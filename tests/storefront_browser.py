"""Public storefront interactions. Fixtures are synthetic; no remote writes."""
import functools,json,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
rows=[dict(id=i,title_en=f'Catalog supplied title {i}',title_ru=f'Фильм {i}',title_hy=f'Ֆիլմ {i}',overview_en=f'Supplied description {i}',overview_ru=f'Описание {i}',overview_hy=f'Նկարագրություն {i}',release_date=f'{2000+i}-01-01',genre_names=['Drama','Thriller'],poster_path=f'https://art.example.test/{i}.svg',backdrop_path=f'https://art.example.test/backdrop-{i}.svg',watch_url=f'https://media.example.test/{i}.mp4') for i in range(1,13)]
rows[1]['poster_path']='https://art.example.test/broken.svg'
rows[0]['playback_verification']={'watch_url':rows[0]['watch_url'],'license_verified':True,'playback_verified':True,'commercial_reuse_verified':True,'license_source':'https://rights.example.test/synthetic','license_terms_source':'https://rights.example.test/synthetic/terms'}
state={'mode':'populated','ai_fail':False}
requests=[];writes=[];errors=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(reduced_motion='reduce')
  page.on('pageerror',lambda error:errors.append(str(error)))
  def route(r):
   url=r.request.url;requests.append(url)
   if r.request.method not in ['GET','HEAD']:writes.append((r.request.method,url))
   if '/rest/v1/movies?' in url:r.fulfill(status=503 if state['mode']=='error' else 200,content_type='application/json',body=json.dumps(rows if state['mode']=='populated' else []))
   elif '/functions/v1/cinewave-ai' in url:
    assert json.loads(r.request.post_data)=={'message':'Recommend a film'}
    r.fulfill(status=503 if state['ai_fail'] else 200,content_type='application/json',body='{"answer":"Synthetic AI response"}')
   elif url=='https://art.example.test/broken.svg':r.abort()
   elif url.startswith('https://art.example.test/'):
    r.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="500" height="750" fill="#493044"/><circle cx="250" cy="300" r="160" fill="#a53e60"/></svg>')
   elif url.startswith(base):r.continue_()
   else:r.abort()
  page.route('**/*',route);page.goto(base,wait_until='networkidle')
  assert page.locator('#movies .movie').count()==12
  assert page.locator('#heroTitle').inner_text()==rows[0]['title_en']
  assert page.locator('#heroWatch').inner_text()=='Watch Now'
  assert page.locator('#watchableGrid .movie').count()==1
  assert page.locator('#movies .poster-badge.available').count()==1
  assert page.locator('#movies .poster-badge:not(.available)').count()==11
  # Horizontal navigation and keyboard focus both advance the real catalog row.
  row=page.locator('#movies');assert row.evaluate('(el)=>el.scrollWidth>el.clientWidth')
  page.locator('[data-scroll="movies"][data-direction="1"]').click()
  page.wait_for_function('document.getElementById("movies").scrollLeft>50')
  page.locator('[data-scroll="movies"][data-direction="-1"]').click()
  page.wait_for_function('document.getElementById("movies").scrollLeft<5')
  row.locator('.movie').first.focus();page.keyboard.press('ArrowRight')
  assert row.locator('.movie').nth(1).evaluate('(el)=>el===document.activeElement')
  # An unapproved URL remains browse-only and does not issue any media request.
  row.locator('.movie').nth(1).click()
  assert page.locator('.availability-note').is_visible() and page.locator('video').count()==0
  assert not any(url.startswith('https://media.example.test/') for url in requests)
  page.locator('#modalList').click();page.locator('#closeModal').click()
  page.locator('#profileButton').click();assert page.locator('#profilePanel').is_visible()
  page.locator('#profileList').click();assert page.locator('#movies .movie').count()==1
  page.reload(wait_until='networkidle');page.locator('.nav [data-nav="My List"]').click()
  assert page.locator('#movies .movie').count()==1
  page.locator('#resetFilters').click()
  for lang,title,details in [('ru','Фильм 1','О фильме'),('hy','Ֆիլմ 1','Ֆիլմի մասին'),('en','Catalog supplied title 1','View details')]:
   page.locator('#language').select_option(lang)
   assert page.locator('#heroTitle').inner_text()==title
   page.locator('[data-feature="1"]').click()
   assert page.locator('#heroWatch').inner_text()==details
   assert page.locator('#heroArt').evaluate('(el)=>el.hidden')
   page.locator('[data-feature="0"]').click()
   page.locator('#cw-ai-button').click();assert page.locator('#cw-ai-panel').is_visible()
   page.locator('#cw-ai-close').click()
   assert page.locator('#cw-ai-input').get_attribute('aria-label')
  page.locator('#cw-ai-button').click();page.locator('#cw-ai-input').fill('Recommend a film');page.locator('#cw-ai-send').click()
  page.get_by_text('Synthetic AI response',exact=True).wait_for();page.locator('#cw-ai-close').click()
  state['ai_fail']=True
  page.locator('#cw-ai-button').click();page.locator('#cw-ai-input').fill('Recommend a film');page.locator('#cw-ai-send').click()
  page.get_by_text('The assistant is unavailable right now. Please try again.',exact=True).wait_for()
  for lang,message in [('ru','Помощник сейчас недоступен. Попробуйте ещё раз.'),('hy','Օգնականն այս պահին հասանելի չէ։ Փորձեք կրկին։')]:
   page.locator('#language').select_option(lang)
   assert page.locator('[data-ai-status="aiError"]').inner_text()==message
  page.locator('#cw-ai-close').click()
  # Header, hero and carousel bounds at desktop/tablet/mobile widths in every locale.
  for lang in ['en','ru','hy']:
   page.locator('#language').select_option(lang)
   for width in [320,390,768,1024,1440]:
    page.set_viewport_size({'width':width,'height':900})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(lang,width)
    assert page.locator('.hero').bounding_box()['width']<=width
    assert page.locator('#movies').evaluate('(el)=>el.scrollWidth>el.clientWidth')
  page.locator('#language').select_option('en')
  state['mode']='error';page.reload(wait_until='networkidle')
  assert page.locator('#movies .movie').count()==0
  assert page.locator('#retryCatalog').is_visible() and page.locator('#heroWatch').is_disabled()
  assert 'BEYOND THE STARS' not in page.locator('body').inner_text()
  state['mode']='empty';page.locator('#retryCatalog').click()
  page.wait_for_function('document.getElementById("retryCatalog").hidden')
  assert page.locator('#movies .movie').count()==0 and page.locator('#empty').is_visible()
  assert page.locator('#heroWatch').is_disabled()
  assert not errors,errors
  assert writes==[('POST','https://ysecowknittmmmbixgtu.supabase.co/functions/v1/cinewave-ai')]*2,writes
  print('PASS live-shaped catalog hero/rows, carousels/keyboard, playback approval gate/no media requests, persistent My List/profile, en/ru/hy, AI contract, 15 viewport/locale combinations, error/retry/empty without demos, no database writes')
  browser.close()
finally:server.shutdown()
