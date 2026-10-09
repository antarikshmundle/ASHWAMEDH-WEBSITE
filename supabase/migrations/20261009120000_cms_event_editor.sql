-- ASHWAMEDH 2026 — Event editor support (Phase 10.3). docs/architecture/admin-cms.md
-- Additive only: no existing table or column changes.
--
--   events_content_revisions  the previous version of an event's content, written on every save
--   cms_save_event(...)       one transaction: lock → version check → revision → update → coordinators
--
-- Access: like the content tables — RLS on, no policies, no privileges for anon / authenticated.
-- The function is executable by the service role only (the server, after requireAdmin()).

create table public.events_content_revisions (
  id           uuid primary key default gen_random_uuid(),
  event_slug   text not null references public.events_content (event_slug) on delete cascade,
  -- The events_content row as it was before the save (without timestamps).
  content      jsonb not null check (jsonb_typeof(content) = 'object'),
  -- Its coordinators as an ordered array of {name, designation, phone, email, sort_order}.
  coordinators jsonb not null default '[]'::jsonb check (jsonb_typeof(coordinators) = 'array'),
  saved_at     timestamptz not null default now()
);

create index events_content_revisions_event on public.events_content_revisions (event_slug, saved_at desc);

alter table public.events_content_revisions enable row level security;
revoke all on table public.events_content_revisions from anon, authenticated;

-- Saves the editable content of one event. Image and file columns are not touched (Phase 10.4).
-- Errors (the whole save is rolled back):
--   cms_unknown_event     no events_content row for p_slug
--   cms_version_conflict  the row changed since the editor loaded it (p_expected_updated_at)
--   any constraint error  invalid content (the same rules as the table)
create or replace function public.cms_save_event(
  p_slug                text,
  p_expected_updated_at timestamptz,
  p_content             jsonb,
  p_coordinators        jsonb
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row public.events_content%rowtype;
  incoming    public.events_content%rowtype;
  saved_at    timestamptz;
begin
  if jsonb_typeof(p_content) is distinct from 'object' or jsonb_typeof(p_coordinators) is distinct from 'array' then
    raise exception 'cms_invalid_payload';
  end if;

  select * into current_row from public.events_content where event_slug = p_slug for update;
  if not found then
    raise exception 'cms_unknown_event';
  end if;
  if current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'cms_version_conflict';
  end if;

  insert into public.events_content_revisions (event_slug, content, coordinators)
  values (
    p_slug,
    to_jsonb(current_row) - 'created_at' - 'updated_at',
    coalesce(
      (select jsonb_agg(jsonb_build_object(
                'name', c.name, 'designation', c.designation, 'phone', c.phone,
                'email', c.email, 'sort_order', c.sort_order) order by c.sort_order)
         from public.event_coordinators c where c.event_slug = p_slug),
      '[]'::jsonb)
  );

  incoming := jsonb_populate_record(null::public.events_content, p_content);

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
    from jsonb_to_recordset(p_coordinators)
      as x(name text, designation text, phone text, email text, sort_order integer);

  return saved_at;
end;
$$;

revoke execute on function public.cms_save_event(text, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.cms_save_event(text, timestamptz, jsonb, jsonb) to service_role;
