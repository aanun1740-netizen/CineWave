-- REVIEW ONLY. No remote execution authorized.
-- Intended project: CineWave-Test / zayssiouqexwdicudalc.
-- Confirm the project in the dashboard/secure connection independently.
-- This operator confirmation is NOT automatic project identity detection.
-- After explicit rehearsal approval ONLY, replace UNCONFIRMED below with the ref.
-- Run the WHOLE file on ONE dedicated owner connection, never selected fragments.
-- Stop on error; ROLLBACK/close the connection if execution is interrupted.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET LOCAL idle_in_transaction_session_timeout='60s';
SET LOCAL cinewave.rehearsal_confirmed_project='UNCONFIRMED';
DO $$ BEGIN
 IF current_setting('cinewave.rehearsal_confirmed_project',true) IS DISTINCT FROM 'zayssiouqexwdicudalc' THEN
  RAISE EXCEPTION 'Confirm staging identity and obtain explicit rehearsal approval first';
 END IF;
END $$;
LOCK TABLE public.movies IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.movies) THEN RAISE EXCEPTION 'Expected empty staging movies'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' AND column_name='id' AND udt_name='int8' AND is_identity='YES' AND identity_generation='BY DEFAULT') THEN RAISE EXCEPTION 'Expected bigint BY DEFAULT identity'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.movies'::regclass) THEN RAISE EXCEPTION 'Expected movie RLS'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.movies'::regclass AND NOT tgisinternal) THEN RAISE EXCEPTION 'Unexpected movie trigger'; END IF;
 IF to_regnamespace('cinewave_private') IS NOT NULL OR to_regprocedure('public.cinewave_is_admin()') IS NOT NULL OR to_regclass('public.profiles') IS NOT NULL OR to_regclass('public.user_watchlist') IS NOT NULL THEN RAISE EXCEPTION 'Expected pristine reserved objects'; END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets) OR EXISTS(SELECT 1 FROM storage.objects) OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename IN ('buckets','objects')) THEN RAISE EXCEPTION 'Storage differs from reviewed empty baseline'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' AND column_name IN ('rights_holder','license_type','original_source_url','license_evidence_url','license_terms_url','attribution','commercial_streaming_permission','rights_verification_status','playback_checked','video_renditions','playback_verification','media_type')) THEN RAISE EXCEPTION 'Unexpected existing migration columns'; END IF;
END $$;
-- Baseline evidence: capture results before mutations. No nextval/fixture inserts.
SELECT count(*) AS baseline_movies FROM public.movies;
SELECT pg_get_serial_sequence('public.movies','id') AS identity_sequence;
SELECT schemaname,sequencename,last_value FROM pg_sequences WHERE schemaname='public';
SELECT policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='movies' ORDER BY policyname;

-- BEGIN preserved migration 001_admin_panel.sql; SHA256 39064a962b98faaf41a671a9f8e93fe9b5fc3702e43bb7c877217c91c2d29669
-- REVIEW BEFORE EXECUTION. Apply only with explicit owner approval.
-- No user/account creation, role assignments, movie deletes or publication updates.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $$
BEGIN
 IF to_regclass('public.movies') IS NULL THEN RAISE EXCEPTION 'Expected existing public.movies'; END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' AND column_name='genre_names' AND udt_name='_text') THEN
  RAISE EXCEPTION 'Expected genre_names text[]; inspect the owner-visible schema before migrating';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' AND column_name='id' AND (is_identity='YES' OR column_default IS NOT NULL)) THEN
  RAISE EXCEPTION 'Movie id has no generator. Review schema/sequence state separately; do not assign client-side IDs';
 END IF;
END $$;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.movies'::regclass AND contype='p' AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.movies'::regclass AND attname='id')]::smallint[]) THEN RAISE EXCEPTION 'Expected id as the sole movie primary key'; END IF;
 IF NOT coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('storage.buckets')),false) THEN RAISE EXCEPTION 'Expected Supabase bucket RLS'; END IF;
 IF NOT coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('storage.objects')),false) THEN RAISE EXCEPTION 'Expected Supabase Storage with RLS enabled; inspect storage.objects before proceeding'; END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='cinewave-assets' AND (public IS NOT TRUE OR name<>'cinewave-assets')) THEN RAISE EXCEPTION 'Existing storage bucket collision; do not expose or repurpose a private bucket'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS cinewave_private;
