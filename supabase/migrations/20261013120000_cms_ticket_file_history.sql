-- ASHWAMEDH 2026 — upload tickets keep their file id as history (Phase 10.6 follow-up).
-- docs/architecture/admin-cms.md
--
-- cms_upload_tickets.file_id named the file an upload produced through a foreign key with
-- ON DELETE SET NULL, so the media cleanup (deleting a detached file after its grace) silently
-- rewrote every finalized ticket that pointed at it. A ticket is the audit record of an upload and
-- must not change after it is finished: the column stays, without the foreign key.
--
-- Only the service-role RPCs cms_finalize_upload and cms_finalize_gallery_upload write file_id, in
-- the same transaction that inserts that file, so a new value always names an existing row. Later
-- the file may be purged and the id left pointing at nothing — by design. The RESTRICT keys that
-- protect files in use (events_content image / guidelines, gallery_items) are unchanged.
--
-- No IF EXISTS on purpose: if the constraint is not there under this name, the migration fails
-- instead of silently doing nothing.

alter table public.cms_upload_tickets drop constraint cms_upload_tickets_file_id_fkey;

comment on column public.cms_upload_tickets.file_id is
  'Historical identifier of the cms_files row this upload produced. Not a foreign key: the media cleanup may since have purged that file, so the id can point at no row.';
