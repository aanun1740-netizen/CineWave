"""Real bundled Supabase SDK against intercepted Auth/REST/Storage fixtures.
No real login, account creation, database mutation or upload is performed.
"""
import base64,functools,json,time,threading,urllib.parse
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
ADMIN='11111111-1111-4111-8111-111111111111';USER='22222222-2222-4222-8222-222222222222'
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):return super().translate_path(path.removeprefix('/CineWave'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/CineWave/'
def token(uid):
 enc=lambda obj:base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
 return enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':uid,'role':'authenticated','aud':'authenticated','exp':int(time.time())+3600,'iat':int(time.time())})+'.fixture'
def row(id,title,published=False):return {'id':id,'title_en':title,'title_ru':None,'title_hy':None,'overview_en':None,'overview_ru':None,'overview_hy':None,'release_date':'2000-01-01','genre_names':['Drama'],'poster_path':None,'backdrop_path':None,'trailer_url':None,'watch_url':None,'is_published':published,'rights_verification_status':'unverified','commercial_streaming_permission':False,'playback_checked':False,'video_renditions':[],'playback_verification':None,'created_at':'2026-01-01T00:00:00Z','updated_at':'2026-01-01T00:00:00Z'}
state={'uid':None,'records':[row(1,'Existing published',True),row(2,'Existing draft')],'writes':[],'rpc_error':False,'logout_fail':False}
errors=[];csp=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page()
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:csp.append(m.text) if 'violates' in m.text or 'Content Security Policy' in m.text else None)
  def route(r):
   url=r.request.url;method=r.request.method;path=urllib.parse.urlparse(url).path
   if url.startswith(base.removesuffix('CineWave/')):r.continue_();return
   def answer(data,status=200):r.fulfill(status=status,content_type='application/json',body=json.dumps(data))
   if '/auth/v1/token' in path:
    payload=json.loads(r.request.post_data);uid=USER if payload.get('email')=='user@example.test' else ADMIN;state['uid']=uid
    answer({'access_token':token(uid),'refresh_token':'synthetic-refresh','token_type':'bearer','expires_in':3600,'expires_at':int(time.time())+3600,'user':{'id':uid,'email':payload.get('email'),'role':'authenticated','aud':'authenticated','app_metadata':{'provider':'email'},'user_metadata':{'admin':True}}});return
   if '/auth/v1/logout' in path:
    if state['logout_fail']:answer({'message':'synthetic network failure'},500)
    else:state['uid']=None;answer({})
    return
   if '/rest/v1/rpc/cinewave_is_admin' in path:
    if state['rpc_error']:answer({'message':'missing migration','code':'PGRST202'},404)
    else:answer(state['uid']==ADMIN)
    return
   if '/storage/v1/object/cinewave-assets/' in path:
    assert state['uid']==ADMIN
    state['writes'].append(('upload',path));answer({'Key':path.split('/object/')[1],'Id':'fixture-asset'});return
   if path=='/rest/v1/movies':
    assert state['uid']==ADMIN,'non-admin must never load the dashboard movie table'
    query=urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    if method=='GET':answer(state['records']);return
    state['writes'].append((method,r.request.post_data))
    if method=='POST':
     data=json.loads(r.request.post_data);new=row(3,data['title_en']);new.update(data);new['rights_verification_status']='pending';state['records'].append(new);answer(new,201);return
    id=int(query['id'][0].split('.')[-1]);target=next(v for v in state['records'] if v['id']==id)
    assert query.get('updated_at')==['eq.'+target['updated_at']],'optimistic update/delete predicate required'
    if method=='PATCH':
     data=json.loads(r.request.post_data);target.update(data)
     if data.get('rights_verification_status')=='verified':target['playback_verification']={'watch_url':target['watch_url'],'license_verified':True,'playback_verified':True,'commercial_reuse_verified':True,'license_source':target['license_evidence_url'],'license_terms_source':target['license_terms_url'],'renditions':target['video_renditions']}
     answer(target);return
    if method=='DELETE':state['records']=[v for v in state['records'] if v['id']!=id];answer([{'id':id}]);return
   r.abort()
  page.route('**/*',route);page.goto(base+'admin/',wait_until='networkidle')
  assert page.locator('#loginForm').is_visible() and page.locator('#dashboard').is_hidden()
  def login(email):
   page.locator('#email').fill(email);page.locator('#password').fill('synthetic-password');page.locator('#loginButton').click()
  login('user@example.test');page.get_by_text('Access denied. This account is not an authorized CineWave administrator.',exact=True).wait_for()
  assert page.locator('#dashboard').is_hidden() and not state['writes']
  page.locator('#accessLogout').click();page.locator('#loginForm').wait_for(state='visible')
  login('admin@example.test');page.locator('#dashboard').wait_for(state='visible');page.wait_for_function('document.getElementById("statTotal").textContent==="2"')
  assert page.locator('#statPublished').inner_text()=='1' and page.locator('#statPlayable').inner_text()=='0'
  page.locator('#addMovie').click()
  def field(name,value):page.locator(f'#movieForm [name="{name}"]').fill(value)
  field('title_en','Temporary admin fixture');
  for locale in ['ru','hy','en']:
   page.locator('#adminLanguage').select_option(locale);assert page.locator('[name=title_en]').input_value()=='Temporary admin fixture';assert page.locator('#saveMovie').inner_text()
  field('title_ru','Временный фильм');field('title_hy','Ժամանակավոր ֆիլմ');field('overview_en','English');field('overview_ru','Описание');field('overview_hy','Նկարագրություն');field('genres','Action, Drama');field('watch_url','https://media.example/fixture.mp4');field('rights_holder','Synthetic producer');field('license_type','Synthetic permission');field('original_source_url','https://rights.example/film');field('license_evidence_url','https://rights.example/grant');field('license_terms_url','https://rights.example/terms');field('attribution','Synthetic credit');page.locator('[name="commercial_streaming_permission"]').check()
  png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
  page.locator('#posterUpload').set_input_files({'name':'fixture.png','mimeType':'image/png','buffer':png})
  page.get_by_text('Image uploaded. Save the movie to attach it. Existing images were not overwritten.',exact=True).wait_for()
  assert '/storage/v1/object/public/cinewave-assets/' in page.locator('[name="poster_path"]').input_value()
  page.locator('#saveMovie').click();page.get_by_text('Saved. Media/rights changes require a new verification review.',exact=True).wait_for()
  assert state['records'][-1]['title_hy']=='Ժամանակավոր ֆիլմ' and not state['records'][-1]['is_published']
  # Escape must cancel, even after an earlier dialog was confirmed.
  page.locator('#verifyMovie').click();page.locator('#reviewConfirmation').check();page.locator('#confirmAction').click()
  page.get_by_text('Review recorded for this saved snapshot. Publication is a separate action.',exact=True).wait_for()
  page.locator('#cancelEdit').click();page.locator('[data-action="publish"][data-id="3"]').click();page.locator('#confirmAction').click()
  expect(page.locator('[data-action="publish"][data-id="3"]')).to_have_text('Unpublish')
  page.locator('#movieRows [data-action="edit"][data-id="3"]').click();field('overview_hy','Թարմացված նկարագրություն');page.evaluate("window.dispatchEvent(new Event('focus'))");assert page.locator('[name=overview_hy]').input_value()=='Թարմացված նկարագրություն';assert page.locator('#verifyMovie').is_disabled();page.locator('#saveMovie').click();page.get_by_text('Saved. Media/rights changes require a new verification review.',exact=True).wait_for()
  assert state['records'][-1]['overview_hy']=='Թարմացված նկարագրություն'
  assert page.locator('#statPlayable').inner_text()=='1'
  for width in [320,768,1440]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  page.locator('#cancelEdit').click();page.locator('[data-action="publish"][data-id="3"]').click();page.locator('#confirmAction').click();expect(page.locator('[data-action="publish"][data-id="3"]')).to_have_text('Publish')
  page.locator('[data-action="delete"][data-id="3"]').click();page.keyboard.press('Escape')
  assert not any(write[0]=='DELETE' for write in state['writes'])
  page.locator('[data-action="delete"][data-id="3"]').click();assert page.locator('#confirmAction').is_disabled()
  page.locator('#typedConfirmation').fill('Temporary admin fixture');page.locator('#confirmAction').click();page.locator('#movieRows [data-action="edit"][data-id="3"]').wait_for(state='detached')
  assert len(state['records'])==2 and state['records'][0]['title_en']=='Existing published'
  state['logout_fail']=True
  with page.expect_navigation(wait_until='networkidle'):page.locator('#logout').click()
  state['logout_fail']=False
  page.locator('#loginForm').wait_for(state='visible');assert page.locator('#dashboard').is_hidden();assert page.locator('[name=title_en]').input_value()==''
  state['rpc_error']=True;login('admin@example.test');page.get_by_text('Administrator setup unavailable. Ask the owner to review and apply the Admin migration.',exact=True).wait_for();assert page.locator('#dashboard').is_hidden()
  assert not errors,errors;assert not csp,csp
  print('PASS static project-prefix routing, real SDK login/logout, metadata-role spoof denial, fail-closed missing migration, dashboard, multilingual CRUD, upload, verify/publish, typed delete/Escape cancellation, optimistic predicates, responsive editor; all writes mocked')
  browser.close()
finally:server.shutdown()
