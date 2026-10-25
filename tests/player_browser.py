"""Real MP4/HLS decoding tests using locally generated, copyright-free media.
Requires ffmpeg, Python Playwright and /usr/bin/chromium. Never writes remotely.
"""
import functools,json,subprocess,tempfile,threading,re
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cinewave-media-') as temporary:
 media=Path(temporary)
 subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','12','-c:v','libx264','-preset','ultrafast','-g','48','-keyint_min','48','-sc_threshold','0','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',str(media/'fixture.mp4')],check=True)
 subprocess.run(['ffmpeg','-v','error','-i',str(media/'fixture.mp4'),'-c','copy','-hls_time','2','-hls_playlist_type','vod','-hls_segment_filename',str(media/'segment%03d.ts'),str(media/'fixture.m3u8')],check=True)
 for height in [360,720]:
  name='quality'+str(height)
  subprocess.run(['ffmpeg','-v','error','-i',str(media/'fixture.mp4'),'-vf',f'scale=-2:{height}','-c:v','libx264','-threads','2','-preset','ultrafast','-g','48','-c:a','copy','-movflags','+faststart',str(media/(name+'.mp4'))],check=True)
  subprocess.run(['ffmpeg','-v','error','-i',str(media/(name+'.mp4')),'-c','copy','-hls_time','2','-hls_playlist_type','vod','-hls_segment_filename',str(media/(name+'%03d.ts')),str(media/(name+'.m3u8'))],check=True)
 (media/'master.m3u8').write_text('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=900000,RESOLUTION=640x360\nquality360.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720\nquality720.m3u8\n')
 class Handler(SimpleHTTPRequestHandler):
  def translate_path(self,path):
   if path.startswith('/test-media/'):
    target=(media/path.split('?',1)[0].removeprefix('/test-media/')).resolve()
    return str(target if target.is_relative_to(media) else media/'not-found')
   return super().translate_path(path)
  def send_head(self):
   self.remaining=None
   path=Path(self.translate_path(self.path))
   if self.path.startswith('/test-media/') and path.is_file() and self.headers.get('Range'):
    size=path.stat().st_size;match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers['Range'])
    if not match:self.send_error(416);return None
    start=int(match[1]);end=min(int(match[2]) if match[2] else size-1,size-1)
    if start>end:self.send_error(416);return None
    self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)));self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(end-start+1));self.end_headers()
    stream=path.open('rb');stream.seek(start);self.remaining=end-start+1;return stream
   return super().send_head()
  def copyfile(self,source,output):
   if self.remaining is None:
    try:return super().copyfile(source,output)
    except (BrokenPipeError,ConnectionResetError):return
   while self.remaining:
    block=source.read(min(self.remaining,65536))
    if not block:break
    try:output.write(block)
    except (BrokenPipeError,ConnectionResetError):return
    self.remaining-=len(block)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}/'
 rows=[dict(id=1,title_en='MP4 fixture',genre_names=['Action'],watch_url=base+'test-media/fixture.mp4'),dict(id=2,title_en='HLS fixture',genre_names=['Drama'],watch_url=base+'test-media/fixture.m3u8'),dict(id=3,title_en='Missing source',genre_names=[],watch_url=None),dict(id=4,title_en='Unavailable source',genre_names=[],watch_url=base+'test-media/404.mp4')]
 rows.extend([dict(id=5,title_en='Actual HLS quality variants',genre_names=['Drama'],watch_url=base+'test-media/master.m3u8'),dict(id=6,title_en='Actual MP4 renditions',genre_names=['Drama'],watch_url=base+'test-media/fixture.mp4',video_renditions=[{'height':360,'url':base+'test-media/quality360.mp4'},{'height':720,'url':base+'test-media/quality720.mp4'}])])
 # Synthetic fixture approvals authorize only the local generated test media.
 for row in rows:
  if row['watch_url']:
   row['playback_verification']={'watch_url':row['watch_url'],'license_verified':True,'playback_verified':True,'commercial_reuse_verified':True,'license_source':'https://rights.example.org/synthetic-test','license_terms_source':'https://rights.example.org/synthetic-test/terms','renditions':row.get('video_renditions',[])}
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
   page=browser.new_page();errors=[];requests=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:requests.append(r.url))
   def route(r):
    if '/rest/v1/movies?' in r.request.url:r.fulfill(content_type='application/json',body=json.dumps(rows))
    elif r.request.url.startswith(base):r.continue_()
    else:r.abort()
   page.route('**/*',route);page.goto(base,wait_until='networkidle')
   def open_movie(id):
    page.locator(f'#movies [data-id="catalog:{id}"]').click()
   def close():page.locator('#closeModal').click()
   open_movie(1)
   page.wait_for_function("document.querySelector('.cw-stage video').readyState>=1")
   assert page.locator('.cw-quality').is_hidden() # A single MP4 is not multiple qualities.
   assert 11<page.locator('.cw-stage video').evaluate('(v)=>v.duration')<13
   page.get_by_role('button',name='Play',exact=True).click()
   page.wait_for_function("document.querySelector('.cw-stage video').currentTime>0.3")
   page.get_by_role('button',name='Pause',exact=True).click()
   assert page.locator('.cw-stage video').evaluate('(v)=>v.paused')
   page.locator('.cw-volume').evaluate("el=>{el.value='0.3';el.dispatchEvent(new Event('input',{bubbles:true}))}")
   assert abs(page.locator('video').evaluate('(v)=>v.volume')-.3)<.01
   page.get_by_role('button',name='Mute',exact=True).click();assert page.locator('video').evaluate('(v)=>v.muted')
   page.get_by_role('button',name='Unmute',exact=True).click()
   page.locator('.cw-seek').evaluate("el=>{el.value='6';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}")
   page.wait_for_function("document.querySelector('video').currentTime>=5.9")
   assert page.evaluate("JSON.parse(localStorage.getItem('cinewave:playback:catalog:1')).time>=5.9")
   page.get_by_role('button',name='Fullscreen',exact=True).click()
   page.wait_for_function('!!document.fullscreenElement')
   page.get_by_role('button',name='Exit fullscreen',exact=True).click()
   page.wait_for_function('!document.fullscreenElement')
   page.get_by_role('button',name='Play',exact=True).click()
   page.evaluate('window.testVideo=document.querySelector("video")')
   for lang,label in [('ru','Пауза'),('hy','Դադար'),('en','Pause')]:
    page.locator('#language').select_option(lang)
    assert page.evaluate('window.testVideo===document.querySelector("video")')
    assert page.get_by_role('button',name=label,exact=True).is_visible()
   close();assert page.evaluate('window.testVideo.paused&&!window.testVideo.getAttribute("src")')
   open_movie(1);page.wait_for_function("document.querySelector('video').readyState>=1&&document.querySelector('video').currentTime>=5.9")
   close()
   open_movie(2)
   page.get_by_role('button',name='Play',exact=True).click()
   page.wait_for_function("document.querySelector('video').currentTime>0.3",timeout=20000)
   assert any('fixture.m3u8' in u for u in requests) and any('segment' in u and '.ts' in u for u in requests)
   page.locator('.cw-seek').evaluate("el=>{el.value='8';el.dispatchEvent(new Event('input',{bubbles:true}))}")
   page.wait_for_function("document.querySelector('video').currentTime>=7.9")
   page.keyboard.press('Escape')
   assert not page.locator('#modal').evaluate('(el)=>el.classList.contains("open")')
   assert page.locator('video').evaluate('(v)=>v.paused&&!v.getAttribute("src")')
   open_movie(3)
   assert page.get_by_text('This film is available to explore. Playback is not currently available.',exact=True).is_visible()
   assert page.locator('video').count()==0
   close();open_movie(4)
   page.get_by_role('button',name='Try again',exact=True).wait_for()
   assert page.locator('.cw-status').inner_text() in ['This browser cannot play this video format.','This video is unavailable. Check your connection or try again.']
   for lang,messages in [('ru',['Этот браузер не поддерживает формат видео.','Видео недоступно. Проверьте соединение или попробуйте снова.']),('hy',['Այս դիտարկիչը չի աջակցում տեսանյութի ձևաչափին։','Տեսանյութը հասանելի չէ։ Ստուգեք կապը կամ փորձեք կրկին։'])]:
    page.locator('#language').select_option(lang)
    assert page.locator('.cw-status').inner_text() in messages
   page.locator('#language').select_option('en')
   page.get_by_role('button',name='Try again',exact=True).click()
   page.get_by_role('button',name='Try again',exact=True).wait_for()
   close();open_movie(1)
   for width in [320,390,768,1440]:
    page.set_viewport_size({'width':width,'height':900})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert page.locator('.cw-controls').bounding_box()['width']<=width
   close()
   open_movie(6);page.wait_for_function("document.querySelector('video').readyState>=1")
   assert page.locator('.cw-quality option').all_text_contents()==['Original','360p','720p']
   page.locator('.cw-seek').evaluate("el=>{el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}))}")
   page.locator('.cw-quality').select_option('source:0')
   page.wait_for_function("document.querySelector('video').readyState>=1&&document.querySelector('video').videoHeight===360&&document.querySelector('video').currentTime>=4.9")
   page.locator('.cw-quality').select_option('source:1')
   page.wait_for_function("document.querySelector('video').readyState>=1&&document.querySelector('video').videoHeight===720&&document.querySelector('video').currentTime>=4.9")
   page.set_viewport_size({'width':320,'height':900});assert page.locator('.cw-controls').bounding_box()['width']<=320;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.set_viewport_size({'width':1440,'height':900})
   page.locator('#language').select_option('hy');assert page.locator('.cw-quality').get_attribute('aria-label')=='Որակ';page.locator('#language').select_option('en');close()
   # Chromium supports native HLS here; explicitly exercise hls.js/MSE too.
   page.evaluate("()=>{window.originalCanPlayType=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=function(type){return String(type).includes('mpegurl')?'':window.originalCanPlayType.call(this,type)}}")
   open_movie(5);page.get_by_role('button',name='Play',exact=True).click()
   page.wait_for_function("document.querySelectorAll('.cw-quality option').length===3")
   assert page.locator('.cw-quality option').all_text_contents()==['Auto','360p','720p']
   page.locator('.cw-quality').select_option('level:0')
   page.wait_for_function("document.querySelector('video').videoHeight===360",timeout=20000)
   page.locator('.cw-quality').select_option('level:1')
   page.wait_for_function("document.querySelector('video').videoHeight===720",timeout=20000)
   page.locator('.cw-quality').select_option('auto');close()
   # Explicit unsupported-MSE behavior; actual Safari/native HLS is not claimed.
   page.evaluate("Hls.isSupported=()=>false;HTMLMediaElement.prototype.canPlayType=function(){return ''}")
   open_movie(2)
   assert page.get_by_text('This browser cannot play this video format.',exact=True).is_visible()
   close()
   assert page.evaluate("CineWavePlayer.sourceURL('javascript:alert(1)')===null")
   assert page.evaluate("CineWavePlayer.sourceURL('https://user:password@example.org/a.mp4')===null")
   assert not errors,errors
   print('PASS real MP4 and HLS decode; play/pause, volume/mute, seek, fullscreen, progress/resume, en/ru/hy without reload, teardown, missing/404/retry, responsive player, actual MP4/HLS 360p/720p switching with position retention; single MP4 has no fake quality menu')
   browser.close()
 finally:server.shutdown()
