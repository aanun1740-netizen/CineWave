# Platform setup and launch review

This work extends PR #6. It is not a deployment or permission to migrate production.
The existing 24 records are retained. No accounts, roles, films or streams are seeded.

## Pages and configuration

GitHub Pages serves the existing root `index.html`. Navigation uses hash routes, so direct links and refresh require no rewrite configuration:

- `#/home`, `#/movies`, `#/tv`, `#/my-list`
- `#/movie/catalog%3A<ID>` and `#/watch/catalog%3A<ID>`
- `#/login`, `#/register`, `#/profile`, `#/forgot`, `#/recover`
- `admin/` remains the separate administrator interface.

`config.js` is the shared public Supabase URL/publishable-key configuration. It retains the existing connection. `admin/config.js` is a compatibility alias. Never put service-role keys, database passwords or Management API tokens in any static asset. The bundled SDK and licenses remain local under `vendor/`.

For an isolated test checkout, configure only CineWave-Test public values. Do not change the deployed production configuration as part of testing. Review the Pages Content Security Policy if switching project hosts.

In Supabase Auth, configure the Site URL to the approved Pages root including `/CineWave/`; allow the exact root URL for signup confirmation/recovery, and the explicit approved local/staging roots. Avoid wildcard production redirects. Enable email/password signup and email confirmation; configure SMTP, delivery limits and appropriate abuse protection. Test confirmation and recovery from delivered emails, including a separate tab, before launch. PKCE verifiers alone are stored in localStorage to allow email links in another tab. Sessions are per-tab sessionStorage, shared by the public site and Admin. Older Admin sessions require signing in again. Account pages never grant administrator access, including through signup metadata.

Guest favorites remain local to the device. Signed-in favorites are isolated in `user_watchlist`; importing guest favorites is an explicit profile action. Unpublished favorites are hidden by RLS. Profiles are private to their owner, with display name and preferred language only; selecting a profile language saves and applies it. No profile directory or public email list is exposed. Catalog filtering uses the explicit `media_type` field (`movie` or `tv`), never title guesses. Legacy rows default to `movie`; owners must review any actual TV records manually.

## Migrations and staging: NOT RUN

User-designated staging: **CineWave-Test**. Its URL/reference and secure connection have not been supplied. The owner explicitly requires both securely configured access and approval before staging migrations. No remote migration is authorized at this point. Local PGlite tests do not constitute Supabase staging validation.

After those prerequisites are met:

1. Verify the exact project name, reference and connection independently in the Supabase dashboard. Production reference `ysecowknittmmmbixgtu` is prohibited for staging tests. Bind credentials securely outside this repository; do not paste credentials into chat or commit them.
2. Provision an isolated schema representative of the existing `public.movies` and Storage/Auth setup. Review table/column types, existing grants, triggers, policies and dependencies using the preflight in `docs/admin.md`. If `profiles` or `user_watchlist` already exist, compare every column, constraint and foreign key against migration 002 before running; `IF NOT EXISTS` does not reconcile an unrelated schema.
3. Snapshot schema, row counts and existing movie values. Apply reviewed `sql/migrations/001_admin_panel.sql`, then `002_accounts_and_catalog.sql` using the approved staging connection only. Both scripts commit; inspect them beforehand. Verify all original movie fields and publication states are unchanged, apart from additive fields. Repeat to check idempotence.
4. Create separate staging administrator and ordinary users through normal Auth. Add only the administrator UUID to the private allowlist using the manual procedure in `docs/admin.md`. Test anonymous, ordinary and administrator requests using real JWTs. Signup metadata must never create a role.
5. Exercise registration, confirmation mail, login, refresh, logout, recovery, password reauthentication, private profiles and cross-user favorites. Test REST and Storage RLS through HTTP, including forged user IDs and unauthorized writes. Then exercise Admin CRUD, image MIME/size restrictions, stale-update rejection, rights re-verification, unpublish and deletion using disposable staging records.
6. Record project reference, reviewed commit, timestamps, exact results and any errors without credentials. Compare the original-row snapshot again. Obtain explicit approval separately before any production migration or deployment.

