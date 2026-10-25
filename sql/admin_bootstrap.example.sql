-- OWNER-ONLY TEMPLATE. Do not execute until explicitly approved.
-- Does NOT create an Auth account. Copy the already-confirmed user's UUID from
-- Supabase Authentication > Users. Verify its identity through a trusted channel.
BEGIN;
DO $$
DECLARE target uuid := NULL; -- Replace NULL with the owner's reviewed UUID.
BEGIN
 IF target IS NULL THEN RAISE EXCEPTION 'Choose the confirmed administrator UUID first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target AND email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Expected an existing, email-confirmed Auth user';
 END IF;
 INSERT INTO cinewave_private.admin_users(user_id) VALUES(target) ON CONFLICT(user_id) DO NOTHING;
END $$;
COMMIT;
-- Offboarding is a SEPARATE, owner-reviewed operation:
-- DELETE FROM cinewave_private.admin_users WHERE user_id='<reviewed-uuid>'::uuid;
-- Revocation is checked in the database on every protected statement.
