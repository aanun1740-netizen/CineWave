Run from the repository root:

```sh
node --test tests/catalog.test.cjs
python3 tests/browser_smoke.py
```

The browser test requires Python Playwright and Chromium at `/usr/bin/chromium`. It starts and stops its own HTTP server. External requests are intercepted; no remote database is modified and no AI inference is invoked.

Catalog metadata comes exclusively from the published Supabase rows. `title_en/ru/hy` and `overview_en/ru/hy` are selected independently, falling back to English then another supplied language. Catalog IDs are namespaced to prevent collisions with demo translations and the featured item. No translation or film genre is generated from a title.

Genres use `genre_names` and, when present, standard TMDB movie `genre_ids` (taxonomy: https://developer.themoviedb.org/reference/genre-movie-list). `Science Fiction` is normalized to the existing `Sci-Fi` filter. Missing genres remain unknown rather than becoming Drama. The observed 24 published rows all had empty `genre_names` and null `tmdb_id`; a source-backed, review-only backfill for 18 rows is documented in `sql/README.md`. Six rows still require verified metadata. The catalog/import pipeline also needs to populate genres for future rows.

Poster URLs come only from `poster_path`: absolute HTTP(S), protocol-relative URLs, and TMDB image filenames are supported. Nested Wikimedia Special:FilePath URLs from the current importer are unwrapped; this repair does not establish image licensing or availability. Missing, unsafe, malformed, or failed images use the original local SVG at `assets/poster-fallback.svg`. No new third-party artwork is selected. Catalog owners must verify rights for supplied artwork and correct missing/incorrect source records.

Genre-specific checks extend `catalog.test.cjs` and `browser_smoke.py`: text-array normalization, duplicate/blank/malformed values, canonical English/Russian/Armenian labels, dynamically available Crime and secondary Sci-Fi filters, translated search/headings, and selected button state.

The SQL safety test requires PGlite 0.5.11 (an embedded PostgreSQL engine). To keep tooling outside this static app:

```sh
npm --cache /tmp/cinewave-npm-cache install --prefix /tmp/cinewave-sql-test --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.11
PGLITE_MODULE=/tmp/cinewave-sql-test/node_modules/@electric-sql/pglite node --test tests/genre_sql.test.mjs
```

This test cannot connect to Supabase. It validates rollback-by-default, null/empty/blank-only handling, preservation of existing genres, title/date identity guards, untouched non-genre fields, exclusion of all six unresolved rows, repeatability, and rejection of an unexpected column type. No production database modification was tested or performed.


Playback checks:

```sh
node --test tests/player.test.cjs
python3 tests/player_browser.py
PGLITE_MODULE=/tmp/cinewave-sql-test/node_modules/@electric-sql/pglite node --test tests/playback_sql.test.mjs
```

The player browser test additionally requires ffmpeg. It generates original H.264/AAC video in a temporary directory, serves byte ranges locally and decodes MP4/HLS in Chromium. Remote film URLs and licensing are not mocked as verified. The SQL test confirms that the current unverified seed aborts, and tests a hypothetical reviewed seed only in an isolated PostgreSQL database. No Supabase modifications are made. See `docs/playback.md` for activation, blocked film verification, compatibility and attribution requirements.


Public redesign checks:

```sh
node --test tests/availability.test.cjs
python3 tests/storefront_browser.py
```

No unapproved movie is advertised as immediately watchable or requested from a media host. Local generated-media playback fixtures now carry explicit synthetic approval metadata; those fixtures do not grant rights to real films. The storefront test additionally covers carousels, keyboard focus, hero/catalog binding, persistent device-local My List, profile controls, localized AI failure messages and empty/error states without demo substitution. See `docs/storefront.md` for the Admin separation and optional approval contract.

Admin checks (all external Auth/CRUD/uploads are intercepted; SQL uses local PostgreSQL):

```sh
node --test tests/admin_model.test.cjs
python3 tests/admin_browser.py
PGLITE_MODULE=/tmp/cinewave-sql-test/node_modules/@electric-sql/pglite node --test tests/admin_sql.test.mjs
```

See `docs/admin.md` for the exact GitHub Pages route, mandatory owner schema preflight, RLS/role design, migration approval, manual bootstrap, quality integration and unverified production boundaries.

Account and route checks:

```sh
python3 tests/accounts_browser.py
PGLITE_MODULE=/tmp/cinewave-sql-test/node_modules/@electric-sql/pglite node --test tests/accounts_sql.test.mjs
```

The browser suite uses the real bundled SDK with intercepted Auth/REST responses; it creates no remote user. The SQL suite checks additive migration repeatability, owner-only profiles/favorites, forged IDs, anonymous denial, unpublished rows and cascade isolation in embedded PostgreSQL. These are not staging Supabase tests. See `docs/platform-launch.md` for the required real-service checks and currently missing staging access/approval.

Rollback-only staging rehearsal verification (embedded PostgreSQL only):

```sh
python3 scripts/build_staging_rehearsal.py
PGLITE_MODULE=/tmp/cinewave-sql-test/node_modules/@electric-sql/pglite node --test tests/staging_rehearsal.test.mjs
```

Checks default refusal, full rollback twice, postcheck success, and rollback after an injected failure between migrations. Snapshots compare columns, grants, policies, movie RLS, sequence state, row counts and reserved objects. The generated SQL is review-only; no remote execution is authorized. Its project confirmation is manual and cannot detect connection identity.
