# Review-only genre repair

## Diagnosis

A read-only Supabase REST query on 2026-10-24 returned 24 `public.movies` rows. Every `genre_names` value was `[]`; none supplied a TMDB ID. This is missing database metadata, not a failure to map populated arrays. PostgREST returns PostgreSQL text arrays as JSON arrays, which the frontend already accepted. The API schema request returned 401, so the script independently checks that the actual column type is `text[]` and aborts if not.

The frontend now normalizes text-array members, keeps all supplied genres, and builds filters from the catalog rather than seven hard-coded categories. Filter keys are stable across languages; genre labels, search and headings support English, Russian and Armenian. Unknown genres are retained verbatim rather than assigned a guessed category. Missing genres stay visibly unknown until Supabase is updated.

## Evidence and proposed updates

`data/genre-backfill.json` contains the observed IDs, exact expected titles/dates, proposed genre arrays, original source records and unresolved films. Proposed genres are copied from the official MovieTweetings research repository, whose README documents cross-referencing IMDb for genre metadata. The source snapshot is pinned to commit `44c525d0c766944910686c60697203cda39305d6`; its SHA-256 is recorded in the evidence file. This is an archived, IMDb-derived dataset, not a fresh direct IMDb query. Genres are classifications from that source, not generated guesses.

Source: https://github.com/sidooms/MovieTweetings/blob/44c525d0c766944910686c60697203cda39305d6/latest/movies.dat

Provenance: https://github.com/sidooms/MovieTweetings/blob/44c525d0c766944910686c60697203cda39305d6/README.md

Citation: Dooms, De Pessemier and Martens (2013), *MovieTweetings: a Movie Rating Dataset Collected From Twitter*, CrowdRec at RecSys 2013.

Only title/year matches are included. Three original-language aliases were matched explicitly: A Gang Story → Les Lyonnais (2011); Swept Away → Travolti da un insolito destino nell'azzurro mare d'agosto (1974); Three Worlds → Trois mondes (2012). Review those identities along with the IMDb links before approval. The SQL uses the exact dates currently in Supabase, including its January 1 placeholder dates; it does not change dates or infer a different edition/remake.

| ID | Film | Proposed genres | IMDb record |
| --- | --- | --- | --- |
| 1 | The Matrix (1999) | Action, Sci-Fi | [tt0133093](https://www.imdb.com/title/tt0133093/) |
| 2 | We Live in Public (2009) | Documentary | [tt0498329](https://www.imdb.com/title/tt0498329/) |
| 3 | A Gang Story (2011) | Drama, Thriller | [tt1741542](https://www.imdb.com/title/tt1741542/) |
| 4 | The Intouchables (2011) | Biography, Comedy, Drama | [tt1675434](https://www.imdb.com/title/tt1675434/) |
| 5 | Swept Away (1974) | Adventure, Comedy, Drama | [tt0073817](https://www.imdb.com/title/tt0073817/) |
| 6 | Kick-Ass (2010) | Action, Comedy | [tt1250777](https://www.imdb.com/title/tt1250777/) |
| 7 | 12 Angry Men (1957) | Crime, Drama | [tt0050083](https://www.imdb.com/title/tt0050083/) |
| 8 | Gone with the Wind (1939) | Drama, History, Romance, War | [tt0031381](https://www.imdb.com/title/tt0031381/) |
| 9 | The Man Between (1953) | Drama, Thriller | [tt0046031](https://www.imdb.com/title/tt0046031/) |
| 10 | Rough Night in Jericho (1967) | Romance, Western | [tt0062218](https://www.imdb.com/title/tt0062218/) |
| 12 | A Fantastic Fear of Everything (2012) | Comedy, Horror | [tt2006040](https://www.imdb.com/title/tt2006040/) |
| 13 | The Manchurian Candidate (2004) | Drama, Mystery, Sci-Fi, Thriller | [tt0368008](https://www.imdb.com/title/tt0368008/) |
| 17 | Cleopatra (1963) | Biography, Drama, History, Romance | [tt0056937](https://www.imdb.com/title/tt0056937/) |
| 18 | Wanted (2008) | Action, Crime, Fantasy, Thriller | [tt0493464](https://www.imdb.com/title/tt0493464/) |
| 21 | Matchstick Men (2003) | Comedy, Crime, Drama, Thriller | [tt0325805](https://www.imdb.com/title/tt0325805/) |
| 22 | Masters of the Universe (1987) | Action, Adventure, Fantasy, Sci-Fi, Thriller | [tt0093507](https://www.imdb.com/title/tt0093507/) |
| 23 | Three Worlds (2012) | Drama | [tt2369497](https://www.imdb.com/title/tt2369497/) |
| 24 | Places in the Heart (1984) | Drama | [tt0087921](https://www.imdb.com/title/tt0087921/) |

Six films have no verified match in the retrieved source. They are deliberately excluded from the SQL:

- Alien Raiders (2008), ID 11
- Adhisaya Manithan (1990), ID 14
- Nalai Manithan (1989), ID 15
- Vaa Arugil Vaa (1991), ID 16
- Delirious (2006), ID 19
- Mirageman (2007), ID 20

These need a reliable record tied to the correct film/year before a later backfill. Wikipedia, Wikidata and the official IMDb dataset host returned proxy CONNECT 403 in this environment. No restriction was bypassed. Do not fill these from title similarity or treat another movie with the same title as a match.

## Safe execution procedure — approval required

No database modifications were executed against Supabase. Local tests use only an isolated in-memory PostgreSQL engine.

1. Review the source records, especially the three aliases, and verify `public.movies.genre_names` is `text[]` in Supabase. A read-only check is:

   ```sql
   SELECT data_type, udt_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'movies'
     AND column_name = 'genre_names';
   SELECT id, title_en, release_date, genre_names FROM public.movies
   ORDER BY id;
   ```

2. Obtain explicit owner approval **before running** `backfill_missing_genres.sql` against Supabase. The script includes an UPDATE, even though its default transaction ends in ROLLBACK.
3. After approval, run the entire script as one transaction in the Supabase SQL editor. Inspect its preview statuses and returned rows. Its default ROLLBACK leaves no persistent genre changes. It sets transaction-local lock and statement timeouts.
4. If the reviewed results are correct and persistence has been approved, change only the final ROLLBACK to COMMIT and rerun the entire script. Never execute fragments without the transaction. With an unchanged catalog, 18 rows are eligible; rows that have since changed or acquired genres are skipped.
5. Re-query the affected rows and refresh the website. The frontend automatically offers every newly present genre in all three languages. The six unresolved films should still show the localized unknown label.

The UPDATE touches only `genre_names`. It requires the observed ID, exact title, exact release date, and no nonblank existing genre. Null, empty and blank-only arrays are eligible; any nonblank entry is preserved. Rerunning after a committed update makes no further changes. Posters, titles, descriptions, release dates and the AI connection are untouched. Fix the upstream metadata importer as well so new records supply authoritative genre arrays; that importer is not present in this repository.

Regenerate the SQL after an evidence review with `python3 scripts/build_genre_sql.py`. Generation never connects to a database. No frontend release, pull request merge or deployment applies this SQL automatically.
