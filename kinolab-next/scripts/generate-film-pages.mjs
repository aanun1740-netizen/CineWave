// Build crawlable, real HTML movie pages from KinoLab's PUBLIC published catalog.
// No private keys, user records, media downloads, or third-party watch links.
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = 'https://kinolabmovies.com';
const api = 'https://ysecowknittmmmbixgtu.supabase.co';

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clean = (value) => typeof value === 'string' ? value.trim() : '';

export function safePoster(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && !u.username && !u.password && !u.hash
      ? u.href : '';
  } catch {
    return '';
  }
}

export function pageUrl(id) {
  const raw = String(id ?? '');
  if (!/^[1-9]\d{0,16}$/.test(raw)) throw Error('Invalid public film id');
  return site + '/film/' + raw + '/';
}

function htmlLang(lang, title, description) {
  if (!description) return '';
  return '<section lang="' + lang + '"><h2>' + esc(title) + '</h2><p>' +
    esc(description) + '</p></section>\n';
}

const css = [
  ':root{color-scheme:dark;background:#20152e;color:#f7f5f0;font-family:system-ui,-apple-system,Segoe UI,sans-serif}',
  '*{box-sizing:border-box}body{margin:0}a{color:inherit}a:focus-visible{outline:3px solid #d4f458;outline-offset:4px}',
  'header,main,footer{max-width:1060px;margin:auto;padding:20px 24px}',
  'header{border-bottom:1px solid #ffffff30}header a{text-decoration:none;color:#d4f458;font-weight:800}',
  'main{display:grid;grid-template-columns:minmax(180px,285px) 1fr;gap:36px;padding-top:48px}',
  'figure{margin:0}figure img{width:100%;height:auto;aspect-ratio:2/3;object-fit:cover;border-radius:12px}',
  'h1{font-size:clamp(2rem,5vw,3.3rem);line-height:1.15;margin:0 0 12px}h2{font-size:1.15rem;margin:26px 0 5px}',
  'p{line-height:1.75;color:#ded7e4}small,.meta{color:#b3a8c0}.cta{display:inline-block;background:#d4f458;color:#20152e;font-weight:750;padding:13px 18px;border-radius:9px;text-decoration:none;margin:14px 0}',
  '.tag{color:#d4f458;font-size:0.78rem;letter-spacing:.12em;font-weight:800}',
  'footer{border-top:1px solid #ffffff30;margin-top:48px;font-size:.9rem}',
  '@media(max-width:650px){main{grid-template-columns:1fr;padding-top:25px}figure img{max-width:240px}header,main,footer{padding-left:18px;padding-right:18px}}'
].join('');

export function renderFilmPage(row) {
  const canonical = pageUrl(row.id);
  if (row.is_published !== true || row.terms_confirmed !== true) {
    throw Error('Refusing to index an unpublished or unconfirmed movie');
  }
  const title = clean(row.title_en) || clean(row.title_ru) || clean(row.title_hy);
  if (!title) throw Error('Film ' + row.id + ' has no title');
  const desc = clean(row.overview_en) || clean(row.overview_ru) || clean(row.overview_hy) ||
    ('Discover ' + title + ' and explore its details on KinoLab.');
  const snippet = desc.length <= 165 ? desc : desc.slice(0, 162).trimEnd() + '...';
  const photo = safePoster(row.poster_path);
  const year = /^\d{4}-\d{2}-\d{2}$/.test(row.release_date || '')
    ? String(row.release_date).slice(0, 4) : '';
  const genres = Array.isArray(row.genre_names) ? row.genre_names.filter((g) =>
    typeof g === 'string' && g.trim()).map((g) => g.trim()) : [];
  const isSeries = row.media_type === 'tv';
  const type = isSeries ? 'TVSeries' : 'Movie';
  const detailHref = '/#/movie/' + encodeURIComponent('catalog:external:' + row.id);
  const data = {
    '@context': 'https://schema.org',
    '@type': type,
    name: title,
    description: desc,
    url: canonical
  };
  if (photo) data.image = photo;
  if (year) data.datePublished = String(row.release_date);
  if (genres.length) data.genre = genres;
  const ld = JSON.stringify(data).replace(/[<>&]/g, (c) => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026'
  }[c]));
  const alternativeNames = [
    clean(row.title_ru) && '<p lang="ru"><strong>Русский:</strong> ' + esc(row.title_ru) + '</p>',
    clean(row.title_hy) && '<p lang="hy"><strong>Հայերեն:</strong> ' + esc(row.title_hy) + '</p>'
  ].filter(Boolean).join('\n');
  const imageHtml = photo
    ? '<figure><img src="' + esc(photo) + '" width="500" height="750" alt="' +
      esc(title) + ' movie poster" loading="eager"></figure>'
    : '<figure><div aria-label="No poster available"></div></figure>';
  return '<!doctype html>\n' +
    '<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="index,follow">' +
    '<title>' + esc(title) + (year ? ' (' + year + ')' : '') + ' | KinoLab</title>' +
    '<meta name="description" content="' + esc(snippet) + '">' +
    '<link rel="canonical" href="' + canonical + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:url" content="' + canonical + '">' +
    '<meta property="og:title" content="' + esc(title) + ' | KinoLab">' +
    '<meta property="og:description" content="' + esc(snippet) + '">' +
    (photo ? '<meta property="og:image" content="' + esc(photo) + '">' : '') +
    '<script type="application/ld+json">' + ld + '</script>' +
    '<style>' + css + '</style></head><body>' +
    '<header><a href="/">◀ KinoLab</a></header><main>' +
    imageHtml + '<article><div class="tag">KINOLAB · ' +
    (isSeries ? 'TV SERIES' : 'FILM') + '</div>' +
    '<h1>' + esc(title) + '</h1>' +
    '<div class="meta">' + [year, ...genres].map(esc).filter(Boolean).join(' · ') + '</div>' +
    '<p>' + esc(desc) + '</p>' + alternativeNames +
    htmlLang('ru', 'Описание на русском', clean(row.overview_ru)) +
    htmlLang('hy', 'Նկարագրություն հայերեն', clean(row.overview_hy)) +
    '<p><a class="cta" href="' + esc(detailHref) + '">View film in KinoLab</a></p>' +
    '<small>Watch options, when available, open an external provider. KinoLab does not host this film.</small>' +
    '</article></main><footer><a href="/">KinoLab</a> · ' +
    '<a href="/privacy.html">Privacy</a> · Movies and series in three languages</footer>' +
    '</body></html>\n';
}

