/* CineWave HTML5 VOD player. No catalog or authentication writes. */
(() => {
 'use strict';
 const STRINGS = {
  en:{quality:'Quality',auto:'Auto',original:'Original',play:'Play',pause:'Pause',mute:'Mute',unmute:'Unmute',volume:'Volume',seek:'Seek',fullscreen:'Fullscreen',exitFullscreen:'Exit fullscreen',loading:'Loading video…',ready:'Ready to play',unavailable:'This video is unavailable. Check your connection or try again.',unsupported:'This browser cannot play this video format.',missing:'No playable video is available for this title.',retry:'Try again',live:'Live',progress:'Playback progress',autoplay:'Press Play to start the video.',fullscreenError:'Fullscreen is unavailable. You can continue watching here.'},
  ru:{quality:'Качество',auto:'Авто',original:'Оригинал',play:'Воспроизвести',pause:'Пауза',mute:'Выключить звук',unmute:'Включить звук',volume:'Громкость',seek:'Перемотка',fullscreen:'На весь экран',exitFullscreen:'Выйти из полноэкранного режима',loading:'Загрузка видео…',ready:'Готово к просмотру',unavailable:'Видео недоступно. Проверьте соединение или попробуйте снова.',unsupported:'Этот браузер не поддерживает формат видео.',missing:'Для этого фильма нет доступного видео.',retry:'Повторить',live:'Прямой эфир',progress:'Ход просмотра',autoplay:'Нажмите «Воспроизвести», чтобы начать.',fullscreenError:'Полноэкранный режим недоступен. Продолжайте просмотр здесь.'},
  hy:{quality:'Որակ',auto:'Ավտոմատ',original:'Սկզբնական',play:'Նվագարկել',pause:'Դադար',mute:'Անջատել ձայնը',unmute:'Միացնել ձայնը',volume:'Ձայնի ուժգնություն',seek:'Տեղափոխվել',fullscreen:'Ամբողջ էկրանով',exitFullscreen:'Դուրս գալ ամբողջ էկրանից',loading:'Տեսանյութը բեռնվում է…',ready:'Պատրաստ է դիտման',unavailable:'Տեսանյութը հասանելի չէ։ Ստուգեք կապը կամ փորձեք կրկին։',unsupported:'Այս դիտարկիչը չի աջակցում տեսանյութի ձևաչափին։',missing:'Այս ֆիլմի համար հասանելի տեսանյութ չկա։',retry:'Փորձել կրկին',live:'Ուղիղ եթեր',progress:'Դիտման ընթացքը',autoplay:'Սկսելու համար սեղմեք «Նվագարկել»։',fullscreenError:'Ամբողջ էկրանի ռեժիմը հասանելի չէ։ Շարունակեք դիտումը այստեղ։'}
 };
 const storageKey=id=>'cinewave:playback:'+id;
 function readProgress(id) {
  try {const data=JSON.parse(localStorage.getItem(storageKey(id)));return data&&Number.isFinite(data.time)&&data.time>=0&&Number.isFinite(data.duration)&&data.duration>0?data:null;} catch{return null;}
 }
 function progressFor(id) {const data=readProgress(id);return data?Math.max(0,Math.min(100,100*data.time/data.duration)):0;}
 function sourceURL(value) {
  if(typeof value!=='string'||!value.trim())return null;
  try {const url=new URL(value,location.href);if(url.username||url.password)return null;if(url.protocol!=='https:'&&!(url.protocol==='http:'&&url.origin===location.origin))return null;return url.href;}catch{return null;}
 }
 function timeLabel(time) {if(!Number.isFinite(time))return '0:00';const seconds=Math.max(0,Math.floor(time));return (seconds>=3600?Math.floor(seconds/3600)+':':'')+String(Math.floor(seconds/60)%60).padStart(seconds>=3600?2:1,'0')+':'+String(seconds%60).padStart(2,'0');}
 function mount(root,movie,language='en') {
  let lang=STRINGS[language]?language:'en',hls=null,disposed=false,state='loading',lastSaved=-Infinity,restored=false,failed=false,loadingTimer=null,selectedURL=movie.video,pendingSeek=null,pendingPlay=false;
  const events=new AbortController();
  const wrap=document.createElement('section');wrap.className='cw-player';wrap.tabIndex=0;
  wrap.innerHTML='<div class="cw-stage"><video playsinline preload="metadata" controls></video><p class="cw-status" role="status" aria-live="polite"></p></div><div class="cw-controls"><button type="button" data-control="play">▶</button><span class="cw-time"><span data-time="current">0:00</span> / <span data-time="duration">0:00</span></span><input class="cw-seek" type="range" min="0" max="100" step="0.1" value="0" disabled><button type="button" data-control="mute">♪</button><input class="cw-volume" type="range" min="0" max="1" step="0.05" value="1"><select class="cw-quality" hidden></select><button type="button" data-control="fullscreen">⛶</button><button type="button" data-control="retry" hidden>↻</button></div>';
  root.replaceChildren(wrap);
  const video=wrap.querySelector('video'),status=wrap.querySelector('.cw-status'),seek=wrap.querySelector('.cw-seek'),volume=wrap.querySelector('.cw-volume');
  const play=wrap.querySelector('[data-control="play"]'),mute=wrap.querySelector('[data-control="mute"]'),fullscreen=wrap.querySelector('[data-control="fullscreen"]'),retry=wrap.querySelector('[data-control="retry"]');
  const quality=wrap.querySelector('.cw-quality'),controls=wrap.querySelector('.cw-controls');
  let controlsTimer=null,revealOnlyTap=false;
  function revealControls(){
   if(disposed)return;
   wrap.classList.remove('cw-controls-hidden');
   clearTimeout(controlsTimer);
   if(video.paused||video.ended)return;
   controlsTimer=setTimeout(()=>{
    if(disposed||video.paused||video.ended)return;
    const hovering=window.matchMedia('(hover: hover)').matches&&controls.matches(':hover');
    if(!hovering&&!controls.querySelector(':focus-visible'))wrap.classList.add('cw-controls-hidden');
   },3000);
  }
  const configured=(Array.isArray(movie.renditions)?movie.renditions:[]).filter((item,index,array)=>item&&typeof item==='object'&&[360,480,720,1080].includes(Number(item.height))&&sourceURL(item.url)&&item.url!==movie.video&&array.findIndex(other=>other?.url===item.url)===index&&array.findIndex(other=>Number(other?.height)===Number(item.height))===index);
  const isHLS=url=>{try{return /\.m3u8$/i.test(new URL(url,location.href).pathname);}catch{return false;}};
  function buildQuality(){
   const prior=quality.value;quality.replaceChildren();
   if(configured.length){quality.add(new Option(isHLS(movie.video)?t().auto:t().original,'original'));configured.forEach((item,index)=>quality.add(new Option(item.height+'p','source:'+index)));quality.value=selectedURL===movie.video?'original':'source:'+configured.findIndex(item=>item.url===selectedURL);quality.hidden=false;quality.disabled=false;}
   else if(isHLS(selectedURL)){quality.add(new Option(t().auto,'auto'));const seen=new Set();(hls?.levels||[]).forEach((level,index)=>{if(level.height>0&&!seen.has(level.height)){seen.add(level.height);quality.add(new Option(level.height+'p','level:'+index));}});quality.value=[...quality.options].some(option=>option.value===prior)?prior:'auto';quality.hidden=false;quality.disabled=quality.options.length===1;}
   else { quality.replaceChildren(); quality.add(new Option(t().original,'original')); quality.value='original'; quality.hidden=false; quality.disabled=true; }
   label(quality,t().quality);
  }
  const current=wrap.querySelector('[data-time="current"]'),duration=wrap.querySelector('[data-time="duration"]');
  const t=()=>STRINGS[lang];
  const listen=(target,type,handler)=>target.addEventListener(type,handler,{signal:events.signal});
  const label=(node,text)=>{node.setAttribute('aria-label',text);node.title=text;};
  function localize(value=lang) {
   lang=STRINGS[value]?value:'en';wrap.lang=lang;wrap.setAttribute('aria-label',t().progress);
   label(play,video.paused?t().play:t().pause);play.textContent=video.paused?'▶':'❚❚';
   mute.textContent=video.muted||video.volume===0?'🔇':'🔊';label(mute,video.muted||video.volume===0?t().unmute:t().mute);mute.setAttribute('aria-pressed',String(video.muted));
   label(volume,t().volume);label(seek,t().seek);label(fullscreen,document.fullscreenElement===wrap?t().exitFullscreen:t().fullscreen);
   retry.textContent=t().retry;label(retry,t().retry);status.textContent=state?t()[state]:'';status.hidden=!state;
   buildQuality();updateProgress();
  }
  function setState(value){if(disposed)return;clearTimeout(loadingTimer);if(value==='loading')loadingTimer=setTimeout(()=>fail('unavailable'),45000);state=value;status.textContent=value?t()[value]:'';status.hidden=!value;}
  function fail(value='unavailable'){if(disposed)return;failed=true;play.disabled=true;if(hls)hls.stopLoad();video.pause();setState(value);retry.hidden=false;}
  function updateProgress(){
   const finite=Number.isFinite(video.duration)&&video.duration>0;
   seek.disabled=!finite;seek.max=finite?String(video.duration):'100';seek.value=String(finite?Math.min(video.currentTime,video.duration):0);
   seek.setAttribute('aria-valuetext',timeLabel(video.currentTime)+' / '+timeLabel(video.duration));
   current.textContent=timeLabel(video.currentTime);duration.textContent=video.duration===Infinity?t().live:timeLabel(video.duration);
  }
  function save(force=false){
   if(!restored||!Number.isFinite(video.duration)||video.duration<=0||(!force&&Math.abs(video.currentTime-lastSaved)<5))return;
   const data={time:video.currentTime,duration:video.duration};movie.progress=100*data.time/data.duration;lastSaved=data.time;
   try{localStorage.setItem(storageKey(movie.id),JSON.stringify(data));}catch{/* Storage may be disabled. Playback still works. */}
  }
  async function togglePlay(){
   if(!video.paused){video.pause();return;}
   try{await video.play();}catch(error){if(disposed)return;if(error.name==='AbortError')return;if(error.name==='NotAllowedError')setState('autoplay');else fail(error.name==='NotSupportedError'?'unsupported':'unavailable');}
  }
  function attachSource(){
   if(hls){hls.destroy();hls=null;}
   failed=false;restored=false;retry.hidden=true;play.disabled=false;video.pause();video.removeAttribute('src');video.load();
   const url=sourceURL(selectedURL);buildQuality();
   if(!url){fail('missing');retry.hidden=true;return;}
   setState('loading');
   if(/\.m3u8$/i.test(new URL(url).pathname)) {
    if(!window.Hls?.isSupported() && video.canPlayType('application/vnd.apple.mpegurl')){video.src=url;video.load();}
    else if(window.Hls?.isSupported()){
     hls=new window.Hls({maxBufferLength:30});
     hls.on(window.Hls.Events.ERROR,(_event,data)=>{if(data.fatal)fail(data.type===window.Hls.ErrorTypes.MEDIA_ERROR?'unsupported':'unavailable');});
     hls.on(window.Hls.Events.MANIFEST_PARSED,()=>{if(!disposed)buildQuality();});hls.loadSource(url);hls.attachMedia(video);
    }else fail('unsupported');
   }else{video.src=url;video.load();}
  }
  listen(quality,'change',()=>{if(quality.value==='auto'){if(hls)hls.currentLevel=-1;return;}if(quality.value.startsWith('level:')){if(hls)hls.currentLevel=Number(quality.value.slice(6));return;}const next=quality.value==='original'?movie.video:configured[Number(quality.value.slice(7))]?.url;if(!next||next===selectedURL)return;pendingSeek=video.currentTime;pendingPlay=!video.paused;selectedURL=next;attachSource();});
  listen(wrap,'pointermove',event=>{if(event.pointerType!=='touch')revealControls();});
  listen(wrap,'pointerdown',event=>{
   revealOnlyTap=event.pointerType==='touch'&&wrap.classList.contains('cw-controls-hidden');
   revealControls();
  });
  listen(controls,'pointerleave',revealControls);
  listen(controls,'focusin',revealControls);
  listen(controls,'focusout',revealControls);
  listen(play,'click',togglePlay);
  listen(video,'click',()=>{if(revealOnlyTap){revealOnlyTap=false;return;}togglePlay();});
  listen(mute,'click',()=>{video.muted=!(video.muted||video.volume===0);if(!video.muted&&video.volume===0)video.volume=0.5;});
  listen(volume,'input',()=>{video.volume=Number(volume.value);video.muted=video.volume===0;});
  listen(seek,'input',()=>{if(!seek.disabled){video.currentTime=Number(seek.value);updateProgress();}});
  listen(seek,'change',()=>save(true));
  listen(video,'seeked',()=>{updateProgress();save(true);});
  listen(fullscreen,'click',async()=>{try{if(document.fullscreenElement===wrap)await document.exitFullscreen();else if(wrap.requestFullscreen)await wrap.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();else setState('fullscreenError');}catch{setState('fullscreenError');}});
  listen(document,'fullscreenchange',()=>{localize();revealControls();});
  listen(retry,'click',attachSource);
  listen(video,'loadedmetadata',()=>{const saved=readProgress(movie.id);if(pendingSeek!==null&&Number.isFinite(video.duration)){video.currentTime=Math.min(pendingSeek,Math.max(0,video.duration-.1));pendingSeek=null;}else if(!restored&&saved&&Number.isFinite(video.duration)&&saved.time<video.duration-2)video.currentTime=Math.min(saved.time,video.duration);restored=true;updateProgress();if(!failed)setState('ready');if(pendingPlay){pendingPlay=false;video.play().catch(()=>setState('autoplay'));}});
  listen(video,'play',()=>{setState('');localize();revealControls();});listen(video,'pause',()=>{save(true);localize();revealControls();});
  listen(video,'volumechange',()=>{volume.value=String(video.muted?0:video.volume);localize();});
  listen(window,'pagehide',()=>save(true));
  listen(video,'timeupdate',()=>{updateProgress();save();});listen(video,'ended',()=>{save(true);localize();revealControls();});
  listen(video,'waiting',()=>{if(!failed)setState('loading');});listen(video,'playing',()=>setState(''));
  listen(video,'error',()=>fail(video.error?.code===4?'unsupported':'unavailable'));
  listen(wrap,'keydown',event=>{if(event.key==='Tab')revealControls();if(![wrap,video].includes(event.target))return;if(event.key===' '){event.preventDefault();togglePlay();}else if(['ArrowLeft','ArrowRight'].includes(event.key)&&Number.isFinite(video.duration)){event.preventDefault();video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+(event.key==='ArrowRight'?5:-5)));}});
  video.controls=false;localize();attachSource();
  return {video,localize,destroy(){if(disposed)return;save(true);disposed=true;clearTimeout(loadingTimer);clearTimeout(controlsTimer);events.abort();if(document.fullscreenElement===wrap)document.exitFullscreen().catch(()=>{});if(video.webkitDisplayingFullscreen&&video.webkitExitFullscreen)video.webkitExitFullscreen();if(hls)hls.destroy();video.pause();video.removeAttribute('src');video.load();}};
 }
 window.CineWavePlayer={mount,sourceURL,timeLabel,readProgress,progressFor};
})();
