// Only use artwork supplied by the catalog; never infer a poster from a title.
const POSTER_FALLBACK = 'assets/poster-fallback.svg';
const TMDB_GENRES = {28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western'};
function cleanText(value) { return typeof value === 'string' ? value.trim() : ''; }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function posterURL(value) {
  let raw = cleanText(value);
  if (!raw || /^(null|undefined)$/i.test(raw)) return POSTER_FALLBACK;
  // TMDB file paths may arrive with or without a leading slash.
  if (/^\/?[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(raw)) return 'https://image.tmdb.org/t/p/w500/' + raw.replace(/^\//, '');
  try {
    let url = new URL(raw.startsWith('//') ? 'https:' + raw : raw);
    // Repair the importer wrapping an entire Commons URL as a filename.
    for (let i=0; i<3 && url.hostname === 'commons.wikimedia.org' && url.pathname.startsWith('/wiki/Special:FilePath/'); i++) {
      const file = decodeURIComponent(url.pathname.slice('/wiki/Special:FilePath/'.length));
      if (/^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//i.test(file)) url = new URL(file);
      else { url.pathname = '/wiki/Special:FilePath/' + encodeURIComponent(decodeURIComponent(file)); break; }
    }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return POSTER_FALLBACK;
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.href;
  } catch { return POSTER_FALLBACK; }
}
function movieGenres(row) {
  const names = Array.isArray(row.genre_names) ? row.genre_names.map(cleanText).filter(Boolean) : [];
  const ids = Array.isArray(row.genre_ids) ? row.genre_ids.map(id => TMDB_GENRES[id]).filter(Boolean) : [];
  return [...new Set([...names.map(name => name === 'Science Fiction' ? 'Sci-Fi' : name), ...ids])];
}
function localizedMovie(movie, lang = currentLanguage) {
  if (movie.source === 'supabase') {
    const choose = values => cleanText(values?.[lang]) || cleanText(values?.en) || cleanText(values?.ru) || cleanText(values?.hy);
    return {title: choose(movie.titles) || movie.title, desc: choose(movie.descriptions)};
  }
  const translated = movieTranslations[movie.id]?.[lang];
  return {title: translated?.[0] || movie.title, desc: translated?.[1] || movie.desc || ''};
}
function genreLabel(genre) {
  const key = {Action:'action',Adventure:'adventure',Animation:'animation',Comedy:'comedy',Drama:'drama',Horror:'horror','Sci-Fi':'scifi'}[genre];
  return key ? translations[currentLanguage][key] : genre;
}
function unknownMetadata(key) {
  return {en:{genre:'Genre unavailable',description:'Description unavailable',title:'Untitled'},ru:{genre:'Жанр не указан',description:'Описание отсутствует',title:'Без названия'},hy:{genre:'Ժանրը նշված չէ',description:'Նկարագրությունը հասանելի չէ',title:'Առանց վերնագրի'}}[currentLanguage][key];
}
function mapCatalogMovie(row) {
  const titles = {en:cleanText(row.title_en),ru:cleanText(row.title_ru),hy:cleanText(row.title_hy)};
  const genres = movieGenres(row);
  const date = cleanText(row.release_date);
  return {id:'catalog:' + String(row.id ?? row.tmdb_id),source:'supabase',titles,
    descriptions:{en:cleanText(row.overview_en),ru:cleanText(row.overview_ru),hy:cleanText(row.overview_hy)},
    title:titles.en || titles.ru || titles.hy || '',desc:'',year:/^\d{4}-\d{2}-\d{2}$/.test(date) ? Number(date.slice(0,4)) : null,
    genres,genre:genres[0] || '',kind:'Movie',rating:row.rating != null ? String(row.rating) : '',duration:'',
    img:posterURL(row.poster_path),video:cleanText(row.watch_url),progress:0};
}
