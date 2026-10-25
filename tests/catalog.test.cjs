const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const ctx=vm.createContext({URL});
vm.runInContext(fs.readFileSync('catalog.js','utf8'),ctx);
const run=code=>vm.runInContext(code,ctx);
test('poster paths, trusted catalog URLs and malformed Commons imports',()=>{
 assert.equal(run("posterURL('/abc.jpg')"),'https://image.tmdb.org/t/p/w500/abc.jpg');
 assert.equal(run("posterURL('abc.jpg')"),'https://image.tmdb.org/t/p/w500/abc.jpg');
 assert.equal(run("posterURL(' https://cdn.example.org/poster.jpg ')"),'https://cdn.example.org/poster.jpg');
 const broken='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent('http://commons.wikimedia.org/wiki/Special:FilePath/12%20Angry%20Men.jpg');
 assert.equal(run(`posterURL(${JSON.stringify(broken)})`),'https://commons.wikimedia.org/wiki/Special:FilePath/12%20Angry%20Men.jpg');
 for(const value of [null,'','null','javascript:alert(1)','data:image/svg+xml,x','https://user:pass@example.org/x']) assert.equal(run(`posterURL(${JSON.stringify(value)})`),'assets/poster-fallback.svg');
});
test('catalog identity and metadata never inherit demo translations or guessed genres',()=>{
 assert.equal(run("mapCatalogMovie({id:1}).id"),'catalog:1');
 assert.equal(run("mapCatalogMovie({id:1}).genre"),'');
 assert.equal(run("mapCatalogMovie({id:1}).year"),null);
 assert.equal(run("movieGenres({genre_names:['Science Fiction','Action'],genre_ids:[878,28,999]}).join(',')"),'Sci-Fi,Action');
});
test('localization chooses supplied fields independently with honest fallback',()=>{
 assert.equal(run("localizedMovie(mapCatalogMovie({id:1,title_en:'Real film',title_ru:'Фильм',overview_en:'Actual overview'}),'ru').title"),'Фильм');
 assert.equal(run("localizedMovie(mapCatalogMovie({id:1,title_en:'Real film',overview_en:'Actual overview'}),'hy').desc"),'Actual overview');
 assert.equal(run("localizedMovie(mapCatalogMovie({id:1}),'en').desc"),'');
 assert.equal(run(`escapeHTML('<img onerror="x">')`),'&lt;img onerror=&quot;x&quot;&gt;');
});
test('PostgREST text arrays normalize aliases, translations, whitespace and duplicates',()=>{
 assert.equal(run("movieGenres({genre_names:[' action ','Боевик','Մարտաֆիլմ','Science Fiction','Фантастика','Գիտաֆանտաստիկ','',null,8]}).join(',')"),'Action,Sci-Fi');
 assert.equal(run("movieGenres({genre_names:['Crime','Thriller','Crime',' Documentary ']}).join(',')"),'Crime,Thriller,Documentary');
 for (const value of [null,[],[' ',null],'{Action,Drama}','Action, Drama']) assert.equal(run(`movieGenres({genre_names:${JSON.stringify(value)}}).length`),0);
 assert.equal(run("movieGenres({genre_names:['Experimental']}).join(',')"),'Experimental');
});
test('all supported genres have language-independent keys and three translated labels',()=>{
 assert.equal(run("Object.entries(GENRE_LABELS).every(([key,labels])=>labels.length===3&&labels.every(label=>canonicalGenre(label)===key))"),true);
 assert.equal(run("genreLabel('Crime','ru')"),'Криминал');
 assert.equal(run("genreLabel('Thriller','hy')"),'Թրիլլեր');
 assert.equal(run("availableGenres([{genres:['Action','Thriller']},{genres:['Thriller','Crime']}]).join(',')"),'Action,Thriller,Crime');
});

test('hero backdrops resize only recognized TMDB paths and never invent artwork',()=>{
 assert.equal(run("backdropURL('/landscape.jpg')"),'https://image.tmdb.org/t/p/w1280/landscape.jpg');
 assert.equal(run("backdropURL('https://art.example/w500/custom.jpg')"),'https://art.example/w500/custom.jpg');
 assert.equal(run("backdropURL(null)"),null);
 assert.equal(run("backdropURL('javascript:alert(1)')"),null);
});

test('renditions come only from a complete approval bound to the primary URL',()=>{
 const row={watch_url:'https://media.example/film.mp4',video_renditions:[{height:1080,url:'https://unreviewed.example/film.mp4'}],playback_verification:{watch_url:'https://media.example/film.mp4',license_verified:true,playback_verified:true,commercial_reuse_verified:true,license_source:'https://rights.example/film',license_terms_source:'https://rights.example/terms',renditions:[{height:360,url:'https://media.example/360.mp4'}]}};
 assert.equal(run(`verifiedRenditions(${JSON.stringify(row)})[0].height`),360);
 row.playback_verification.watch_url='https://media.example/another.mp4';assert.equal(run(`verifiedRenditions(${JSON.stringify(row)}).length`),0);
 row.playback_verification.watch_url=row.watch_url;row.playback_verification.license_verified=false;assert.equal(run(`verifiedRenditions(${JSON.stringify(row)}).length`),0);
});
