// Hash routes work on GitHub Pages without server-side rewrites.
(() => {
 const nav={home:'Home',movies:'Movies',tv:'TV Shows','my-list':'My List'};
 let current='',underlay='home',applying=false,pending=null;
 function parse(){const hash=location.hash;if(!hash||hash==='#')return 'home';if(/^#(?:access_token|refresh_token|error)=/.test(hash))return 'home';return hash.replace(/^#\/?/,'');}
 function apply(route,options={}){
  if(applying)return;applying=true;
  try{
   const parts=route.split('/'),page=parts[0];current=route;
   if(page in nav){
    document.body.classList.remove('account-view');$('accountPages').hidden=true;closeMovie(true);
    if(!options.preserve){activeNav=nav[page];activeGenre='All';$('search').value='';$('clearSearch').hidden=true;}
    underlay=page;pending=null;render();
   }else if(['login','register','profile','forgot','recover'].includes(page)){
    closeMovie(true);$('profilePanel').hidden=true;$('profileButton').setAttribute('aria-expanded','false');window.CineWaveAccounts.show(page);
   }else if(['movie','watch'].includes(page)){
    document.body.classList.remove('account-view');$('accountPages').hidden=true;
    let id;try{id=decodeURIComponent(parts.slice(1).join('/'));}catch{id='';}
    const movie=movies.find(m=>m.id===id);if(movie){pending=null;openMovie(movie,page==='watch'?'watch':'details');}
    else if(catalogState==='loading'){pending=route;}
    else{pending=null;activePlayer?.destroy();activePlayer=null;currentMovie=null;$('modalTitle').textContent={en:'Title unavailable',ru:'Фильм недоступен',hy:'Ֆիլմը հասանելի չէ'}[currentLanguage];$('modalDesc').textContent=uiText('empty');$('modalMeta').replaceChildren();$('videoWrap').replaceChildren();$('modalWatch').hidden=true;$('modalTrailer').hidden=true;$('modalList').disabled=true;$('modal').classList.add('open');document.body.classList.add('has-player-dialog');}
   }else{navigate('home',{replace:true});}
  }finally{applying=false;}
 }
 function navigate(route,options={}){
  if(!/^(home|movies|tv|my-list|login|register|profile|forgot|recover|movie\/[^\s]+|watch\/[^\s]+)$/.test(route))route='home';
  if(applying){queueMicrotask(()=>navigate(route,options));return;}
  const href='#/'+route;if(location.hash!==href)history[options.replace?'replaceState':'pushState'](null,'',href);
  apply(route,options);if(!['movie','watch'].includes(route.split('/')[0]))window.scrollTo({top:0,behavior:reducedMotion()?'auto':'smooth'});
 }
 function refresh(){if(applying)return;if(pending&&catalogState!=='loading')apply(pending);else if(['profile','recover','login','register'].includes(current.split('/')[0]))apply(current);}
 function closeDetails(){if(['movie','watch'].includes(current.split('/')[0]))navigate(underlay,{replace:true,preserve:true});}
 function listing(page){if(!nav[page])return;current=page;underlay=page;pending=null;history.replaceState(null,'','#/'+page);}
 window.CineWaveRouter={navigate,refresh,closeDetails,listing,get route(){return current;}};
 window.addEventListener('popstate',()=>apply(parse()));window.addEventListener('hashchange',()=>apply(parse()));
 document.addEventListener('click',event=>{const link=event.target.closest('[data-route]');if(link){event.preventDefault();navigate(link.dataset.route);}});
 const initial=parse();history.replaceState(null,'','#/'+initial);apply(initial);
})();