export function makeSitemap(rows) {
  const urls = [site + '/', site + '/privacy.html', ...rows.map((row) => pageUrl(row.id))];
  if (new Set(urls).size !== urls.length) throw Error('Duplicate public film IDs');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => '  <url><loc>' + esc(url) + '</loc></url>').join('\n') +
    '\n</urlset>\n';
}

async function loadRows() {
  const config = await readFile(join(root, 'config.js'), 'utf8');
  const match = config.match(/key:\s*"(sb_publishable_[A-Za-z0-9_-]+)"/);
  if (!match) throw Error('Expected browser-safe Supabase publishable key in config');
  const rows = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const query = new URLSearchParams({
      select: 'id,title_en,title_ru,title_hy,overview_en,overview_ru,overview_hy,genre_names,release_date,media_type,poster_path,is_published,terms_confirmed',
      is_published: 'eq.true',
      terms_confirmed: 'eq.true',
      order: 'id.asc',
      limit: '1000',
      offset: String(offset)
    });
    const url = api + '/rest/v1/kinolab_external_catalog?' + query;
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(url, {
          headers: {apikey: match[1], Authorization: 'Bearer ' + match[1]},
          signal: AbortSignal.timeout(20000)
        });
        if (response.ok) break;
        if (response.status < 500 && response.status !== 429) {
          throw Error('Public catalog HTTP ' + response.status);
        }
      } catch (error) {
        if (attempt === 2) throw error;
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
    if (!response?.ok) throw Error('Public catalog is unavailable');
    const batch = await response.json();
    if (!Array.isArray(batch)) throw Error('Unexpected public catalog response');
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  if (rows.length < 1) throw Error('Refusing to emit an empty film sitemap');
  const known = new Set();
  for (const row of rows) {
    const id = String(row.id);
    pageUrl(id);
    if (known.has(id)) throw Error('Duplicate film id: ' + id);
    if (!row.is_published || !row.terms_confirmed) throw Error('Non-public film exposed');
    known.add(id);
  }
  return rows;
}

export async function generate(out) {
  const rows = await loadRows();
  const target = resolve(out);
  const allowed = [resolve(root, 'dist'), resolve(root, '..')];
  if (!allowed.includes(target)) throw Error('Output must be the build directory or repository root');
  // This directory is dedicated exclusively to generated film HTML pages.
  await rm(join(target, 'film'), {recursive: true, force: true});
  for (const row of rows) {
    const dest = join(target, 'film', String(row.id));
    await mkdir(dest, {recursive: true});
    await writeFile(join(dest, 'index.html'), renderFilmPage(row), 'utf8');
  }
  await writeFile(join(target, 'sitemap.xml'), makeSitemap(rows), 'utf8');
  console.log('SEO_GENERATION_OK: ' + rows.length + ' public film pages, ' +
    (rows.length + 2) + ' sitemap URLs; no database writes.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await generate(process.argv[2] || join(root, 'dist'));
}
