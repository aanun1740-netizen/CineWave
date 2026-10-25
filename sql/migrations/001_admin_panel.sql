-- REVIEW BEFORE EXECUTION. Apply only with explicit owner approval.
-- No user/account creation, role assignments, movie deletes or publication updates.
BEGIN;
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
COMMIT;
