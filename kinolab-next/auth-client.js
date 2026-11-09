// Shared per-tab Auth session. Only the PKCE verifier uses cross-tab storage.
window.initializeCineWaveAuth = () => {
 let temporary=new Map();
 const storage={
  getItem(key){try{return (key.endsWith('-code-verifier')?localStorage:sessionStorage).getItem(key);}catch{return temporary.get(key)||null;}},
  setItem(key,value){try{(key.endsWith('-code-verifier')?localStorage:sessionStorage).setItem(key,value);}catch{temporary.set(key,value);}},
  removeItem(key){temporary.delete(key);try{(key.endsWith('-code-verifier')?localStorage:sessionStorage).removeItem(key);}catch{}}
 };
 const key='cinewave:session',config=window.CINEWAVE_CONFIG;
 window.CineWaveStaging.assertURL(config.url);
 const client=window.supabase.createClient(config.url,config.key,{global:{fetch:window.CineWaveStaging.fetch.bind(window.CineWaveStaging)},auth:{storage,storageKey:key,persistSession:true,autoRefreshToken:true,flowType:'pkce',detectSessionInUrl:document.body.classList.contains('cinewave-site')}});
 async function signOut(){let failed=false;try{const {error}=await client.auth.signOut({scope:'local'});failed=Boolean(error);}catch{failed=true;}finally{for(const suffix of ['', '-code-verifier','-user'])storage.removeItem(key+suffix);}return {failed};}
 window.CineWaveAuth={client,signOut};
};
if (window.supabase) window.initializeCineWaveAuth();
