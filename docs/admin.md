# CineWave Studio Admin Panel

## Delivery and static URL

The separate static entry point is `admin/index.html`. With this repository's GitHub Pages project hosting, its exact URL is:

**https://aanun1740-netizen.github.io/CineWave/admin/**

`https://aanun1740-netizen.github.io/CineWave/admin/index.html` also works. The path is beneath `/CineWave/`, not the domain-root `/admin`. There is no SPA rewrite, server framework, service-role key, signup route, administrator-grant UI, or automatic deployment. The static login HTML is public; protected data and operations are authorized by Supabase, not hidden JavaScript.

No production migration, login, account creation, administrator assignment, movie mutation, or upload was executed during implementation. All production inspection was read-only. Existing 24 movie values and publication states were preserved. Local tests use synthetic users/media and an isolated PostgreSQL engine.

## What was inspected

The existing `public.movies` REST API returned 24 records with `id`, `tmdb_id`, `title_en/ru/hy`, `overview_en/ru/hy`, `poster_path`, `backdrop_path`, `release_date`, `genre_names`, `rating`, `trailer_url`, `watch_url`, `is_published`, `created_at`, and `updated_at`. Observed IDs are numeric, genres are arrays, publication is boolean, rating is numeric/null, and dates/timestamps serialize as strings. All 24 observed playback URLs were empty.

The public OpenAPI schema request returned HTTP 401; SQL types, defaults, constraints, existing RLS/function privileges and Storage internals could not be completely inspected through that API. **The owner must run the read-only `sql/inspect_admin_schema.sql` and compare it before approving the migration.** The migration requires a generated, sole-primary-key movie ID, `genre_names text[]`, existing timestamp/catalog fields, Supabase Auth, and enabled RLS on Storage tables. It aborts on incompatible additive field types, missing prerequisites or a conflicting private bucket. Do not disable these checks to force an incompatible schema through.

Review unrelated SECURITY DEFINER RPCs and existing restrictive policies as part of the owner preflight. This migration constrains pre-existing permissive movie/object policies but cannot certify the safety of unrelated privileged functions that were not visible to the browser API. Do not blindly revoke unrelated RPCs or break existing public consumers.

## Review-only migration

`sql/migrations/001_admin_panel.sql` is a transaction intended for explicit, owner-approved installation, first on staging:

- Creates `cinewave_private.admin_users`, keyed to an existing `auth.users.id`. Browser roles have no schema/table access. Neither ordinary users nor browser administrators can grant roles. User-editable Auth metadata is ignored.
- Exposes only `public.cinewave_is_admin()`, a no-argument, fixed-search-path SECURITY DEFINER boolean check tied to `auth.uid()`. It does not enumerate administrators or grant privileges.
- Adds rights-holder, license type, public evidence/source/terms URLs, attribution, commercial streaming permission, verification status, playback check, actual renditions and derived approval JSON. It does not update existing titles, genres, artwork, URLs or publication values.
- Enables/forces movie RLS, revokes public/browser write and column grants before installing narrowly authorized privileges, and adds restrictive guards alongside permissive policies. Anonymous/ordinary users can read only published movies; administrators can read drafts and perform CRUD. Existing unsafe permissive policies cannot OR around the new restrictive guards.
- A trigger forces new records through draft/pending verification. Only an explicit later review with complete full-film commercial rights, attribution and tested media yields the storefront's `playback_verification`. Clients cannot forge that JSON. Changing identity, rights or media invalidates it. When the new server verification columns are present, they are authoritative over the old managed-file fallback. If another environment already has cleared managed-file films, plan an explicit reviewed import of their evidence before expecting playback to remain approved; publication flags are not changed automatically. A draft cannot be published without it, and a verified published film must be unpublished before rights/media changes.
- Grandfathers the existing published catalog **without approving its playback**: ordinary description/poster/genre edits do not automatically unpublish these records. Once explicitly unpublished, normal verification is required to republish. Changing English identity/date or rights/media while published requires unpublishing first. No initial movie UPDATE or DELETE is performed.
- Creates a dedicated public-image bucket, `cinewave-assets`, with JPEG/PNG/WebP and an 8 MB limit. Anonymous viewing is intentional; writes and cross-bucket moves into this bucket are restricted to administrators. Browser roles cannot change/delete its bucket settings. Other buckets are not reconfigured. SVG/video uploads are not accepted by this image bucket.

The migration is rerunnable with the expected schema and owner and is exercised twice in local tests. It leaves unrelated policy definitions intact. On any error the transaction must be rolled back and the cause inspected; do not weaken RLS, disable a trigger or publish a service key in response.

