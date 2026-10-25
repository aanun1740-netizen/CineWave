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
function backdropURL(value) {
 const normalized=posterURL(value);
 if(normalized===POSTER_FALLBACK)return null;
 const url=new URL(normalized);
 if(url.hostname==='image.tmdb.org'&&url.pathname.startsWith('/t/p/w500/'))url.pathname=url.pathname.replace('/t/p/w500/','/t/p/w1280/');
 return url.href;
}
// Canonical values stay language-independent; only visible labels are translated.
const GENRE_LABELS = {
 'Action':['Action','Боевик','Մարտաֆիլմ'],
 'Adventure':['Adventure','Приключения','Արկածային'],
 'Animation':['Animation','Анимация','Անիմացիա'],
 'Biography':['Biography','Биография','Կենսագրական'],
 'Comedy':['Comedy','Комедия','Կատակերգություն'],
 'Crime':['Crime','Криминал','Քրեական'],
 'Documentary':['Documentary','Документальный','Վավերագրական'],
 'Drama':['Drama','Драма','Դրամա'],
 'Family':['Family','Семейный','Ընտանեկան'],
 'Fantasy':['Fantasy','Фэнтези','Ֆենթեզի'],
 'History':['History','Исторический','Պատմական'],
 'Horror':['Horror','Ужасы','Սարսափ'],
 'Music':['Music','Музыкальный','Երաժշտական'],
 'Musical':['Musical','Мюзикл','Մյուզիքլ'],
 'Mystery':['Mystery','Детектив','Դետեկտիվ'],
 'Romance':['Romance','Мелодрама','Մելոդրամա'],
 'Sci-Fi':['Sci-Fi','Фантастика','Գիտաֆանտաստիկ'],
 'Short':['Short','Короткометражный','Կարճամետրաժ'],
 'Sport':['Sport','Спорт','Սպորտային'],
 'Thriller':['Thriller','Триллер','Թրիլլեր'],
 'TV Movie':['TV Movie','Телефильм','Հեռուստաֆիլմ'],
 'War':['War','Военный','Պատերազմական'],
 'Western':['Western','Вестерн','Վեսթերն']
};
function genreToken(value) { return cleanText(value).normalize('NFC').toLowerCase().replace(/[\s_-]+/g,' '); }
const GENRE_ALIASES = new Map();
for (const [canonical, labels] of Object.entries(GENRE_LABELS)) {
 for (const label of [canonical,...labels]) GENRE_ALIASES.set(genreToken(label),canonical);
}
for (const [alias, canonical] of Object.entries({'Science Fiction':'Sci-Fi','Science-Fiction':'Sci-Fi','SciFi':'Sci-Fi','Historical':'History','Documentary Film':'Documentary','Научная фантастика':'Sci-Fi','Գիտական ֆանտաստիկա':'Sci-Fi'})) GENRE_ALIASES.set(genreToken(alias),canonical);
function canonicalGenre(value) {
 const name=cleanText(value);
 return GENRE_ALIASES.get(genreToken(name)) || name;
}
function movieGenres(row) {
 // PostgREST serializes PostgreSQL text[] as JSON arrays. Do not guess or
 // split arbitrary strings: unsupported shapes must remain visibly unknown.
 const names=Array.isArray(row.genre_names) ? row.genre_names.map(canonicalGenre).filter(Boolean) : [];
 const ids=Array.isArray(row.genre_ids) ? row.genre_ids.map(id=>TMDB_GENRES[id]).filter(Boolean) : [];
 return [...new Set([...names,...ids])];
}
function availableGenres(items) {
 return [...new Set(items.flatMap(movie=>movie.genres || [movie.genre]).map(canonicalGenre).filter(Boolean))];
}
function renderGenreFilters() {
 const container=document.getElementById('genres');
 const genres=['All',...availableGenres(movies)];
 if (!genres.includes(activeGenre)) activeGenre='All';
 const signature=JSON.stringify([currentLanguage,genres]);
 if(container.dataset.signature===signature) return;
 container.dataset.signature=signature;
 const gradients=['#f9234c,#40152d','#ed332f,#29111a','#246a86,#182b40','#dba12a,#61370f','#854c73,#24192d','#5b6873,#11151d','#2779c9,#111c35','#5a8d52,#203b2b'];
 container.innerHTML=genres.map((genre,index)=>`<button class="genre" data-genre="${escapeHTML(genre)}" aria-pressed="false" style="--g:linear-gradient(135deg,${gradients[index%gradients.length]})"><span>${escapeHTML(genre==='All'?translations[currentLanguage].all:genreLabel(genre))}</span></button>`).join('');
}
function localizedMovie(movie, lang = currentLanguage) {
  if (movie.source === 'supabase') {
    const choose = values => cleanText(values?.[lang]) || cleanText(values?.en) || cleanText(values?.ru) || cleanText(values?.hy);
    return {title: choose(movie.titles) || movie.title, desc: choose(movie.descriptions)};
  }
  return {title:movie.title,desc:movie.desc||''};
}
function genreLabel(genre, lang = currentLanguage) {
 const canonical=canonicalGenre(genre);
 return GENRE_LABELS[canonical]?.[{en:0,ru:1,hy:2}[lang] ?? 0] || canonical;
}
function unknownMetadata(key) {
  return {en:{genre:'Genre unavailable',description:'Description unavailable',title:'Untitled'},ru:{genre:'Жанр не указан',description:'Описание отсутствует',title:'Без названия'},hy:{genre:'Ժանրը նշված չէ',description:'Նկարագրությունը հասանելի չէ',title:'Առանց վերնագրի'}}[currentLanguage][key];
}
function verifiedRenditions(row) {
 const proof=row.playback_verification;
 const https=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}};
 if(!proof||proof.watch_url!==cleanText(row.watch_url)||proof.license_verified!==true||proof.playback_verified!==true||proof.commercial_reuse_verified!==true||!https(proof.license_source)||!https(proof.license_terms_source))return [];
 return Array.isArray(proof.renditions)?proof.renditions:[];
}
function mapCatalogMovie(row) {
  const titles = {en:cleanText(row.title_en),ru:cleanText(row.title_ru),hy:cleanText(row.title_hy)};
  const genres = movieGenres(row);
  const date = cleanText(row.release_date);
  return {id:'catalog:' + String(row.id ?? row.tmdb_id),source:'supabase',titles,
    descriptions:{en:cleanText(row.overview_en),ru:cleanText(row.overview_ru),hy:cleanText(row.overview_hy)},
    title:titles.en || titles.ru || titles.hy || '',desc:'',year:/^\d{4}-\d{2}-\d{2}$/.test(date) ? Number(date.slice(0,4)) : null,
    genres,genre:genres[0] || '',kind:row.media_type==='tv'?'TV Show':'Movie',mediaType:row.media_type==='tv'?'tv':'movie',trailer:cleanText(row.trailer_url),rating:row.rating != null ? String(row.rating) : '',duration:'',
    img:posterURL(row.poster_path),backdrop:backdropURL(row.backdrop_path),approvalRequired:Object.prototype.hasOwnProperty.call(row,'rights_verification_status'),approval:row.playback_verification||null,renditions:verifiedRenditions(row),video:cleanText(row.watch_url),progress:globalThis.CineWavePlayer?.progressFor('catalog:'+String(row.id ?? row.tmdb_id))||0};
}
