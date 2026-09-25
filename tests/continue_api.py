"""Real Kestrel persistence regression; uses an isolated temporary data directory."""
import concurrent.futures
import http.cookiejar
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
DLL = ROOT / 'app/bin/Release/net10.0/MyOnlineTV.Web.dll'
BASE = 'http://127.0.0.1:5080'

def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

def request(opener, method, route, data=None, profile='default'):
    headers = {'Content-Type': 'application/json', 'X-MyOnline-Profile': profile}
    req = urllib.request.Request(BASE + route, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
    with opener.open(req, timeout=15) as response:
        raw = response.read()
        return json.loads(raw) if raw else None

def item(id):
    return dict(id=id, title='Ångström episode/movie', url='', positionSeconds=75, durationSeconds=600, updated='2026-09-24T10:00:00Z')

with socket.socket() as probe:
    if probe.connect_ex(('127.0.0.1', 5080)) == 0:
        raise RuntimeError('Port 5080 is occupied; refusing to touch an existing application.')

with tempfile.TemporaryDirectory(prefix='myonline-continue-') as directory:
    data = Path(directory)
    movie, episode = 'iptv-movie:p:1', 'iptv-episode:p:2:mp4'
    (data/'continue-watching.json').write_text(json.dumps([item(movie), item(episode)]))
    media = data/'untouched-media.mkv'; media.write_bytes(b'original media')
    process = None
    log = open(data/'test.log', 'w+')
    def start():
        global process
        process = subprocess.Popen(['dotnet', str(DLL)], cwd=ROOT/'app', env={**os.environ, 'MYONLINE_DATA': str(data)}, stdout=log, stderr=log,
                                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        for _ in range(150):
            if process.poll() is not None: break
            try:
                urllib.request.urlopen(BASE+'/api/auth/status', timeout=1).close()
                return
            except OSError: time.sleep(.1)
        log.flush();log.seek(0)
        raise RuntimeError('Test server failed: '+log.read())
    def stop():
        if process and process.poll() is None:
            process.terminate();process.wait(timeout=20)
    credentials={'username':'continue-test','password':'Test-password-4729!'}
    try:
        start(); session=client()
        request(session,'POST','/api/auth/setup',credentials)
        assert len(request(session,'GET','/api/continue'))==2
        # Favourite/profile state is independent of Continue Watching.
        request(session,'PUT','/api/profile-state/default/'+urllib.parse.quote(movie,safe=''),{'title':'Favourite movie','kind':'movie','favourite':True,'positionSeconds':75})
        before=request(session,'GET','/api/profile-state/default')
        request(session,'DELETE','/api/continue/'+urllib.parse.quote(movie,safe=''))
        request(session,'DELETE','/api/continue/'+urllib.parse.quote(movie,safe=''))
        assert [x['id'] for x in request(session,'GET','/api/continue')]==[episode]
        try:
            request(session,'GET','/api/continue',profile='other-profile')
            raise AssertionError('Foreign profile was accessible')
        except urllib.error.HTTPError as error:
            assert error.code in (403,404)
        request(session,'POST','/api/auth/logout')
        session=client();request(session,'POST','/api/auth/login',credentials)
        assert [x['id'] for x in request(session,'GET','/api/continue')]==[episode]
        stop();start();session=client();request(session,'POST','/api/auth/login',credentials)
        assert [x['id'] for x in request(session,'GET','/api/continue')]==[episode]
        request(session,'DELETE','/api/continue/'+urllib.parse.quote(episode,safe=''))
        assert request(session,'GET','/api/continue')==[]
        request(session,'POST','/api/continue',item(movie))
        assert [x['id'] for x in request(session,'GET','/api/continue')]==[movie]
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda i:request(session,'POST','/api/continue',item('episode:'+str(i))), range(16)))
        assert len(request(session,'GET','/api/continue'))==17
        request(session,'DELETE','/api/continue')
        stop();start();session=client();request(session,'POST','/api/auth/login',credentials)
        assert request(session,'GET','/api/continue')==[]
        assert request(session,'GET','/api/profile-state/default')==before
        assert media.read_bytes()==b'original media'
        request(session,'POST','/api/continue',item(episode))
        assert [x['id'] for x in request(session,'GET','/api/continue')]==[episode]
        print('PASS: movie/episode removal, idempotency, profile isolation, logout/login, restart, clear, rewatch, concurrent saves, favourites/media preservation.')
    finally:
        stop();log.close()
