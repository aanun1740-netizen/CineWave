Run from the repository root:

```sh
node --test tests/catalog.test.cjs
python3 tests/browser_smoke.py
```

The browser test requires Python Playwright and Chromium at `/usr/bin/chromium`. It starts and stops its own HTTP server. External requests are intercepted; no remote database is modified and no AI inference is invoked.

Catalog metadata comes exclusively from the published Supabase rows. `title_en/ru/hy` and `overview_en/ru/hy` are selected independently, falling back to English then another supplied language. Catalog IDs are namespaced to prevent collisions with demo translations and the featured item. No translation or film genre is generated from a title.

Genres use `genre_names` and, when present, standard TMDB movie `genre_ids` (taxonomy: https://developer.themoviedb.org/reference/genre-movie-list). `Science Fiction` is normalized to the existing `Sci-Fi` filter. Missing genres remain unknown rather than becoming Drama. The observed 24 published rows all had empty `genre_names` and null `tmdb_id`; genre enrichment belongs in the catalog/import pipeline using an identified, reliable source.

Poster URLs come only from `poster_path`: absolute HTTP(S), protocol-relative URLs, and TMDB image filenames are supported. Nested Wikimedia Special:FilePath URLs from the current importer are unwrapped; this repair does not establish image licensing or availability. Missing, unsafe, malformed, or failed images use the original local SVG at `assets/poster-fallback.svg`. No new third-party artwork is selected. Catalog owners must verify rights for supplied artwork and correct missing/incorrect source records.