Migration 002 adds `media_type`, `profiles`, and `user_watchlist`. It revokes broad grants, enforces owner-only policies with restrictive guards, limits editable columns, and adds no administrator bootstrap. A signed-in user cannot use these tables until migration 002 is installed; failures are shown instead of pretending saves succeeded.

## Reviewed cleanup procedure — no deletion authorized

Do not run a blanket `DELETE`, `TRUNCATE`, reset sequences, or use the UI to remove the 24 legacy rows now. Cleanup is a separate operation after the platform passes staging, production rollout is explicitly approved, and the owner approves the exact cleanup scope.

1. Take an independently restorable database backup (including Auth/profile/watchlist data), export the exact 24 proposed movie rows, and retain original assets separately. Verify recovery on staging. A backup table in the same database alone is insufficient.
2. Produce a fresh owner-reviewed manifest of exact IDs, titles, release dates and full-row fingerprints from the approved environment. Confirm there are exactly 24 targets and identify every inbound foreign key/trigger; stop on unexpected dependencies. Do not identify targets merely as the first 24 IDs or all current rows. Compare to the owner's intended legacy collection, including edits made since this PR.
3. Prepare a dedicated SQL transaction from that manifest with a short lock timeout. Lock targets, assert every ID and fingerprint still matches, archive full movie rows and dependent favorites to an access-restricted archive, and delete only IDs joined to the reviewed manifest. Assert exactly 24 deleted records and that all non-target records are unchanged. Include an explicit approval gate and end the first rehearsal in `ROLLBACK`. Unexpected row changes/counts/dependencies must abort.
4. Rehearse on CineWave-Test with synthetic/new movies alongside the legacy set. Verify new movies, Auth users, profiles, uploads and unrelated favorites survive; validate rollback and backup restoration. Movie foreign-key cascades remove associated favorites, so archive those relationships too. Never delete Storage objects as part of movie-row cleanup.
5. Present the final manifest, SQL, rehearsal results, restore instructions and exact irreversible effects for owner approval. Only after explicit cleanup approval may an authorized operator change the final transaction to `COMMIT` and execute against the separately confirmed production project. No executable cleanup script is provided here because the current target manifest has not been freshly reviewed or approved.

## Remaining launch gates

- Real staging migration, Auth/email and Storage/RLS checks above remain unverified and blocked by staging access/approval.
- Local browser tests intercept Supabase responses; they validate UI and actual SDK behavior, not a live Supabase service.
- Verify email recovery/confirmation in multiple browsers, account switching and expired sessions against staging. Test Safari/iOS native HLS and actual mobile fullscreen; local decoding coverage is Chromium.
- Owner must supply and verify lawful movie/artwork/trailer rights, commercial permissions and playable URLs. Admin review binds approval to saved source/rights metadata; it does not independently establish legal rights. No unauthorized stream is added. Test actual hosts for CORS, range requests, expiring URLs and HTTPS/CSP compatibility. Quality options require real approved alternate streams or HLS variants.
- Review production backups, monitoring, email delivery, quotas, privacy/terms and recovery operations. Get explicit approvals for production migrations, deployment, and eventual cleanup as separate actions. This PR must not be merged automatically.

## Local review evidence

The review uses 16 Node unit tests, four isolated PostgreSQL suites, and five browser suites (catalog smoke, storefront, generated-media player, Admin and public accounts). HTTP fixtures intercept all external browser services; tests do not create real accounts or alter remote data. Admin language changes preserve unsaved input. Account tests cover email-confirmation pending UI, password reauthentication/update, cloud favorites, profile persistence, TV filtering and device/account list separation. Passing these checks does not close any live-service launch gate above.