REVOKE ALL ON SCHEMA cinewave_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS cinewave_private.admin_users (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 assigned_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON cinewave_private.admin_users FROM PUBLIC, anon, authenticated;
ALTER TABLE cinewave_private.admin_users ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.cinewave_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM cinewave_private.admin_users a WHERE a.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.cinewave_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cinewave_is_admin() TO anon, authenticated;

ALTER TABLE public.movies
 ADD COLUMN IF NOT EXISTS rights_holder text,
 ADD COLUMN IF NOT EXISTS license_type text,
 ADD COLUMN IF NOT EXISTS original_source_url text,
 ADD COLUMN IF NOT EXISTS license_evidence_url text,
 ADD COLUMN IF NOT EXISTS license_terms_url text,
 ADD COLUMN IF NOT EXISTS attribution text,
 ADD COLUMN IF NOT EXISTS commercial_streaming_permission boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS rights_verification_status text NOT NULL DEFAULT 'unverified',
 ADD COLUMN IF NOT EXISTS playback_checked boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS video_renditions jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN IF NOT EXISTS playback_verification jsonb;
-- Assert additive columns also have expected types on a repeated/custom deployment.
DO $$
DECLARE c record;
BEGIN
 FOR c IN SELECT * FROM (VALUES ('rights_holder','text'),('license_type','text'),('original_source_url','text'),('license_evidence_url','text'),('license_terms_url','text'),('attribution','text'),('rights_verification_status','text'),('commercial_streaming_permission','bool'),('playback_checked','bool'),('video_renditions','jsonb'),('playback_verification','jsonb')) AS expected(name,typ)
 LOOP
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' AND column_name=c.name AND udt_name=c.typ) THEN RAISE EXCEPTION 'Unexpected existing type for %',c.name; END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION cinewave_private.https_url(value text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(value ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$',false)
$$;
CREATE OR REPLACE FUNCTION cinewave_private.media_url(value text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT cinewave_private.https_url(value) AND value ~* '\.(mp4|m3u8)(\?[^[:space:]]*)?$'
$$;
CREATE OR REPLACE FUNCTION cinewave_private.guard_movie() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb; seen integer[] := '{}'; seen_urls text[] := '{}'; height integer; ready boolean; changed boolean := false;
BEGIN
 IF nullif(btrim(NEW.title_en),'') IS NULL THEN RAISE EXCEPTION 'English title is required'; END IF;
 IF NEW.rights_verification_status IS NULL OR NEW.rights_verification_status NOT IN ('unverified','pending','verified','rejected') THEN RAISE EXCEPTION 'Invalid verification status'; END IF;
 IF NEW.video_renditions IS NULL OR jsonb_typeof(NEW.video_renditions) <> 'array' OR jsonb_array_length(NEW.video_renditions)>4 THEN RAISE EXCEPTION 'Renditions must be an array of up to four actual sources'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.video_renditions) LOOP
  IF jsonb_typeof(item)<>'object' OR coalesce(item->>'height','') NOT IN ('360','480','720','1080') OR NOT cinewave_private.media_url(item->>'url') THEN RAISE EXCEPTION 'Invalid rendition height or HTTPS MP4/HLS URL'; END IF;
  height:=(item->>'height')::integer;
  IF height=ANY(seen) THEN RAISE EXCEPTION 'Duplicate rendition height'; END IF;
  IF item->>'url'=NEW.watch_url OR (item->>'url')=ANY(seen_urls) THEN RAISE EXCEPTION 'Each rendition must have a distinct actual source URL'; END IF;
  seen:=array_append(seen,height);seen_urls:=array_append(seen_urls,item->>'url');
 END LOOP;
 IF TG_OP='INSERT' THEN
  -- New movies enter as unverified drafts, even when a client sends flags.
  NEW.rights_verification_status:='pending'; NEW.playback_checked:=false;NEW.created_at:=coalesce(NEW.created_at,now());
 ELSE
  changed := ROW(NEW.title_en,NEW.release_date,NEW.watch_url,NEW.video_renditions,NEW.rights_holder,NEW.license_type,NEW.original_source_url,NEW.license_evidence_url,NEW.license_terms_url,NEW.attribution,NEW.commercial_streaming_permission)
    IS DISTINCT FROM ROW(OLD.title_en,OLD.release_date,OLD.watch_url,OLD.video_renditions,OLD.rights_holder,OLD.license_type,OLD.original_source_url,OLD.license_evidence_url,OLD.license_terms_url,OLD.attribution,OLD.commercial_streaming_permission);
  IF changed THEN NEW.rights_verification_status:='pending'; NEW.playback_checked:=false; END IF;
 END IF;
 ready := NEW.rights_verification_status='verified' AND NEW.playback_checked IS TRUE AND NEW.commercial_streaming_permission IS TRUE
   AND nullif(btrim(NEW.rights_holder),'') IS NOT NULL AND nullif(btrim(NEW.license_type),'') IS NOT NULL
   AND nullif(btrim(NEW.attribution),'') IS NOT NULL AND cinewave_private.media_url(NEW.watch_url)
   AND cinewave_private.https_url(NEW.original_source_url) AND cinewave_private.https_url(NEW.license_evidence_url) AND cinewave_private.https_url(NEW.license_terms_url);
 IF NEW.rights_verification_status='verified' AND NOT ready THEN RAISE EXCEPTION 'Verification requires complete rights, commercial permission, attribution and tested media'; END IF;
 NEW.playback_verification:=CASE WHEN ready THEN jsonb_build_object('watch_url',NEW.watch_url,'license_verified',true,'playback_verified',true,'commercial_reuse_verified',true,'license_source',NEW.license_evidence_url,'license_terms_source',NEW.license_terms_url,'renditions',NEW.video_renditions) ELSE NULL END;
 IF NEW.is_published IS TRUE THEN
  IF TG_OP='INSERT' THEN RAISE EXCEPTION 'Save a draft and verify full-film streaming rights before publishing';
  ELSIF (OLD.is_published IS NOT TRUE OR changed OR (OLD.playback_verification IS NOT NULL AND NOT ready)) AND NOT ready THEN
   RAISE EXCEPTION 'Verified commercial streaming rights and tested media are required; unpublish before changing rights/media';
  END IF;
 END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION cinewave_private.https_url(text), cinewave_private.media_url(text), cinewave_private.guard_movie() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS cinewave_guard_movie ON public.movies;
