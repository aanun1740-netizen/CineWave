const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const context=vm.createContext({window:{},URL});vm.runInContext(fs.readFileSync('admin/model.js','utf8'),context);const m=context.window.CineWaveAdminModel;
test('Admin payload keeps multilingual fields and text-array genres without accepting privileged fields',()=>{
 const value=m.payload({title_en:'Film',title_ru:'Фильм',title_hy:'Ֆիլմ',genres:'Action, Drama, Action',is_published:true,playback_verification:{verified:true},commercial_streaming_permission:true},[]);
 assert.equal(value.title_ru,'Фильм');assert.equal(value.title_hy,'Ֆիլմ');assert.deepEqual([...value.genre_names],['Action','Drama']);assert.equal(value.is_published,undefined);assert.equal(value.playback_verification,undefined);assert.equal(value.commercial_streaming_permission,true);
});
test('Media/quality inputs must be real distinct supported sources',()=>{
 assert.throws(()=>m.renditions([{height:720,url:'https://media.example/a.mp4'},{height:720,url:'https://media.example/b.mp4'}]));
 assert.throws(()=>m.renditions([{height:1080,url:'javascript:alert(1)'}]));
 assert.throws(()=>m.renditions([{height:360,url:'https://media.example/a.mp4'},{height:720,url:'https://media.example/a.mp4'}]));
 for(const height of [360,480,720,1080])assert.equal(m.renditions([{height,url:'https://media.example/'+height+'.mp4'}])[0].height,height);
 assert.equal(m.renditions([{height:360,url:'https://media.example/a.mp4'}])[0].height,360);
 assert.equal(m.media('https://media.example/master.m3u8?token=sample'),true);assert.equal(m.media('https://user:pass@media.example/a.mp4'),false);
 assert.equal(m.ready({watch_url:'https://media.example/a.mp4'}),false);
});
test('Uploads reject SVG, oversized or empty assets',()=>{
 assert.throws(()=>m.asset({type:'image/svg+xml',size:100}));assert.throws(()=>m.asset({type:'image/jpeg',size:8388609}));assert.throws(()=>m.asset({type:'image/png',size:0}));assert.equal(m.asset({type:'image/webp',size:100}),'webp');
});
