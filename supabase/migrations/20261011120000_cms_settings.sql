-- ASHWAMEDH 2026 — Festival settings (Phase 10.5). docs/architecture/admin-cms.md
-- Additive only. One row of festival-level content the admin can edit: contact details, social
-- links, Cultural Night dates, time / venue of the fixed schedule rows, vertical taglines — with the
-- official source, like event content. Unknown = NULL (the site shows TBA / nothing, as today).
-- Titles of schedule rows, the "What's On" list and everything else stay in the repository.
--
--   festival_settings            exactly one row (id = 1), created here
--   festival_settings_revisions  the previous version, written on every save
--   cms_save_settings(...)       one transaction: lock → version check → revision → update
--
-- Access: RLS on, no policies, nothing for anon / authenticated; the function is service-role only.

-- Social links: [{"label": "...", "href": "https://..."}], at most 8.
create or replace function public.cms_valid_social_links(p_links jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_links) = 'array'
     and jsonb_array_length(p_links) <= 8
     and not exists (
       select 1 from jsonb_array_elements(p_links) as link
        where jsonb_typeof(link) <> 'object'
           or (select count(*) from jsonb_object_keys(link)) <> 2
           or jsonb_typeof(link -> 'label') <> 'string'
           or jsonb_typeof(link -> 'href') <> 'string'
           or btrim(link ->> 'label') = '' or char_length(link ->> 'label') > 40
           or (link ->> 'href') !~ '^https://[^\s/?#@]+\.[^\s/?#@]+(/[^\s]*)?$'
           or char_length(link ->> 'href') > 300
     )
$$;

create table public.festival_settings (
  id                           smallint primary key default 1 check (id = 1),
  contact_phone                text check (contact_phone is null or contact_phone ~ '^\+?[0-9][0-9 ().-]{5,23}$'),
  -- WhatsApp needs the international format (+country …) for its wa.me link.
  contact_whatsapp             text check (contact_whatsapp is null or contact_whatsapp ~ '^\+[0-9][0-9 ().-]{5,23}$'),
  contact_email                text check (contact_email is null or (contact_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(contact_email) <= 254)),
  social_links                 jsonb not null default '[]'::jsonb check (public.cms_valid_social_links(social_links)),
  cultural_night_day1_date     text check (cultural_night_day1_date is null or (btrim(cultural_night_day1_date) <> '' and char_length(cultural_night_day1_date) <= 60)),
  cultural_night_day2_date     text check (cultural_night_day2_date is null or (btrim(cultural_night_day2_date) <> '' and char_length(cultural_night_day2_date) <= 60)),
  schedule_inauguration_time   text check (schedule_inauguration_time is null or (btrim(schedule_inauguration_time) <> '' and char_length(schedule_inauguration_time) <= 60)),
  schedule_inauguration_venue  text check (schedule_inauguration_venue is null or (btrim(schedule_inauguration_venue) <> '' and char_length(schedule_inauguration_venue) <= 120)),
  schedule_technomedh_time     text check (schedule_technomedh_time is null or (btrim(schedule_technomedh_time) <> '' and char_length(schedule_technomedh_time) <= 60)),
  schedule_technomedh_venue    text check (schedule_technomedh_venue is null or (btrim(schedule_technomedh_venue) <> '' and char_length(schedule_technomedh_venue) <= 120)),
  schedule_cultural_time       text check (schedule_cultural_time is null or (btrim(schedule_cultural_time) <> '' and char_length(schedule_cultural_time) <= 60)),
  schedule_cultural_venue      text check (schedule_cultural_venue is null or (btrim(schedule_cultural_venue) <> '' and char_length(schedule_cultural_venue) <= 120)),
  schedule_sports_time         text check (schedule_sports_time is null or (btrim(schedule_sports_time) <> '' and char_length(schedule_sports_time) <= 60)),
  schedule_sports_venue        text check (schedule_sports_venue is null or (btrim(schedule_sports_venue) <> '' and char_length(schedule_sports_venue) <= 120)),
  schedule_cultural_night_time text check (schedule_cultural_night_time is null or (btrim(schedule_cultural_night_time) <> '' and char_length(schedule_cultural_night_time) <= 60)),
  schedule_cultural_night_venue text check (schedule_cultural_night_venue is null or (btrim(schedule_cultural_night_venue) <> '' and char_length(schedule_cultural_night_venue) <= 120)),
  tagline_technomedh           text check (tagline_technomedh is null or (btrim(tagline_technomedh) <> '' and char_length(tagline_technomedh) <= 120)),
  tagline_cultural             text check (tagline_cultural is null or (btrim(tagline_cultural) <> '' and char_length(tagline_cultural) <= 120)),
  tagline_sports               text check (tagline_sports is null or (btrim(tagline_sports) <> '' and char_length(tagline_sports) <= 120)),
  tagline_cultural_night       text check (tagline_cultural_night is null or (btrim(tagline_cultural_night) <> '' and char_length(tagline_cultural_night) <= 120)),
  source_kind                  text check (source_kind in ('official-pdf', 'official-form', 'owner-confirmed')),
  source_reference             text check (source_reference is null or (btrim(source_reference) <> '' and char_length(source_reference) <= 200)),
  source_date                  date,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint festival_settings_source_complete check (
    (source_kind is null) = (source_reference is null) and (source_kind is null) = (source_date is null)
  ),
  constraint festival_settings_content_needs_source check (
    source_kind is not null
    or (social_links = '[]'::jsonb
        and contact_phone is null
        and contact_whatsapp is null
        and contact_email is null
        and cultural_night_day1_date is null
        and cultural_night_day2_date is null
        and schedule_inauguration_time is null
        and schedule_inauguration_venue is null
        and schedule_technomedh_time is null
        and schedule_technomedh_venue is null
        and schedule_cultural_time is null
        and schedule_cultural_venue is null
        and schedule_sports_time is null
        and schedule_sports_venue is null
        and schedule_cultural_night_time is null
        and schedule_cultural_night_venue is null
        and tagline_technomedh is null
        and tagline_cultural is null
        and tagline_sports is null
        and tagline_cultural_night is null)
  )
);

