const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
let stored=null;
const context=vm.createContext({window:{},location:new URL('http://127.0.0.1:8000/'),URL,localStorage:{getItem(){return stored;}}});
vm.runInContext(fs.readFileSync('player.js','utf8'),context);
const player=context.window.CineWavePlayer;
test('media URLs allow HTTPS and local same-origin HTTP, reject credential and script URLs',()=>{
 assert.equal(player.sourceURL('https://media.example.org/movie.m3u8?token=sample'),'https://media.example.org/movie.m3u8?token=sample');
 assert.equal(player.sourceURL('/fixture.mp4'),'http://127.0.0.1:8000/fixture.mp4');
 for(const url of ['',null,'javascript:alert(1)','data:video/mp4;base64,abc','https://user:password@example.org/a.mp4','http://external.example.org/a.mp4'])assert.equal(player.sourceURL(url),null);
});
test('progress treats absent/malformed storage safely and bounds displayed percentage',()=>{
 for(const value of [null,'bad-json','{}','{"time":-1,"duration":100}','{"time":4,"duration":0}']){stored=value;assert.equal(player.progressFor('catalog:1'),0);}
 stored='{"time":20,"duration":80}';assert.equal(player.progressFor('catalog:1'),25);
 stored='{"time":100,"duration":80}';assert.equal(player.progressFor('catalog:1'),100);
 context.localStorage.getItem=()=>{throw new Error('blocked storage');};assert.equal(player.progressFor('catalog:1'),0);
});
test('time display supports zero, minutes and hours',()=>{
 assert.equal(player.timeLabel(0),'0:00');assert.equal(player.timeLabel(75.9),'1:15');assert.equal(player.timeLabel(3661),'1:01:01');assert.equal(player.timeLabel(Infinity),'0:00');
});