## Securely assign the first administrator

1. Do not create an account automatically. The owner must identify an existing, email-confirmed Supabase Auth account. If no suitable account exists, the owner can explicitly create one through **Supabase Dashboard → Authentication → Users** using a secure password and the intended person; complete email confirmation and password setup through a trusted channel. The app does not implement invite/recovery/MFA enrollment flows.
2. Copy the immutable Auth user UUID, verify the account and identity, and obtain approval to assign it. Do not grant based only on a browser-supplied email or `user_metadata.role`/`admin` flag.
3. After the main migration is approved and installed, review `sql/admin_bootstrap.example.sql`. Replace its `NULL` target with that UUID. The template refuses an absent or unconfirmed user and never inserts an Auth account.
4. Run that reviewed assignment in the privileged Supabase SQL editor. Do not put owner database credentials or service-role keys in the site, chat, environment variables exposed to browsers, or GitHub Pages.
5. Sign in at the exact `/CineWave/admin/` URL with the confirmed account. A valid login without allowlist membership must show access denied. Missing migrations/RPCs fail closed.
6. To revoke access, the owner explicitly deletes the reviewed UUID from `cinewave_private.admin_users` (see the template's commented example). Database access is denied on subsequent statements even for an already-issued JWT. The UI rechecks on focus, Auth changes and approximately every minute. Also manage the Auth account/refresh sessions through the owner dashboard as appropriate.

The SDK stores the browser session in per-tab sessionStorage; unavailable storage falls back to memory. Sign-out clears the local session and sensitive form/list state; if the remote sign-out request fails, the local session is still cleared and the SDK is reset with a page reload. It is a local-device sign-out, not a claim to revoke every issued JWT or every device. GoTrue handles password authentication/rate limits; configure its production policies in the owner dashboard. Actual production Auth, invitations, password recovery and MFA were not exercised or implemented here.

## Operator workflow

- Overview shows total/published/draft counts, **approved** playback count (not merely nonempty URLs), and recent records. Listing pages through all records in batches of 100. Search spans English, Russian and Armenian titles; publication and verification filters are available.
- Add a film as a draft. Fill localized titles/descriptions, text-array genres, date, artwork/trailer/source URLs and complete rights evidence. Saving edits never silently resets existing untranslated fields or rating values outside the form's allowlist.
- The rights/source/terms and attribution fields on published movies are public through the existing catalog API. **Keep private contracts, personal data, credentials and private signed-document links out of these public fields.** Use publicly shareable evidence/attestations; keep private legal records elsewhere under their own controls. Signed movie URLs are also visible to catalog readers; don't put privileged secrets there.
- Uploads use fresh `user-UUID/random-UUID.ext` names and `upsert:false`; they do not overwrite old artwork. Save the record to attach the new URL. Canceling an editor does not automatically delete newly uploaded or shared assets. Any orphan cleanup should be reviewed separately.
- Add optional, genuine 360p/480p/720p/1080p sources, one distinct URL per actual rendition. A single MP4 does not become multiple qualities by relabeling it. Use a master `.m3u8` for adaptive HLS; manifests/codecs/CORS/media hosting still determine support. Internal preview is available for administrators to test delivery, but is not a license grant or publication approval.
- Save source/evidence changes first. Review full-film commercial grants, included soundtrack/assets, public source and evidence/terms links, attribution and every actual media source. Then use **Review rights & tested playback** and explicitly confirm the review. That action sets review flags on an unchanged saved snapshot; the database derives approval only when the facts are complete.
- Publishing/unpublishing is a separate confirmation in the movie library. Deletion requires the exact English title and a second confirmation. Escape/Cancel never confirms, including after a previously confirmed dialog. Deleting a record never automatically deletes image assets.
- Updates/deletes include `updated_at` optimistic-concurrency predicates. A stale/missing result requires refresh instead of overwriting another administrator's changes. Navigation away from unsaved editor changes requires a discard decision; sign-out clears local edits for security.

## Player integration

The original `CineWavePlayer` remains the player. When the server verification column is present, it is authoritative: stale curated evidence cannot restore an approval that the server cleared. Public catalog mapping passes only rendition URLs from a valid, exact-primary-URL-bound approval snapshot; it does not trust arbitrary unverified `video_renditions`. The Admin preview can test unsaved sources because it is behind Admin authorization, while public playback still uses the existing eligibility gate.

- A lone MP4 has **no fabricated quality menu**.
- With actual separate MP4 files, the player offers Original and only configured distinct heights. Switching preserves the position and attempts to retain play/pause state.
- hls.js/MSE displays Auto and the actual manifest's available heights. It does not invent missing 480p/1080p levels.
- Native HLS without configured variants remains Auto-only; a browser that does not expose its variants cannot offer manual quality levels. A manually configured genuine rendition can be selected explicitly.
- Labels remain English/Russian/Armenian. Missing/unsupported/network-failed media and denied autoplay remain handled by the existing player.

Public storefront design, AI request contract, search, genres and My List are untouched. Only catalog rendition mapping and the player quality control are extended. Quality availability is based on supplied/verified sources and real manifest levels, not guessed transcoding or real-time encoding.

## Deployment steps — approval required

1. Review the PR, SQL preflight results, policies, function ownership, bucket collision checks and additive schema assumptions. Back up the database and note the current 24 IDs/publication states.
2. Use a separate staging Supabase project with representative schema/policies first. Run the reviewed migration and intentionally test an anonymous browser, an ordinary authenticated account and an allowlisted account against REST and Storage. Verify published reads remain available, drafts/writes are denied to others, and rights/publication gates cannot be bypassed by calling REST directly.
3. After explicit approval, apply the migration to production through the owner SQL editor as a whole transaction. Never run this file automatically from a frontend, GitHub Pages build, deploy action or chat tool.
4. Assign the first confirmed administrator manually using the reviewed UUID template. No assignment is included in the migration.
5. Confirm Supabase Auth email/password sign-in is enabled and configure the site URL to `https://aanun1740-netizen.github.io/CineWave/`. This Admin uses password sign-in rather than implicit auth callbacks, so the public key/config must match that project. Do not expose owner/service credentials.
6. Only after frontend deployment approval, merge/release the static files together: `admin/`, `vendor/supabase.min.js`, `vendor/supabase-licenses/`, updated vendor notices and the small `catalog.js`/`player.js`/`player.css` integration. Existing storefront assets remain in place. GitHub Pages serves the real `admin/index.html` directory entry without rewrites.
7. Open the exact Admin URL, sign in, verify totals and existing publication states before making any real edit, and test public catalog/AI/My List/player compatibility. Use explicitly approved test records for production smoke tests; do not delete or overwrite existing films merely to test the UI.
8. Configure the actual media origin's HTTPS, CORS, byte-range responses and stable full-film URLs. Admin CSP allows HTTPS connections for arbitrary authorized media previews; scripts are restricted to local files, forms/base URLs to self, and objects blocked. Tighten `connect-src`/`media-src` to your approved media/auth hosts when known. No global storefront CSP was weakened. GitHub Pages cannot supply custom frame-ancestors headers via a meta tag; there is no claim of server-header clickjacking protection.

SQL rollback of the feature is **not** automatically provided because dropping security policies/roles could expose data or break readers. Review an owner-controlled recovery plan from the schema backup. Frontend rollback should retain the secure database policies and restore the previous public player assets together if necessary.

## Test evidence and limits

- `tests/admin_sql.test.mjs`: actual PostgreSQL RLS/trigger tests in isolated PGlite. Applies migration twice; preserves all existing fixture fields/publication states; tests anon/user denial despite legacy permissive policies, spoofed metadata, private-role assignment denial, authorized CRUD, verification/publication and invalidation, Storage writes/moves/settings, and role revocation.
- `tests/admin_browser.py`: real bundled Supabase SDK with intercepted Auth/REST/Storage responses; verifies static project-prefix routing, login/logout, unauthorized/missing-migration denial, dashboard, multilingual CRUD, upload, review/publish/unpublish, typed deletion/Cancel, optimistic predicates and mobile editor/CSP. No production sessions or writes.
- `tests/admin_model.test.cjs`: field allowlist, multilingual/text-array handling, source/quality validation and MIME/size constraints.
- Extended existing player tests generate and decode real 360p/720p MP4 and HLS variants locally. They cover native Chromium HLS, explicitly forced hls.js/MSE, real quality switching/position retention, and the absence of fake qualities for a lone MP4. 480p/1080p input support is validated but those encodes are not claimed tested end-to-end.
- Existing public storefront/catalog/eligibility/player regression suites remain applicable. Native Safari/iOS, real Supabase Auth/Storage HTTP/RLS deployment, existing hidden privileged RPCs and production migration execution remain unverified until owner staging/approval. No test here grants rights to real movies.

Run commands and temporary PGlite installation are in `tests/README.md`. Dependency integrity and SDK licenses are recorded in `vendor/README.md`.
