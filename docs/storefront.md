# CineWave public storefront

The redesign follows the requested charcoal/pink cinematic direction with an original wave mark, typography, gradients and interface icons. No reference screenshot was available in the task attachments, so the written brief was used. No reference-site code, logo or artwork was imported.

## Data and browsing

- Only the existing published Supabase query populates the catalog. The hardcoded demo movies, made-up featured title, stock-photo hero, demo translations and arbitrary 2025 row were removed. Loading, empty and error/retry states never substitute demo records.
- The hero selects actual catalog records, preferring eligible playback and then supplied artwork. It uses supplied backdrop/poster URLs, real metadata and the selected language's title/description; unavailable artwork falls back to the original design treatment. No new film artwork or metadata was invented. The existing local poster fallback remains available.
- Poster rows support touch scrolling, localized previous/next controls, keyboard navigation and scroll snapping. Search, genre and My List views use a responsive results grid. The secondary row orders real records by supplied year rather than claiming current releases or fabricated popularity.
- My List is stored under `cinewave:my-list` in device localStorage. Language preference uses `cinewave:language`. Storage failures are tolerated. No account system or authentication has been invented; the profile menu describes this device-local behavior.
- English, Russian and Armenian cover navigation, hero/actions, status/error messages, profile, carousel controls, AI chrome and player hand-off. Existing movie translations come only from supplied metadata. AI answers remain the backend's actual response rather than being silently translated or replaced.

## Immediate-playback eligibility

A published movie or nonempty `watch_url` alone is **not** proof of a licensed, playable stream. Unapproved records stay browsable and saveable, with a localized details action and no media request. “Watch Now”, play badges and the ready-to-play/continue-watching rows require explicit approval bound to the exact MP4/HLS URL.

There are two supported read-only approval inputs:

1. The existing, repository-reviewed `data/playback-films.json`. A film entry must match English title, release year and exact `watch_url`; `verified` and `commercial_reuse_verified` must both be true and valid HTTPS `license_source` and `license_terms_source` links supplied. Pending entries do not qualify. The current file has no cleared films and is unchanged by this redesign.
2. Optional per-row `playback_verification` metadata, if an independently developed backend/Admin supplies it. The shape below is a contract example, not a migration or approved film:

   ```json
   {
     "watch_url": "https://your-authorized-media-origin.example/film.mp4",
     "license_verified": true,
     "commercial_reuse_verified": true,
     "playback_verified": true,
     "license_source": "https://your-public-evidence.example/film",
     "license_terms_source": "https://your-public-evidence.example/film/terms"
   }
   ```

The exact `watch_url` must match the row's current URL. Changing a media URL requires new approval for that URL. After the Admin verification schema is installed, server approval is authoritative; the managed-file fallback cannot override cleared or rejected server verification. Unknown/malformed/string-valued flags, absent metadata, unsupported extensions, non-HTTPS remote URLs and embedded credentials are rejected. Same-origin HTTP is permitted for local media tests. This is a presentation policy, not DRM, rights verification by the browser, or access control; media hosts/backends remain responsible for authentication, entitlements and delivery. URL/codec failures are still handled by the existing player.

At inspection the live catalog contained 24 published movies with no `watch_url` and no approval column. They remain visible as catalog entries, without immediate-watch claims. No production fields, records, genres, posters or playback approvals were modified.

## Admin separation

`storefront.css` is scoped to `body.cinewave-site`; the HTML and new `app.js`, `ai.js`, and `availability.js` belong only to the public entry point. No Admin route, file, authentication flow or database migration is added or edited. The published movie query, anonymous browser key, AI endpoint, AI `{message}` payload and existing HTML5/HLS player API are preserved. Optional approval metadata is read with the existing `select=*`; no new database column is required. The managed evidence file supports approval without a schema change.

Admin files were not present in this checkout. Compatibility was checked against the shared read-only catalog contract; the separately developed Admin interface was not executed or claimed verified. Admin entry points should not import public storefront scripts/styles as their own app shell.

## Validation and release

```sh
node --test tests/catalog.test.cjs tests/player.test.cjs tests/availability.test.cjs
python3 tests/browser_smoke.py
python3 tests/storefront_browser.py
python3 tests/player_browser.py
```

The new storefront test uses clearly synthetic rows/art/approval evidence only in HTTP fixtures. It verifies eligibility/no unapproved media requests, hero binding, carousels, keyboard focus, persistent My List/profile, all three languages and 15 locale/viewport combinations, AI request/error localization, empty/error/retry states without demos, and that the only write is the mocked AI request. The existing player test still decodes real generated MP4 and HLS media. Desktop/mobile renders are visually inspected with original synthetic fixture art; that is not licensed movie artwork or replacement production catalog data.

Deploy only after approval, with `index.html`, `storefront.css`, `app.js`, `ai.js`, `availability.js`, `catalog.js` and the existing `player.js`, `player.css`, `vendor/`, `assets/`, and reviewed `data/playback-films.json` together. No build or new runtime CDN dependency is required. This change includes no production SQL or automatic deployment. Real media delivery, native Safari/iOS, live AI answers and the absent reference screenshot remain outside this local visual verification.
