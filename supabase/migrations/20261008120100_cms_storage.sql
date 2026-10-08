-- ASHWAMEDH 2026 — CMS storage buckets (Phase 10.2). docs/architecture/admin-cms.md
--
-- Two buckets so that type and size limits are enforced by Storage itself, per kind of file:
--   ashwamedh-documents  guidelines PDFs            application/pdf           ≤ 10 MB
--   ashwamedh-images     event / gallery / team …   image/jpeg, png, webp     ≤ 5 MB
--
-- Both are PUBLIC for reading, because the public website links to these files directly.
-- Nobody but the server can write: storage.objects has RLS enabled by Supabase, and this project
-- adds no storage policies, so anon / authenticated requests cannot insert, update or delete.
-- All writes go through the server with the service role, after requireAdmin().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ashwamedh-documents', 'ashwamedh-documents', true, 10485760, array['application/pdf']),
  ('ashwamedh-images', 'ashwamedh-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
