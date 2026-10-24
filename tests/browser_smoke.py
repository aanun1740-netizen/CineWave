"""Run with Python Playwright installed: python3 tests/browser_smoke.py.
Starts a local server; all external movie/artwork/AI responses are fixtures.
"""
import functools,json,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
rows=[dict(id=1,title_en='Real <Film>',title_ru='Настоящий фильм',title_hy='Իրական ֆիլմ',overview_en='English overview',overview_ru='Русское описание',overview_hy='Հայերեն նկարագրություն',genre_names=['Action','Science Fiction'],poster_path='/fixture.jpg',release_date='2024-01-01'),dict(id=2,title_en='No metadata',genre_names=[],poster_path=None),dict(id=3,title_en='Valid artwork fixture',genre_names=['Crime'],poster_path='/good.jpg')]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=b.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   if '/rest/v1/movies?' in r.request.url:
    requests.append(r.request.url);r.fulfill(status=200,content_type='application/json',body=json.dumps(rows))
   elif r.request.url=='https://image.tmdb.org/t/p/w500/good.jpg':r.fulfill(content_type='image/svg+xml',body=(root/'assets/poster-fallback.svg').read_text())
   elif '/functions/v1/cinewave-ai' in r.request.url:
    assert json.loads(r.request.post_data)['message']=='Recommend a movie'
    r.fulfill(status=200,content_type='application/json',body='{"answer":"Fixture recommendation"}')
   elif r.request.url.startswith(base):r.continue_()
   else:r.abort()
  page.route('**/*',route);page.goto(base,wait_until='networkidle')
  assert len(requests)==1
  assert page.locator('#movies .movie').count()==3
  assert page.locator('#movies .movie-title').first.text_content()=='Real <Film>'
  assert 'Genre unavailable' in page.locator('#movies .movie').nth(1).inner_text()
  for img in page.locator('#movies img').all()[:2]:
   img.scroll_into_view_if_needed()
   page.wait_for_function('(img)=>img.complete&&img.naturalWidth===500',arg=img.element_handle())
   assert img.get_attribute('src')=='assets/poster-fallback.svg'
  good=page.locator('#movies img').nth(2)
  good.scroll_into_view_if_needed()
  page.wait_for_function('(img)=>img.complete&&img.naturalWidth===500',arg=good.element_handle())
  assert good.get_attribute('src')=='https://image.tmdb.org/t/p/w500/good.jpg'
  assert good.get_attribute('data-fallback') is None
  for lang,title,desc in [('ru','Настоящий фильм','Русское описание'),('hy','Իրական ֆիլմ','Հայերեն նկարագրություն'),('en','Real <Film>','English overview')]:
   page.locator('#language').select_option(lang)
   assert page.locator('#movies .movie-title').first.text_content()==title
   page.locator('#movies .movie').first.click()
   assert page.locator('#modalTitle').text_content()==title
   assert page.locator('#modalDesc').text_content()==desc
   page.locator('#closeModal').click()
  # Canonical filter keys stay stable while button/card/heading labels change.
  for lang,crime,scifi in [('en','Crime','Sci-Fi'),('ru','Криминал','Фантастика'),('hy','Քրեական','Գիտաֆանտաստիկ')]:
   page.locator('#language').select_option(lang)
   for key,label,title in [('Crime',crime,'Valid artwork fixture'),('Sci-Fi',scifi,None)]:
    button=page.locator(f'#genres [data-genre="{key}"]')
    assert button.inner_text()==label
    button.click()
    assert button.get_attribute('aria-pressed')=='true'
    assert page.locator('#movies .movie').count()==1
    assert label in page.locator('#movies .movie-meta').inner_text()
    assert page.locator('#popularHeading').text_content()==label+' • CineWave'
    if title: assert page.locator('#movies .movie-title').text_content()==title
   page.locator('#resetFilters').click()
   page.locator('#search').fill(scifi)
   assert page.locator('#movies .movie').count()==1
   page.locator('#resetFilters').click()
  page.locator('#language').select_option('en')
  page.locator('#search').fill('Настоящий')
  assert page.locator('#movies .movie').count()==1
  page.locator('#clearSearch').click();page.locator('[data-genre="Sci-Fi"]').click()
  assert page.locator('#movies .movie').count()==1
  page.locator('#movies .movie').press('Enter');page.locator('#modalList').click();page.keyboard.press('Escape')
  page.locator('.nav [data-nav="My List"]').click()
  assert page.locator('#movies .movie').count()==1
  page.locator('#cw-ai-button').click();page.locator('#cw-ai-input').fill('Recommend a movie');page.locator('#cw-ai-send').click()
  page.get_by_text('Fixture recommendation',exact=True).wait_for()
  page.locator('#cw-ai-close').click();page.locator('#resetFilters').click()
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   box=page.locator('#movies .poster').first.bounding_box()
   assert abs(box['height']/box['width']-1.5)<.05
  # Simulate the reviewed SQL result, without writing to any remote database.
  evidence=json.loads((root/'data/genre-backfill.json').read_text())
  rows=[dict(id=item['id'],title_en=item['expected_title'],release_date=item['expected_release_date'],genre_names=item['genre_names']) for item in evidence['updates']]+[dict(id=item['id'],title_en=item['title_en'],release_date=item['release_date'],genre_names=[]) for item in evidence['unresolved']]
  page.goto(base,wait_until='networkidle')
  assert page.locator('#movies .movie').count()==24
  assert page.locator('#movies .movie').filter(has_text='Genre unavailable').count()==6
  genres=list(dict.fromkeys(genre for row in rows for genre in row['genre_names']))
  for lang in ['en','ru','hy']:
   page.locator('#language').select_option(lang)
   for genre in genres:
    button=page.locator(f'#genres [data-genre="{genre}"]')
    assert button.count()==1
    if lang!='en':assert button.inner_text()!=genre
    button.click()
    expected=sorted('catalog:'+str(row['id']) for row in rows if genre in row['genre_names'])
    actual=sorted(page.locator('#movies .movie').evaluate_all('(cards)=>cards.map(card=>card.dataset.id)'))
    assert actual==expected,(lang,genre,actual,expected)
    assert button.get_attribute('aria-pressed')=='true'
    assert page.locator('#popularHeading').inner_text()==button.inner_text()+' • CineWave'
   page.locator('#resetFilters').click()
  assert not errors,errors
  print('PASS catalog, local fallback, escaped titles, en/ru/hy metadata, multilingual search, secondary genre, keyboard modal, My List, mocked AI and four viewport widths; 24-row proposed-backfill fixture filtered by every genre in en/ru/hy')
  b.close()
finally:server.shutdown()
