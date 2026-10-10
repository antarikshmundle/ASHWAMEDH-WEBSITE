-- ASHWAMEDH 2026 — Media manager support (Phase 10.4). docs/architecture/admin-cms.md
-- Additive: one new bucket, two new cms_files columns, one new table, three functions, and the two
-- event→file foreign keys switched from ON DELETE SET NULL to RESTRICT (same constraint names).
--
-- Upload flow (D1): the server issues a short-lived ticket bound to an event, a kind and a
-- server-generated object path in the PRIVATE staging bucket; the browser uploads there with a
-- signed URL; the server then checks the real bytes, moves the object to the public bucket and calls
-- cms_finalize_upload. Storage and the database are separate systems: the move happens outside any
-- database transaction. Every database step below is transactional; storage leftovers are found and
-- removed later by the cleanup, which only deletes what no row or active ticket refers to.

-- ---------- private staging bucket (no storage policies: server / service role only) ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ashwamedh-staging', 'ashwamedh-staging', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- cms_files: image dimensions (D6) and detachment time (D4) ----------

alter table public.cms_files
  add column width  integer,
  add column height integer,
  -- When the file stopped being used by any event. The 24-hour cleanup grace counts from here
  -- (or from uploaded_at for a file that was never attached).
  add column detached_at timestamptz,
  add constraint cms_files_dimensions check (
    (category = 'document' and width is null and height is null)
    or (category <> 'document'
        and width is not null and height is not null
        and width between 1 and 4096 and height between 1 and 4096
        and width::bigint * height::bigint <= 16000000)
  );

-- ---------- a file in use can never be deleted (was: ON DELETE SET NULL) ----------

alter table public.events_content
  drop constraint events_content_image_file_id_fkey,
  add constraint events_content_image_file_id_fkey
    foreign key (image_file_id) references public.cms_files (id) on delete restrict,
  drop constraint events_content_guidelines_file_id_fkey,
  add constraint events_content_guidelines_file_id_fkey
    foreign key (guidelines_file_id) references public.cms_files (id) on delete restrict;

-- ---------- upload tickets ----------