create trigger festival_settings_touch before update on public.festival_settings
  for each row execute function public.cms_touch_updated_at();

insert into public.festival_settings (id) values (1) on conflict (id) do nothing;

create table public.festival_settings_revisions (
  id        uuid primary key default gen_random_uuid(),
  content   jsonb not null check (jsonb_typeof(content) = 'object'),
  saved_at  timestamptz not null default now()
);
create index festival_settings_revisions_saved on public.festival_settings_revisions (saved_at desc);

alter table public.festival_settings enable row level security;
alter table public.festival_settings_revisions enable row level security;
revoke all on table public.festival_settings, public.festival_settings_revisions from anon, authenticated;

-- Saves every editable column from p_content (a missing key = NULL; social_links defaults to []).
-- Errors roll the whole save back: cms_invalid_payload, cms_version_conflict, constraint errors.
create or replace function public.cms_save_settings(p_expected_updated_at timestamptz, p_content jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row public.festival_settings%rowtype;
  incoming    public.festival_settings%rowtype;
  saved_at    timestamptz;
begin
  if jsonb_typeof(p_content) is distinct from 'object' then
    raise exception 'cms_invalid_payload';
  end if;
  select * into current_row from public.festival_settings where id = 1 for update;
  if not found then
    raise exception 'cms_settings_missing';
  end if;
  if current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'cms_version_conflict';
  end if;

  insert into public.festival_settings_revisions (content)
  values (to_jsonb(current_row) - 'id' - 'created_at' - 'updated_at');

  incoming := jsonb_populate_record(null::public.festival_settings, p_content);
  update public.festival_settings set
    contact_phone = incoming.contact_phone,
    contact_whatsapp = incoming.contact_whatsapp,
    contact_email = incoming.contact_email,
    social_links = coalesce(incoming.social_links, '[]'::jsonb),
    cultural_night_day1_date = incoming.cultural_night_day1_date,
    cultural_night_day2_date = incoming.cultural_night_day2_date,
    schedule_inauguration_time = incoming.schedule_inauguration_time,
    schedule_inauguration_venue = incoming.schedule_inauguration_venue,
    schedule_technomedh_time = incoming.schedule_technomedh_time,
    schedule_technomedh_venue = incoming.schedule_technomedh_venue,
    schedule_cultural_time = incoming.schedule_cultural_time,
    schedule_cultural_venue = incoming.schedule_cultural_venue,
    schedule_sports_time = incoming.schedule_sports_time,
    schedule_sports_venue = incoming.schedule_sports_venue,
    schedule_cultural_night_time = incoming.schedule_cultural_night_time,
    schedule_cultural_night_venue = incoming.schedule_cultural_night_venue,
    tagline_technomedh = incoming.tagline_technomedh,
    tagline_cultural = incoming.tagline_cultural,
    tagline_sports = incoming.tagline_sports,
    tagline_cultural_night = incoming.tagline_cultural_night,
    source_kind = incoming.source_kind,
    source_reference = incoming.source_reference,
    source_date = incoming.source_date
  where id = 1
  returning updated_at into saved_at;
  return saved_at;
end;
$$;

revoke execute on function public.cms_save_settings(timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.cms_save_settings(timestamptz, jsonb) to service_role;
revoke execute on function public.cms_valid_social_links(jsonb) from public, anon, authenticated;
grant execute on function public.cms_valid_social_links(jsonb) to service_role;
