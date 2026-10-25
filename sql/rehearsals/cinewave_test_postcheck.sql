-- READ ONLY. Run separately on the SAME confirmed staging project after rehearsal.
BEGIN READ ONLY;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.movies) THEN RAISE EXCEPTION 'Movie baseline changed'; END IF;
 IF to_regnamespace('cinewave_private') IS NOT NULL OR to_regprocedure('public.cinewave_is_admin()') IS NOT NULL OR to_regclass('public.profiles') IS NOT NULL OR to_regclass('public.user_watchlist') IS NOT NULL THEN RAISE EXCEPTION 'Migration objects persisted unexpectedly'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' AND column_name IN ('rights_holder','license_type','original_source_url','license_evidence_url','license_terms_url','attribution','commercial_streaming_permission','rights_verification_status','playback_checked','video_renditions','playback_verification','media_type')) THEN RAISE EXCEPTION 'Migration columns persisted'; END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets) OR EXISTS(SELECT 1 FROM storage.objects) OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename IN ('buckets','objects')) THEN RAISE EXCEPTION 'Storage baseline changed'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.movies'::regclass AND NOT tgisinternal) THEN RAISE EXCEPTION 'Movie triggers persisted'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.movies'::regclass) THEN RAISE EXCEPTION 'Movie RLS disabled'; END IF;
END $$;
-- Compare full output with the preflight snapshot, including original FORCE RLS,
-- identity sequence state, policies, grants and columns.
SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='public.movies'::regclass;
SELECT column_name,udt_name,is_nullable,column_default,is_identity FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' ORDER BY ordinal_position;
SELECT policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='movies' ORDER BY policyname;
SELECT grantee,privilege_type,is_grantable FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='movies' ORDER BY grantee,privilege_type;
SELECT schemaname,sequencename,last_value FROM pg_sequences WHERE schemaname='public';
ROLLBACK;