CREATE TRIGGER cinewave_guard_movie BEFORE INSERT OR UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION cinewave_private.guard_movie();
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.movies FROM PUBLIC, anon, authenticated;
DO $$
DECLARE cols text; seq text;
BEGIN
 SELECT string_agg(quote_ident(column_name),',') INTO cols FROM information_schema.columns WHERE table_schema='public' AND table_name='movies';
 EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON public.movies FROM PUBLIC, anon, authenticated',cols);
 seq:=pg_get_serial_sequence('public.movies','id');
 IF seq IS NOT NULL THEN EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated',seq); EXECUTE format('GRANT USAGE ON SEQUENCE %s TO authenticated',seq); END IF;
END $$;
GRANT SELECT ON public.movies TO anon, authenticated;
GRANT INSERT,UPDATE,DELETE ON public.movies TO authenticated;
-- Permissive policies provide access; restrictive policies also constrain any
-- pre-existing permissive policies. Never silently drop unrelated policies.
DROP POLICY IF EXISTS cinewave_read ON public.movies;
DROP POLICY IF EXISTS cinewave_read_guard ON public.movies;
CREATE POLICY cinewave_read ON public.movies FOR SELECT TO anon,authenticated USING(is_published IS TRUE OR public.cinewave_is_admin());
CREATE POLICY cinewave_read_guard ON public.movies AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(is_published IS TRUE OR public.cinewave_is_admin());
DROP POLICY IF EXISTS cinewave_insert ON public.movies;
DROP POLICY IF EXISTS cinewave_insert_guard ON public.movies;
CREATE POLICY cinewave_insert ON public.movies FOR INSERT TO authenticated WITH CHECK(public.cinewave_is_admin());
CREATE POLICY cinewave_insert_guard ON public.movies AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(public.cinewave_is_admin());
DROP POLICY IF EXISTS cinewave_update ON public.movies;
DROP POLICY IF EXISTS cinewave_update_guard ON public.movies;
CREATE POLICY cinewave_update ON public.movies FOR UPDATE TO authenticated USING(public.cinewave_is_admin()) WITH CHECK(public.cinewave_is_admin());
CREATE POLICY cinewave_update_guard ON public.movies AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(public.cinewave_is_admin()) WITH CHECK(public.cinewave_is_admin());
DROP POLICY IF EXISTS cinewave_delete ON public.movies;
DROP POLICY IF EXISTS cinewave_delete_guard ON public.movies;
CREATE POLICY cinewave_delete ON public.movies FOR DELETE TO authenticated USING(public.cinewave_is_admin());
CREATE POLICY cinewave_delete_guard ON public.movies AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(public.cinewave_is_admin());

