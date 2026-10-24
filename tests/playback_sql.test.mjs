import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const sql=await readFile(new URL('../sql/seed_playback_movies.sql',import.meta.url),'utf8');
const evidence=JSON.parse(await readFile(new URL('../data/playback-films.json',import.meta.url),'utf8'));
test('unverified films are blocked; hypothetical reviewed seed is unpublished, insert-only, repeatable and rollback-first',async()=>{
 const db=new PGlite();
 try{
  await db.exec('CREATE TABLE public.movies(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,title_en text,overview_en text,release_date date,genre_names text[],watch_url text,is_published boolean,poster_path text)');
  for(let i=1;i<=24;i++)await db.query('INSERT INTO public.movies(title_en,overview_en,release_date,genre_names,watch_url,is_published,poster_path) VALUES($1,$2,$3,$4,$5,$6,$7)',[`Existing fixture ${i}`,'Preserve','2001-01-01',['Action'],null,true,'original.jpg']);
  const snapshot=async()=>(await db.query('SELECT * FROM public.movies ORDER BY id')).rows;
  const before=await snapshot();
  assert.equal(evidence.films.length,3);
  assert.ok(evidence.films.every(film=>!film.verified&&!film.commercial_reuse_verified&&film.watch_url===null));
  await assert.rejects(db.exec(sql),/Film verification incomplete/);
  await db.exec('ROLLBACK');assert.deepEqual(await snapshot(),before);
  // Supply synthetic values ONLY inside this isolated local database. This is
  // not evidence that any real film/license/URL has been verified.
  const hypothetical=sql.replace('DO $$',()=>`UPDATE cinewave_playback_candidates SET identity_and_video_verified=true,commercial_reuse_verified=true,release_date='2000-01-01',watch_url='https://fixture.example.org/video.mp4',attribution='Synthetic test credit';\nDO $$`);
  await db.exec(hypothetical);assert.deepEqual(await snapshot(),before,'default ROLLBACK must preserve movie records');
  const localCommit=hypothetical.replace(/ROLLBACK;\s*$/,'COMMIT;');
  await db.exec(localCommit);
  const after=await snapshot();assert.equal(after.length,27);
  assert.deepEqual(after.slice(0,24),before,'existing 24 movies must remain identical');
  assert.ok(after.slice(24).every(row=>row.is_published===false&&row.overview_en.includes('License: https://')));
  await db.exec(localCommit);assert.deepEqual(await snapshot(),after,'reruns must not duplicate title/year records');
 }finally{await db.close();}
});
