import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { esc, safePoster, pageUrl, renderFilmPage, makeSitemap } from '../scripts/generate-film-pages.mjs';

const sample = {
  id: 113, title_en: 'Heart of the Beast', title_ru: 'Сердце зверя',
  title_hy: 'Գազանի սիրտը',
  overview_en: 'An adventure in the Alaskan wilderness.',
  overview_ru: 'Приключение на Аляске.', overview_hy: 'Արկած Ալյասկայում։',
  release_date: '2026-01-01', media_type: 'movie', genre_names: ['Adventure'],
  poster_path: 'https://example.org/poster.jpg',
  external_watch_url: 'https://example.org/private-external-player',
  is_published: true, terms_confirmed: true
};

test('public movie pages have canonical URLs, real text, image and external player links excluded', () => {
  const page = renderFilmPage(sample);
  assert.match(page, /<title>Heart of the Beast \(2026\) \| KinoLab<\/title>/);
  assert.match(page, /<link rel="canonical" href="https:\/\/kinolabmovies.com\/film\/113\/">/);
  assert.match(page, /<h1>Heart of the Beast<\/h1>/);
  assert.match(page, /An adventure in the Alaskan wilderness/);
  assert.match(page, /Сердце зверя/);
  assert.match(page, /Արկած Ալյասկայում/);
  assert.match(page, /<script type="application\/ld\+json">/);
  assert.match(page, /href="\/#\/movie\/catalog%3Aexternal%3A113"/);
  assert.doesNotMatch(page, /private-external-player/);
  assert.match(page, /poster\.jpg/);
  assert.match(page, /content="index,follow"/);
});

test('unsafe catalog text is escaped and script tags cannot terminate JSON-LD', () => {
  const movie = {...sample, title_en: '<script>alert("x")</script>',
    overview_en: '</script><img src=x onerror=alert(1)>'};
  const page = renderFilmPage(movie);
  assert.ok(!page.includes('<img src=x onerror='));
  assert.ok(!page.includes('</script><img'));
  assert.match(page, /&lt;script&gt;alert/);
  assert.match(page, /\\u003c\/script/);
  assert.equal(esc('&<>"' + "'"), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(safePoster('javascript:alert(1)'), '');
  assert.equal(safePoster('http://example.org/x.jpg'), '');
});

test('only published public rows are indexable', () => {
  assert.throws(() => renderFilmPage({...sample, is_published:false}), /unpublished/);
  assert.throws(() => renderFilmPage({...sample, terms_confirmed:false}), /unconfirmed/);
  assert.throws(() => pageUrl('external:113'), /Invalid/);
  assert.throws(() => pageUrl('../other'), /Invalid/);
  const xml = makeSitemap([sample, {...sample,id:114,title_en:'Another Film'}]);
  assert.equal((xml.match(/<loc>/g)||[]).length,4);
  assert.match(xml, /https:\/\/kinolabmovies\.com\/film\/113\//);
  assert.doesNotMatch(xml, /#\/movie\//);
  assert.throws(() => makeSitemap([sample,sample]), /Duplicate/);
});
