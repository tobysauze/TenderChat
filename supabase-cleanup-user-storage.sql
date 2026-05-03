-- Auto-clean storage objects when a user is deleted.
--
-- Cascading FKs already wipe profiles/photos/likes/matches/etc., but the
-- physical photo files in the storage.photos bucket are not referenced by
-- a FK and would otherwise be orphaned. This adds:
--
--   1. cleanup_user_storage(uuid) — deletes a user's photo files
--   2. a BEFORE DELETE trigger on auth.users that calls (1)
--   3. a refreshed delete_user() RPC for the self-delete button in the app
--
-- All three combined: deleting a user via the dashboard, raw SQL, or the
-- in-app "Delete account" button now removes their storage files too.

CREATE OR REPLACE FUNCTION public.cleanup_user_storage(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- Each photos.url is a public URL ending in `/photos/<path>`.
  -- The storage.objects.name column stores exactly that `<path>`.
  DELETE FROM storage.objects
  WHERE bucket_id = 'photos'
    AND name IN (
      SELECT REGEXP_REPLACE(p.url, '^.*/photos/', '')
      FROM photos p
      JOIN profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = target_user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM public.cleanup_user_storage(OLD.id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Self-delete RPC used by the in-app "Delete account" button.
-- Authenticated users can only delete themselves; the trigger above
-- handles the storage side automatically.
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  IF current_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = current_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
