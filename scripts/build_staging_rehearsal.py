"""Offline deterministic builder. Never opens a database connection."""
from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]
expected={'001_admin_panel.sql':'39064a962b98faaf41a671a9f8e93fe9b5fc3702e43bb7c877217c91c2d29669','002_accounts_and_catalog.sql':'ac0aa0c9a08495d9b23c9603a9d5049d07341b2b8abd234a4d3fca0207cf8ee1'}
header="""-- REVIEW ONLY. No remote execution authorized.
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
"""
parts=[header]
for name,digest in expected.items():
 data=(root/'sql/migrations'/name).read_bytes()
 if hashlib.sha256(data).hexdigest()!=digest:raise SystemExit(f'{name} changed; review and pin its new checksum before rebuilding')
 lines=data.decode().splitlines(keepends=True)
 starts=[i for i,line in enumerate(lines) if line.strip()=='BEGIN;']
 ends=[i for i,line in enumerate(lines) if line.strip()=='COMMIT;']
 if len(starts)!=1 or len(ends)!=1 or any(line.strip() for line in lines[ends[0]+1:]):raise SystemExit('Unexpected transaction structure')
 parts.append(f'\n-- BEGIN preserved migration {name}; SHA256 {digest}\n')
 parts.extend(line for i,line in enumerate(lines) if i not in [starts[0],ends[0]])
 parts.append(f'-- END preserved migration {name}\n')
parts.append("""
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
""")
(root/'sql/rehearsals/cinewave_test_rollback.sql').write_text(''.join(parts))
