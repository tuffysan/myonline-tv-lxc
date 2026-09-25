from pathlib import Path
root=Path(__file__).resolve().parents[1]
app=(root/'app/wwwroot/app.js').read_text(encoding='utf-8')
mobile=(root/'app/wwwroot/mobile.js').read_text(encoding='utf-8')
checks={
 'continue resolver exists':'async function resumeContinueItem(item)' in app,
 'continue IPTV movie token':'/api/vod/${currentProvider}/${encodeURIComponent(movieId)}/token' in app,
 'continue IPTV episode token':'/api/series/${currentProvider}/episode/${encodeURIComponent(episodeId)}/token' in app,
 'continue legacy resolver':'compatibility resolver' in app,
 'player host is guaranteed':'function ensureMediaPlayerHost()' in app and "wrap.id='mediaPlayer'" in app and 'const wrap=ensureMediaPlayerHost();' in app,
 'server playback uses guaranteed host':'async function playServerMedia' in app and 'const wrap=ensureMediaPlayerHost();' in app,
 'direct media playback uses guaranteed host':app.count('const wrap=ensureMediaPlayerHost();') >= 2,
 'favourite movie starts directly':'const t=await api(`/api/vod/${currentProvider}/${encodeURIComponent(item.id)}/token`' in mobile,
 'favourite movie reaches player':'await playServerMedia(t.playToken' in mobile,
 'TV favourites route correctly':"tvHome361Poster(x,'favourite')" in app,
 'desktop favourites route correctly':"desktop362MediaCard(x,'favourite')" in app,
 'favourite action resolver':"kind==='favourite'?`openHomeFavourite" in app,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(('PASS' if v else 'FAIL')+': '+k)
if failed: raise SystemExit('Playback surface regression guard failed: '+', '.join(failed))
print('PASS: playback surface regression guard')
