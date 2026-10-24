// Isolated PostgreSQL tests. No remote connection is accepted by this test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const evidence = JSON.parse(await readFile(new URL('../data/genre-backfill.json', import.meta.url), 'utf8'));
const sql = await readFile(new URL('../sql/backfill_missing_genres.sql', import.meta.url), 'utf8');

test('backfill is rollback-first, identity-guarded, missing-only and repeatable in local PostgreSQL', async () => {
 const db = new PGlite();
 try {
  await db.exec('CREATE TABLE public.movies (id bigint PRIMARY KEY, title_en text, release_date date, genre_names text[], poster_path text, overview_en text)');
  for (const row of [...evidence.updates,...evidence.unresolved]) {
   await db.query('INSERT INTO public.movies VALUES ($1,$2,$3,$4,$5,$6)', [row.id,row.expected_title ?? row.title_en,row.expected_release_date ?? row.release_date,[],`poster-${row.id}`,'Preserved description']);
  }
  await db.exec(`UPDATE public.movies SET genre_names=ARRAY['Documentary'] WHERE id=2;
   UPDATE public.movies SET genre_names=NULL WHERE id=4;
   UPDATE public.movies SET genre_names=ARRAY[' ',NULL] WHERE id=6;
   UPDATE public.movies SET title_en='Different film' WHERE id=7;
   UPDATE public.movies SET release_date='2000-01-01' WHERE id=8;
   UPDATE public.movies SET genre_names=ARRAY['','Drama'] WHERE id=9;`);
  const snapshot=async()=> (await db.query('SELECT * FROM public.movies ORDER BY id')).rows;
  const before=await snapshot();
  await db.exec(sql);
  assert.deepEqual(await snapshot(),before,'default transaction must roll back everything');
  assert.ok(sql.trimEnd().endsWith('ROLLBACK;'));
  // Simulate owner-approved COMMIT only in this private, in-memory database.
  const localCommit=sql.replace(/ROLLBACK;\s*$/, 'COMMIT;');
  await db.exec(localCommit);
  const after=await snapshot();
  const skipped=[2,7,8,9,...evidence.unresolved.map(row=>row.id)];
  for (const row of after) {
   const original=before.find(item=>item.id===row.id);
   if(skipped.includes(Number(row.id))) assert.deepEqual(row,original);
   else {
    assert.deepEqual(row.genre_names,evidence.updates.find(item=>item.id===Number(row.id)).genre_names);
    assert.deepEqual({...row,genre_names:original.genre_names},original,'only genre_names may change');
   }
  }
  await db.exec(localCommit);
  assert.deepEqual(await snapshot(),after,'second run must preserve populated genres');
  assert.equal(evidence.updates.length,18);
  assert.equal(evidence.unresolved.length,6);
  for(const row of evidence.updates) {
   const [id,title,genres]=row.source_line.split('::');
   assert.equal('tt'+id,row.imdb_id);
   assert.equal(title,`${row.source_title} (${row.source_year})`);
   assert.deepEqual(genres.split('|'),row.genre_names);
  }
  await db.exec('ALTER TABLE public.movies ALTER COLUMN genre_names TYPE jsonb USING to_jsonb(genre_names)');
  await assert.rejects(db.exec(sql),/Expected public.movies.genre_names to be text\[\]/);
  await db.exec('ROLLBACK');
 } finally { await db.close(); }
});
