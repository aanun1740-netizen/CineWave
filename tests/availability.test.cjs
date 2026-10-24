const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const ctx=vm.createContext({URL,location:{href:'https://cinewave.example/',origin:'https://cinewave.example'}});
vm.runInContext(fs.readFileSync('catalog.js','utf8'),ctx);vm.runInContext(fs.readFileSync('availability.js','utf8'),ctx);
const check=(movie,curated=[])=>vm.runInContext(`approvedPlayback(${JSON.stringify(movie)},${JSON.stringify(curated)})`,ctx);
const proof={watch_url:'https://media.example/film.mp4',license_verified:true,playback_verified:true,commercial_reuse_verified:true,license_source:'https://rights.example/film',license_terms_source:'https://rights.example/terms'};
const movie={id:'catalog:1',title:'Catalog film',titles:{en:'Catalog film'},year:2008,video:proof.watch_url,approval:proof};
test('a video URL or publication alone never advertises immediate playback',()=>{
 assert.equal(check({...movie,approval:null}),false);assert.equal(check({...movie,video:''}),false);
 assert.equal(check(movie),true);assert.equal(check({...movie,approval:{...proof,verified:true,license_verified:false}}),false);
 for(const field of ['license_verified','playback_verified','commercial_reuse_verified']){
  assert.equal(check({...movie,approval:{...proof,[field]:false}}),false);
  assert.equal(check({...movie,approval:{...proof,[field]:'true'}}),false);
 }
});
test('approval binds to the exact supported media URL with public license evidence',()=>{
 for(const video of ['https://media.example/other.mp4','https://media.example/film.mkv','javascript:alert(1)','http://external.example/film.mp4','https://user:password@media.example/film.mp4'])assert.equal(check({...movie,video}),false);
 assert.equal(check({...movie,approval:{...proof,license_source:''}}),false);
 assert.equal(check({...movie,approval:{...proof,license_terms_source:'javascript:alert(1)'}}),false);
 const video='https://media.example/film.m3u8?signature=test';assert.equal(check({...movie,video,approval:{...proof,watch_url:video}}),true);
});
test('curated evidence must match title, year, exact URL and completed verification',()=>{
 const record={title_en:'Catalog film',release_date:'2008-04-10',watch_url:movie.video,verified:true,commercial_reuse_verified:true,license_source:proof.license_source,license_terms_source:proof.license_terms_source};
 const without={...movie,approval:null};assert.equal(check(without,[record]),true);
 for(const patch of [{title_en:'Another film'},{release_date:'2009-04-10'},{watch_url:movie.video+'?changed'},{verified:false},{commercial_reuse_verified:false}])assert.equal(check(without,[{...record,...patch}]),false);
 assert.equal(check(without,[null,{},'malformed',42]),false);
 const pending=JSON.parse(fs.readFileSync('data/playback-films.json','utf8')).films;assert.equal(check(without,pending),false);
});
