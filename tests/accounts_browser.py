"""Real SDK, intercepted Auth/REST; no remote accounts or writes."""
import base64,functools,json,time,threading,urllib.parse
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):return super().translate_path(path.removeprefix('/CineWave'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/CineWave/'
uid='22222222-2222-4222-8222-222222222222'
enc=lambda v:base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
token=enc({'alg':'HS256'})+'.'+enc({'sub':uid,'role':'authenticated','exp':int(time.time())+3600})+'.fixture'
user={'id':uid,'email':'user@example.test','role':'authenticated','aud':'authenticated','user_metadata':{'display_name':'Test viewer','admin':True}}
state={'profile':None,'list':[],'writes':[]};errors=[]
rows=[{'id':1,'title_en':'Supplied movie','title_ru':'Фильм','title_hy':'Ֆիլմ','genre_names':['Drama'],'is_published':True,'media_type':'movie'},{'id':2,'title_en':'Supplied series','genre_names':['Drama'],'is_published':True,'media_type':'tv'}]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   url=r.request.url;method=r.request.method;path=urllib.parse.urlparse(url).path
   if url.startswith(base.removesuffix('CineWave/')):r.continue_();return
   def answer(data,status=200):r.fulfill(status=status,content_type='application/json',body=json.dumps(data))
   data=json.loads(r.request.post_data or '{}') if method in ['POST','PATCH'] else {}
   if path=='/auth/v1/signup':
    assert 'admin' not in data.get('data',{});answer({'user':user,'session':None});return
   if path=='/auth/v1/token':answer({'access_token':token,'refresh_token':'fixture','token_type':'bearer','expires_in':3600,'user':user});return
   if path=='/auth/v1/logout':answer({});return
   if path=='/auth/v1/recover':answer({});return
   if path=='/auth/v1/user':answer(user);return
   if path=='/rest/v1/rpc/cinewave_is_admin':answer(False);return
   if path=='/rest/v1/movies':answer(rows);return
   if path=='/rest/v1/profiles':
    if method=='GET':answer(state['profile']);return
    state['writes'].append((method,path,data));state['profile']={**(state['profile'] or {'user_id':uid}),**data};answer(None,204);return
   if path=='/rest/v1/user_watchlist':
    if method=='GET':answer([{'movie_id':n} for n in state['list']]);return
    state['writes'].append((method,path,data))
    if method=='POST':assert data['user_id']==uid;state['list'].append(int(data['movie_id']))
    else:state['list']=[]
    answer(None,204);return
   r.abort()
  page.route('**/*',route);page.goto(base+'#/profile',wait_until='networkidle');expect(page.locator('#userLoginForm')).to_be_visible()
  page.evaluate("CineWaveRouter.navigate('register')")
  for field,value in [('registerName','Test viewer'),('registerEmail','user@example.test'),('registerPassword','fixture-password'),('registerConfirm','fixture-password')]:page.locator('#'+field).fill(value)
  page.locator('#userRegisterForm button').click();expect(page.locator('#accountFeedback')).to_contain_text('Check your email')
  page.locator('#userLoginEmail').fill('user@example.test');page.locator('#userLoginPassword').fill('fixture-password');page.locator('#userLoginForm button').click()
  expect(page.locator('#userProfile')).to_be_visible();expect(page.locator('#profileName')).to_have_value('Test viewer');assert page.locator('#menuAdmin').is_hidden()
  page.locator('#profileName').fill('Updated viewer');page.locator('#profileLanguage').select_option('ru');page.locator('#userProfileForm button').click();expect(page.locator('#accountFeedback')).to_have_text('Профиль сохранён.')
  for locale in ['hy','en','ru']:
   page.evaluate('(l)=>applyLanguage(l)',locale);assert page.locator('#accountTitle').inner_text() in ['Ձեր պրոֆիլը','Your profile','Ваш профиль']
  page.evaluate("applyLanguage('en');CineWaveRouter.navigate('movies')");expect(page.locator('#movies .movie')).to_have_count(1)
  page.locator('#movies .movie').first.click();expect(page.locator('#modal')).to_have_class('modal open');assert '#/movie/' in page.url
  page.locator('#modalList').click();page.wait_for_function('watchList.has("catalog:1")');assert state['list']==[1]
  page.locator('#closeModal').click();page.evaluate("CineWaveRouter.navigate('tv')");expect(page.locator('#movies .movie')).to_have_count(1);expect(page.locator('#movies')).to_contain_text('Supplied series')
  page.reload(wait_until='networkidle');assert '#/tv' in page.url;expect(page.locator('#movies .movie')).to_have_count(1)
  page.evaluate("CineWaveRouter.navigate('profile')");expect(page.locator('#profileName')).to_have_value('Updated viewer')
  for width in [320,768,1440]:page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.evaluate("CineWaveRouter.navigate('recover')");page.locator('#passwordCurrent').fill('fixture-password');page.locator('#resetPassword').fill('new-fixture-password');page.locator('#resetConfirm').fill('new-fixture-password');page.locator('#passwordForm button').click();expect(page.locator('#accountFeedback')).to_have_text('Password updated.')
  page.evaluate("CineWaveRouter.navigate('profile')");page.locator('#userLogout').click();expect(page.locator('#userLoginForm')).to_be_visible();page.wait_for_function('watchList.size===0');assert state['list']==[1]
  page.evaluate("CineWaveRouter.navigate('forgot')");page.locator('#forgotEmail').fill('user@example.test');page.locator('#forgotForm button').click();expect(page.locator('#accountFeedback')).to_contain_text('reset link')
  assert not errors,errors;browser.close()
 print('PASS Pages routes, registration confirmation, real SDK login/logout, profile save, account watchlist, TV classification, three languages, responsive account pages; no signup admin escalation')
finally:server.shutdown()
