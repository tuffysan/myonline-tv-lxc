"""Two-account black-box security tests against real Kestrel and a local upstream.

Run after the Release build. All data and downloads live in a temporary directory.
Never contacts a configured/production IPTV provider.
"""
import http.cookiejar
import http.server
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:5080'
PASSWORD = 'Isolation-test-9847!'


def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(c, method, path, data=None, profile='default', status=200, binary=False):
    req = urllib.request.Request(BASE+path, method=method,
        headers={'Content-Type': 'application/json', 'X-MyOnline-Profile': profile},
        data=json.dumps(data).encode() if data is not None else None)
    try:
        response = c.open(req, timeout=45)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        raw = response.read()
        assert response.status == status, (method, path, response.status, status, raw[:500])
        if binary:
            return raw, response.headers
        return json.loads(raw) if raw else None


def denied(c, method, path, data=None, profile='default'):
    call(c, method, path, data, profile, status=404)


def progress(id):
    return dict(id=id, title='Räksmörgås', positionSeconds=90, durationSeconds=600)


class Upstream(http.server.BaseHTTPRequestHandler):
    channel_count = 2
    def do_GET(self):
        payload = b'isolated test media'
        kind = 'video/mp4'
        if 'player_api.php' in self.path:
            payload, kind = b'[]', 'application/json'
        if self.path == '/fixture.m3u':
            rows=['#EXTM3U']
            for i in range(self.channel_count):
                rows += [f'#EXTINF:-1 tvg-id="{i}" group-title="{"Adult 18+" if i == 1 else "News"}",Channel {i}', f'http://127.0.0.1:{self.server.server_port}/stream/{i}.mp4']
            payload,kind='\n'.join(rows).encode(),'application/x-mpegurl'
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_):
        pass


with socket.socket() as probe:
    if probe.connect_ex(('127.0.0.1', 5080)) == 0:
        raise RuntimeError('Port 5080 occupied; refusing to use an existing application.')