create table public.cms_upload_tickets (
  id             uuid primary key default gen_random_uuid(),
  event_slug     text not null references public.events_content (event_slug) on delete cascade,
  kind           text not null check (kind in ('image', 'guidelines')),
  -- Server-generated, identical in the staging and the public bucket: <folder>/<slug>/<uuid>.<ext>
  object_path    text not null unique check (
                   object_path ~ '^events/[a-z0-9]+(-[a-z0-9]+)*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$'
                 ),
  original_name  text not null check (char_length(original_name) between 1 and 200 and original_name !~ '[/\\[:cntrl:]]'),
  declared_type  text not null check (declared_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  declared_size  integer not null check (declared_size between 1 and 10485760),
  -- issued → processing → finalized | failed. A processing ticket older than 10 minutes was
  -- interrupted and may be claimed again (recovery).
  status         text not null default 'issued' check (status in ('issued', 'processing', 'finalized', 'failed')),
  issued_at      timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '15 minutes',
  processing_at  timestamptz,
  finished_at    timestamptz,
  file_id        uuid references public.cms_files (id) on delete set null,
  failure        text check (failure is null or char_length(failure) <= 300),
  constraint cms_upload_tickets_kind_type check (
    (kind = 'guidelines' and declared_type = 'application/pdf' and object_path like '%.pdf')
    or (kind = 'image' and declared_type <> 'application/pdf' and object_path !~ '\.pdf$')
  ),
  constraint cms_upload_tickets_path_slug check (object_path like 'events/' || event_slug || '/%'),
  constraint cms_upload_tickets_window check (expires_at > issued_at and expires_at <= issued_at + interval '1 hour'),
  constraint cms_upload_tickets_finished check ((status in ('finalized', 'failed')) = (finished_at is not null))
);

create index cms_upload_tickets_open on public.cms_upload_tickets (status, issued_at);

alter table public.cms_upload_tickets enable row level security;
revoke all on table public.cms_upload_tickets from anon, authenticated;

-- ---------- shared helpers (internal) ----------

-- Locks the event row and checks the version the editor loaded. Returns the locked row.
create or replace function public.cms_lock_event(p_slug text, p_expected_updated_at timestamptz)
returns public.events_content
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row public.events_content%rowtype;
begin
  select * into current_row from public.events_content where event_slug = p_slug for update;
  if not found then
    raise exception 'cms_unknown_event';
  end if;
  if current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'cms_version_conflict';
  end if;
  return current_row;
end;
$$;

-- Records the current content and coordinators as a revision (same shape as cms_save_event).
create or replace function public.cms_record_revision(p_row public.events_content)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.events_content_revisions (event_slug, content, coordinators)
  values (
    p_row.event_slug,
    to_jsonb(p_row) - 'created_at' - 'updated_at',
    coalesce(
      (select jsonb_agg(jsonb_build_object(
                'name', c.name, 'designation', c.designation, 'phone', c.phone,
                'email', c.email, 'sort_order', c.sort_order) order by c.sort_order)
         from public.event_coordinators c where c.event_slug = p_row.event_slug),
      '[]'::jsonb)
  );
end;
$$;

-- Marks files that are no longer used by any event as detached (cleanup grace starts now), and
-- clears detached_at for files that are in use again.
create or replace function public.cms_refresh_detached(p_file_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.cms_files f
     set detached_at = case
           when exists (select 1 from public.events_content e
                         where e.image_file_id = f.id or e.guidelines_file_id = f.id)
             then null
           else coalesce(f.detached_at, now())
         end
   where f.id = any (p_file_ids);
end;
$$;

-- ---------- attach / remove media (D2, D3) ----------

-- p_kind 'image' | 'guidelines'; p_file_id NULL removes. Attaching replaces the competing path /
-- link (image_path / guidelines_url) — the previous values stay in the revision. The file must be
-- of the right category (trigger) and belong to this event's folder. Returns the new version.
create or replace function public.cms_set_event_media(
  p_slug                text,
  p_expected_updated_at timestamptz,
  p_kind                text,
  p_file_id             uuid
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row public.events_content%rowtype;
  saved_at    timestamptz;
begin
  if p_kind not in ('image', 'guidelines') then
    raise exception 'cms_invalid_kind';
  end if;
  current_row := public.cms_lock_event(p_slug, p_expected_updated_at);

  if p_file_id is not null and not exists (
    select 1 from public.cms_files f
     where f.id = p_file_id and f.path like 'events/' || p_slug || '/%'
  ) then
    raise exception 'cms_file_not_for_event';
  end if;

  perform public.cms_record_revision(current_row);

  if p_kind = 'image' then
    update public.events_content
       set image_file_id = p_file_id,
           image_path    = case when p_file_id is null then image_path else null end
     where event_slug = p_slug
    returning updated_at into saved_at;
  else
    update public.events_content
       set guidelines_file_id = p_file_id,
           guidelines_url     = case when p_file_id is null then guidelines_url else null end
     where event_slug = p_slug
    returning updated_at into saved_at;
  end if;

  perform public.cms_refresh_detached(
    array_remove(array[current_row.image_file_id, current_row.guidelines_file_id, p_file_id], null));
  return saved_at;
end;
$$;

-- ---------- finalize an upload (one transaction: ticket, file row, event link) ----------

-- Called after the server has checked the bytes and moved the object to the public bucket.
-- Idempotent: a ticket that is already finalized returns its file again. Any failure (expired or
-- wrong ticket, version conflict, constraint) rolls back the file row and the link together; the
-- moved object is then left for the cleanup, never referenced.
create or replace function public.cms_finalize_upload(
  p_ticket_id           uuid,
  p_slug                text,
  p_kind                text,
  p_expected_updated_at timestamptz,
  p_file                jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ticket   public.cms_upload_tickets%rowtype;
  v_file_id uuid;
  saved_at timestamptz;
begin
  select * into ticket from public.cms_upload_tickets where id = p_ticket_id for update;
  if not found or ticket.event_slug is distinct from p_slug or ticket.kind is distinct from p_kind then
    raise exception 'cms_invalid_ticket';
  end if;
  if ticket.status = 'finalized' then
    return jsonb_build_object('file_id', ticket.file_id, 'updated_at',
      (select updated_at from public.events_content where event_slug = p_slug), 'repeated', true);
  end if;
  if ticket.status <> 'processing' then
    raise exception 'cms_ticket_not_claimed';
  end if;

  insert into public.cms_files (bucket, path, original_name, mime_type, size_bytes, category, alt_text, width, height)
  values (
    case when p_kind = 'guidelines' then 'ashwamedh-documents' else 'ashwamedh-images' end,
    ticket.object_path,
    ticket.original_name,
    p_file ->> 'mime_type',
    (p_file ->> 'size_bytes')::integer,
    case when p_kind = 'guidelines' then 'document' else 'event-image' end,
    nullif(btrim(p_file ->> 'alt_text'), ''),
    (p_file ->> 'width')::integer,
    (p_file ->> 'height')::integer
  )
  returning id into v_file_id;

  saved_at := public.cms_set_event_media(p_slug, p_expected_updated_at, p_kind, v_file_id);

  update public.cms_upload_tickets
     set status = 'finalized', finished_at = now(), file_id = v_file_id
   where id = p_ticket_id;

  return jsonb_build_object('file_id', v_file_id, 'updated_at', saved_at, 'repeated', false);
end;
$$;

-- ---------- restore a revision, including media links (D5) ----------

-- Restores text, coordinators and media links from a revision. A linked file that no longer exists
-- is not restored (the link stays empty) and is reported in "missing". Returns
-- {"updated_at": …, "missing": ["image" | "guidelines", …]}.
create or replace function public.cms_restore_event(
  p_slug                text,
  p_expected_updated_at timestamptz,
  p_revision_id         uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row public.events_content%rowtype;
  revision    public.events_content_revisions%rowtype;
  incoming    public.events_content%rowtype;
  image_id    uuid;
  guide_id    uuid;
  missing     text[] := '{}';
  saved_at    timestamptz;
begin
  select * into revision from public.events_content_revisions where id = p_revision_id and event_slug = p_slug;
  if not found then
    raise exception 'cms_unknown_revision';
  end if;
  current_row := public.cms_lock_event(p_slug, p_expected_updated_at);
  incoming := jsonb_populate_record(null::public.events_content, revision.content);

  image_id := incoming.image_file_id;
  if image_id is not null and not exists (select 1 from public.cms_files where id = image_id) then
    image_id := null;
    missing := array_append(missing, 'image');
  end if;
  guide_id := incoming.guidelines_file_id;
  if guide_id is not null and not exists (select 1 from public.cms_files where id = guide_id) then
    guide_id := null;
    missing := array_append(missing, 'guidelines');
  end if;

  perform public.cms_record_revision(current_row);

  update public.events_content set
    description           = incoming.description,
    rules                 = incoming.rules,
    eligibility           = incoming.eligibility,
    participation         = incoming.participation,
    team_size             = incoming.team_size,
    registration_fee      = incoming.registration_fee,
    event_date            = incoming.event_date,
    event_time            = incoming.event_time,
    venue                 = incoming.venue,
    image_file_id         = image_id,
    image_path            = incoming.image_path,
    guidelines_file_id    = guide_id,
    guidelines_url        = incoming.guidelines_url,
    registration_status   = coalesce(incoming.registration_status, 'not-open'),
    registration_url      = incoming.registration_url,
    registration_deadline = incoming.registration_deadline,
    source_kind           = incoming.source_kind,
    source_reference      = incoming.source_reference,
    source_date           = incoming.source_date
  where event_slug = p_slug
  returning updated_at into saved_at;

  delete from public.event_coordinators where event_slug = p_slug;
  insert into public.event_coordinators (event_slug, name, designation, phone, email, sort_order)
  select p_slug, x.name, x.designation, x.phone, x.email, x.sort_order
    from jsonb_to_recordset(revision.coordinators)
      as x(name text, designation text, phone text, email text, sort_order integer);

  perform public.cms_refresh_detached(array_remove(array[
    current_row.image_file_id, current_row.guidelines_file_id, image_id, guide_id], null));

  return jsonb_build_object('updated_at', saved_at, 'missing', to_jsonb(missing));
end;
$$;

-- ---------- access: service role only ----------

revoke execute on function public.cms_lock_event(text, timestamptz) from public, anon, authenticated;
revoke execute on function public.cms_record_revision(public.events_content) from public, anon, authenticated;
revoke execute on function public.cms_refresh_detached(uuid[]) from public, anon, authenticated;
revoke execute on function public.cms_set_event_media(text, timestamptz, text, uuid) from public, anon, authenticated;
revoke execute on function public.cms_finalize_upload(uuid, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke execute on function public.cms_restore_event(text, timestamptz, uuid) from public, anon, authenticated;

grant execute on function public.cms_lock_event(text, timestamptz) to service_role;
grant execute on function public.cms_record_revision(public.events_content) to service_role;
grant execute on function public.cms_refresh_detached(uuid[]) to service_role;
grant execute on function public.cms_set_event_media(text, timestamptz, text, uuid) to service_role;
grant execute on function public.cms_finalize_upload(uuid, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.cms_restore_event(text, timestamptz, uuid) to service_role;
