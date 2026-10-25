-- Review and staging-test after 001. Never run automatically against production.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF to_regprocedure('public.cinewave_is_admin()') IS NULL THEN RAISE EXCEPTION 'Apply reviewed Admin migration 001 first'; END IF;
END $$;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'movie';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' AND column_name='media_type' AND udt_name='text') THEN RAISE EXCEPTION 'Unexpected media_type type'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.movies'::regclass AND conname='cinewave_media_type') THEN
  ALTER TABLE public.movies ADD CONSTRAINT cinewave_media_type CHECK(media_type IN ('movie','tv'));
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.profiles (
 user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '' CHECK(char_length(display_name)<=80),
 preferred_language text NOT NULL DEFAULT 'en' CHECK(preferred_language IN ('en','ru','hy')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE typ text;
BEGIN
 SELECT format_type(atttypid,atttypmod) INTO typ FROM pg_attribute WHERE attrelid='public.movies'::regclass AND attname='id' AND NOT attisdropped;
 IF typ NOT IN ('bigint','integer') THEN RAISE EXCEPTION 'Inspect movie ID type before installing watchlist'; END IF;
 EXECUTE format('CREATE TABLE IF NOT EXISTS public.user_watchlist (user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,movie_id %s NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,movie_id))',typ);
 IF NOT EXISTS(SELECT 1 FROM pg_attribute p JOIN pg_attribute m ON m.attrelid='public.movies'::regclass AND m.attname='id' WHERE p.attrelid='public.user_watchlist'::regclass AND p.attname='movie_id' AND p.atttypid=m.atttypid) THEN RAISE EXCEPTION 'Incompatible existing watchlist'; END IF;
END $$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlist FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles,public.user_watchlist FROM PUBLIC,anon,authenticated;
DO $$ DECLARE rel text;cols text;
BEGIN
 FOREACH rel IN ARRAY ARRAY['profiles','user_watchlist'] LOOP
  SELECT string_agg(quote_ident(column_name),',') INTO cols FROM information_schema.columns WHERE table_schema='public' AND table_name=rel;
  EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON public.%I FROM PUBLIC,anon,authenticated',cols,rel);
 END LOOP;
END $$;
GRANT SELECT ON public.profiles,public.user_watchlist TO authenticated;
GRANT INSERT(user_id,display_name,preferred_language),UPDATE(display_name,preferred_language) ON public.profiles TO authenticated;
GRANT INSERT(user_id,movie_id),DELETE ON public.user_watchlist TO authenticated;
-- No watchlist UPDATE grant; insertion/deletion avoids reassignment of ownership.
DROP POLICY IF EXISTS cinewave_profile_select ON public.profiles;
DROP POLICY IF EXISTS cinewave_profile_select_guard ON public.profiles;
CREATE POLICY cinewave_profile_select ON public.profiles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY cinewave_profile_select_guard ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS cinewave_profile_insert ON public.profiles;
DROP POLICY IF EXISTS cinewave_profile_insert_guard ON public.profiles;
CREATE POLICY cinewave_profile_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
CREATE POLICY cinewave_profile_insert_guard ON public.profiles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS cinewave_profile_update ON public.profiles;
DROP POLICY IF EXISTS cinewave_profile_update_guard ON public.profiles;
CREATE POLICY cinewave_profile_update ON public.profiles FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY cinewave_profile_update_guard ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS cinewave_watchlist_select ON public.user_watchlist;
DROP POLICY IF EXISTS cinewave_watchlist_select_guard ON public.user_watchlist;
CREATE POLICY cinewave_watchlist_select ON public.user_watchlist FOR SELECT TO authenticated USING(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.movies m WHERE m.id=movie_id AND m.is_published));
CREATE POLICY cinewave_watchlist_select_guard ON public.user_watchlist AS RESTRICTIVE FOR SELECT TO authenticated USING(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.movies m WHERE m.id=movie_id AND m.is_published));
DROP POLICY IF EXISTS cinewave_watchlist_insert ON public.user_watchlist;
DROP POLICY IF EXISTS cinewave_watchlist_insert_guard ON public.user_watchlist;
CREATE POLICY cinewave_watchlist_insert ON public.user_watchlist FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.movies m WHERE m.id=movie_id AND m.is_published));
CREATE POLICY cinewave_watchlist_insert_guard ON public.user_watchlist AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.movies m WHERE m.id=movie_id AND m.is_published));
DROP POLICY IF EXISTS cinewave_watchlist_delete ON public.user_watchlist;
DROP POLICY IF EXISTS cinewave_watchlist_delete_guard ON public.user_watchlist;
CREATE POLICY cinewave_watchlist_delete ON public.user_watchlist FOR DELETE TO authenticated USING(user_id=auth.uid());
CREATE POLICY cinewave_watchlist_delete_guard ON public.user_watchlist AS RESTRICTIVE FOR DELETE TO authenticated USING(user_id=auth.uid());
CREATE OR REPLACE FUNCTION cinewave_private.profile_timestamp() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN NEW.updated_at:=now();RETURN NEW;END $$;
REVOKE ALL ON FUNCTION cinewave_private.profile_timestamp() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS cinewave_profile_timestamp ON public.profiles;
CREATE TRIGGER cinewave_profile_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION cinewave_private.profile_timestamp();
COMMIT;
