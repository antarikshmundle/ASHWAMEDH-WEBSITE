-- ASHWAMEDH 2026 — trigger function privileges (Phase 10.4 security fix). docs/architecture/admin-cms.md
--
-- 20261008120000_cms_content.sql revoked EXECUTE on the two trigger functions from anon and
-- authenticated, but not from PUBLIC, so both roles kept it through PUBLIC. They are trigger
-- functions (Postgres refuses a direct call) and PostgREST does not expose them, so the practical
-- risk was low; this closes it anyway. Firing a trigger does not check EXECUTE on its function, so
-- the triggers keep working. The explicit service_role and owner grants are left as they are.

revoke execute on function public.cms_touch_updated_at() from public, anon, authenticated;
revoke execute on function public.cms_check_event_files() from public, anon, authenticated;
