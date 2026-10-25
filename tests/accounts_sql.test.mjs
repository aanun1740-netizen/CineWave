import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const one=await readFile(new URL('../sql/migrations/001_admin_panel.sql',import.meta.url),'utf8'),two=await readFile(new URL('../sql/migrations/002_accounts_and_catalog.sql',import.meta.url),'utf8');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
test('account profiles/watchlists are self-only; TV metadata is additive; no role escalation',async()=>{
 const db=new PGlite();const role=async(name,id='')=>db.exec(`RESET ROLE;SELECT set_config('request.jwt.claim.sub','${id}',false);SET ROLE ${name}`);
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE TABLE auth.users(id uuid PRIMARY KEY);INSERT INTO auth.users VALUES('${A}'),('${B}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;
   CREATE TABLE public.movies(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,title_en text,title_ru text,title_hy text,overview_en text,overview_ru text,overview_hy text,release_date date,genre_names text[],poster_path text,backdrop_path text,trailer_url text,watch_url text,is_published boolean,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());INSERT INTO public.movies(title_en,genre_names,is_published) SELECT 'Legacy '||n,ARRAY['Drama'],true FROM generate_series(1,24)n;
   CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(id bigint PRIMARY KEY,bucket_id text,name text);ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`);
  await db.exec(one);const before=(await db.query('SELECT id,title_en,is_published,updated_at FROM public.movies ORDER BY id')).rows;
  await db.exec(two);await db.exec(two);assert.deepEqual((await db.query('SELECT id,title_en,is_published,updated_at FROM public.movies ORDER BY id')).rows,before);
  await db.exec("UPDATE public.movies SET media_type='tv' WHERE id=2");await assert.rejects(db.exec("UPDATE public.movies SET media_type='unknown' WHERE id=2"));
  await db.exec("INSERT INTO public.movies(title_en,is_published) VALUES('Private draft',false)");
  await role('anon');await assert.rejects(db.query('SELECT * FROM public.profiles'));await assert.rejects(db.query('SELECT * FROM public.user_watchlist'));
  await role('authenticated',A);await db.query('INSERT INTO public.profiles(user_id,display_name,preferred_language) VALUES($1,$2,$3)',[A,'Անուն','hy']);
  await assert.rejects(db.query('INSERT INTO public.profiles(user_id,display_name) VALUES($1,$2)',[B,'Other']));await assert.rejects(db.query('UPDATE public.profiles SET user_id=$1',[B]));
  await db.query('INSERT INTO public.user_watchlist(movie_id) VALUES(1)');await assert.rejects(db.query('INSERT INTO public.user_watchlist(movie_id) VALUES(25)'));
  await assert.rejects(db.query('INSERT INTO public.user_watchlist(user_id,movie_id) VALUES($1,2)',[B]));
  await db.query("UPDATE public.profiles SET display_name='Обновлено',preferred_language='ru'");assert.equal((await db.query('SELECT display_name FROM public.profiles')).rows[0].display_name,'Обновлено');
  await assert.rejects(db.exec(`INSERT INTO cinewave_private.admin_users VALUES('${A}',now())`));assert.equal((await db.query('SELECT public.cinewave_is_admin() AS ok')).rows[0].ok,false);
  await role('authenticated',B);assert.equal((await db.query('SELECT * FROM public.profiles')).rows.length,0);assert.equal((await db.query('SELECT * FROM public.user_watchlist')).rows.length,0);assert.equal((await db.query("UPDATE public.profiles SET display_name='attack' RETURNING user_id")).rows.length,0);
  await db.query('INSERT INTO public.profiles(display_name,preferred_language) VALUES($1,$2)',['User B','en']);await db.query('INSERT INTO public.user_watchlist(movie_id) VALUES(1)');
  await db.exec('RESET ROLE');await db.exec('UPDATE public.movies SET is_published=false WHERE id=1');
  await role('authenticated',A);assert.equal((await db.query('SELECT * FROM public.user_watchlist')).rows.length,0);assert.equal((await db.query('DELETE FROM public.user_watchlist WHERE movie_id=1 RETURNING movie_id')).rows.length,0);
  await db.exec('RESET ROLE');await db.exec('DELETE FROM public.movies WHERE id=1');assert.equal((await db.query('SELECT * FROM public.user_watchlist')).rows.length,0);assert.equal((await db.query('SELECT * FROM public.profiles')).rows.length,2);
 }finally{await db.close();}
});
