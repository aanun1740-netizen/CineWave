# KinoLab production Supabase preflight — read-only audit (2026-11-10)

**Scope**: Live KinoLab production migration preparation only. No SQL writes, schema changes, auth updates, deployments or DNS modifications were made during this audit. This report is in the draft pull request's `kinolab-next/` folder, not the live site.

## Project state

| Environment | Supabase ref | Observed status | Immediate implication |
|---|---|---|---|
| Existing CineWave production | `ysecowknittmmmbixgtu` | `INACTIVE` | Database reads and migrations timed out. Cannot validate production schema, policies, Auth or browser key yet. |
| KinoLab staging | `zayssiouqexwdicudalc` | `ACTIVE_HEALTHY` | Available for read-only inspection. No staging data changed. |

The production candidate frontend's browser configuration references the **existing production** URL and publishable key from the older CineWave storefront. The current key's enabled state could **not** be checked while production was inactive. An active project and validated production key are prerequisites to launch.

## Staging catalog and media (read-only counts)

- `public.kinolab_external_catalog`: **47** rows, **47** marked published, **47** marked terms-confirmed.
- Exactly **0** rows missing a title in any of hy/ru/en, **0** missing an overview in any of hy/ru/en, **0** empty poster paths, **0** watch URLs without an HTTPS prefix (these checks validate format/completeness, **not streaming rights or playback**).
- `public.movies`: 0; `public.movie_metadata_public`: 0; `public.kinolab_title_archive`: 0.
- `public.profiles`: 2 entries (not exported or copied).
- Public bucket `cinewave-assets`: **63** storage object rows (image bytes were not read or exported).
- All six public tables visible in the initial audit had RLS enabled.

Staging users and content must not be presumed to exist in the old production database. A database restore rehearsal with both catalog CSV and separately backed-up image **bytes** is still required; copying application source alone is not a migration.

## Priority security findings: review and fix in staging before production

1. **High priority:** current table-level grants give both `anon` and `authenticated` privileges including `TRUNCATE`, `TRIGGER`, and `REFERENCES` on `public.kinolab_external_catalog`. PostgreSQL RLS does **not** govern `TRUNCATE`; public TRUNCATE privilege could allow a destructive operation outside row policies if executed through an accessible SQL route. Reduce privileges to the least necessary set.
2. The RLS policies on `kinolab_external_catalog` allow public reads for published rows and constrain insert/update/delete to admin-qualified authenticated sessions. Keep this intended behavior; test anonymous, regular member and administrator access separately after changing grants.
3. Supabase security advisor warns that `public.cinewave_is_admin()` is `SECURITY DEFINER` and executable by `anon`, and that `public.kinolab_import_title_batch(records jsonb)` is callable by authenticated users with elevated function privileges. **Do not blindly revoke function EXECUTE**: first review their implementations and their callers; RLS policies depend on `cinewave_is_admin()`.
4. Leaked-password protection is disabled in staging; review Supabase Auth's configuration and enable where supported for production.
5. Other advisor notices flag private-schema RLS tables without policies (possibly intentional) and performance optimizations; they are not by themselves proof of public exposure.

Suggested **review-only** SQL for the public catalog grant issue (NOT EXECUTED):

```sql
-- Run only after backup and regression testing; no data rows are changed.
REVOKE TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.kinolab_external_catalog
FROM anon, authenticated;
```

Before running, review direct grants AND grants inherited from `PUBLIC` and other roles; confirm role behavior with `has_table_privilege` on both `anon` and `authenticated`. Do not replace the current RLS policies with blanket write access. Verify all Studio create/edit/delete flows afterwards and run Supabase security advisors again.

Supabase references:
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security

## Production restoration update — 2026-11-10

**Verified state changed**: Supabase now reports `ACTIVE_HEALTHY` for `ysecowknittmmmbixgtu`. The owner restored the project through the dashboard. Read-only SQL queries now succeed.

Actual production database inspection shows:
- `public.movies`: **0** rows, RLS enabled.
- No other application tables or views in `public`; no `cinewave_private` or `kinolab_analytics` application objects were observed.
- **0** rows in `auth.users` and `auth.identities` (count-only queries; no user PII retrieved).
- **0** Storage buckets.
- **0** public RPC functions (e.g. `cinewave_is_admin` is missing).
- Existing Edge Functions `dynamic-handler`, `hyper-action`, `cinewave-ai` are deployed, but their functional compatibility/auth has **not** been tested.
- An enabled publishable API key now exists. The candidate source still requires functional verification of the exact public key and Auth service.
- Supabase security advisor reports no current lints for this sparse production project; this is not evidence that migrated schema would be safe.

The source frontend can build, but **production is not ready**: uploading only 47 catalog rows will not work without their table schema/RLS and user/Admin/AI contracts. The staging poster bucket contains 63 media object records that must be backed up and re-hosted; changing URLs without copying actual image bytes would break posters.

**Required next work**: prepare and review explicit production migrations (tables, views, RPC, policies, storage) from audited staging definitions; verify latest catalog CSV and image backups; establish production administrator with a verified authenticated account; validate auth redirects and AI function; then stage a non-live preview. Never copy real auth.users/password data wholesale from staging or copy private CSV exports into the public GitHub repo.

## Release blockers / next actions

1. Restore/reactivate the **existing** production project only with owner authorization and after reviewing its plan implications. Do not create a paid project automatically.
2. Read-only audit its tables, policies, functions, enabled publishable key, Auth configuration, and Storage. Confirm the intended target before migrating data.
3. Back up staging catalog/images, fix and verify privileges, review approved outbound links, then migrate the required tables and storage to the **approved** production project using reviewed migrations and a restore test.
4. Configure production Auth redirects for `https://kinolabmovies.com` and `https://www.kinolabmovies.com`, plus AI Edge Function endpoint and authorization rules. No credentials should appear in public source.
5. Only after a production preview (browser, three languages, login, Studio, AI, watch links, media, mobile) passes, approve final GitHub deployment and Cloudflare DNS; enforce HTTPS and verify canonical URLs and SEO.

**This audit must not be treated as production approval.**
