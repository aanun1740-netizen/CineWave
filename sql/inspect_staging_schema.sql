-- READ ONLY. Owner runs only on confirmed CineWave-Test after secure access approval.
-- Connection/project identity must be confirmed outside SQL in the dashboard.
BEGIN READ ONLY;
SELECT current_database(),current_user,version();
SELECT count(*) AS movie_count FROM public.movies;
SELECT table_schema,table_name,column_name,udt_name,is_nullable,column_default,is_identity
FROM information_schema.columns
WHERE (table_schema='public' AND table_name IN ('movies','profiles','user_watchlist'))
 OR (table_schema='cinewave_private' AND table_name='admin_users')
ORDER BY table_schema,table_name,ordinal_position;
SELECT conrelid::regclass AS table_name,conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid IN (to_regclass('public.movies'),to_regclass('public.profiles'),to_regclass('public.user_watchlist'),to_regclass('cinewave_private.admin_users'));
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE (schemaname='public' AND tablename IN ('movies','profiles','user_watchlist')) OR (schemaname='storage' AND tablename IN ('buckets','objects'));
SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='public' AND c.relname IN ('movies','profiles','user_watchlist')) OR (n.nspname='storage' AND c.relname IN ('buckets','objects'));
SELECT event_object_schema,event_object_table,trigger_name,action_timing,event_manipulation,action_statement FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table IN ('movies','profiles','user_watchlist');
SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='cinewave-assets';
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN ('movies','profiles','user_watchlist');
SELECT p.oid::regprocedure AS function,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef;
COMMIT;
