from pathlib import Path
root=Path(__file__).resolve().parents[1]
app=(root/'app/wwwroot/app.js').read_text(encoding='utf-8')
mobile=(root/'app/wwwroot/mobile.js').read_text(encoding='utf-8')
checks={
 'continue resolver exists':'async function resumeContinueItem(item)' in app,
 'continue IPTV movie token':'/api/vod/${currentProvider}/${encodeURIComponent(movieId)}/token' in app,
 'continue IPTV episode token':'/api/series/${currentProvider}/episode/${encodeURIComponent(episodeId)}/token' in app,
 'continue legacy resolver':'v39.9.1 compatibility resolver' in app,
 'favourite movie starts playback':"await playMovie(item.id,item.name||item.title||'Movie')" in mobile,
 'TV favourites route correctly':"tvHome361Poster(x,'favourite')" in app,
 'desktop favourites route correctly':"desktop362MediaCard(x,'favourite')" in app,
 'favourite action resolver':"kind==='favourite'?`openHomeFavourite" in app,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(('PASS' if v else 'FAIL')+': '+k)
if failed: raise SystemExit('Playback surface regression guard failed: '+', '.join(failed))
print('PASS: playback surface regression guard')
