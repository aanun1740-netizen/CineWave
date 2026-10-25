/* Public storefront. Reads published catalog rows; never writes to Supabase. */
const translations={
 en:{all:'All Movies',home:'Discover',movies:'Movies',tv:'TV Shows',list:'My List',search:'Search titles...',clear:'Clear search',chooseLanguage:'Choose language',profile:'Your space',profileNote:'Your next movie night starts here. {count} saved titles, kept on this device.',skip:'Skip to movies',mainNav:'Main navigation',mobileNav:'Mobile navigation',collection:'THE CINEWAVE COLLECTION',genericHero:'Your next great film.',genericDescription:'A new perspective. A familiar favorite. Find a story that stays with you.',details:'View details',watch:'Watch Now',add:'My List',inList:'In My List',heroCaption:'{count} films. A world of stories.',featured:'Featured movies',feature:'Feature {title}',mood:'FOLLOW YOUR MOOD',genreHeading:'Find your kind of cinema',allGenres:'All genres',catalogEyebrow:'A WORLD OF STORIES',discover:'Discover the collection',ready:'Ready to play',continue:'Continue watching',throughYears:'Through the years',yearsSubtitle:'Explore the collection, from {first} to {last}.',reset:'Reset filters',empty:'No films found. Try another search or genre.',emptyList:'Your list is waiting for a story. Save a film to find it here.',noCatalog:'The collection is empty. Check back for new stories.',loading:'Bringing the collection to you…',loadError:'The collection could not be loaded. Please try again.',retry:'Try again',catalogOnly:'Catalog',available:'Watch now',browseOnly:'This film is available to explore. Playback is not currently available.',descriptionFallback:'Explore this title and save it for your next movie night.',descriptionUnknown:'Description unavailable',titleUnknown:'Untitled',added:'Added to My List',removed:'Removed from My List',previous:'Previous movies',next:'Next movies',rowLabel:'Movie collection',close:'Close',footer:'Discover stories. Save your favorites. Playback is available for approved releases.',askTitle:'A little inspiration for your next film?',askText:'Meet your cinema companion. Ask CineWave AI for a recommendation.',ask:'Find my next film',aiWelcome:'Hello! I’m CineWave’s movie assistant. What would you like to watch?',aiMessage:'Your message',aiPlaceholder:'Ask about a film…',aiThinking:'Finding a little movie inspiration…',aiError:'The assistant is unavailable right now. Please try again.',aiNoAnswer:'No answer was returned. Please try again.',aiClose:'Close chat',aiSend:'Send message',aiEyebrow:'YOUR CINEMA COMPANION'},
 ru:{all:'Все фильмы',home:'Главная',movies:'Фильмы',tv:'Сериалы',list:'Мой список',search:'Поиск фильмов...',clear:'Очистить поиск',chooseLanguage:'Выбрать язык',profile:'Ваше пространство',profileNote:'Ваш следующий киновечер начинается здесь. Сохранено фильмов на этом устройстве: {count}.',skip:'Перейти к фильмам',mainNav:'Главная навигация',mobileNav:'Мобильная навигация',collection:'КОЛЛЕКЦИЯ CINEWAVE',genericHero:'Ваш следующий любимый фильм.',genericDescription:'Новый взгляд. Любимая классика. Найдите историю, которая останется с вами.',details:'О фильме',watch:'Смотреть',add:'Мой список',inList:'В моём списке',heroCaption:'{count} фильмов. Целый мир историй.',featured:'Избранные фильмы',feature:'Выбрать: {title}',mood:'ПО ВАШЕМУ НАСТРОЕНИЮ',genreHeading:'Найдите своё кино',allGenres:'Все жанры',catalogEyebrow:'ЦЕЛЫЙ МИР ИСТОРИЙ',discover:'Откройте коллекцию',ready:'Можно смотреть',continue:'Продолжить просмотр',throughYears:'Сквозь годы',yearsSubtitle:'Откройте коллекцию: с {first} по {last} год.',reset:'Сбросить фильтры',empty:'Фильмы не найдены. Измените запрос или жанр.',emptyList:'Ваш список ждёт свою историю. Сохраните фильм, чтобы найти его здесь.',noCatalog:'В коллекции пока нет фильмов. Загляните позже.',loading:'Загружаем коллекцию…',loadError:'Не удалось загрузить коллекцию. Попробуйте ещё раз.',retry:'Повторить',catalogOnly:'Каталог',available:'Смотреть',browseOnly:'Вы можете узнать об этом фильме и сохранить его. Просмотр пока недоступен.',descriptionFallback:'Узнайте больше об этом фильме и сохраните его для следующего киновечера.',descriptionUnknown:'Описание отсутствует',titleUnknown:'Без названия',added:'Добавлено в мой список',removed:'Удалено из моего списка',previous:'Предыдущие фильмы',next:'Следующие фильмы',rowLabel:'Коллекция фильмов',close:'Закрыть',footer:'Открывайте истории. Сохраняйте любимое. Просмотр доступен для одобренных релизов.',askTitle:'Ищете вдохновение для киновечера?',askText:'Ваш помощник в мире кино. Попросите CineWave AI порекомендовать фильм.',ask:'Подобрать фильм',aiWelcome:'Здравствуйте! Я кинопомощник CineWave. Что вы хотели бы посмотреть?',aiMessage:'Ваше сообщение',aiPlaceholder:'Спросите о фильме…',aiThinking:'Ищем вдохновение для киновечера…',aiError:'Помощник сейчас недоступен. Попробуйте ещё раз.',aiNoAnswer:'Ответ не получен. Попробуйте ещё раз.',aiClose:'Закрыть чат',aiSend:'Отправить сообщение',aiEyebrow:'ВАШ ПОМОЩНИК В МИРЕ КИНО'},
 hy:{all:'Բոլոր ֆիլմերը',home:'Գլխավոր',movies:'Ֆիլմեր',tv:'Սերիալներ',list:'Իմ ցանկը',search:'Որոնել ֆիլմ...',clear:'Մաքրել որոնումը',chooseLanguage:'Ընտրել լեզուն',profile:'Ձեր անկյունը',profileNote:'Ձեր հաջորդ կինոերեկոն սկսվում է այստեղ։ Այս սարքում պահպանված ֆիլմեր՝ {count}։',skip:'Անցնել ֆիլմերին',mainNav:'Գլխավոր նավարկում',mobileNav:'Բջջային նավարկում',collection:'CINEWAVE ՀԱՎԱՔԱԾՈՒ',genericHero:'Ձեր հաջորդ սիրելի ֆիլմը։',genericDescription:'Նոր հայացք։ Սիրելի դասական։ Գտեք մի պատմություն, որը կմնա ձեզ հետ։',details:'Ֆիլմի մասին',watch:'Դիտել հիմա',add:'Իմ ցանկը',inList:'Իմ ցանկում է',heroCaption:'{count} ֆիլմ։ Պատմությունների մի ամբողջ աշխարհ։',featured:'Ընտրված ֆիլմեր',feature:'Ընտրել՝ {title}',mood:'ԸՍՏ ՁԵՐ ՏՐԱՄԱԴՐՈՒԹՅԱՆ',genreHeading:'Գտեք ձեր կինոն',allGenres:'Բոլոր ժանրերը',catalogEyebrow:'ՊԱՏՄՈՒԹՅՈՒՆՆԵՐԻ ԱՇԽԱՐՀ',discover:'Բացահայտեք հավաքածուն',ready:'Հասանելի է դիտման',continue:'Շարունակել դիտումը',throughYears:'Տարիների միջով',yearsSubtitle:'Բացահայտեք հավաքածուն՝ {first}–{last}։',reset:'Մաքրել զտիչները',empty:'Ֆիլմ չի գտնվել։ Փորձեք այլ որոնում կամ ժանր։',emptyList:'Ձեր ցանկը սպասում է իր պատմությանը։ Պահպանեք ֆիլմը՝ այստեղ գտնելու համար։',noCatalog:'Հավաքածուն դեռ դատարկ է։ Վերադարձեք նոր պատմությունների համար։',loading:'Բեռնում ենք հավաքածուն…',loadError:'Չհաջողվեց բեռնել հավաքածուն։ Փորձեք կրկին։',retry:'Փորձել կրկին',catalogOnly:'Հավաքածու',available:'Դիտել հիմա',browseOnly:'Կարող եք ծանոթանալ այս ֆիլմին և պահպանել այն։ Դիտումը դեռ հասանելի չէ։',descriptionFallback:'Ծանոթացեք այս ֆիլմին և պահպանեք այն հաջորդ կինոերեկոյի համար։',descriptionUnknown:'Նկարագրությունը հասանելի չէ',titleUnknown:'Առանց վերնագրի',added:'Ավելացվեց իմ ցանկում',removed:'Հեռացվեց իմ ցանկից',previous:'Նախորդ ֆիլմերը',next:'Հաջորդ ֆիլմերը',rowLabel:'Ֆիլմերի հավաքածու',close:'Փակել',footer:'Բացահայտեք պատմություններ։ Պահպանեք սիրելիները։ Դիտումը հասանելի է հաստատված թողարկումների համար։',askTitle:'Ոգեշնչո՞ւմ եք փնտրում հաջորդ ֆիլմի համար։',askText:'Ձեր ուղեկիցը կինոյի աշխարհում։ Խնդրեք CineWave AI-ին ֆիլմ առաջարկել։',ask:'Գտնել իմ հաջորդ ֆիլմը',aiWelcome:'Բարև։ Ես CineWave-ի կինոօգնականն եմ։ Ի՞նչ կցանկանաք դիտել։',aiMessage:'Ձեր հաղորդագրությունը',aiPlaceholder:'Հարցրեք ֆիլմի մասին…',aiThinking:'Որոնում ենք կինոոգեշնչում…',aiError:'Օգնականն այս պահին հասանելի չէ։ Փորձեք կրկին։',aiNoAnswer:'Պատասխան չի ստացվել։ Փորձեք կրկին։',aiClose:'Փակել զրույցը',aiSend:'Ուղարկել հաղորդագրությունը',aiEyebrow:'ՁԵՐ ԿԻՆՈՈՒՂԵԿԻՑԸ'}
};
const $=id=>document.getElementById(id);
const movies=[];
let currentLanguage='en',activeGenre='All',activeNav='Home',currentMovie=null,activePlayer=null,playerOpener=null,currentMovieMode='details',featuredMovie=null,heroIndex=0,approvedFilms=[],catalogState='loading',loadingCatalog=false;
const failedArtwork=new Set();
let watchList=new Set();
try {const saved=JSON.parse(localStorage.getItem('cinewave:my-list'));if(Array.isArray(saved))watchList=new Set(saved.filter(id=>typeof id==='string'));const lang=localStorage.getItem('cinewave:language');if(translations[lang])currentLanguage=lang;}catch{/* Device storage is optional. */}
function uiText(key,params={}){return String(translations[currentLanguage][key]??translations.en[key]??key).replace(/\{(\w+)\}/g,(_match,name)=>String(params[name]??''));}
function icon(name){return `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;}
function isWatchable(movie){return approvedPlayback(movie,approvedFilms);}
function toast(message){$('toast').textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').textContent='',2400);}
async function toggleList(movie){if(!movie)return;const wasSaved=watchList.has(movie.id);const account=window.CineWaveAccounts;if(account&&!account.ready){toast(account.text('working'));return;}if(account?.signedIn){const ok=await account.changeList(movie);if(!ok)return;}const exists=wasSaved;if(exists)watchList.delete(movie.id);else watchList.add(movie.id);if(!account?.signedIn){try{localStorage.setItem('cinewave:my-list',JSON.stringify([...watchList]));}catch{}}toast(uiText(exists?'removed':'added'));renderHero();updateProfile();if(currentMovie){$('modalList').textContent=(watchList.has(currentMovie.id)?'✓ ':'＋ ')+uiText(watchList.has(currentMovie.id)?'inList':'list');$('modalList').setAttribute('aria-pressed',String(watchList.has(currentMovie.id)));}if(activeNav==='My List')render();}
function updateProfile(){if(window.CineWaveAccounts)window.CineWaveAccounts.updateMenu();else $('profileNote').textContent=uiText('profileNote',{count:watchList.size});}
function card(movie){
 const title=localizedMovie(movie).title||uiText('titleUnknown'),available=isWatchable(movie);
 const metadata=[movie.year,(movie.genres||[movie.genre]).filter(Boolean).map(g=>genreLabel(g)).join(' · ')||unknownMetadata('genre')].filter(Boolean).join(' • ');
 return `<article class="movie" data-id="${escapeHTML(movie.id)}" tabindex="0" role="button" aria-label="${escapeHTML(title+' — '+uiText(available?'watch':'details'))}"><div class="poster"><img loading="lazy" decoding="async" width="500" height="750" src="${escapeHTML(failedArtwork.has(movie.img)?POSTER_FALLBACK:movie.img||POSTER_FALLBACK)}" alt="${escapeHTML(title)}"><span class="poster-badge ${available?'available':''}">${escapeHTML(uiText(available?'available':'catalogOnly'))}</span><span class="play-overlay">${icon(available?'play':'info')}${escapeHTML(uiText(available?'watch':'details'))}</span></div><div class="movie-title">${escapeHTML(title)}</div><div class="movie-meta">${escapeHTML(metadata)}${movie.progress?`<div class="progress"><div style="width:${Math.max(0,Math.min(100,Number(movie.progress)||0))}%"></div></div>`:''}</div></article>`;
}
document.addEventListener('error',event=>{const img=event.target;if(img.matches?.('.poster img')&&!img.dataset.fallback){failedArtwork.add(img.currentSrc||img.src);img.dataset.fallback='true';img.src=POSTER_FALLBACK;}},true);
function heroChoices(){return [...movies].sort((a,b)=>Number(isWatchable(b))-Number(isWatchable(a))||Number(b.img!==POSTER_FALLBACK)-Number(a.img!==POSTER_FALLBACK)).slice(0,5);}
function renderHero(){
 const choices=heroChoices();heroIndex=choices.length?heroIndex%choices.length:0;featuredMovie=choices[heroIndex]||null;
 const info=featuredMovie?localizedMovie(featuredMovie):null;
 $('heroTitle').textContent=info?.title||uiText('genericHero');$('heroDescription').textContent=info?(info.desc||uiText('descriptionFallback')):uiText('genericDescription');
 const metadata=featuredMovie?[featuredMovie.year,...(featuredMovie.genres||[]).map(g=>genreLabel(g)),featuredMovie.rating].filter(Boolean):[];
 $('heroMeta').replaceChildren(...metadata.map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));
 $('heroWatch').disabled=!featuredMovie;$('heroList').disabled=!featuredMovie;
 $('heroWatch').innerHTML=icon(featuredMovie&&isWatchable(featuredMovie)?'play':'info')+'<span>'+escapeHTML(uiText(featuredMovie&&isWatchable(featuredMovie)?'watch':'details'))+'</span>';
 $('heroList').innerHTML=icon('heart')+'<span>'+escapeHTML(uiText(featuredMovie&&watchList.has(featuredMovie.id)?'inList':'list'))+'</span>';
 $('heroList').setAttribute('aria-pressed',String(Boolean(featuredMovie&&watchList.has(featuredMovie.id))));
 $('heroCaption').textContent=uiText('heroCaption',{count:movies.length});
 const suppliedPoster=featuredMovie?.img&&featuredMovie.img!==POSTER_FALLBACK?featuredMovie.img:null;
 const poster=suppliedPoster&&!failedArtwork.has(suppliedPoster)?suppliedPoster:null;
 const suppliedBackdrop=featuredMovie?.backdrop&&featuredMovie.backdrop!==POSTER_FALLBACK?featuredMovie.backdrop:suppliedPoster;
 const backdrop=suppliedBackdrop&&!failedArtwork.has(suppliedBackdrop)?suppliedBackdrop:null;
 $('heroArt').hidden=!poster;$('heroBackdrop').hidden=!backdrop;
 if(poster&&$('heroPoster').getAttribute('src')!==poster)$('heroPoster').src=poster;
 if(backdrop&&$('heroBackdrop').getAttribute('src')!==backdrop)$('heroBackdrop').src=backdrop;
 $('heroPoster').alt=info?.title||'';
 $('heroPoster').onerror=()=>{failedArtwork.add($('heroPoster').currentSrc||$('heroPoster').src);$('heroArt').hidden=true;};$('heroBackdrop').onerror=()=>{failedArtwork.add($('heroBackdrop').currentSrc||$('heroBackdrop').src);$('heroBackdrop').hidden=true;};
 $('heroPagination').setAttribute('aria-label',uiText('featured'));
 $('heroPagination').innerHTML=choices.map((movie,index)=>`<button data-feature="${index}" class="${index===heroIndex?'active':''}" aria-label="${escapeHTML(uiText('feature',{title:localizedMovie(movie).title}))}" aria-pressed="${index===heroIndex}"></button>`).join('');
}
function render(){
 renderGenreFilters();renderHero();updateProfile();
 const query=$('search').value.trim().toLowerCase();document.body.classList.toggle('is-browsing',Boolean(query||activeGenre!=='All'||activeNav!=='Home'));
 const filtered=movies.filter(movie=>(activeGenre==='All'||(movie.genres||[]).includes(activeGenre))&&(!query||[localizedMovie(movie).title,...Object.values(movie.titles||{}),...(movie.genres||[]).flatMap(g=>[g,genreLabel(g)])].some(value=>String(value).toLowerCase().includes(query)))&&(activeNav!=='My List'||watchList.has(movie.id))&&(activeNav!=='TV Shows'||movie.kind==='TV Show')&&(activeNav!=='Movies'||movie.kind==='Movie'));
 $('movies').innerHTML=filtered.map(card).join('');$('empty').hidden=filtered.length>0||catalogState==='loading'||catalogState==='error';
 $('empty').textContent=uiText(activeNav==='My List'?'emptyList':movies.length?'empty':'noCatalog');
 $('popularHeading').textContent=activeGenre!=='All'?genreLabel(activeGenre)+' • CineWave':uiText({Home:'discover',Movies:'movies','TV Shows':'tv','My List':'list'}[activeNav]);
 $('catalogSection').classList.toggle('is-results',Boolean(query||activeGenre!=='All'||activeNav!=='Home'));
 const available=movies.filter(isWatchable),continuing=available.filter(movie=>movie.progress>0&&movie.progress<99);
 $('watchableGrid').innerHTML=available.map(card).join('');$('watchableSection').hidden=!available.length||activeNav!=='Home'||Boolean(query)||activeGenre!=='All';
 $('continueGrid').innerHTML=continuing.map(card).join('');$('continueSection').hidden=!continuing.length||activeNav!=='Home'||Boolean(query)||activeGenre!=='All';
 const byYear=[...movies].sort((a,b)=>(b.year||0)-(a.year||0));$('newGrid').innerHTML=byYear.slice(0,12).map(card).join('');$('newSection').hidden=!movies.length||activeNav!=='Home'||Boolean(query)||activeGenre!=='All';
 const years=movies.map(m=>m.year).filter(Boolean);$('newSubtitle').textContent=years.length?uiText('yearsSubtitle',{first:Math.min(...years),last:Math.max(...years)}):'';
 $('catalogStatus').hidden=catalogState==='ready';$('catalogStatusText').textContent=uiText(catalogState==='loading'?'loading':'loadError');$('retryCatalog').hidden=catalogState!=='error';$('skeletons').hidden=catalogState!=='loading'||movies.length>0;
 document.querySelectorAll('[data-genre]').forEach(button=>{const selected=button.dataset.genre===activeGenre;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
 document.querySelectorAll('[data-nav]').forEach(button=>{const selected=button.dataset.nav===activeNav;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 requestAnimationFrame(updateRowControls);window.CineWaveRouter?.refresh();
}
function updateRowControls(){document.querySelectorAll('.row-controls').forEach(controls=>{const row=$(controls.dataset.row);const max=row.scrollWidth-row.clientWidth;const buttons=controls.querySelectorAll('button');if(buttons.length){buttons[0].disabled=row.scrollLeft<=2;buttons[1].disabled=max<=2||row.scrollLeft>=max-2;}});}
function localizeRowControls(){document.querySelectorAll('.row-controls').forEach(controls=>{controls.innerHTML=`<button type="button" data-scroll="${controls.dataset.row}" data-direction="-1" aria-label="${escapeHTML(uiText('previous'))}">${icon('arrow')}</button><button type="button" data-scroll="${controls.dataset.row}" data-direction="1" aria-label="${escapeHTML(uiText('next'))}">${icon('arrow')}</button>`;});}
function closeMovie(silent=false){
 const wasOpen=$('modal').classList.contains('open'),openerId=playerOpener?.closest('.movie')?.dataset.id;
 activePlayer?.destroy();activePlayer=null;$('modal').classList.remove('open');document.body.classList.remove('has-player-dialog');
 if(wasOpen){render();const target=playerOpener?.isConnected?playerOpener:[...$('movies').querySelectorAll('.movie')].find(card=>card.dataset.id===openerId);(target||$('search')).focus({preventScroll:true});}if(!silent)window.CineWaveRouter?.closeDetails();
}
function openMovie(movie,mode='details'){
 currentMovieMode=mode;
 const wasOpen=$('modal').classList.contains('open');if(!wasOpen)playerOpener=document.activeElement;
 currentMovie=movie;const info=localizedMovie(movie);$('modalTitle').textContent=info.title||uiText('titleUnknown');$('modalDesc').textContent=info.desc||uiText('descriptionUnknown');
 const metadata=[movie.year,...(movie.genres||[]).map(g=>genreLabel(g)),movie.rating,movie.duration].filter(Boolean);
 $('modalMeta').replaceChildren(...metadata.map(value=>{const span=document.createElement('span');span.textContent=value;return span;}));
 $('modalList').textContent=(watchList.has(movie.id)?'✓ ':'＋ ')+uiText(watchList.has(movie.id)?'inList':'list');$('modalList').setAttribute('aria-pressed',String(watchList.has(movie.id)));
 if(mode==='watch'&&isWatchable(movie)){
  if(activePlayer?.video.dataset.movieId===movie.id)activePlayer.localize(currentLanguage);
  else{activePlayer?.destroy();activePlayer=CineWavePlayer.mount($('videoWrap'),movie,currentLanguage);activePlayer.video.dataset.movieId=movie.id;}
 }else{
  activePlayer?.destroy();activePlayer=null;const frame=document.createElement('div');frame.className='details-art';const image=document.createElement('img');image.className='detail-poster';image.src=failedArtwork.has(movie.img)?POSTER_FALLBACK:movie.img||POSTER_FALLBACK;image.alt=info.title||'';image.onerror=()=>{if(image.src.endsWith(POSTER_FALLBACK))return;image.src=POSTER_FALLBACK;};frame.append(image);
  if(!isWatchable(movie)){const note=document.createElement('div');note.className='availability-note';note.textContent=uiText('browseOnly');frame.append(note);}$('videoWrap').replaceChildren(frame);
 }
 $('modalWatch').hidden=mode==='watch'||!isWatchable(movie);$('modalWatch').textContent=uiText('watch');$('modalList').disabled=false;
 let trailer=null;try{const url=new URL(movie.trailer);if(url.protocol==='https:'&&!url.username&&!url.password)trailer=url.href;}catch{}
 $('modalTrailer').hidden=!trailer;$('modalTrailer').textContent={en:'Watch trailer',ru:'Трейлер',hy:'Դիտել թրեյլերը'}[currentLanguage];if(trailer)$('modalTrailer').href=trailer;

 $('modal').classList.add('open');document.body.classList.add('has-player-dialog');if(!wasOpen)($('modal').querySelector('[data-control="play"]:not(:disabled)')||$('closeModal')).focus({preventScroll:true});
}
function applyLanguage(lang){
 currentLanguage=translations[lang]?lang:'en';document.documentElement.lang=currentLanguage;$('language').value=currentLanguage;try{localStorage.setItem('cinewave:language',currentLanguage);}catch{}
 const labels={heroEyebrow:'collection',genreEyebrow:'mood',genreHeading:'genreHeading',allGenres:'allGenres',catalogEyebrow:'catalogEyebrow',watchableHeading:'ready',continueHeading:'continue',newHeading:'throughYears',resetFilters:'reset',retryCatalog:'retry',profileTitle:'profile',profileList:'list',footerText:'footer',aiPromptTitle:'askTitle',aiPromptText:'askText',askAI:'ask',aiGreeting:'aiWelcome'};
 for(const [id,key] of Object.entries(labels))$(id).textContent=uiText(key);
 const navigation={Home:'home',Movies:'movies','TV Shows':'tv','My List':'list'};document.querySelectorAll('[data-nav]').forEach(button=>{const bold=button.querySelector('b');if(bold)bold.textContent=uiText(navigation[button.dataset.nav]);else button.textContent=uiText(navigation[button.dataset.nav]);});
 $('search').placeholder=uiText('search');$('search').setAttribute('aria-label',uiText('search'));$('clearSearch').setAttribute('aria-label',uiText('clear'));$('language').setAttribute('aria-label',uiText('chooseLanguage'));$('profileButton').setAttribute('aria-label',uiText('profile'));$('closeModal').setAttribute('aria-label',uiText('close'));
 document.querySelector('.skip-link').textContent=uiText('skip');document.querySelector('.nav').setAttribute('aria-label',uiText('mainNav'));document.querySelector('.mobile-nav').setAttribute('aria-label',uiText('mobileNav'));document.querySelector('.brand').setAttribute('aria-label',uiText('home')+' CineWave');
 $('cw-ai-input').placeholder=uiText('aiPlaceholder');$('cw-ai-input').setAttribute('aria-label',uiText('aiMessage'));$('cw-ai-close').setAttribute('aria-label',uiText('aiClose'));$('cw-ai-send').setAttribute('aria-label',uiText('aiSend'));document.querySelector('#cw-ai-head .eyebrow').textContent=uiText('aiEyebrow');
 document.querySelectorAll('.movie-grid').forEach(row=>row.setAttribute('aria-label',uiText('rowLabel')));
 document.querySelectorAll('[data-ai-status]').forEach(node=>node.textContent=uiText(node.dataset.aiStatus));
 localizeRowControls();render();window.CineWaveAccounts?.localize();if(currentMovie&&$('modal').classList.contains('open'))openMovie(currentMovie,currentMovieMode);
}
document.addEventListener('click',event=>{
 const article=event.target.closest('.movie');if(article){const movie=movies.find(m=>m.id===article.dataset.id);if(movie){if(window.CineWaveRouter)window.CineWaveRouter.navigate('movie/'+encodeURIComponent(movie.id));else openMovie(movie);}}
 const nav=event.target.closest('[data-nav]');if(nav&&window.CineWaveRouter){window.CineWaveRouter.navigate({Home:'home',Movies:'movies','TV Shows':'tv','My List':'my-list'}[nav.dataset.nav]);return;}if(nav){activeNav=nav.dataset.nav;activeGenre='All';$('search').value='';$('clearSearch').hidden=true;render();if(activeNav==='Home')window.scrollTo({top:0,behavior:reducedMotion()?'auto':'smooth'});else $('catalog').scrollIntoView({behavior:reducedMotion()?'auto':'smooth'});}
 const arrow=event.target.closest('[data-scroll]');if(arrow){const row=$(arrow.dataset.scroll);row.scrollBy({left:Number(arrow.dataset.direction)*row.clientWidth*.85,behavior:reducedMotion()?'auto':'smooth'});}
 const feature=event.target.closest('[data-feature]');if(feature){heroIndex=Number(feature.dataset.feature);renderHero();}
 if(!$('profilePanel').hidden&&!event.target.closest('#profilePanel,#profileButton')){$('profilePanel').hidden=true;$('profileButton').setAttribute('aria-expanded','false');}
});
function reducedMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
document.addEventListener('keydown',event=>{
 if(event.target.matches('.movie')){if(['Enter',' '].includes(event.key)){event.preventDefault();const movie=movies.find(m=>m.id===event.target.dataset.id);if(movie){if(window.CineWaveRouter)window.CineWaveRouter.navigate('movie/'+encodeURIComponent(movie.id));else openMovie(movie);}}else if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();(event.key==='ArrowRight'?event.target.nextElementSibling:event.target.previousElementSibling)?.focus();}}
 if(event.key==='Escape'){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else if(!$('cw-ai-panel').hidden)window.closeCineWaveAI?.();else if(!$('profilePanel').hidden){$('profilePanel').hidden=true;$('profileButton').setAttribute('aria-expanded','false');$('profileButton').focus();}else closeMovie();}
 if(event.key==='Tab'&&$('modal').classList.contains('open')){const focusable=[...$('modal').querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(node=>node.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
});
$('genres').addEventListener('click',event=>{const button=event.target.closest('[data-genre]');if(button){activeGenre=button.dataset.genre;activeNav='Movies';window.CineWaveRouter?.listing('movies');render();}});
$('search').addEventListener('input',()=>{activeNav='Movies';window.CineWaveRouter?.listing('movies');$('clearSearch').hidden=!$('search').value;render();});
$('clearSearch').addEventListener('click',()=>{$('search').value='';$('clearSearch').hidden=true;render();$('search').focus();});
$('resetFilters').addEventListener('click',()=>{activeGenre='All';activeNav='Home';window.CineWaveRouter?.listing('home');$('search').value='';$('clearSearch').hidden=true;render();});
$('allGenres').addEventListener('click',()=>{activeGenre='All';activeNav='Movies';window.CineWaveRouter?.listing('movies');render();});
$('heroWatch').addEventListener('click',()=>{if(featuredMovie)window.CineWaveRouter.navigate((isWatchable(featuredMovie)?'watch/':'movie/')+encodeURIComponent(featuredMovie.id));});$('modalWatch').addEventListener('click',()=>{if(currentMovie&&isWatchable(currentMovie))window.CineWaveRouter.navigate('watch/'+encodeURIComponent(currentMovie.id));});$('heroList').addEventListener('click',()=>toggleList(featuredMovie));$('modalList').addEventListener('click',()=>toggleList(currentMovie));
$('closeModal').addEventListener('click',()=>closeMovie());$('modal').addEventListener('click',event=>{if(event.target===$('modal'))closeMovie();});
$('language').addEventListener('change',event=>applyLanguage(event.target.value));
$('profileButton').addEventListener('click',()=>{$('profilePanel').hidden=!$('profilePanel').hidden;$('profileButton').setAttribute('aria-expanded',String(!$('profilePanel').hidden));});
$('profileList').addEventListener('click',()=>{activeNav='My List';activeGenre='All';window.CineWaveRouter?.listing('my-list');$('search').value='';$('clearSearch').hidden=true;$('profilePanel').hidden=true;$('profileButton').setAttribute('aria-expanded','false');render();$('catalog').scrollIntoView({behavior:reducedMotion()?'auto':'smooth'});});
$('askAI').addEventListener('click',()=>window.openCineWaveAI?.());
for(const row of document.querySelectorAll('.movie-grid'))row.addEventListener('scroll',updateRowControls,{passive:true});
window.addEventListener('resize',updateRowControls,{passive:true});

const PUBLIC_API=window.CINEWAVE_CONFIG;
async function loadCatalog(){
 if(loadingCatalog)return;loadingCatalog=true;catalogState='loading';render();
 try{
  const response=await fetch(`${PUBLIC_API.url}/rest/v1/movies?select=*&is_published=eq.true&order=release_date.desc`,{headers:{apikey:PUBLIC_API.key,Authorization:`Bearer ${PUBLIC_API.key}`}});
  if(!response.ok)throw new Error('catalog-unavailable');const rows=await response.json();if(!Array.isArray(rows))throw new Error('invalid-catalog');
  movies.splice(0,movies.length,...rows.map(mapCatalogMovie));catalogState='ready';
 }catch{catalogState='error';}finally{loadingCatalog=false;render();}
}
$('retryCatalog').addEventListener('click',loadCatalog);
applyLanguage(currentLanguage);loadCatalog();
fetch('data/playback-films.json').then(response=>{if(!response.ok)throw new Error('no-approvals');return response.json();}).then(data=>{approvedFilms=Array.isArray(data.films)?data.films:[];render();}).catch(()=>{/* No approval evidence means browse-only. */});
