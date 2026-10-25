// Presentation eligibility only; media authorization remains the host's job.
function approvedPlayback(movie, curated = []) {
 if (!movie || typeof movie.video !== 'string') return false;
 const https = value => {try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
 let source;
 try {source=new URL(movie.video,globalThis.location?.href);}catch{return false;}
 const local=source.protocol==='http:'&&source.origin===globalThis.location?.origin;
 if ((!https(source.href)&&!local)||!/(\.mp4|\.m3u8)$/i.test(source.pathname)) return false;
 const sameFilm = record => {
  if(!record||typeof record!=='object')return false;
  const title=cleanText(record.title_en);
  return Boolean(title)&&title.toLowerCase()===cleanText(movie.titles?.en||movie.title).toLowerCase()&&Number(String(record.release_date||record.candidate_year).slice(0,4))===movie.year;
 };
 const qualifies=(record,managed)=>Boolean(record&&typeof record==='object'&&record.watch_url===movie.video&&record.commercial_reuse_verified===true&&(managed?record.verified===true:(record.license_verified===true&&record.playback_verified===true))&&https(record.license_source)&&https(record.license_terms_source));
 return qualifies(movie.approval,false)||(!movie.approvalRequired&&(Array.isArray(curated)?curated:[]).filter(sameFilm).some(record=>qualifies(record,true)));
}
