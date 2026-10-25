/* No signup, role-grant or privileged credential code belongs in this client. */
(() => {
 'use strict';
 const t=window.AdminI18n.t;
 const $=id=>document.getElementById(id),model=window.CineWaveAdminModel,config=window.CINEWAVE_ADMIN_CONFIG;
 const client=window.CineWaveAuth.client;
 let acceptSessions=true,authorized=false,session=null,rows=[],editing=null,dirty=false,busy=false,generation=0,view='overview',preview=null;
 const form=$('movieForm');
 function message(text){$('notice').dataset.uiMessage=text;$('notice').textContent=t(text);}
 function fail(error){const code=error?.code;if(['42501','PGRST301','PGRST302'].includes(code)){lock('Your access is no longer authorized. Sign in again or contact the owner.');return;}message(window.AdminI18n.known(error?.message)?error.message:'Operation failed. Please retry.');}
 function lock(text='Sign in to continue.') {authorized=false;rows=[];editing=null;dirty=false;form.reset();$('renditions').replaceChildren();$('accountEmail').textContent='';preview?.destroy();preview=null;if($('previewDialog').open)$('previewDialog').close();if($('confirmDialog').open)$('confirmDialog').close('cancel');$('dashboard').hidden=true;$('access').hidden=false;$('accessStatus').dataset.uiMessage=text;$('accessStatus').textContent=t(text);$('accessLogout').hidden=!session;$('loginForm').hidden=Boolean(session);$('movieRows').replaceChildren();$('recentMovies').replaceChildren();}
 async function authorize(next){
  if(next&&!acceptSessions)return;
  const keep=authorized&&next?.user.id===session?.user.id;const current=++generation;session=next;if(!keep)lock(next?'Checking administrator authorization…':'Sign in to continue.');
  if(!next)return;
  try{const {data,error}=await client.rpc('cinewave_is_admin');if(current!==generation)return;if(error)throw new Error('Administrator setup unavailable. Ask the owner to review and apply the Admin migration.');if(data!==true){lock('Access denied. This account is not an authorized CineWave administrator.');return;}
   authorized=true;$('access').hidden=true;$('dashboard').hidden=false;$('accountEmail').textContent=next.user.email||'Administrator';if(!keep)showView('overview');if(!dirty)await loadMovies(current);
  }catch(error){if(current===generation)lock(error.message);}
 }
 async function loadMovies(current=generation){
  if(!authorized)return;message('Loading your movie library…');const result=[];
  try{for(let start=0;;start+=100){const {data,error}=await client.from('movies').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).range(start,start+99);if(current!==generation||!authorized)return;if(error)throw error;result.push(...data);if(data.length<100)break;}
   rows=result;render();message('');
  }catch(error){if(current===generation)fail(error);}
 }
 function showView(next){view=next;$('overview').hidden=next!=='overview';$('moviesView').hidden=next!=='movies';$('editor').hidden=next!=='editor';$('pageTitle').textContent=t({overview:'Overview',movies:'Movie library',editor:editing?'Edit movie':'Add movie'}[next]);document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===next));}
 function element(tag,text,className){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;}
 function button(text,action,row){const node=element('button',t(text),'secondary');node.type='button';node.dataset.action=action;node.dataset.id=String(row.id);return node;}
 function render(){
  $('statTotal').textContent=rows.length;$('statPublished').textContent=rows.filter(r=>r.is_published).length;$('statDrafts').textContent=rows.filter(r=>!r.is_published).length;$('statPlayable').textContent=rows.filter(model.ready).length;
  $('recentMovies').replaceChildren(...rows.slice(0,5).map(row=>{const node=element('div','','recent-row'),text=element('div',row.title_en||'Untitled');text.append(element('small',row.created_at?new Date(row.created_at).toLocaleDateString(window.AdminI18n.locale):t('Date unavailable')));node.append(text,button('Edit','edit',row));return node;}));
  const q=$('movieSearch').value.trim().toLowerCase(),publication=$('publicationFilter').value,rights=$('rightsFilter').value;
  const filtered=rows.filter(row=>(!q||[row.title_en,row.title_ru,row.title_hy].some(v=>String(v||'').toLowerCase().includes(q)))&&(publication==='all'||row.is_published===(publication==='published'))&&(rights==='all'||row.rights_verification_status===rights));
  $('movieRows').replaceChildren(...filtered.map(row=>{const tr=document.createElement('tr'),title=element('td',row.title_en||'Untitled','table-title');title.append(element('br',''),element('small',[row.title_ru,row.title_hy].filter(Boolean).join(' · ')));const meta=element('td',[row.release_date?.slice(0,4),(row.genre_names||[]).join(', ')].filter(Boolean).join(' · '));const pub=document.createElement('td');pub.append(element('span',t(row.is_published?'Published':'Draft'),'tag '+(row.is_published?'published':'')));const verification=document.createElement('td');verification.append(element('span',t(row.rights_verification_status||'unverified'),'tag '+(row.rights_verification_status==='verified'?'verified':'')));const actions=element('td','','row-actions');actions.append(button('Edit','edit',row),button(row.is_published?'Unpublish':'Publish','publish',row),button('Delete','delete',row));tr.append(title,meta,pub,verification,actions);return tr;}));$('resultCount').textContent=t(filtered.length+' of '+rows.length+' movies');
 }
 function collect(){const values=Object.fromEntries(new FormData(form));values.commercial_streaming_permission=form.elements.commercial_streaming_permission.checked;const sources=[...$('renditions').querySelectorAll('.rendition-row')].map(node=>({height:node.querySelector('select').value,url:node.querySelector('input').value}));return model.payload(values,sources);}
 function markDirty(){dirty=true;$('verifyMovie').disabled=true;}
 function addRendition(row={height:360,url:''}){if($('renditions').children.length>=4){message('There are at most four supported quality renditions.');return;}const node=element('div','','rendition-row'),select=document.createElement('select');select.setAttribute('aria-label',t('Actual rendition height'));for(const h of [360,480,720,1080]){const option=new Option(h+'p',h);select.add(option);}select.value=String(row.height);const input=document.createElement('input');input.type='url';input.placeholder=t('Actual rendition URL');input.setAttribute('aria-label',t('Actual rendition URL'));input.value=row.url;input.required=true;const remove=element('button','×','secondary');remove.type='button';remove.setAttribute('aria-label',t('Remove rendition'));remove.addEventListener('click',()=>{node.remove();markDirty();});node.append(select,input,remove);$('renditions').append(node);}
 function edit(row=null){if(!authorized)return;editing=row?structuredClone(row):null;form.reset();$('renditions').replaceChildren();for(const name of model.fields)form.elements[name].value=row?.[name]||'';form.elements.media_type.value=row?.media_type||'movie';form.elements.genres.value=(row?.genre_names||[]).join(', ');form.elements.commercial_streaming_permission.checked=Boolean(row?.commercial_streaming_permission);for(const rendition of row?.video_renditions||[])addRendition(rendition);dirty=false;$('verifyMovie').disabled=!row;$('saveMovie').textContent=t(row?'Save changes':'Save draft');$('editorTitle').textContent=t(row?'Edit: '+row.title_en:'New movie');$('verificationStatus').textContent=t('Server verification: '+(row?.rights_verification_status||'unverified')+(row?.is_published?' · Currently published':' · Draft'));showView('editor');message('');window.scrollTo({top:0});}
 async function confirm({title,text,typed=null,review=false,rawText=false}){
  $('confirmDialog').returnValue='cancel';$('confirmTitle').textContent=t(title);$('confirmText').textContent=rawText?text:t(text);$('typedLabel').hidden=!typed;$('reviewLabel').hidden=!review;$('typedConfirmation').value='';$('reviewConfirmation').checked=false;
  const valid=()=>{ $('confirmAction').disabled=Boolean(typed&&$('typedConfirmation').value!==typed||review&&!$('reviewConfirmation').checked);};valid();$('typedConfirmation').oninput=valid;$('reviewConfirmation').onchange=valid;
  return new Promise(resolve=>{$('confirmDialog').addEventListener('close',()=>resolve($('confirmDialog').returnValue==='confirm'),{once:true});$('confirmDialog').showModal();});
 }
 async function update(row,patch){
  if(!authorized)throw new Error('Not authorized.');const {data,error}=await client.from('movies').update(patch).eq('id',row.id).eq('updated_at',row.updated_at).select().maybeSingle();if(error)throw error;if(!data)throw new Error('This record changed or access was denied. Refresh before editing again.');return data;
 }
 async function action(name,row){
  if(!authorized||busy)return;
  if(name==='edit'){if(!dirty||await confirm({title:'Discard unsaved edits?',text:'Only local edits will be discarded.'}))edit(row);return;}
  if(name==='publish'){
   if(!row.is_published&&!model.ready(row)){message('Save complete rights evidence and verify tested playback before publishing this draft.');return;}
   if(!await confirm({title:row.is_published?'Unpublish movie?':'Publish verified movie?',text:row.title_en,rawText:true}))return;
   if(!authorized)return;busy=true;try{await update(row,{is_published:!row.is_published});await loadMovies();}catch(error){fail(error);}finally{busy=false;}
  }
  if(name==='delete'){
   if(!await confirm({title:'Permanently delete this movie?',text:'This removes the record from CineWave. It does not delete shared image assets. Type its exact title to confirm.',typed:row.title_en}))return;
   if(!authorized)return;busy=true;try{const {data,error}=await client.from('movies').delete().eq('id',row.id).eq('updated_at',row.updated_at).select('id');if(error)throw error;if(!data.length)throw new Error('Record changed or access denied. Refresh first.');await loadMovies();}catch(error){fail(error);}finally{busy=false;}
  }
 }
 $('loginForm').addEventListener('submit',async event=>{event.preventDefault();acceptSessions=true;$('loginButton').disabled=true;$('accessStatus').dataset.uiMessage='Signing in…';$('accessStatus').textContent=t('Signing in…');try{const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error)throw error;await authorize(data.session);}catch{$('accessStatus').dataset.uiMessage='Sign-in failed. Check your credentials, connection, and Auth settings.';$('accessStatus').textContent=t('Sign-in failed. Check your credentials, connection, and Auth settings.');}finally{$('password').value='';$('loginButton').disabled=false;}});
 async function logout(){acceptSessions=false;++generation;session=null;lock();const {failed}=await window.CineWaveAuth.signOut();lock('Signed out on this device.');if(failed)location.reload();}
 $('logout').addEventListener('click',logout);$('accessLogout').addEventListener('click',logout);
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',async()=>{if(dirty&&!await confirm({title:'Discard unsaved edits?',text:'Your saved movie is unchanged.'}))return;dirty=false;showView(button.dataset.view);}));
 for(const id of ['sidebarAdd','addMovie'])$(id).addEventListener('click',async()=>{if(dirty&&!await confirm({title:'Discard unsaved edits?',text:'Your saved movie is unchanged.'}))return;edit();});
 $('cancelEdit').addEventListener('click',async()=>{if(dirty&&!await confirm({title:'Discard unsaved edits?',text:'Your saved movie is unchanged.'}))return;dirty=false;showView('movies');});
 $('refresh').addEventListener('click',async()=>{if(dirty){message('Save or cancel local edits before refreshing.');return;}await loadMovies();});
 for(const id of ['movieSearch','publicationFilter','rightsFilter'])$(id).addEventListener(id==='movieSearch'?'input':'change',render);
 document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;const row=rows.find(r=>String(r.id)===button.dataset.id);if(row)action(button.dataset.action,row);});
 form.addEventListener('input',markDirty);form.addEventListener('change',markDirty);$('addRendition').addEventListener('click',()=>{addRendition();markDirty();});
 form.addEventListener('submit',async event=>{event.preventDefault();if(!authorized||busy)return;busy=true;$('saveMovie').disabled=true;try{const payload=collect();let saved;if(editing)saved=await update(editing,payload);else{const {data,error}=await client.from('movies').insert({...payload,is_published:false}).select().single();if(error)throw error;saved=data;}dirty=false;await loadMovies();edit(saved);message('Saved. Media/rights changes require a new verification review.');}catch(error){fail(error);}finally{busy=false;$('saveMovie').disabled=false;}});
 $('verifyMovie').addEventListener('click',async()=>{if(!authorized||!editing||dirty||busy)return;const row=editing;if(!await confirm({title:'Verify full-film commercial rights?',text:'Review the recorded rights holder, license grant, original film source, license evidence and terms, attribution, and actual media delivery. A URL alone is not evidence.',review:true}))return;if(!authorized)return;busy=true;try{const saved=await update(row,{rights_verification_status:'verified',playback_checked:true});await loadMovies();edit(saved);message('Review recorded for this saved snapshot. Publication is a separate action.');}catch(error){fail(error);}finally{busy=false;}});
 document.querySelectorAll('[data-asset]').forEach(input=>input.addEventListener('change',async()=>{if(!authorized)return;const file=input.files[0];if(!file)return;input.disabled=true;try{const ext=model.asset(file);const path=session.user.id+'/'+crypto.randomUUID()+'.'+ext;const {error}=await client.storage.from('cinewave-assets').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(error)throw error;if(!authorized)return;const {data}=client.storage.from('cinewave-assets').getPublicUrl(path);form.elements[input.dataset.asset].value=data.publicUrl;markDirty();message('Image uploaded. Save the movie to attach it. Existing images were not overwritten.');}catch(error){fail(error);}finally{input.disabled=false;input.value='';}}));
 $('preview').addEventListener('click',()=>{if(!authorized)return;try{const data=collect();if(!data.watch_url)throw new Error('Add a valid primary MP4/HLS source first.');preview?.destroy();$('previewDialog').showModal();preview=CineWavePlayer.mount($('previewPlayer'),{id:'admin-preview:'+(editing?.id||'draft'),video:data.watch_url,renditions:data.video_renditions},window.AdminI18n.locale);}catch(error){fail(error);}});
 function closePreview(){preview?.destroy();preview=null;if($('previewDialog').open)$('previewDialog').close();}
 $('closePreview').addEventListener('click',closePreview);$('previewDialog').addEventListener('cancel',closePreview);$('previewDialog').addEventListener('close',()=>{preview?.destroy();preview=null;});
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 window.addEventListener('focus',()=>{if(session&&!busy)authorize(session);});
 setInterval(()=>{if(authorized&&session&&!busy)authorize(session);},60000);
 window.CineWaveAdminRelocalize=()=>{render();showView(view);if(editing||view==='editor'){$('editorTitle').textContent=t(editing?'Edit: '+editing.title_en:'New movie');$('saveMovie').textContent=t(editing?'Save changes':'Save draft');$('verificationStatus').textContent=t('Server verification: '+(editing?.rights_verification_status||'unverified')+(editing?.is_published?' · Currently published':' · Draft'));}};
 client.auth.onAuthStateChange((_event,next)=>{setTimeout(()=>authorize(next),0);});
 client.auth.getSession().then(({data,error})=>{if(error)lock('Session unavailable. Sign in again.');else authorize(data.session);}).catch(()=>lock('Session unavailable. Sign in again.'));
})();