-- Images only: public viewing, admin-only writes. Existing buckets unchanged.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('cinewave-assets','cinewave-assets',true,8388608,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=8388608,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
DROP POLICY IF EXISTS cinewave_assets_read ON storage.objects;
CREATE POLICY cinewave_assets_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='cinewave-assets' AND public.cinewave_is_admin());
DROP POLICY IF EXISTS cinewave_assets_insert ON storage.objects;
DROP POLICY IF EXISTS cinewave_assets_insert_guard ON storage.objects;
CREATE POLICY cinewave_assets_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='cinewave-assets' AND public.cinewave_is_admin());
CREATE POLICY cinewave_assets_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(bucket_id<>'cinewave-assets' OR public.cinewave_is_admin());
DROP POLICY IF EXISTS cinewave_assets_update ON storage.objects;
DROP POLICY IF EXISTS cinewave_assets_update_guard ON storage.objects;
CREATE POLICY cinewave_assets_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='cinewave-assets' AND public.cinewave_is_admin()) WITH CHECK(bucket_id='cinewave-assets' AND public.cinewave_is_admin());
CREATE POLICY cinewave_assets_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(bucket_id<>'cinewave-assets' OR public.cinewave_is_admin()) WITH CHECK(bucket_id<>'cinewave-assets' OR public.cinewave_is_admin());
DROP POLICY IF EXISTS cinewave_assets_delete ON storage.objects;
DROP POLICY IF EXISTS cinewave_assets_delete_guard ON storage.objects;
CREATE POLICY cinewave_assets_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='cinewave-assets' AND public.cinewave_is_admin());
CREATE POLICY cinewave_assets_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(bucket_id<>'cinewave-assets' OR public.cinewave_is_admin());
-- Browser roles never administer this reserved bucket's settings; only the
-- reviewed owner migration configures its visibility/type/size limits.
DROP POLICY IF EXISTS cinewave_bucket_insert_guard ON storage.buckets;
CREATE POLICY cinewave_bucket_insert_guard ON storage.buckets AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(id<>'cinewave-assets');
DROP POLICY IF EXISTS cinewave_bucket_update_guard ON storage.buckets;
CREATE POLICY cinewave_bucket_update_guard ON storage.buckets AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(id<>'cinewave-assets') WITH CHECK(id<>'cinewave-assets');
DROP POLICY IF EXISTS cinewave_bucket_delete_guard ON storage.buckets;
CREATE POLICY cinewave_bucket_delete_guard ON storage.buckets AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(id<>'cinewave-assets');
-- END preserved migration 001_admin_panel.sql

-- BEGIN preserved migration 002_accounts_and_catalog.sql; SHA256 ac0aa0c9a08495d9b23c9603a9d5049d07341b2b8abd234a4d3fca0207cf8ee1
-- Review and staging-test after 001. Never run automatically against production.
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
-- END preserved migration 002_accounts_and_catalog.sql

-- Assertions inside the rehearsal; errors abort the transaction.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.movies) OR EXISTS(SELECT 1 FROM public.profiles) OR EXISTS(SELECT 1 FROM public.user_watchlist) OR EXISTS(SELECT 1 FROM cinewave_private.admin_users) THEN RAISE EXCEPTION 'Rehearsal must not create records or admins'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.movies'::regclass,'public.profiles'::regclass,'public.user_watchlist'::regclass) AND (NOT relrowsecurity OR NOT relforcerowsecurity)) THEN RAISE EXCEPTION 'Missing forced RLS'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='cinewave-assets' AND name=id AND public IS TRUE AND file_size_limit=8388608 AND allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']) THEN RAISE EXCEPTION 'Unexpected image bucket'; END IF;
 IF (SELECT atttypid FROM pg_attribute WHERE attrelid='public.user_watchlist'::regclass AND attname='movie_id') IS DISTINCT FROM 'bigint'::regtype::oid THEN RAISE EXCEPTION 'Wrong watchlist ID type'; END IF;
 IF has_table_privilege('anon','public.profiles','SELECT') OR has_table_privilege('anon','public.user_watchlist','SELECT') OR has_table_privilege('authenticated','cinewave_private.admin_users','SELECT') THEN RAISE EXCEPTION 'Unexpected browser grants'; END IF;
 IF public.cinewave_is_admin() THEN RAISE EXCEPTION 'No admin expected'; END IF;
END $$;
SELECT count(*) AS rehearsal_movies FROM public.movies;
SELECT schemaname,tablename,policyname,permissive,cmd,qual,with_check FROM pg_policies WHERE (schemaname='public' AND tablename IN ('movies','profiles','user_watchlist')) OR (schemaname='storage' AND tablename IN ('buckets','objects')) ORDER BY schemaname,tablename,policyname;
SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='cinewave-assets';
-- Always discard schema, policies, grants, functions, triggers and bucket changes.
-- Do not change this to COMMIT. Persistent installation is a separate approval.
ROLLBACK;