with tempfile.TemporaryDirectory(prefix='myonline-isolation-') as directory:
    data = Path(directory)
    upstream = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Upstream)
    threading.Thread(target=upstream.serve_forever, daemon=True).start()
    upstream_url = f'http://127.0.0.1:{upstream.server_port}'
    log = open(data/'server.log', 'w+')
    process = None

    def start():
        global process
        process = subprocess.Popen(['dotnet', str(ROOT/'app/bin/Release/net10.0/MyOnlineTV.Web.dll')],
            cwd=ROOT/'app', env={**os.environ, 'MYONLINE_DATA': str(data)}, stdout=log, stderr=log,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        for _ in range(150):
            if process.poll() is not None:
                break
            try:
                urllib.request.urlopen(BASE+'/api/auth/status', timeout=1).close()
                return
            except OSError:
                time.sleep(.1)
        log.flush(); log.seek(0)
        raise RuntimeError(log.read())

    def stop():
        if process and process.poll() is None:
            process.terminate(); process.wait(timeout=20)

    def login(name):
        c = client()
        call(c, 'POST', '/api/auth/login', dict(username=name, password=PASSWORD))
        return c

    try:
        # Unattributed legacy global progress must not become every user's history.
        (data/'continue-watching.json').write_text(json.dumps([progress('legacy-root')]))
        start()
        root = client()
        call(root, 'POST', '/api/auth/setup', dict(username='root', password=PASSWORD))
        users = {}
        for name in ('alice', 'bob'):
            users[name] = call(root, 'POST', '/api/admin/users', dict(username=name, password=PASSWORD, role='User', enabled=True))
        a, b = login('alice'), login('bob')
        for route in ('/api/admin/overview-v2','/api/admin/users','/API/Admin/production-readiness'):
            call(client(),'GET',route,status=401)
            call(a,'GET',route,status=403)
            call(root,'GET',route)
        pa, pb = (users[n]['profileId'] for n in ('alice', 'bob'))
        assert call(a, 'GET', '/api/continue') == call(b, 'GET', '/api/continue') == []
        assert len(call(root, 'GET', '/api/continue')) == 1
        for c, other in ((a,pb),(b,pa)):
            denied(c,'GET','/api/continue',profile=other)
            denied(c,'DELETE','/api/continue',profile=other)
            denied(c,'GET','/api/favourites',profile=other)
            call(c,'GET','/api/profile-state/'+other,status=403)
            denied(c,'POST','/api/profile/'+other+'/verify-pin',dict(pin='1234'))
        movie, episode = 'movie:1', 'episode:2'
        for c in (a,b):
            for id in (movie,episode): call(c,'POST','/api/continue',progress(id))
        call(a,'PUT',f'/api/profile-state/{pa}/movie:1',dict(title='Keep favourite',favourite=True))
        state = call(a,'GET','/api/profile-state/'+pa)
        call(a,'DELETE','/api/continue/'+movie,status=204)
        assert [x['id'] for x in call(a,'GET','/api/continue')]==[episode]
        assert len(call(b,'GET','/api/continue'))==2
        call(a,'DELETE','/api/continue',status=204)
        assert call(a,'GET','/api/profile-state/'+pa)==state
        call(a,'POST','/api/auth/logout')
        a=login('alice')
        assert call(a,'GET','/api/continue')==[]
        stop();start();a,b,root=login('alice'),login('bob'),login('root')
        assert call(a,'GET','/api/continue')==[] and len(call(b,'GET','/api/continue'))==2
        call(a,'POST','/api/continue',progress(episode))
        assert len(call(a,'GET','/api/continue'))==1
        print('PASS: account/profile progress isolation, delete/clear, favourite preservation, login/restart, rewatch')

        pids=[]
        for c,name in ((a,'alice'),(b,'bob')):
            call(c,'POST','/api/providers',dict(name=name,type='xtream',baseUrl=upstream_url,username=name,password='private-'+name))
            rows=call(c,'GET','/api/providers');assert len(rows)==1
            pids.append(rows[0]['id'])
        ap,bp=pids
        for c,pid in ((a,bp),(b,ap),(root,ap)):
            for path in (f'/api/providers/{pid}/edit', f'/api/channels/{pid}',f'/api/epg/{pid}',f'/api/vod/{pid}/categories',f'/api/channel-preferences/{pid}'):
                denied(c,'GET',path)
            denied(c,'POST',f'/api/series/{pid}/episode/1/token')
            denied(c,'POST',f'/api/catalogue-cache/clear/{pid}')
        assert 'private-alice' not in json.dumps(call(a,'GET',f'/api/providers/{ap}/edit'))
        assert call(a,'GET',f'/api/vod/{ap}/categories')==[]
        call(a,'GET','/api/epg/preferences')  # literal route must not be treated as a provider ID
        print('PASS: IPTV ownership, credential redaction, source cache routes and metadata routes')

        source=call(a,'POST','/api/providers',dict(name='Refresh fixture',type='m3u',playlistUrl=upstream_url+'/fixture.m3u'))['id']
        preview=call(a,'POST',f'/api/providers/{source}/refresh-live-preview')
        assert preview['added']==2
        call(a,'POST',f'/api/providers/{source}/refresh-live')
        assert 'Adult 18+' in call(a,'GET',f'/api/channel-preferences/{source}')['hiddenGroups']
        call(a,'POST',f'/api/providers/{source}/adult-groups',dict(active=True))
        assert 'Adult 18+' not in call(a,'GET',f'/api/channel-preferences/{source}')['hiddenGroups']
        call(a,'POST',f'/api/providers/{source}/refresh-settings',dict(mode='manual',intervalHours=24,newChannelsActive=False))
        Upstream.channel_count=3
        assert call(a,'POST',f'/api/providers/{source}/refresh-live-preview')['added']==1
        call(a,'POST',f'/api/providers/{source}/refresh-live')
        assert len(call(a,'GET',f'/api/channel-preferences/{source}')['hiddenChannels'])==1
        assert len(call(a,'GET',f'/api/providers/{source}/sync-history'))==2
        assert call(a,'GET',f'/api/providers/{source}/sync-diagnostics')['lastAdded']==1
        call(a,'POST',f'/api/catalogue-preferences/{ap}/bulk',dict(kind='vod',hiddenCategories=['private-category'],hiddenItems=['private-item'],replaceItems=True))
        assert call(a,'GET',f'/api/catalogue-preferences/{ap}')['hiddenVodItems']==['private-item']
        for suffix,method in (('adult-groups','POST'),('refresh-live-preview','POST'),('sync-history','GET'),('sync-diagnostics','GET')):
            denied(b,method,f'/api/providers/{source}/'+suffix)
        call(b,'POST',f'/api/catalogue-preferences/{ap}/bulk',dict(kind='vod'),status=403)
        print('PASS: restored adult controls, refresh preview/history/diagnostics, new-channel policy and catalogue bulk isolation')

        tokens=[]
        for c,pid in ((a,ap),(b,bp)):
            tokens.append(call(c,'POST',f'/api/series/{pid}/episode/1/token'))
        token=tokens[0]['downloadToken']
        denied(b,'GET','/api/downloads/device/'+token)
        denied(b,'GET','/api/proxy/'+tokens[0]['playToken'])
        denied(b,'GET','/API/Proxy/'+tokens[0]['playToken'])
        denied(b,'GET','/API/Downloads/Device/'+token)
        denied(b,'POST','/API/Live/Start/'+ap+'/1')
        denied(b,'POST','/api/media/start/'+tokens[0]['playToken'])
        call(b,'POST','/api/downloads/media',dict(token=token,title='stolen'),status=400)
        raw,headers=call(a,'GET','/api/downloads/device/'+token+'?title='+urllib.parse.quote('Räksmörgås'),binary=True)
        assert raw==b'isolated test media'
        cd=headers['Content-Disposition']
        assert cd.isascii() and 'filename=' in cd and "filename*=UTF-8''R%C3%A4ksm%C3%B6rg%C3%A5s.mp4" in cd
        assert headers['Cache-Control']=='no-store'
        call(root,'POST','/api/admin/storage-targets',dict(name='Test',type='path',destination=str(data/'downloads-test'),defaultDownload=True,defaultDvr=True,enabled=True))
        jobs=[call(c,'POST','/api/downloads/media',dict(token=t['downloadToken'],title='Same title'),status=202) for c,t in ((a,tokens[0]),(b,tokens[1]))]
        for c,job in ((a,jobs[0]),(b,jobs[1])):
            for _ in range(100):
                rows=call(c,'GET','/api/downloads');assert len(rows)==1
                if rows[0]['status']=='Completed': break
                assert rows[0]['status']!='Failed',rows
                time.sleep(.1)
            assert rows[0]['status']=='Completed',rows
        for suffix,method in (('/file','GET'),('/cancel','POST'),('/retry','POST'),('','DELETE')):
            denied(b,method,'/api/downloads/'+jobs[0]['id']+suffix)
        files=list((data/'downloads-test').glob('*'))
        assert len(files)==2 and all(f.read_bytes()==raw for f in files)
        print('PASS: token/job ownership, cross-user download mutations, filename collision protection and Unicode HTTP header')

        rule=dict(providerId=ap,channelKey='1',titlePattern='Private programme')
        rules=call(a,'POST','/api/dvr/rules',rule);rid=rules[0]['id']
        assert call(b,'GET','/api/dvr/rules')==[]
        denied(b,'POST','/api/dvr/rules',rule)
        denied(b,'POST','/api/dvr/rules',{**rule,'id':rid,'providerId':bp})
        denied(b,'DELETE','/api/dvr/rules/'+rid)
        rec=dict(providerId=ap,channelKey='1',title='Private recording',start='2099-01-01T10:00:00Z',end='2099-01-01T11:00:00Z')
        job=call(a,'POST','/api/recordings',rec)
        assert call(b,'GET','/api/recordings')==[]
        denied(b,'POST','/api/recordings',rec)
        for suffix,method in (('/file','GET'),('/cancel','POST'),('','DELETE')):
            denied(b,method,'/api/recordings/'+job['id']+suffix)
        rooms=call(a,'POST','/api/rooms/register',dict(name='Private TV',activeTitle='Private film'))
        assert call(b,'GET','/api/rooms')==[]
        denied(b,'POST','/api/rooms/'+rooms[0]['id']+'/handoff',dict(title='Intrusion'))
        call(a,'POST','/api/notifications',dict(title='Private notification',message='Private'))
        notice=call(a,'GET','/api/notifications')[0]
        assert call(b,'GET','/api/notifications')==[]
        denied(b,'POST','/api/notifications/'+notice['id']+'/read')
        print('PASS: DVR/rules/recording ownership and room/notification isolation')
        libs=[]
        for c,name in ((a,'alice'),(b,'bob')):
            libs.append(call(c,'POST','/api/media-libraries',dict(name=name,type='jellyfin',baseUrl=upstream_url,token='secret-'+name,enabled=True,libraryIds=[])))
        lid=libs[0]['id']
        assert len(call(b,'GET','/api/media-libraries'))==1
        for path in (f'/api/media-libraries/{lid}/edit',f'/api/media-libraries/{lid}/libraries',f'/api/unified/jellyfin/{lid}/1/play',f'/api/unified/jellyfin/{lid}/1/episodes'):
            denied(b,'GET',path)
        denied(b,'DELETE','/api/media-libraries/'+lid)
        print('PASS: media-library credential, playback and episode isolation')
        # Real FFmpeg creates independent HLS sessions against the local fake media source.
        sessions=[call(c,'POST','/api/media/start/'+t['playToken'],status=202) for c,t in ((a,tokens[0]),(b,tokens[1]))]
        sid=sessions[0]['sessionId']
        denied(b,'GET','/api/live/status/'+sid)
        denied(b,'GET','/api/live/hls/'+sid+'/index.m3u8')
        denied(b,'DELETE','/api/live/session/'+sid)
        # Invalid media can fail decoding, but B's start must not remove A's session.
        assert call(a,'GET','/api/live/status/'+sid)['sessionId']==sid
        call(b,'DELETE','/api/live/session/'+sessions[1]['sessionId'],status=204)
        print('PASS: playback sessions are owned and one user starting playback does not stop another')


        # Recreating a username must neither revive old cookies nor inherit private sources.
        call(root,'DELETE','/api/admin/users/'+users['alice']['id'],status=204)
        call(root,'POST','/api/admin/users',dict(username='alice',password=PASSWORD,role='User',enabled=True))
        call(a,'GET','/api/providers',status=401)
        fresh=login('alice')
        assert call(fresh,'GET','/api/providers')==[]
        assert call(fresh,'GET','/api/continue')==[]
        denied(fresh,'GET','/api/downloads/device/'+token)
        call(root,'POST','/api/admin/users',dict(id=users['bob']['id'],username='bob',role='User',enabled=False))
        call(b,'GET','/api/providers',status=401)
        assert call(b,'GET','/api/auth/status')['authenticated'] is False
        print('PASS: deleted/recreated account does not inherit old cookies, progress, sources or tokens')
        print('All multi-user API isolation checks passed.')
    except Exception:
        log.flush();log.seek(0);print(log.read()[-10000:])
        raise
    finally:
        stop();log.close();upstream.shutdown();upstream.server_close()
