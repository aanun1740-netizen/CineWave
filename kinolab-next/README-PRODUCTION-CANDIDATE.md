# KinoLab production candidate — NOT LIVE

The React storefront and Studio source live here. GitHub Pages serves the compiled site from the repository root. See [Updating the production storefront and Studio](#updating-the-production-storefront-and-studio) for the current release steps.

## Prepared
- React/Vite KinoLab frontend + Studio code, including trilingual content, KinoLab AI UI, 5-film guest prompt, auth and outward Watch links.
- Build base `/` for eventual `kinolabmovies.com` origin (not the staging project path).
- `config.js` uses the **existing public production Supabase URL and publishable key** previously present in `CineWave/app.js`; staging project is not used in this candidate. Analytics remain disabled until production permissions are confirmed.
- A read-only, branch-scoped CI workflow performs `npm ci`, production-configuration checks, and a Vite build, without deployment or database access.

## Important limitations / blockers
1. **Production Supabase not audited or migrated.** The existing production project may lack tables, views, functions, Auth configuration, storage buckets, policies or permitted roles required by the new frontend. Copying UI files does **not** move film records or images.
2. **Data backup and restore**: use the owner-held staging catalog CSV and image backups, verify a restore into the approved production backend and verify count/title/descriptions/posters/watch links before deployment. Keep sensitive exports outside this public GitHub repository.
3. **Permissions**: verify RLS for anonymous/member/admin, `cinewave_is_admin` RPC, registration/recovery redirects, AI edge function auth and quotas, and storage policies. Do not infer approval from a successful frontend build.
4. **Content and publishing rights** for externally linked films require independent review.
5. **Production release artifacts** need real browser tests, correct privacy/SEO pages, metadata, sitemap, canonical URL, verified custom domain, DNS, HTTPS, and a reviewed deploy workflow. The two legacy standalone PNG assets and staging browser fixture tests have not been copied. Existing staging `public/privacy.html` needs a production review before publish.
6. **No GitHub Pages deployment on this branch.** Merging `kinolab-next/` alone will not replace the old root website. Do not change Pages source to `kinolab-next/` directly; Vite must produce `dist/` through GitHub Actions.

## Build candidate locally
```bash
cd kinolab-next
npm ci --ignore-scripts
npm test
npm run build
```

### Release sequence
After production Supabase, content, RLS, Auth and AI are verified, prepare a distinct reviewed PR that promotes the candidate build to the actual production root deployment workflow. Obtain owner approval for that PR and for linking `kinolabmovies.com`; verify a working temporary production preview before switching DNS. Keep staging `CineWave-Test-` and its backend untouched, and retain rollback to the old CineWave site.

## Updating the production storefront and Studio

The Pages deployment from `main` publishes the compiled files in the repository root. After updating the app, build with Node 22 and copy both entry pages and the generated assets into the same pull request. Keep older hashed assets available for browsers that still have cached HTML. The SEO refresh manages the root film pages and sitemap.

From the repository root:

```sh
npm --prefix kinolab-next ci --ignore-scripts
npm --prefix kinolab-next run build
cp kinolab-next/dist/index.html index.html
cp kinolab-next/dist/admin/index.html admin/index.html
cp -a kinolab-next/dist/assets/. assets/
node kinolab-next/scripts/verify-pages-bundle.mjs kinolab-next/dist .
```

Pull-request checks compare the Pages bundle against the tested build. Post-merge checks also verify the published HTML and assets and open the clean watch route in a browser.
