-- ASHWAMEDH 2026 — Gallery and Team (Phase 10.6). docs/architecture/admin-cms.md
-- Additive, plus a widening of the upload-ticket rules so gallery images use the 10.4 pipeline:
--
--   gallery_items   one official image (cms_files, category gallery-image) + caption + source,
--                   draft / published, ordered
--   team_members    name, role, group + source, draft / published, ordered (no photos: OD 10.6-2)
--   cms_upload_tickets  kind 'gallery' (path gallery/<uuid>.<ext>, no event) — event tickets unchanged
--   cms_finalize_gallery_upload  one transaction: ticket → file row → draft gallery item
--   cms_delete_gallery_item      versioned delete; the file is only detached (cleanup after 24 h)
--   cms_reorder_gallery / cms_reorder_team  set the whole order at once
--
-- Only published rows appear on the public site. Every row needs its official source.
-- Access: RLS on, no policies, nothing for anon / authenticated; functions are service-role only.

-- ---------- upload tickets: gallery images (event tickets keep exactly their rules) ----------

alter table public.cms_upload_tickets
  alter column event_slug drop not null,
  drop constraint cms_upload_tickets_kind_check,
  add constraint cms_upload_tickets_kind_check check (kind in ('image', 'guidelines', 'gallery')),
  drop constraint cms_upload_tickets_object_path_check,
  add constraint cms_upload_tickets_object_path_check check (
    object_path ~ '^(events/[a-z0-9]+(-[a-z0-9]+)*|gallery)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$'
  ),
  drop constraint cms_upload_tickets_kind_type,
  add constraint cms_upload_tickets_kind_type check (
    (kind = 'guidelines' and declared_type = 'application/pdf' and object_path like '%.pdf')
    or (kind in ('image', 'gallery') and declared_type <> 'application/pdf' and object_path !~ '\.pdf$')
  ),
  drop constraint cms_upload_tickets_path_slug,
  add constraint cms_upload_tickets_path_slug check (
    (kind in ('image', 'guidelines') and event_slug is not null
       and object_path like 'events/' || event_slug || '/%')
    or (kind = 'gallery' and event_slug is null and object_path like 'gallery/%')
  );

-- ---------- tables ----------

