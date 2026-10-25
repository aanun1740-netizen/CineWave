-- Read-only owner preflight. No data or permissions are changed.
SELECT column_name,udt_name,is_nullable,column_default,is_identity
FROM information_schema.columns WHERE table_schema='public' AND table_name='movies' ORDER BY ordinal_position;
SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.movies'::regclass;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE (schemaname='public' AND tablename='movies') OR (schemaname='storage' AND tablename IN ('objects','buckets'));
SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='public' AND c.relname='movies') OR (n.nspname='storage' AND c.relname IN ('objects','buckets'));
SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='cinewave-assets';
-- Review unrelated privileged RPCs that could bypass RLS. Do not blindly revoke
-- existing functions; confirm the caller grants and what their bodies do.
SELECT p.oid::regprocedure AS function, p.prosecdef AS security_definer, p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef;
SELECT id,is_published FROM public.movies ORDER BY id;
-- Read sequence state without calling nextval or changing anything.
SELECT pg_get_serial_sequence('public.movies','id') AS id_sequence, max(id) AS largest_existing_id FROM public.movies;
SELECT schemaname,sequencename,last_value FROM pg_sequences WHERE schemaname='public';
SELECT grantee,privilege_type,is_grantable FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='movies';
