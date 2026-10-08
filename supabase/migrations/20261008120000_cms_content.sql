-- ASHWAMEDH 2026 — CMS content schema (Phase 10.2). docs/architecture/admin-cms.md
--
-- Event IDENTITY is not stored here: which events exist, their names, slugs, departments and
-- verticals live in the repository (src/data/events/inventory.ts, frozen and snapshot-tested).
-- This schema only holds editable content keyed by the frozen slug.
--
-- Contract with the public site: unknown = NULL (never a placeholder string). The site's display
-- layer turns NULL into "TBA" / "Coming Soon". Every rule below mirrors a rule that buildEvent()
-- (src/data/events/build.ts) also enforces when content is read.
--
-- Access: RLS is enabled with no policies, and anon/authenticated have no privileges. Only the
-- server (service role) reads or writes these tables.

-- ---------- helpers ----------

create or replace function public.cms_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- files (metadata; the bytes live in Supabase Storage) ----------

create table public.cms_files (
  id            uuid primary key default gen_random_uuid(),
  bucket        text not null check (bucket in ('ashwamedh-documents', 'ashwamedh-images')),
  -- Server-generated: <folder>[/<event-slug>]/<uuid>.<ext>. Never derived from the uploaded name.
  path          text not null check (
                  path ~ '^(events|festival|gallery|team|logos)/([a-z0-9]+(-[a-z0-9]+)*/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$'
                ),
  original_name text not null check (
                  char_length(original_name) between 1 and 200
                  and original_name !~ '[/\\[:cntrl:]]'
                ),
  mime_type     text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes    integer not null check (size_bytes > 0),
  category      text not null check (category in ('document', 'event-image', 'gallery-image', 'team-image', 'logo')),
  alt_text      text check (alt_text is null or (btrim(alt_text) <> '' and char_length(alt_text) <= 300)),
  uploaded_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (bucket, path),
  constraint cms_files_kind check (
    (category = 'document'
      and bucket = 'ashwamedh-documents'
      and mime_type = 'application/pdf'
      and size_bytes <= 10485760)
    or
    (category <> 'document'
      and bucket = 'ashwamedh-images'
      and mime_type in ('image/jpeg', 'image/png', 'image/webp')
      and size_bytes <= 5242880)
  )
);

create trigger cms_files_touch before update on public.cms_files
  for each row execute function public.cms_touch_updated_at();

-- ---------- event content (one row per frozen event slug) ----------

create table public.events_content (
  event_slug            text primary key check (event_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  description           text[] check (description is null or cardinality(description) > 0),
  rules                 text[] check (rules is null or cardinality(rules) > 0),
  eligibility           text[] check (eligibility is null or cardinality(eligibility) > 0),
  participation         text check (participation in ('individual', 'team', 'individual-or-team')),
  team_size             text check (team_size is null or btrim(team_size) <> ''),
  registration_fee      text check (registration_fee is null or btrim(registration_fee) <> ''),
  event_date            text check (event_date is null or btrim(event_date) <> ''),
  event_time            text check (event_time is null or btrim(event_time) <> ''),
  venue                 text check (venue is null or btrim(venue) <> ''),

  -- Image: an uploaded file, or a repository path under /images/events/ (never both).
  image_file_id         uuid references public.cms_files (id) on delete set null,
  image_path            text check (image_path is null or (image_path ~ '^/images/events/[^?#\s]+$' and image_path !~ '\.\.')),
  -- Guidelines PDF: an uploaded file, or an https:// / /docs/ link (D7-8; never both).
  guidelines_file_id    uuid references public.cms_files (id) on delete set null,
  guidelines_url        text check (guidelines_url is null or guidelines_url ~ '^(https://|/docs/)[^\s]+$'),

  -- Registration (D7-1 … D7-5): open only with an official Google Form link.
  registration_status   text not null default 'not-open' check (registration_status in ('not-open', 'open', 'closed')),
  registration_url      text check (
                          registration_url is null
                          or registration_url ~ '^https://(docs\.google\.com/forms/[^\s]+|forms\.gle/[^\s]+)$'
                        ),
  registration_deadline text check (registration_deadline is null or btrim(registration_deadline) <> ''),

  -- Provenance (ContentSource): required as soon as any content is entered.
  source_kind           text check (source_kind in ('official-pdf', 'official-form', 'owner-confirmed')),
  source_reference      text check (source_reference is null or btrim(source_reference) <> ''),
  source_date           date,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint events_content_open_needs_link check (registration_status <> 'open' or registration_url is not null),
  constraint events_content_one_image check (image_file_id is null or image_path is null),
  constraint events_content_one_guidelines check (guidelines_file_id is null or guidelines_url is null),
  constraint events_content_source_complete check (
    (source_kind is null) = (source_reference is null)
    and (source_kind is null) = (source_date is null)
  ),
  constraint events_content_content_needs_source check (
    source_kind is not null
    or (description is null and rules is null and eligibility is null and participation is null
        and team_size is null and registration_fee is null and event_date is null and event_time is null
        and venue is null and image_file_id is null and image_path is null and guidelines_file_id is null
        and guidelines_url is null and registration_status = 'not-open' and registration_url is null
        and registration_deadline is null)
  )
);

create trigger events_content_touch before update on public.events_content
  for each row execute function public.cms_touch_updated_at();

-- Linked files must be of the right kind (a guidelines PDF is a document, an image an event image).
create or replace function public.cms_check_event_files()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.guidelines_file_id is not null and not exists (
    select 1 from public.cms_files f where f.id = new.guidelines_file_id and f.category = 'document'
  ) then
    raise exception 'guidelines_file_id must reference a document file';
  end if;
  if new.image_file_id is not null and not exists (
    select 1 from public.cms_files f where f.id = new.image_file_id and f.category = 'event-image'
  ) then
    raise exception 'image_file_id must reference an event-image file';
  end if;
  return new;
end;
$$;

create trigger events_content_files before insert or update on public.events_content
  for each row execute function public.cms_check_event_files();

-- ---------- coordinators (several per event, ordered) ----------

create table public.event_coordinators (
  id          uuid primary key default gen_random_uuid(),
  event_slug  text not null references public.events_content (event_slug) on delete cascade,
  name        text not null check (btrim(name) <> '' and char_length(name) <= 120),
  designation text check (designation is null or (btrim(designation) <> '' and char_length(designation) <= 120)),
  phone       text check (phone is null or phone ~ '^\+?[0-9][0-9 ().-]{5,23}$'),
  email       text check (email is null or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  sort_order  integer not null check (sort_order >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_slug, sort_order)
);

create index event_coordinators_event_slug on public.event_coordinators (event_slug);

create trigger event_coordinators_touch before update on public.event_coordinators
  for each row execute function public.cms_touch_updated_at();

-- ---------- access: server (service role) only ----------

alter table public.cms_files enable row level security;
alter table public.events_content enable row level security;
alter table public.event_coordinators enable row level security;

revoke all on table public.cms_files, public.events_content, public.event_coordinators from anon, authenticated;
revoke execute on function public.cms_touch_updated_at(), public.cms_check_event_files() from anon, authenticated;