create table public.gallery_items (
  id               uuid primary key default gen_random_uuid(),
  file_id          uuid not null unique references public.cms_files (id) on delete restrict,
  caption          text not null check (btrim(caption) <> '' and char_length(caption) <= 200),
  sort_order       integer not null default 0 check (sort_order >= 0),
  status           text not null default 'draft' check (status in ('draft', 'published')),
  source_kind      text not null check (source_kind in ('official-pdf', 'official-form', 'owner-confirmed')),
  source_reference text not null check (btrim(source_reference) <> '' and char_length(source_reference) <= 200),
  source_date      date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.team_members (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (btrim(name) <> '' and char_length(name) <= 120),
  role             text not null check (btrim(role) <> '' and char_length(role) <= 120),
  group_label      text not null check (btrim(group_label) <> '' and char_length(group_label) <= 80),
  sort_order       integer not null default 0 check (sort_order >= 0),
  status           text not null default 'draft' check (status in ('draft', 'published')),
  source_kind      text not null check (source_kind in ('official-pdf', 'official-form', 'owner-confirmed')),
  source_reference text not null check (btrim(source_reference) <> '' and char_length(source_reference) <= 200),
  source_date      date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index gallery_items_order on public.gallery_items (status, sort_order, created_at);
create index team_members_order on public.team_members (status, sort_order, created_at);

create trigger gallery_items_touch before update on public.gallery_items
  for each row execute function public.cms_touch_updated_at();
create trigger team_members_touch before update on public.team_members
  for each row execute function public.cms_touch_updated_at();

-- A gallery item's file must be a gallery image (as events_content checks its files).
create or replace function public.cms_check_gallery_file()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.cms_files f where f.id = new.file_id and f.category = 'gallery-image'
  ) then
    raise exception 'gallery file_id must reference a gallery-image file';
  end if;
  return new;
end;
$$;

create trigger gallery_items_file before insert or update of file_id on public.gallery_items
  for each row execute function public.cms_check_gallery_file();

alter table public.gallery_items enable row level security;
alter table public.team_members enable row level security;
revoke all on table public.gallery_items, public.team_members from anon, authenticated;

-- ---------- gallery upload: ticket → file row → draft item (one transaction) ----------

-- p_item: {caption, source_kind, source_reference, source_date}; p_file: {mime_type, size_bytes,
-- alt_text, width, height}. Idempotent: a finalized ticket returns its item again.
create or replace function public.cms_finalize_gallery_upload(
  p_ticket_id uuid,
  p_item      jsonb,
  p_file      jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ticket    public.cms_upload_tickets%rowtype;
  v_file_id uuid;
  v_item_id uuid;
begin
  select * into ticket from public.cms_upload_tickets where id = p_ticket_id for update;
  if not found or ticket.kind is distinct from 'gallery' then
    raise exception 'cms_invalid_ticket';
  end if;
  if ticket.status = 'finalized' then
    return jsonb_build_object('file_id', ticket.file_id, 'repeated', true,
      'item_id', (select id from public.gallery_items where file_id = ticket.file_id));
  end if;
  if ticket.status <> 'processing' then
    raise exception 'cms_ticket_not_claimed';
  end if;

  insert into public.cms_files (bucket, path, original_name, mime_type, size_bytes, category, alt_text, width, height)
  values ('ashwamedh-images', ticket.object_path, ticket.original_name, p_file ->> 'mime_type',
          (p_file ->> 'size_bytes')::integer, 'gallery-image', nullif(btrim(p_file ->> 'alt_text'), ''),
          (p_file ->> 'width')::integer, (p_file ->> 'height')::integer)
  returning id into v_file_id;

  insert into public.gallery_items (file_id, caption, sort_order, source_kind, source_reference, source_date)
  values (v_file_id, p_item ->> 'caption',
          coalesce((select max(sort_order) + 1 from public.gallery_items), 0),
          p_item ->> 'source_kind', p_item ->> 'source_reference', (p_item ->> 'source_date')::date)
  returning id into v_item_id;

  update public.cms_upload_tickets
     set status = 'finalized', finished_at = now(), file_id = v_file_id
   where id = p_ticket_id;

  return jsonb_build_object('file_id', v_file_id, 'item_id', v_item_id, 'repeated', false);
end;
$$;

-- Deletes a gallery item (version-checked); its file is only detached — the cleanup removes it
-- after the 24-hour grace.
create or replace function public.cms_delete_gallery_item(p_id uuid, p_expected_updated_at timestamptz)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item public.gallery_items%rowtype;
begin
  select * into item from public.gallery_items where id = p_id for update;
  if not found then
    raise exception 'cms_unknown_item';
  end if;
  if item.updated_at is distinct from p_expected_updated_at then
    raise exception 'cms_version_conflict';
  end if;
  delete from public.gallery_items where id = p_id;
  update public.cms_files set detached_at = coalesce(detached_at, now()) where id = item.file_id;
end;
$$;

-- Sets the order of ALL items at once: p_ids must list every item exactly once.
create or replace function public.cms_reorder_gallery(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1 from public.gallery_items for update;
  if cardinality(p_ids) is distinct from (select count(*) from public.gallery_items)
     or cardinality(p_ids) is distinct from (select count(distinct x) from unnest(p_ids) as x)
     or exists (select 1 from unnest(p_ids) as x where x not in (select id from public.gallery_items)) then
    raise exception 'cms_invalid_order';
  end if;
  update public.gallery_items g set sort_order = o.position - 1
    from unnest(p_ids) with ordinality as o(id, position)
   where g.id = o.id and g.sort_order is distinct from o.position - 1;
end;
$$;

create or replace function public.cms_reorder_team(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1 from public.team_members for update;
  if cardinality(p_ids) is distinct from (select count(*) from public.team_members)
     or cardinality(p_ids) is distinct from (select count(distinct x) from unnest(p_ids) as x)
     or exists (select 1 from unnest(p_ids) as x where x not in (select id from public.team_members)) then
    raise exception 'cms_invalid_order';
  end if;
  update public.team_members t set sort_order = o.position - 1
    from unnest(p_ids) with ordinality as o(id, position)
   where t.id = o.id and t.sort_order is distinct from o.position - 1;
end;
$$;

-- ---------- access: service role only ----------

revoke execute on function public.cms_check_gallery_file() from public, anon, authenticated;
revoke execute on function public.cms_finalize_gallery_upload(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.cms_delete_gallery_item(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.cms_reorder_gallery(uuid[]) from public, anon, authenticated;
revoke execute on function public.cms_reorder_team(uuid[]) from public, anon, authenticated;

grant execute on function public.cms_finalize_gallery_upload(uuid, jsonb, jsonb) to service_role;
grant execute on function public.cms_delete_gallery_item(uuid, timestamptz) to service_role;
grant execute on function public.cms_reorder_gallery(uuid[]) to service_role;
grant execute on function public.cms_reorder_team(uuid[]) to service_role;
