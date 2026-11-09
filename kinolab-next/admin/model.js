/* Shared, side-effect-free Admin validation. Database policies are authoritative. */
(() => {
 const fields=['title_en','title_ru','title_hy','overview_en','overview_ru','overview_hy','release_date','poster_path','backdrop_path','trailer_url','embed_url','watch_url','rights_holder','license_type','original_source_url','license_evidence_url','license_terms_url','attribution'];
 const https=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}};
 const media=value=>https(value)&&/\.(mp4|webm|m3u8)$/i.test(new URL(value).pathname);
 function renditions(values){
  if(!Array.isArray(values)||values.length>4)throw new Error('Use at most four actual renditions.');
  const seen=new Set(),urls=new Set();return values.map(row=>{const height=Number(row.height),url=String(row.url||'').trim();if(![360,480,720,1080].includes(height)||seen.has(height)||urls.has(url)||!media(url))throw new Error('Each rendition needs a distinct supported height and an actual HTTPS MP4/WebM/HLS URL.');seen.add(height);urls.add(url);return {height,url};});
 }
 function payload(values,sources){
  const out={};for(const name of fields)out[name]=String(values[name]||'').trim()||null;
  if(!out.title_en)throw new Error('An English title is required.');
  for(const name of ['trailer_url','original_source_url','license_evidence_url','license_terms_url'])if(out[name]&&!https(out[name]))throw new Error(name+' must be an HTTPS URL without credentials.');
  if(out.embed_url&&!https(out.embed_url))throw new Error('Embed URL must be an HTTPS URL.');
  if(out.watch_url&&!media(out.watch_url))throw new Error('Use an HTTPS MP4, WebM or .m3u8 URL for playback.');
  for(const name of ['poster_path','backdrop_path'])if(out[name]&&!https(out[name])&&!/^\/?[\w-]+\.(png|jpg|jpeg|webp)$/i.test(out[name]))throw new Error('Artwork must be an HTTPS URL or an existing TMDB file path.');
  if(out.release_date&&!/^\d{4}-\d{2}-\d{2}$/.test(out.release_date))throw new Error('Use a valid ISO release date.');
  out.media_type=values.media_type==='tv'?'tv':'movie';
  out.genre_names=[...new Set(String(values.genres||'').split(',').map(s=>s.trim()).filter(Boolean))];out.video_renditions=renditions(sources);if(out.video_renditions.some(source=>source.url===out.watch_url))throw new Error('A rendition must not repeat the primary URL.');out.commercial_streaming_permission=values.commercial_streaming_permission===true;return out;
 }
 function ready(row){const p=row.playback_verification;return Boolean(p&&p.watch_url===row.watch_url&&p.license_verified===true&&p.playback_verified===true&&p.commercial_reuse_verified===true&&https(p.license_source)&&https(p.license_terms_source)&&media(row.watch_url));}
 function asset(file){if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8388608||file.size<=0)throw new Error('Choose a JPEG, PNG or WebP image up to 8 MB. SVG and empty files are not accepted.');return {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];}
 window.CineWaveAdminModel={fields,https,media,renditions,payload,ready,asset};
})();
