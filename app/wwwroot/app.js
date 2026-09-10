const $=s=>document.querySelector(s), content=$('#content'), title=$('#title');
let providers=[], currentProvider=null, channels=[], epg=[], fav=new Set(), hls=null, currentView='home', profiles=[], currentProfile=localStorage.getItem('myonline-profile')||'default', channelPrefs={hiddenGroups:[],hiddenChannels:[],aliases:{}}, authState={user:'',role:''}, accessState={allowedProfileIds:[],defaultProfileId:'default',policies:{}};

async function api(url,opt={}){
  const method=(opt.method||'GET').toUpperCase();
  const attempts=Number(opt.attempts||((method==='GET')?3:1));
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const controller=new AbortController();
      const timeoutMs=Number(opt.timeoutMs||30000);
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      const {timeoutMs:_,attempts:__,...fetchOpt}=opt;
      const headers={...(fetchOpt.headers||{})};if(currentProfile)headers['X-MyOnline-Profile']=currentProfile;const r=await fetch(url,{credentials:'same-origin',...fetchOpt,headers,signal:opt.signal||controller.signal}).finally(()=>clearTimeout(timer));
      if(r.status===401){await authGate();throw new Error('Authentication required');}
      if(!r.ok){
        const body=await r.text();
        const err=new Error(body||`HTTP ${r.status}`);
        err.status=r.status;err.url=url;
        if(attempt<attempts&&[429,502,503,504].includes(r.status)){
          await new Promise(x=>setTimeout(x,attempt*750));
          continue;
        }
        throw err;
      }
      if(r.status===204)return null;
      const t=r.headers.get('content-type')||'';
      return t.includes('json')?r.json():r.text();
    }catch(e){
      lastError=e;
      if(e?.name==='AbortError'){
        const err=new Error(`Timeout after ${Number(opt.timeoutMs||30000)/1000}s: ${url}`);
        err.url=url;err.timeout=true;lastError=err;
      }
      if(attempt<attempts&&(e?.name==='AbortError'||e instanceof TypeError)){
        await new Promise(x=>setTimeout(x,attempt*750));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError||new Error(`Request failed: ${url}`);
}
const jpost=(url,obj)=>api(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(obj)});

async function boot(){
  const st=await fetch('/api/auth/status',{credentials:'same-origin'}).then(r=>r.json());
  if(!st.configured||!st.authenticated){await authGate(st);return}
  await enterApp(st);
}
async function authGate(state){
  const st=state||await fetch('/api/auth/status',{credentials:'same-origin'}).then(r=>r.json());
  $('#app').classList.add('hidden');$('#auth').classList.remove('hidden');
  if(!st.configured){
    $('#auth').innerHTML=`<div class="authCard"><h1>Set up MyOnline TV</h1><p>Create the administrator account for this server.</p>
      <label>Username</label><input id=su value=admin autocomplete=username>
      <label>Password</label><input id=sp type=password autocomplete=new-password>
      <label>Confirm password</label><input id=sp2 type=password autocomplete=new-password>
      <button id=setup class=btn>Create administrator</button><div id=authmsg></div></div>`;
    $('#setup').onclick=async()=>{
      const p=$('#sp').value;if(p!==$('#sp2').value){$('#authmsg').textContent='Passwords do not match.';return}
      try{const r=await jpost('/api/auth/setup',{username:$('#su').value,password:p});await enterApp({authenticated:true,user:r.user,role:r.role})}
      catch(e){$('#authmsg').textContent=e.message}
    }
  }else{
    $('#auth').innerHTML=`<div class="authCard"><h1>MyOnline TV</h1><p>Sign in to your private entertainment server.</p>
      <label>Username</label><input id=lu value=admin autocomplete=username>
      <label>Password</label><input id=lp type=password autocomplete=current-password>
      <button id=login class=btn>Sign in</button><div id=authmsg></div></div>`;
    const go=async()=>{try{const r=await jpost('/api/auth/login',{username:$('#lu').value,password:$('#lp').value});await enterApp({authenticated:true,user:r.user,role:r.role})}catch(e){$('#authmsg').textContent='Sign-in failed.'}};
    $('#login').onclick=go;$('#lp').onkeydown=e=>{if(e.key==='Enter')go()}
  }
}
async function enterApp(st){
  $('#auth').classList.add('hidden');$('#app').classList.remove('hidden');
  authState={user:st.user||'',role:st.role||''};
  if(!authState.role){const a=await fetch('/api/auth/status',{credentials:'same-origin'}).then(r=>r.json());authState={user:a.user||authState.user,role:a.role||''}}
  document.querySelectorAll('[data-admin-only]').forEach(x=>x.classList.toggle('hidden',authState.role!=='Admin'));
  $('#userBadge').textContent=authState.user||'user';
  const s=await api('/api/status');$('#status').textContent=`${s.version} · ${s.platform}`;
  const brandVersion=$('#brandVersion');if(brandVersion)brandVersion.textContent=`Web v${s.version} · Unified Media Center`;
  providers=await api('/api/providers');fav=new Set(await api('/api/favourites'));profiles=await api('/api/profiles');try{accessState=await api('/api/access/me')}catch{accessState={allowedProfileIds:profiles.map(p=>p.id),defaultProfileId:profiles[0]?.id||'default',policies:{}}}profiles=profiles.filter(p=>authState.role==='Admin'||(accessState.allowedProfileIds||[]).includes(p.id));if(!profiles.some(p=>p.id===currentProfile))currentProfile=accessState.defaultProfileId||profiles[0]?.id||'default';applyPermissions();renderProfileBadge();
  if(!currentProvider&&providers.length)currentProvider=providers[0].id;
  show('home');
}
$('#logout').onclick=async()=>{await api('/api/auth/logout',{method:'POST'});await authGate()};
document.querySelectorAll('nav button[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));

async function show(v){
  if(!viewAllowed(v)){v='home'}
  currentView=v;destroyPlayer();
  title.textContent=({home:'Home',live:'Live TV',guide:'Guide',movies:'Movies',series:'Series',downloads:'Downloads',recordings:'Recordings',search:'Search',system:'System',admin:'Admin'})[v]||v;
  if(v==='home')await home();
  if(v==='live')await live();
  if(v==='guide')await guide();
  if(v==='movies')await movies();
  if(v==='series')await series();
  if(v==='downloads')await downloadView();
  if(v==='recordings')await recordingsView();
  if(v==='search')await searchView();
  if(v==='system')await systemView();
  if(v==='admin')await adminView();
}

function currentPolicy(){return (accessState.policies||{})[currentProfile]||{live:true,movies:true,series:true,downloads:true,allowedProviderIds:[]}}
function applyPermissions(){
  const p=currentPolicy(),map={live:p.live,guide:p.live,movies:p.movies,series:p.series,downloads:p.downloads,recordings:p.live};
  document.querySelectorAll('nav button[data-view]').forEach(b=>{
    if(Object.prototype.hasOwnProperty.call(map,b.dataset.view))b.classList.toggle('hidden',!map[b.dataset.view]);
  });
  if(Array.isArray(p.allowedProviderIds)&&p.allowedProviderIds.length){
    providers=providers.filter(x=>p.allowedProviderIds.includes(x.id));
    if(!providers.some(x=>x.id===currentProvider))currentProvider=providers[0]?.id||null;
  }
}
function featureForView(v){return ({live:'live',guide:'live',movies:'movies',series:'series',downloads:'downloads',recordings:'live'})[v]||''}
function viewAllowed(v){const f=featureForView(v);return !f||currentPolicy()[f]!==false}

function renderProfileBadge(){const p=profiles.find(x=>x.id===currentProfile);const b=$('#userBadge');if(b&&p)b.innerHTML=`<button class=profileBadge onclick="profilePicker()">${esc(p.icon)} ${esc(p.name)} ▾</button>`}
function profilePicker(){let box=$('#profilePicker');if(box){box.remove();return}box=document.createElement('div');box.id='profilePicker';box.className='profilePicker';box.innerHTML=profiles.map(p=>`<button onclick="selectProfile('${escAttr(p.id)}')">${esc(p.icon)} ${esc(p.name)}${p.isKids?' · Kids':''}</button>`).join('')+(authState.role==='Admin'?`<button onclick="show('admin')">⚙ Admin</button>`:'');document.body.appendChild(box)}
async function selectProfile(id){
  const p=profiles.find(x=>x.id===id);if(!p)return;
  const policy=(accessState.policies||{})[id];
  if(p.isKids&&policy?.hasPin!==false){
    // PIN is only requested when a PIN has actually been configured; server returns valid for profiles without one.
    const pin=prompt('Enter profile PIN (leave blank if no PIN is configured):');
    if(pin===null)return;
    try{const r=await jpost('/api/profile/'+encodeURIComponent(id)+'/verify-pin',{pin});if(!r.valid){alert('Incorrect PIN.');return}}catch(e){alert(friendlyError(e));return}
  }
  currentProfile=id;localStorage.setItem('myonline-profile',id);$('#profilePicker')?.remove();applyPermissions();renderProfileBadge();show('home')
}

async function home(){
  let unifiedMovies=[],unifiedSeries=[];
  try{
    [unifiedMovies,unifiedSeries]=await Promise.all([
      api('/api/unified/movies',{timeoutMs:65000}),
      api('/api/unified/series',{timeoutMs:65000})
    ]);
  }catch{}
  const cont=await api('/api/continue');

  const recentlyAdded=[...unifiedMovies,...unifiedSeries]
    .filter(x=>x.addedAt)
    .sort((a,b)=>new Date(b.addedAt)-new Date(a.addedAt))
    .slice(0,12);

  content.innerHTML=`<div class=hero><div><span class=kicker>MYONLINE TV WEB</span><h2>Everything. One interface.</h2>
  <p class=muted>Live TV, Guide, IPTV, Plex and Jellyfin in one self-hosted media center.</p>
  <div class=row><input id=homeSearch placeholder="Search Live, Movies and Series"><button class=btn id=homeSearchButton>Search</button></div></div></div>
  <div class=stats>
    <div class=stat><b>${providers.length}</b><span>Providers</span></div>
    <div class=stat><b>${fav.size}</b><span>Favourites</span></div>
    <div class=stat><b>${cont.length}</b><span>Continue watching</span></div>
  </div>
  ${cont.length?`<h2>Continue watching</h2><div class=continueRow>${cont.slice(0,12).map(x=>`<button class=continueCard onclick='resumeContinueItem(${JSON.stringify(x)})'><span>▶</span><b>${esc(x.title)}</b><small>Resume around ${Math.floor((x.positionSeconds||0)/60)} min</small></button>`).join('')}</div><div id=mediaPlayer></div>`:''}
  ${recentlyAdded.length?`<div class=sectionHead><h2>Recently added</h2><button class=linkButton onclick="show('search')">Browse all</button></div><div class=posterRail>${recentlyAdded.map(x=>`<button class=posterCard onclick='playUnifiedItem(${JSON.stringify(x)})'>${x.poster?`<img loading=lazy decoding=async src="${escAttr(x.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(x.name)}</b><small><span class=sourceBadge>${esc(x.source||'media')}</span> ${esc(x.year||'')}</small></div></button>`).join('')}</div>`:''}
  ${homeMediaRails()}
  <h2>Quick access</h2><div class=grid>
    <button class="card actionCard" onclick="show('live')"><h3>Live TV</h3><p>Channels and groups</p></button>
    <button class="card actionCard" onclick="show('guide')"><h3>TV Guide</h3><p>Timeline EPG</p></button>
    <button class="card actionCard" onclick="show('movies')"><h3>Movies</h3><p>IPTV and media libraries</p></button>
    <button class="card actionCard" onclick="show('series')"><h3>Series</h3><p>Seasons and episodes</p></button>
  </div>
  <h2>Official streaming services</h2>
  <div class=serviceRow>
    <a class=service href="https://www.netflix.com" target=_blank>Netflix</a>
    <a class=service href="https://www.disneyplus.com" target=_blank>Disney+</a>
    <a class=service href="https://www.max.com" target=_blank>Max</a>
    <a class=service href="https://www.primevideo.com" target=_blank>Prime Video</a>
    <a class=service href="https://www.svtplay.se" target=_blank>SVT Play</a>
  </div>
  ${unifiedMovies.length?`<div class=sectionHead><h2>Movies from Plex & Jellyfin</h2></div><div class=posterRail>${unifiedMovies.slice(0,12).map(m=>`<button class=posterCard onclick='playUnifiedItem(${JSON.stringify(m)})'>${m.poster?`<img loading=lazy decoding=async src="${escAttr(m.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(m.name)}</b><small><span class=sourceBadge>${esc(m.source)}</span> ${esc(m.year||'')}</small></div></button>`).join('')}</div>`:''}
  ${unifiedSeries.length?`<div class=sectionHead><h2>Series from Plex & Jellyfin</h2></div><div class=posterRail>${unifiedSeries.slice(0,12).map(s=>`<button class=posterCard onclick='playUnifiedItem(${JSON.stringify(s)})'>${s.poster?`<img loading=lazy decoding=async src="${escAttr(s.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(s.name)}</b><small><span class=sourceBadge>${esc(s.source)}</span> ${esc(s.year||'')}</small></div></button>`).join('')}</div>`:''}`;

  $('#homeSearchButton').onclick=homeQuickSearch;
  $('#homeSearch').onkeydown=e=>{if(e.key==='Enter')homeQuickSearch()};
}
async function ensureProvider(type){
  providers=await api('/api/providers');
  if(currentProvider && !providers.some(p=>p.id===currentProvider))currentProvider=null;
  if(type==='xtream'){
    const xp=providers.filter(p=>p.type==='xtream');
    if(!xp.length)return false;
    if(!xp.some(p=>p.id===currentProvider))currentProvider=xp[0].id;
  }else if(!currentProvider&&providers.length)currentProvider=providers[0].id;
  return !!currentProvider;
}

function providerSelect(type){
  const rows=type?providers.filter(p=>p.type===type):providers;
  return `<select id=provider>${rows.map(p=>`<option value="${p.id}" ${p.id===currentProvider?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`;
}


async function loadChannelPrefs(){
  if(!currentProvider){channelPrefs={hiddenGroups:[],hiddenChannels:[],aliases:{}};return}
  try{channelPrefs=await api('/api/channel-preferences/'+encodeURIComponent(currentProvider))}catch{channelPrefs={hiddenGroups:[],hiddenChannels:[],aliases:{}}}
  channelPrefs.hiddenGroups=channelPrefs.hiddenGroups||[];channelPrefs.hiddenChannels=channelPrefs.hiddenChannels||[];channelPrefs.aliases=channelPrefs.aliases||{};
}
function isChannelHidden(c){return channelPrefs.hiddenGroups.includes(c.group)||channelPrefs.hiddenChannels.includes(c.key)}
function channelName(c){return channelPrefs.aliases?.[c.key]||c.name}
async function hideGroup(group){if(!group||group.startsWith('__'))return;if(!confirm('Hide group '+group+'?'))return;await jpost('/api/channel-preferences/'+encodeURIComponent(currentProvider)+'/group',{group,hidden:true});await loadChannelPrefs();renderChannels()}
async function hideChannel(key){if(!confirm('Hide this channel?'))return;await jpost('/api/channel-preferences/'+encodeURIComponent(currentProvider)+'/channel',{channelKey:key,hidden:true,alias:null});await loadChannelPrefs();renderChannels()}

const LIVE_RECENTS_KEY='myonline-live-recents-v1';
let liveSelectedIndex=0;
let liveVisibleRows=[];
let liveCurrentChannel=null;

function getLiveRecents(){
  try{return JSON.parse(localStorage.getItem(LIVE_RECENTS_KEY)||'[]')}catch{return []}
}
function rememberLiveChannel(c){
  const rows=getLiveRecents().filter(x=>x.providerId!==currentProvider||x.key!==c.key);
  rows.unshift({providerId:currentProvider,key:c.key,name:c.name,group:c.group||'',logo:c.logo||'',id:c.id||'',number:c.number||''});
  localStorage.setItem(LIVE_RECENTS_KEY,JSON.stringify(rows.slice(0,20)));
}
function liveProgramFor(c){
  if(!Array.isArray(epg)||!epg.length)return {now:null,next:null};
  const now=Date.now();
  const rows=epg.filter(p=>p.channel===c.id||p.channel===c.epgId).sort((a,b)=>new Date(a.start)-new Date(b.start));
  const current=rows.find(p=>new Date(p.start).getTime()<=now&&new Date(p.stop).getTime()>now)||null;
  const next=rows.find(p=>new Date(p.start).getTime()>now)||null;
  return {now:current,next};
}
function liveStatus(text,kind=''){
  const el=document.querySelector('#livePlaybackStatus');
  if(el){el.textContent=text;el.className='livePlaybackStatus '+kind}
}
function channelByKey(key){return channels.find(c=>String(c.key)===String(key))}
function stepLiveChannel(delta){
  if(!liveVisibleRows.length)return;
  let i=liveCurrentChannel?liveVisibleRows.findIndex(c=>c.key===liveCurrentChannel.key):liveSelectedIndex;
  if(i<0)i=0;
  i=(i+delta+liveVisibleRows.length)%liveVisibleRows.length;
  liveSelectedIndex=i;
  const c=liveVisibleRows[i];
  playLive(c.key,c.name);
}
function toggleLiveFullscreen(){
  const el=document.querySelector('.playerCard');
  if(!el)return;
  if(document.fullscreenElement)document.exitFullscreen?.();
  else el.requestFullscreen?.();
}
function liveOverlay(c){
  const pg=liveProgramFor(c);
  const now=pg.now?esc(pg.now.title):'Live TV';
  const next=pg.next?`Next: ${esc(pg.next.title)}`:'';
  return `<div class="liveOverlay">
    <div class="liveOverlayLogo">${c.logo?`<img src="${escAttr(c.logo)}">`:''}</div>
    <div><div class="liveOverlayTop"><span class="liveBadge">LIVE</span><b>${esc(channelName(c))}</b></div>
    <div class="liveNow">${now}</div><div class="liveNext">${next}</div></div>
    <div class="liveClock">${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
  </div>`;
}
async function loadLiveEpgQuiet(){
  try{epg=await api('/api/epg/'+currentProvider+'?hours=6')}catch(_){}
}

async function live(){
  if(!await ensureProvider()){content.innerHTML=noProvider();return}
  await loadChannelPrefs();
  content.innerHTML='<div class=card>Loading channels…</div>';
  try{channels=await api('/api/channels/'+currentProvider);await loadLiveEpgQuiet();renderChannels()}
  catch(e){content.innerHTML=errorCard(e)}
}
function renderChannels(){
  const recents=getLiveRecents().filter(x=>x.providerId===currentProvider).map(r=>channelByKey(r.key)).filter(Boolean);
  content.innerHTML=`<div class=toolbar>${providerSelect()}<input id=q placeholder="Search channels"><select id=group><option value="">All groups</option><option value="__favorites">★ Favourites</option><option value="__recent">↻ Recently watched</option>${[...new Set(channels.map(x=>x.group).filter(Boolean).filter(g=>!channelPrefs.hiddenGroups.includes(g)))].sort().map(g=>`<option>${esc(g)}</option>`).join('')}</select><button class=btn id=liveFavQuick>★ Favourites</button><button class=btn id=hideGroupBtn>Hide group</button></div>
  <div class="liveHelp">Remote/keyboard: ↑ ↓ select · Enter play · ← → previous/next channel · F fullscreen · Esc exit</div>
  <div id=playerWrap></div><div id=chan class=channelGrid tabindex="0"></div>`;
  $('#provider').onchange=async e=>{currentProvider=e.target.value;await live()};
  $('#q').oninput=renderFilter;$('#group').onchange=renderFilter;$('#liveFavQuick').onclick=()=>{$('#group').value='__favorites';renderFilter()};$('#hideGroupBtn').onclick=()=>hideGroup($('#group').value);
  $('#chan').addEventListener('keydown',liveKeyHandler);
  renderFilter();
}
function renderFilter(){
  const q=($('#q')?.value||'').toLowerCase(),g=$('#group')?.value||'';
  let rows=channels.filter(c=>!isChannelHidden(c)).filter(c=>(!q||channelName(c).toLowerCase().includes(q)));
  if(g==='__favorites')rows=rows.filter(c=>fav.has(c.id));
  else if(g==='__recent'){
    const order=getLiveRecents().filter(x=>x.providerId===currentProvider).map(x=>x.key);
    rows=order.map(k=>channelByKey(k)).filter(Boolean).filter(c=>!q||c.name.toLowerCase().includes(q));
  } else if(g) rows=rows.filter(c=>c.group===g);
  liveVisibleRows=rows.slice(0,800);
  liveSelectedIndex=Math.min(liveSelectedIndex,Math.max(0,liveVisibleRows.length-1));
  $('#chan').innerHTML=liveVisibleRows.map((c,i)=>{
    const pg=liveProgramFor(c);
    return `<article class="channelCard ${i===liveSelectedIndex?'selectedChannel':''}" data-live-index="${i}">
      <div class=logoBox>${c.logo?`<img loading=lazy decoding=async src="${escAttr(c.logo)}" onerror="this.style.display='none'">`:''}</div>
      <div class=channelInfo><b>${esc(c.number?c.number+' · ':'')}${esc(channelName(c))}</b><small>${esc(c.group)}</small>${pg.now?`<small class=channelNow>${esc(pg.now.title)}</small>`:''}</div>
      <button class=round title="Play" onclick='playLive(${JSON.stringify(c.key)},${JSON.stringify(c.name)})'>▶</button>
      <button class=round title="Favourite" onclick="toggleFav('${escAttr(c.id)}')">${fav.has(c.id)?'★':'☆'}</button><button class=round title="Hide channel" onclick='hideChannel(${JSON.stringify(c.key)})'>×</button>
    </article>`}).join('');
  document.querySelectorAll('[data-live-index]').forEach(el=>el.onclick=e=>{
    if(e.target.closest('button'))return;
    liveSelectedIndex=Number(el.dataset.liveIndex)||0;renderFilter();
  });
}
function liveKeyHandler(e){
  if(!liveVisibleRows.length)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();liveSelectedIndex=(liveSelectedIndex+(e.key==='ArrowDown'?1:-1)+liveVisibleRows.length)%liveVisibleRows.length;renderFilter();
    document.querySelector(`[data-live-index="${liveSelectedIndex}"]`)?.scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'){
    e.preventDefault();const c=liveVisibleRows[liveSelectedIndex];if(c)playLive(c.key,c.name);
  }else if(e.key==='ArrowLeft'){e.preventDefault();stepLiveChannel(-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();stepLiveChannel(1)}
  else if(e.key.toLowerCase()==='f'){e.preventDefault();toggleLiveFullscreen()}
}
document.addEventListener('keydown',e=>{
  if(currentView!=='live'||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(e.key==='ArrowLeft'){e.preventDefault();stepLiveChannel(-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();stepLiveChannel(1)}
  else if(e.key.toLowerCase()==='f'){e.preventDefault();toggleLiveFullscreen()}
});
async function toggleFav(id){fav=new Set(await api('/api/favourites/'+encodeURIComponent(id),{method:'POST'}));if(currentView==='live')renderFilter()}

let activeLiveSession=null;
let liveFallbackTried=false;

async function playLive(channelKey,name,forceTranscode=false){
  if(!forceTranscode)liveFallbackTried=false;
  destroyPlayer();
  const wrap=$('#playerWrap')||$('#mediaPlayer');
  if(!wrap)return;
  const selected=channelByKey(channelKey)||{key:channelKey,name};liveCurrentChannel=selected;rememberLiveChannel(selected);
  wrap.innerHTML=`<div class="playerCard livePlayer"><video id=video controls autoplay playsinline></video>${liveOverlay(selected)}
    <div class="liveControls"><button class=btn onclick="stepLiveChannel(-1)">← Previous</button><button class=btn onclick="stepLiveChannel(1)">Next →</button><button class=btn onclick="toggleLiveFullscreen()">⛶ Fullscreen</button></div>
    <div id=livePlaybackStatus class=livePlaybackStatus>Connecting to channel…</div><div class=nowPlaying>${esc(name)}</div></div>`;
  wrap.scrollIntoView({behavior:'smooth',block:'start'});
  try{
    const info=await api('/api/live/start/'+encodeURIComponent(currentProvider)+'/'+encodeURIComponent(channelKey)+(forceTranscode?'?transcode=true':''),{method:'POST'});
    activeLiveSession=info.sessionId;

    let state=null;
    const deadline=Date.now()+22000;
    while(Date.now()<deadline){
      state=await api(info.statusUrl||('/api/live/status/'+encodeURIComponent(info.sessionId)));
      if(state.status==='ready')break;
      if(state.status==='failed')throw new Error(state.error||'FFmpeg could not prepare this channel.');
      liveStatus('Preparing browser stream…','loading');
      await new Promise(r=>setTimeout(r,500));
    }
    if(!state||state.status!=='ready')throw new Error('Live TV startup timed out.');

    const video=$('#video');
    if(!video)return;
    const playbackUrl=state.playbackUrl||info.playbackUrl;
    if(window.Hls&&Hls.isSupported()){
      hls=new Hls({enableWorker:true,lowLatencyMode:true,liveSyncDurationCount:3,backBufferLength:30});
      hls.loadSource(playbackUrl);hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>{}));
      hls.on(Hls.Events.ERROR,async(_,d)=>{
        if(d.fatal){
          console.warn('HLS fatal',d);
          if(!forceTranscode&&!liveFallbackTried){
            liveFallbackTried=true;
            const np=wrap.querySelector('.nowPlaying');if(np)np.textContent=name+' · Retrying with compatibility transcoding…';
            await playLive(channelKey,name,true);
            return;
          }
          const np=wrap.querySelector('.nowPlaying');
          if(np)np.textContent=name+' · Playback error: '+(d.details||d.type||'HLS error');
        }
      });
    }else if(video.canPlayType('application/vnd.apple.mpegurl')){
      video.src=playbackUrl;await video.play().catch(()=>{});
    }else throw new Error('This browser does not support HLS playback.');
    liveStatus('Playing','ready');
  }catch(e){
    liveStatus(friendlyError(e),'error');const np=wrap.querySelector('.nowPlaying');if(np)np.textContent=name;
  }
}

function friendlyError(e){
  const raw=(e&&e.message)||String(e||'Unknown error');
  if(raw.includes('504 Gateway Time-out'))return 'Server timeout while contacting IPTV provider.';
  try{
    const j=JSON.parse(raw);
    return j.detail||j.title||raw;
  }catch(_){return raw.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
}

let activeMediaSession=null;
let mediaFallbackTried=false;
let pendingResumeSeconds=0;
let nextUnifiedEpisode=null;
let unifiedEpisodeContext=[];

async function playServerMedia(token,name,mediaId=null,forceTranscode=false){
  if(!forceTranscode)mediaFallbackTried=false;
  destroyPlayer();
  const wrap=$('#playerWrap')||$('#mediaPlayer');
  if(!wrap)return;
  wrap.innerHTML=`<div class=playerCard><video id=video controls autoplay playsinline></video><div id=mediaPlaybackStatus class=livePlaybackStatus>Preparing video…</div><div class=nowPlaying>${esc(name)}</div></div>`;
  wrap.scrollIntoView({behavior:'smooth',block:'start'});

  try{
    const info=await api('/api/media/start/'+encodeURIComponent(token)+(forceTranscode?'?transcode=true':''),{method:'POST'});
    activeMediaSession=info.sessionId;
    activeLiveSession=info.sessionId;

    let state=null;
    const deadline=Date.now()+30000;
    while(Date.now()<deadline){
      state=await api(info.statusUrl||('/api/live/status/'+encodeURIComponent(info.sessionId)));
      if(state.status==='ready')break;
      if(state.status==='failed')throw new Error(state.error||'FFmpeg could not prepare this video.');
      await new Promise(r=>setTimeout(r,500));
    }
    if(!state||state.status!=='ready')throw new Error('Video startup timed out.');

    const video=$('#video');
    if(!video)return;
    const playbackUrl=state.playbackUrl||info.playbackUrl;

    const requestedResume=Math.max(0,Number(pendingResumeSeconds)||0);
    pendingResumeSeconds=0;
    if(requestedResume>2){
      const seek=()=>{
        try{
          if(Number.isFinite(video.duration)&&video.duration>0)
            video.currentTime=Math.min(requestedResume,Math.max(0,video.duration-2));
          else video.currentTime=requestedResume;
        }catch{}
      };
      video.addEventListener('loadedmetadata',seek,{once:true});
    }

    const installResumeTracking=()=>{
      if(!mediaId)return;
      let last=-1;
      const save=()=>{
        const sec=Math.floor(video.currentTime||0);
        if(sec===last)return;
        last=sec;
        jpost('/api/continue',{id:String(mediaId),title:name,url:'',positionSeconds:sec,updated:new Date().toISOString()}).catch(()=>{});
      };
      video.addEventListener('timeupdate',()=>{if(Math.floor(video.currentTime)%15===0)save()});
      video.addEventListener('pause',save);
      video.addEventListener('ended',save);
    };

    video.addEventListener('ended',()=>{
      if(!nextUnifiedEpisode)return;
      const next=nextUnifiedEpisode;
      nextUnifiedEpisode=null;
      const card=video.closest('.playerCard');
      if(card){
        const bar=document.createElement('div');
        bar.className='nextEpisodeBar';
        bar.innerHTML=`<span>Up next: <b>${esc(next.name||'Next episode')}</b></span><button class=btn id=playNextUnified>Play next episode</button>`;
        card.appendChild(bar);
        $('#playNextUnified').onclick=()=>playUnifiedItem(next);
      }
    });

    if(window.Hls&&Hls.isSupported()){
      hls=new Hls({enableWorker:true,backBufferLength:60});
      hls.loadSource(playbackUrl);hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,()=>{installResumeTracking();video.play().catch(()=>{})});
      hls.on(Hls.Events.ERROR,async(_,d)=>{
        if(!d.fatal)return;
        console.warn('Media HLS fatal',d);
        if(!forceTranscode&&!mediaFallbackTried){
          mediaFallbackTried=true;
          const st=$('#mediaPlaybackStatus');if(st)st.textContent='Codec not browser-compatible · retrying with H.264/AAC…';
          await playServerMedia(token,name,mediaId,true);
          return;
        }
        const st=$('#mediaPlaybackStatus');if(st){st.textContent='Playback error: '+(d.details||d.type||'HLS error');st.className='livePlaybackStatus error'}
      });
    }else if(video.canPlayType('application/vnd.apple.mpegurl')){
      video.src=playbackUrl;
      installResumeTracking();
      await video.play().catch(()=>{});
    }else throw new Error('This browser does not support HLS playback.');

    const st=$('#mediaPlaybackStatus');if(st){st.textContent=forceTranscode?'Playing · compatibility mode':'Playing';st.className='livePlaybackStatus ready'}
  }catch(e){
    const st=$('#mediaPlaybackStatus');if(st){st.textContent=friendlyError(e);st.className='livePlaybackStatus error'}
  }
}

function playMedia(url,name,mediaId=null){
  destroyPlayer();
  const wrap=$('#playerWrap')||$('#mediaPlayer');
  if(!wrap)return;
  wrap.innerHTML=`<div class=playerCard><video id=video controls autoplay playsinline></video><div class=nowPlaying>${esc(name)}</div></div>`;
  const video=$('#video');
  if(mediaId){
    let last=-1;
    const save=()=>{
      const sec=Math.floor(video.currentTime||0);
      if(sec===last)return;
      last=sec;
      jpost('/api/continue',{id:String(mediaId),title:name,url,positionSeconds:sec,updated:new Date().toISOString()}).catch(()=>{});
    };
    video.addEventListener('timeupdate',()=>{if(Math.floor(video.currentTime)%15===0)save()});
    video.addEventListener('pause',save);
    video.addEventListener('ended',save);
  }
  if(window.Hls&&Hls.isSupported()){
    hls=new Hls({enableWorker:true,lowLatencyMode:true});
    hls.loadSource(url);hls.attachMedia(video);
    hls.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal)console.warn('HLS fatal',d)});
  }else if(video.canPlayType('application/vnd.apple.mpegurl')) video.src=url;
  else video.src=url;
  wrap.scrollIntoView({behavior:'smooth',block:'start'});
}
function destroyPlayer(){
  if(hls){try{hls.destroy()}catch{}hls=null}
  if(activeLiveSession){
    const id=activeLiveSession;activeLiveSession=null;activeMediaSession=null;
    fetch('/api/live/session/'+encodeURIComponent(id),{method:'DELETE',keepalive:true}).catch(()=>{});
  }
}

let guideWindow='now';
function guideStart(kind){
  const d=new Date();
  if(kind==='tonight'){d.setHours(18,0,0,0);if(d.getTime()<Date.now()-3600000)d.setDate(d.getDate()+1)}
  else if(kind==='tomorrow'){d.setDate(d.getDate()+1);d.setHours(0,0,0,0)}
  else d.setMinutes(d.getMinutes()-30);
  return d;
}
async function guide(){
  if(!await ensureProvider()){content.innerHTML=noProvider();return}
  await loadChannelPrefs();content.innerHTML='<div class=card>Loading EPG…</div>';
  try{
    const start=guideStart(guideWindow),hours=guideWindow==='tomorrow'?24:guideWindow==='tonight'?10:7;
    [channels,epg]=await Promise.all([api('/api/channels/'+currentProvider),api('/api/epg/'+currentProvider+'?hours='+hours+'&start='+encodeURIComponent(start.toISOString()))]);
    renderGuide(start,hours);
  }catch(e){content.innerHTML=errorCard(e)}
}
function renderGuide(start,hours){
  const end=new Date(start.getTime()+hours*3600000),span=end-start;
  const by=new Map();epg.forEach(x=>{if(!by.has(x.channel))by.set(x.channel,[]);by.get(x.channel).push(x)});
  const rows=channels.filter(c=>!isChannelHidden(c)&&by.has(c.id)).slice(0,180);
  const ticks=[];for(let d=new Date(start);d<end;d=new Date(d.getTime()+3600000))ticks.push(d);
  content.innerHTML=`<div class=toolbar>${providerSelect()}<button class="btn ${guideWindow==='now'?'activeBtn':''}" onclick="guideWindow='now';guide()">Now</button><button class="btn ${guideWindow==='tonight'?'activeBtn':''}" onclick="guideWindow='tonight';guide()">Tonight</button><button class="btn ${guideWindow==='tomorrow'?'activeBtn':''}" onclick="guideWindow='tomorrow';guide()">Tomorrow</button><button class=btn id=refreshGuide>Refresh</button></div><div id=playerWrap></div><div class=timelineWrap><div class=timelineHead><div class=channelHead>Channel</div><div class=timeAxis style="grid-template-columns:repeat(${ticks.length},1fr)">${ticks.map(x=>`<span>${x.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>`).join('')}</div></div><div class=timeline>${rows.map(c=>timelineRowV319(c,by.get(c.id)||[],start,end,span)).join('')}</div></div>`;
  $('#provider').onchange=async e=>{currentProvider=e.target.value;await guide()};$('#refreshGuide').onclick=guide;
}
function timelineRowV319(c,progs,start,end,span){
  const nowPct=(Date.now()-start.getTime())/span*100;
  const line=nowPct>=0&&nowPct<=100?`<div class=nowLine style="left:${nowPct}%"><span>Now</span></div>`:'';
  const blocks=progs.map(pr=>{
    const a=Math.max(new Date(pr.start).getTime(),start.getTime()),b=Math.min(new Date(pr.stop).getTime(),end.getTime());if(b<=a)return '';
    const left=(a-start.getTime())/span*100,width=Math.max(.8,(b-a)/span*100),isNow=a<=Date.now()&&b>Date.now();
    const payload=encodeURIComponent(JSON.stringify(pr));
    return `<button class="prog ${isNow?'currentProgram':''}" style="left:${left}%;width:${width}%" onclick='if(event.shiftKey){event.preventDefault();scheduleGuideRecording(${JSON.stringify(c.key)},${JSON.stringify(channelName(c))},decodeURIComponent("${payload}"));return}playLive(${JSON.stringify(c.key)},${JSON.stringify(channelName(c))})' title="Play ${escAttr(pr.title)} live · Shift+click to record"><b>${esc(pr.title)}</b><small>${new Date(pr.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></button>`;
  }).join('');
  return `<div class=timelineRow><button class=timelineChannel onclick='playLive(${JSON.stringify(c.key)},${JSON.stringify(channelName(c))})'>${c.logo?`<img src="${escAttr(c.logo)}">`:''}<span>${esc(channelName(c))}</span><small>▶ Live</small></button><div class=programLane>${line}${blocks}</div></div>`;
}
function showProgramDetails(channelKey,channelNameText,payload){
  playLive(channelKey,channelNameText);
}

async function movies(){
  if(!await ensureProvider('xtream')){content.innerHTML='<div class=card>Movies require an Xtream-compatible provider.</div>';return}
  content.innerHTML='<div class=card>Loading movies… The first load can take up to 2 minutes for large Xtream libraries.</div>';
  try{
    const cats=await api(`/api/vod/${currentProvider}/categories`);
    content.innerHTML=`<div class=toolbar>${providerSelect('xtream')}<select id=category><option value="">All categories</option>${cats.map(c=>`<option value="${escAttr(c.id)}">${esc(c.name)}</option>`).join('')}</select><input id=mediaq placeholder="Search movies"><button class=btn id=refreshMovies>Refresh</button><span id=moviesStatus class=muted></span></div><div id=mediaPlayer></div><div id=mediaGrid class=posterGrid></div>`;
    $('#provider').onchange=async e=>{currentProvider=e.target.value;await movies()};
    $('#category').onchange=loadMovies;$('#mediaq').oninput=debounce(filterMedia);$('#refreshMovies').onclick=refreshMovies;
    await loadMovies();
  }catch(e){content.innerHTML=errorCard(new Error(`Movies could not be loaded. The provider may need longer to return the VOD catalogue. ${e.message||e}`))}
}
let mediaItems=[];
async function loadMovies(){
  const grid=$('#mediaGrid');if(grid)grid.innerHTML='<div class=card>Loading movies… The first load can take up to 2 minutes for large Xtream libraries.</div>';
  try{
    const cat=$('#category')?.value||'',key=catalogueCacheKey('movies',currentProvider,cat);mediaItems=readCatalogueCache(key)||await api(`/api/vod/${currentProvider}/items?categoryId=${encodeURIComponent(cat)}`,{timeoutMs:125000});writeCatalogueCache(key,mediaItems);const st=$('#moviesStatus');if(st)st.textContent=`Loaded ${mediaItems.length} movies`;
    filterMedia();
  }catch(e){if(grid)grid.innerHTML=errorCard(e)}
}
function filterMedia(){
  const q=($('#mediaq')?.value||'').toLowerCase();
  const rows=mediaItems.filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,1000);
  if(!rows.length){
    $('#mediaGrid').innerHTML=`<div class=card>${mediaItems.length?'No movies match the current search.':'No movies were returned by the provider for this selection.'}</div>`;
    return;
  }
  $('#mediaGrid').innerHTML=rows.map(m=>`<article class=posterCard>${m.poster?`<img loading=lazy decoding=async src="${escAttr(m.poster)}">`:'<div class=posterPlaceholder>▶</div>'}<div class=posterBody><b>${esc(m.name)}</b><small>${esc(m.year||'')} ${m.rating?'· '+esc(m.rating):''}</small><div class=row><button class=btn onclick='playMovie(${JSON.stringify(m.id)},${JSON.stringify(m.name)})'>Play</button><button class=btn onclick='movieDetails(${JSON.stringify(m.id)})'>Info</button><button class=btn onclick='toggleMediaFav("movie",${JSON.stringify(m)})'>${isMediaFav('movie',m.id)?'★':'☆'}</button><button class=btn onclick='downloadMovie(${JSON.stringify(m.id)},${JSON.stringify(m.name)})'>↓</button></div></div></article>`).join('');
}

function movieDetails(id){
  const m=mediaItems.find(x=>String(x.id)===String(id));if(!m)return;$('#movieDetail')?.remove();
  const grid=$('#mediaGrid');grid.insertAdjacentHTML('beforebegin',`<div id=movieDetail class=mediaDetail>${m.poster?`<img src="${escAttr(m.poster)}">`:''}<div><button class=btn onclick="$('#movieDetail').remove()">← Back</button><h2>${esc(m.name)}</h2><p class=muted>${esc([m.year,m.genre,m.rating&&('★ '+m.rating)].filter(Boolean).join(' · '))}</p><p>${esc(m.plot||'No description available.')}</p><div class=row><button class=btn onclick='playMovie(${JSON.stringify(m.id)},${JSON.stringify(m.name)})'>▶ Play</button><button class=btn onclick='downloadMovie(${JSON.stringify(m.id)},${JSON.stringify(m.name)})'>↓ Download</button></div></div></div>`);$('#movieDetail').scrollIntoView({behavior:'smooth'});
}

async function series(){
  if(!await ensureProvider('xtream')){content.innerHTML='<div class=card>Series require an Xtream-compatible provider.</div>';return}
  content.innerHTML='<div class=card>Loading series…</div>';
  try{
    const cats=await api(`/api/series/${currentProvider}/categories`);
    content.innerHTML=`<div class=toolbar>${providerSelect('xtream')}<select id=category><option value="">All categories</option>${cats.map(c=>`<option value="${escAttr(c.id)}">${esc(c.name)}</option>`).join('')}</select><input id=seriesq placeholder="Search series"><button class=btn id=refreshSeries>Refresh</button><span id=seriesStatus class=muted></span></div><div id=mediaPlayer></div><div id=seriesContent></div>`;
    $('#provider').onchange=async e=>{currentProvider=e.target.value;await series()};
    $('#category').onchange=loadSeries;$('#seriesq').oninput=debounce(filterSeries);$('#refreshSeries').onclick=refreshSeries;
    await loadSeries();
  }catch(e){content.innerHTML=errorCard(e)}
}
let seriesItems=[];
async function loadSeries(){
  const box=$('#seriesContent');if(box)box.innerHTML='<div class=card>Loading series…</div>';
  try{
    const cat=$('#category')?.value||'',key=catalogueCacheKey('series',currentProvider,cat);seriesItems=readCatalogueCache(key)||await api(`/api/series/${currentProvider}/items?categoryId=${encodeURIComponent(cat)}`);writeCatalogueCache(key,seriesItems);const st=$('#seriesStatus');if(st)st.textContent=`Loaded ${seriesItems.length} series`;
    filterSeries();
  }catch(e){if(box)box.innerHTML=errorCard(e)}
}
function filterSeries(){
  const q=($('#seriesq')?.value||'').toLowerCase(),rows=seriesItems.filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,1000);
  $('#seriesContent').innerHTML=`<div class=posterGrid>${rows.map(s=>`<button class="posterCard seriesButton" onclick="openSeries('${escAttr(s.id)}')">${s.poster?`<img loading=lazy decoding=async src="${escAttr(s.poster)}">`:'<div class=posterPlaceholder>▦</div>'}<div class=posterBody><b>${esc(s.name)}</b><small>${esc(s.year||'')} ${s.rating?'· ★ '+esc(s.rating):''}</small><small>${esc(s.genre||'')}</small><span class=mediaFavStar onclick='event.stopPropagation();toggleMediaFav("series",${JSON.stringify(s)})'>${isMediaFav('series',s.id)?'★':'☆'}</span></div></button>`).join('')}</div>`;
}
async function openSeries(id){
  $('#seriesContent').innerHTML='<div class=card>Loading episodes…</div>';
  try{
    const s=await api(`/api/series/${currentProvider}/${encodeURIComponent(id)}`);
    const by={};s.episodes.forEach(e=>(by[e.season]??=[]).push(e));
    $('#seriesContent').innerHTML=`<div class=seriesHero>${s.cover?`<img src="${escAttr(s.cover)}">`:''}<div><button class=btn onclick=filterSeries()>← Back</button><h2>${esc(s.name)}</h2><p>${esc(s.plot||'')}</p></div></div>
    ${Object.keys(by).sort((a,b)=>Number(a)-Number(b)).map(season=>`<section><h3>Season ${esc(season)}</h3><div class=episodeList>${by[season].map(e=>`<div class=episode><span><b>E${esc(e.episode)}</b> ${esc(e.title||'Episode')}</span><div class=row><button class=btn onclick='playEpisode(${JSON.stringify(e.id)},${JSON.stringify(e.extension||'mp4')},${JSON.stringify(e.title||'Episode')},${JSON.stringify('episode:'+s.name+':'+season+':'+e.episode)})'>Play</button><button class=btn onclick='downloadEpisode(${JSON.stringify(e.id)},${JSON.stringify(e.extension||'mp4')},${JSON.stringify((s.name||'Series')+' - S'+season+'E'+e.episode)})'>↓</button></div></div>`).join('')}</div></section>`).join('')}`;
  }catch(e){$('#seriesContent').innerHTML=errorCard(e)}
}

async function movieToken(id){
  return await api(`/api/vod/${currentProvider}/${encodeURIComponent(id)}/token`,{method:'POST'});
}
async function playMovie(id,name){
  try{const item=mediaItems.find(x=>String(x.id)===String(id))||{id,name};rememberMediaHistory('movie',item);const t=await movieToken(id);await playServerMedia(t.playToken,name,'movie:'+id)}catch(e){alert(e.message)}
}
async function downloadMovie(id,name){
  try{const t=await movieToken(id);await startMediaDownload(t.downloadToken,name)}catch(e){alert(e.message)}
}
async function episodeToken(id,ext){
  return await api(`/api/series/${currentProvider}/episode/${encodeURIComponent(id)}/token?ext=${encodeURIComponent(ext||'mp4')}`,{method:'POST'});
}
async function playEpisode(id,ext,name,mediaId){
  try{rememberMediaHistory('episode',{id,name});const t=await episodeToken(id,ext);await playServerMedia(t.playToken,name,mediaId)}catch(e){alert(e.message)}
}
async function downloadEpisode(id,ext,name){
  try{const t=await episodeToken(id,ext);await startMediaDownload(t.downloadToken,name)}catch(e){alert(e.message)}
}

async function startMediaDownload(token,name){
  try{await jpost('/api/downloads/media',{token,title:name});show('downloads')}catch(e){alert(e.message)}
}
async function downloadView(){
  const jobs=await api('/api/downloads');
  content.innerHTML=`<div class=hero><h2>Downloads</h2><p class=muted>Movies and episodes can be saved on the MyOnline TV server. Non-encrypted HLS is handled by FFmpeg. Protected/DRM streams are not bypassed.</p><button class=btn id=refreshDl>Refresh</button></div>
  <div class=downloadList>${jobs.length?jobs.map(j=>`<article class=downloadCard><div><h3>${esc(j.title)}</h3><span class="status ${j.status==='Failed'?'bad':''}">${esc(j.status)}</span></div><div class=progress><div style="width:${j.progress<0?35:Math.max(0,j.progress)}%"></div></div><small>${j.progress<0?'Working…':Math.round(j.progress)+'%'} · ${esc(j.fileName||'')}</small>${j.error?`<p class=danger>${esc(j.error)}</p>`:''}<div class=row>${j.completed?`<a class=btn href="/api/downloads/${j.id}/file">Save to device</a>`:''}<button class=btn onclick="deleteDownload('${j.id}')">Remove</button></div></article>`).join(''):'<div class=card>No downloads yet. Open Movies or Series and click ↓.</div>'}</div>`;
  $('#refreshDl').onclick=downloadView;
}
async function deleteDownload(id){await api('/api/downloads/'+id,{method:'DELETE'});downloadView()}


async function systemView(){
  content.innerHTML='<div class=card>Loading system information…</div>';
  try{
    const [sys,health,backs]=await Promise.all([
      api('/api/system'),
      api('/api/providers/health'),
      api('/api/system/backups')
    ]);
    const gb=n=>(n/1024/1024/1024).toFixed(1);
    const uptime=Math.floor(sys.uptimeSeconds/3600);
    content.innerHTML=`<div class=hero><span class=kicker>APPLIANCE STATUS</span><h2>MyOnline TV System</h2>
      <p class=muted>Version ${esc(sys.version)} · schema ${sys.dataSchemaVersion} · uptime ${uptime} h</p>
      <div class=row><button class=btn id=createBackup>Create backup</button><button class=btn id=refreshSystem>Refresh</button><button class=btn id=recoverSystem>Run recovery</button><button class=btn id=copyDiag>Copy diagnostics</button></div></div>
      <div class=stats>
        <div class=stat><b>${sys.providers}</b><span>Providers</span></div>
        <div class=stat><b>${sys.downloads}</b><span>Downloaded files</span></div>
        <div class=stat><b>${sys.backups}</b><span>Backups</span></div><div class=stat><b>${sys.activeLiveStreams}</b><span>Live streams</span></div><div class=stat><b>${sys.profiles}</b><span>Profiles</span></div><div class=stat><b>${sys.catalogueCacheFiles||0}</b><span>Catalogue cache files</span></div><div class=stat><b>${((sys.catalogueCacheBytes||0)/1024/1024).toFixed(1)} MB</b><span>Catalogue cache</span></div><div class=stat><b>${(sys.processWorkingSetBytes/1024/1024).toFixed(0)} MB</b><span>App memory</span></div>
      </div>
      <div class=grid>
        <div class=card><h3>Runtime</h3><p>${esc(sys.framework)}</p><p class=muted>${esc(sys.os)}</p><p>FFmpeg: <b>${sys.ffmpeg?'OK':'Missing'}</b></p></div>
        <div class=card><h3>Disk</h3><p><b>${gb(sys.disk.usedBytes)} GB</b> used of ${gb(sys.disk.totalBytes)} GB</p><p>${gb(sys.disk.freeBytes)} GB free</p></div>
      </div>
      <h2>Recovery diagnostics</h2>
      <div class=grid>
        <div class=card><h3>Latest catalogue refresh</h3>${Object.keys(sys.lastCatalogueRefreshes||{}).length?Object.entries(sys.lastCatalogueRefreshes).map(([k,v])=>`<p><b>${esc(k)}</b><br><small>${new Date(v).toLocaleString()}</small></p>`).join(''):'<p class=muted>No catalogue refresh recorded since startup.</p>'}</div>
        <div class=card><h3>Recent errors</h3>${(sys.recentErrors||[]).length?sys.recentErrors.map(e=>`<p><b>${esc(e.area)}</b><br><small>${new Date(e.at).toLocaleString()} · ${esc(e.message)}</small></p>`).join(''):'<p class=muted>No recent tracked errors.</p>'}</div>
      </div>
      <h2>Provider health</h2>
      <div class=downloadList>${health.length?health.map(h=>`<article class=downloadCard><div class=row><span class="healthDot ${h.ok?'ok':'fail'}"></span><h3>${esc(h.name)}</h3></div><p>${esc(h.type)} · ${h.latencyMs} ms</p><small>${esc(h.message)}</small></article>`).join(''):'<div class=card>No providers configured.</div>'}</div>
      <h2>Backups</h2>
      <div class=downloadList>${backs.length?backs.map(b=>`<article class=downloadCard><b>${esc(b.fileName)}</b><small>${(b.sizeBytes/1024).toFixed(1)} KiB · ${new Date(b.created).toLocaleString()}</small><button class=btn onclick='restoreBackup(${JSON.stringify(b.fileName)})'>Restore data</button></article>`).join(''):'<div class=card>No backups yet.</div>'}</div>`;
    $('#createBackup').onclick=async()=>{try{const b=await api('/api/system/backup',{method:'POST'});alert('Backup created: '+b.fileName);systemView()}catch(e){alert(e.message)}};
    $('#refreshSystem').onclick=systemView;$('#recoverSystem').onclick=async()=>{try{const r=await api('/api/system/recover',{method:'POST'});alert(`Recovery complete. Cleaned ${r.cleaned} stale item(s).`);systemView()}catch(e){alert(friendlyError(e))}};$('#copyDiag').onclick=()=>navigator.clipboard?.writeText(JSON.stringify({system:sys,providers:health},null,2)).then(()=>alert('Diagnostics copied.')).catch(()=>alert('Could not copy diagnostics.'));
  }catch(e){content.innerHTML=errorCard(e)}
}

async function restoreBackup(fileName){if(!confirm('Restore data from '+fileName+'? Restart is recommended afterwards.'))return;try{await api('/api/system/restore/'+encodeURIComponent(fileName),{method:'POST'});alert('Restore complete. Restart MyOnline TV when convenient.');systemView()}catch(e){alert(friendlyError(e))}}

let editingProviderId=null, editingUserId=null;

async function adminView(){
  if(authState.role!=='Admin'){content.innerHTML='<div class=card>Administrator access is required.</div>';return}
  providers=await api('/api/providers');profiles=await api('/api/profiles');
  const users=await api('/api/admin/users');const accessCfg=await api('/api/admin/profile-access');const mediaLibraries=await api('/api/media-libraries');

  content.innerHTML=`
  <div class=hero><h2>Administration</h2><p class=muted>Manage users, IPTV providers, Plex/Jellyfin libraries and viewer profiles.</p></div>

  <h2>Users</h2>
  <div class=card>
    <div class=formGrid>
      <div class=field><label>Username</label><input id=auser autocomplete=off></div>
      <div class=field><label>Role</label><select id=arole><option value=User>User</option><option value=Admin>Admin</option></select></div>
      <div class=field><label>Password</label><input id=apass type=password autocomplete=new-password placeholder="Required for new user"></div>
      <div class=field><label>Status</label><label class=checkline><input id=aenabled type=checkbox checked> Enabled</label></div>
    </div>
    <div class=row><button class=btn id=saveUser>Add user</button><button class=btn id=cancelUser disabled>Cancel edit</button></div>
  </div>
  <div class=manageList>${users.map(u=>{const ua=accessCfg.userAccess[u.username]||{allowedProfileIds:profiles.map(p=>p.id),defaultProfileId:profiles[0]?.id||'default'};return `<div class=manageChannel><span><b>${esc(u.username)}</b> · ${esc(u.role)} ${u.enabled?'':'· Disabled'}</span><span><select multiple id="ua-${u.id}">${profiles.map(p=>`<option value="${p.id}" ${ua.allowedProfileIds.includes(p.id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></span><button class=btn onclick="saveUserAccess('${escAttr(u.id)}','${escAttr(u.username)}')">Profiles</button><button class=btn onclick="editUser('${escAttr(u.id)}')">Edit</button><button class=btn onclick="deleteUser('${escAttr(u.id)}','${escAttr(u.username)}')">Remove</button></div>`}).join('')}</div>

  <h2>Media libraries</h2>
  <div class=card>
    <div class=formGrid>
      <div class=field><label>Name</label><input id=mlname></div>
      <div class=field><label>Type</label><select id=mltype><option value=plex>Plex</option><option value=jellyfin>Jellyfin</option></select></div>
      <div class=field><label>Server URL</label><input id=mlbase placeholder="https://plex.example or http://192.168.x.x:8096"></div>
      <div class=field><label>Token / API key</label><input id=mltoken type=password placeholder="Token/API key"></div>
      <div class=field><label>Status</label><label class=checkline><input id=mlenabled type=checkbox checked> Enabled</label></div>
    </div>
    <div class=row><button class=btn id=mlsave>Add media library</button><button class=btn id=mlcancel disabled>Cancel edit</button></div>
  </div>
  <div class=grid>${mediaLibraries.map(x=>`<div class=card><h3>${esc(x.name)}</h3><p>${esc(x.type)} · ${esc(x.host||'')}</p><div class=row><button class=btn onclick="editMediaLibrary('${x.id}')">Edit</button><button class=btn onclick="testMediaLibrary('${x.id}')">Test</button><button class=btn onclick="chooseMediaLibraries('${x.id}')">Libraries</button><button class=btn onclick="removeMediaLibrary('${x.id}')">Remove</button></div><div id="mlstat-${x.id}" class=muted></div></div>`).join('')}</div>

  <h2>IPTV providers</h2>
  <div class=card>
    <p class=muted>Connection details are encrypted at rest. Existing passwords are never returned to the browser.</p>
    <input id=pid type=hidden>
    <div class=formGrid>
      <div class=field><label>Name</label><input id=pname></div>
      <div class=field><label>Type</label><select id=ptype><option value=m3u>M3U + XMLTV</option><option value=xtream>Xtream-compatible</option></select></div>
      <div class=field><label>M3U playlist URL</label><input id=purl placeholder="https://.../playlist.m3u"></div>
      <div class=field><label>XMLTV EPG URL</label><input id=pepg placeholder="https://.../epg.xml"></div>
      <div class=field><label>Xtream base URL</label><input id=pbase placeholder="https://provider.example:443"></div>
      <div class=field><label>Username</label><input id=puser autocomplete=off></div>
      <div class=field><label>Password</label><input id=ppass type=password autocomplete=new-password placeholder="Leave blank to keep existing password"></div>
    </div>
    <div class=row><button class=btn id=savep>Add provider</button><button class=btn id=cancelProvider disabled>Cancel edit</button></div>
  </div>

  <div class=grid>${providers.map(p=>`<div class=card><h3>${esc(p.name)}</h3><div class=muted>${esc(p.type)} · ${esc(p.host||'')}</div><p>${p.hasEpg?'EPG configured':'No explicit EPG'} · ${p.hasCredentials?'Credentials stored':'No credentials'}</p><div class=row><button class=btn onclick="editProvider('${p.id}')">Edit</button><button class=btn onclick="testProvider('${p.id}',this)">Test</button><button class=btn onclick="removeProvider('${p.id}')">Remove</button></div><div id="ptest-${p.id}" class=muted></div></div>`).join('')}</div>

  <div class=card style="margin-top:18px"><h3>Channels & groups</h3><p class=muted>Hide groups/channels or give a channel a local display name.</p><div class=row><select id=manageProvider>${providers.map(p=>`<option value="${p.id}" ${p.id===currentProvider?'selected':''}>${esc(p.name)}</option>`).join('')}</select><button class=btn id=manageChannels>Manage channels</button></div><div id=channelManager></div></div>

  <div class=card style="margin-top:18px"><h3>Viewer profiles</h3><div class=formGrid><div class=field><label>Name</label><input id=profileName placeholder="Profile name"></div><div class=field><label>Icon</label><select id=profileIcon><option>👤</option><option>🧑</option><option>👩</option><option>👨</option><option>🧒</option><option>🎬</option></select></div></div><label><input id=profileKids type=checkbox> Kids profile</label><button class=btn id=addProfile>Add profile</button><div class=manageList>${profiles.map(p=>`<div class=manageChannel><span>${esc(p.icon)} ${esc(p.name)} ${p.isKids?'· Kids':''}</span><span></span><button class=btn onclick="deleteProfile('${escAttr(p.id)}')" ${profiles.length<=1?'disabled':''}>Remove</button></div>`).join('')}</div></div>

  <div class=card style="margin-top:18px"><h3>Profiles & permissions</h3>
    <p class=muted>Choose profile permissions, providers and optional Kids PIN.</p>
    <div id=permissionMatrix></div>
  </div>

  <div class=card style="margin-top:18px"><h3>Security</h3><p>User passwords use PBKDF2-SHA256 with unique salts. Provider credentials are AES-GCM encrypted at rest.</p><p class=muted>Only administrators can manage users/providers or access System administration.</p></div>`;


  const pm=$('#permissionMatrix');
  pm.innerHTML=profiles.map(p=>{
    const pol=accessCfg.policies[p.id]||{live:true,movies:true,series:true,downloads:true,allowedProviderIds:[]};
    return `<div class=manageChannel><span><b>${esc(p.icon)} ${esc(p.name)}</b><br><small>
      <label><input type=checkbox id="pl-${p.id}" ${pol.live!==false?'checked':''}> Live/Guide</label>
      <label><input type=checkbox id="pm-${p.id}" ${pol.movies!==false?'checked':''}> Movies</label>
      <label><input type=checkbox id="ps-${p.id}" ${pol.series!==false?'checked':''}> Series</label>
      <label><input type=checkbox id="pd-${p.id}" ${pol.downloads!==false?'checked':''}> Downloads</label></small></span>
      <span><select multiple id="pp-${p.id}">${providers.map(x=>`<option value="${x.id}" ${(pol.allowedProviderIds||[]).includes(x.id)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></span>
      <input id="pin-${p.id}" type=password placeholder="New Kids PIN">
      <button class=btn onclick="saveProfilePolicy('${p.id}')">Save permissions</button></div>`;
  }).join('');

  $('#manageChannels').onclick=manageChannels;
  $('#addProfile').onclick=async()=>{try{await jpost('/api/profiles',{id:null,name:$('#profileName').value,isKids:$('#profileKids').checked,icon:$('#profileIcon').value});profiles=await api('/api/profiles');adminView()}catch(e){alert(friendlyError(e))}};

  $('#mlsave').onclick=saveMediaLibrary;$('#mlcancel').onclick=()=>{editingMediaLibraryId=null;adminView()};
  $('#saveUser').onclick=saveAdminUser;
  $('#cancelUser').onclick=()=>{editingUserId=null;adminView()};
  $('#savep').onclick=saveProvider;
  $('#cancelProvider').onclick=()=>{editingProviderId=null;adminView()};
}

async function editUser(id){
  const users=await api('/api/admin/users');
  const u=users.find(x=>x.id===id);if(!u)return;
  editingUserId=id;
  $('#auser').value=u.username;$('#arole').value=u.role;$('#aenabled').checked=u.enabled;$('#apass').value='';
  $('#apass').placeholder='Leave blank to keep current password';
  $('#saveUser').textContent='Save user';$('#cancelUser').disabled=false;$('#auser').focus();
}

async function saveAdminUser(){
  try{
    const body={id:editingUserId||'',username:$('#auser').value,password:$('#apass').value,role:$('#arole').value,enabled:$('#aenabled').checked};
    await jpost('/api/admin/users',body);editingUserId=null;await adminView();
  }catch(e){alert(friendlyError(e))}
}

async function deleteUser(id,username){
  if(username.toLowerCase()===(authState.user||'').toLowerCase()){alert('You cannot remove the account you are signed in with.');return}
  if(!confirm('Remove user '+username+'?'))return;
  try{await api('/api/admin/users/'+encodeURIComponent(id),{method:'DELETE'});adminView()}catch(e){alert(friendlyError(e))}
}

async function editProvider(id){
  try{
    const p=await api('/api/providers/'+encodeURIComponent(id)+'/edit');
    editingProviderId=id;
    $('#pid').value=p.id;$('#pname').value=p.name;$('#ptype').value=p.type;
    $('#purl').value=p.playlistUrl||'';$('#pepg').value=p.epgUrl||'';$('#pbase').value=p.baseUrl||'';
    $('#puser').value=p.username||'';$('#ppass').value='';
    $('#ppass').placeholder=p.passwordStored?'Leave blank to keep existing password':'Password';
    $('#savep').textContent='Save provider';$('#cancelProvider').disabled=false;
    $('#pname').scrollIntoView({behavior:'smooth',block:'center'});$('#pname').focus();
  }catch(e){alert(friendlyError(e))}
}

async function saveProvider(){
  const p={id:editingProviderId||'',name:$('#pname').value,type:$('#ptype').value,playlistUrl:$('#purl').value,epgUrl:$('#pepg').value,baseUrl:$('#pbase').value,username:$('#puser').value,password:$('#ppass').value,keepExistingConnection:false,keepExistingPassword:!!editingProviderId&&!$('#ppass').value};
  try{await jpost('/api/providers',p);editingProviderId=null;providers=await api('/api/providers');await adminView()}catch(e){alert(friendlyError(e))}
}


async function deleteProfile(id){if(!confirm('Remove this viewer profile?'))return;try{await api('/api/profiles/'+encodeURIComponent(id),{method:'DELETE'});profiles=await api('/api/profiles');if(currentProfile===id){currentProfile=profiles[0].id;localStorage.setItem('myonline-profile',currentProfile)}renderProfileBadge();adminView()}catch(e){alert(friendlyError(e))}}

async function manageChannels(){
  currentProvider=$('#manageProvider').value;await loadChannelPrefs();const box=$('#channelManager');box.innerHTML='<p class=muted>Loading…</p>';
  try{channels=await api('/api/channels/'+encodeURIComponent(currentProvider));const groups=[...new Set(channels.map(c=>c.group).filter(Boolean))].sort();
    box.innerHTML=`<h4>Groups</h4><div class=manageList>${groups.map(g=>`<label><input type=checkbox ${channelPrefs.hiddenGroups.includes(g)?'checked':''} onchange='manageGroup(${JSON.stringify(g)},this.checked)'> Hide ${esc(g)}</label>`).join('')}</div><h4>Channels</h4><div class=manageList>${channels.slice(0,3000).map(c=>`<div class=manageChannel><label><input type=checkbox ${channelPrefs.hiddenChannels.includes(c.key)?'checked':''} onchange='manageHidden(${JSON.stringify(c.key)},this.checked)'> Hide</label><span>${esc(c.name)}</span><input value="${escAttr(channelPrefs.aliases?.[c.key]||'')}" placeholder="Local name" onchange='manageAlias(${JSON.stringify(c.key)},this.value)'></div>`).join('')}</div><button class=btn onclick=resetChannelPrefs()>Reset channel settings</button>`;
  }catch(e){box.innerHTML=errorCard(e)}
}
async function manageGroup(group,hidden){await jpost('/api/channel-preferences/'+encodeURIComponent(currentProvider)+'/group',{group,hidden});await loadChannelPrefs()}
async function manageHidden(key,hidden){await jpost('/api/channel-preferences/'+encodeURIComponent(currentProvider)+'/channel',{channelKey:key,hidden,alias:channelPrefs.aliases?.[key]??null});await loadChannelPrefs()}
async function manageAlias(key,alias){await jpost('/api/channel-preferences/'+encodeURIComponent(currentProvider)+'/channel',{channelKey:key,hidden:channelPrefs.hiddenChannels.includes(key),alias});await loadChannelPrefs()}
async function resetChannelPrefs(){if(!confirm('Reset all channel settings?'))return;await api('/api/channel-preferences/'+encodeURIComponent(currentProvider)+'/reset',{method:'POST'});await manageChannels()}

async function testProvider(id,button){
  const box=$('#ptest-'+id);
  if(box)box.textContent='Testing provider…';
  if(button)button.disabled=true;
  try{
    const r=await api('/api/providers/'+encodeURIComponent(id)+'/test');
    let details='';
    if(r.type==='xtream'){
      const a=r.auth||{},l=r.live||{};
      details=`Auth: ${a.statusCode??'-'} ${a.message||''}; Live: ${l.statusCode??'-'} ${l.message||''}`;
    }else{
      const p=r.playlist||{};details=`Playlist: ${p.statusCode??'-'} ${p.message||''}`;
    }
    if(box){box.className=r.ok?'muted':'danger';box.textContent=(r.ok?'OK · ':'Failed · ')+details+` · ${r.latencyMs} ms`;}
  }catch(e){if(box){box.className='danger';box.textContent=e.message}}
  finally{if(button)button.disabled=false}
}

async function removeProvider(id){if(!confirm('Remove this provider?'))return;await api('/api/providers/'+id,{method:'DELETE'});providers=await api('/api/providers');if(currentProvider===id)currentProvider=null;adminView()}

function noProvider(){return '<div class=card>No IPTV provider configured. Open Settings and add one.</div>'}
function errorCard(e){return `<div class="card danger"><b>Error</b><p>${esc(friendlyError(e))}</p><button class=btn onclick="show(currentView)">Retry</button></div>`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escAttr(s){return esc(s)}
boot().catch(e=>{$('#auth').classList.remove('hidden');$('#auth').innerHTML=`<div class=authCard><h2>Startup error</h2><pre>${esc(e.message)}</pre></div>`});

// v0.7.0 catalogue cache
const CATALOG_CACHE_PREFIX='myonline-catalog-v1:';
function catalogueCacheKey(kind,provider,category){return `${CATALOG_CACHE_PREFIX}${kind}:${provider}:${category||'all'}`}
function readCatalogueCache(key,maxAgeMs=10*60*1000){
  try{const x=JSON.parse(sessionStorage.getItem(key)||'null');return x&&Date.now()-x.saved<maxAgeMs?x.items:null}catch{return null}
}
function writeCatalogueCache(key,items){
  try{sessionStorage.setItem(key,JSON.stringify({saved:Date.now(),items}))}catch{}
}

// v0.7.0 player cleanup
window.addEventListener('pagehide',()=>destroyPlayer());
window.addEventListener('beforeunload',()=>destroyPlayer());

// v0.7.0 movie favourites
function mediaFavKey(){return `myonline-media-favourites-v2:${currentProfile||'default'}`}
function getMediaFavs(){try{return JSON.parse(localStorage.getItem(mediaFavKey())||'[]')}catch{return []}}
function isMediaFav(type,id){return getMediaFavs().some(x=>x.type===type&&String(x.id)===String(id))}
function toggleMediaFav(type,item){
  let rows=getMediaFavs().filter(x=>!(x.type===type&&String(x.id)===String(item.id)));
  if(!isMediaFav(type,item.id))rows.unshift({type,id:String(item.id),name:item.name,poster:item.poster||'',providerId:currentProvider});
  localStorage.setItem(mediaFavKey(),JSON.stringify(rows.slice(0,500)));
  if(type==='movie')filterMedia();else filterSeries();
}

// v0.7.0 watch history
function historyKey(){return `myonline-media-history-v2:${currentProfile||'default'}`}
function getMediaHistory(){try{return JSON.parse(localStorage.getItem(historyKey())||'[]')}catch{return []}}
function rememberMediaHistory(type,item){
  let rows=getMediaHistory().filter(x=>!(x.type===type&&String(x.id)===String(item.id)));
  rows.unshift({type,id:String(item.id),name:item.name||item.title||'Untitled',poster:item.poster||'',providerId:currentProvider,updated:Date.now()});
  localStorage.setItem(historyKey(),JSON.stringify(rows.slice(0,100)));
}

// v0.7.0 home rails
function homeMediaRails(){
  const favs=getMediaFavs().slice(0,12),hist=getMediaHistory().slice(0,12);
  return `${favs.length?`<h2>Media favourites</h2><div class=continueRow>${favs.map(x=>`<button class=continueCard onclick="show('${x.type==='movie'?'movies':'series'}')"><span>★</span><b>${esc(x.name)}</b><small>${esc(x.type)}</small></button>`).join('')}</div>`:''}
  ${hist.length?`<h2>Recently watched</h2><div class=continueRow>${hist.map(x=>`<button class=continueCard onclick="show('${x.type==='movie'?'movies':'series'}')"><span>↻</span><b>${esc(x.name)}</b><small>${new Date(x.updated).toLocaleString()}</small></button>`).join('')}</div>`:''}`;
}

// v0.7.0 quick search
function homeQuickSearch(){
  const q=($('#homeSearch')?.value||'').trim();
  if(!q)return;
  window.__pendingGlobalSearch=q;
  show('search');
}

// v0.7.0 TV & Remote UX
let tvRemoteMode=false;
let tvLastFocusByView={};

function tvFocusables(){
  return [...document.querySelectorAll(
    'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )].filter(x=>{
    if(x.offsetParent===null)return false;
    const s=getComputedStyle(x);
    return s.visibility!=='hidden'&&s.display!=='none';
  });
}

function tvCenter(el){
  const r=el.getBoundingClientRect();
  return {x:r.left+r.width/2,y:r.top+r.height/2,r};
}

function tvMoveSpatial(direction){
  const items=tvFocusables();
  if(!items.length)return;
  let current=document.activeElement;
  if(!items.includes(current)){
    const preferred=document.querySelector('main button,main a[href],nav button');
    (preferred||items[0]).focus();
    return;
  }

  const c=tvCenter(current);
  let best=null,bestScore=Infinity;
  for(const el of items){
    if(el===current)continue;
    const p=tvCenter(el);
    const dx=p.x-c.x,dy=p.y-c.y;

    let primary=0,cross=0,valid=false;
    if(direction==='left'  && dx < -6){primary=-dx;cross=Math.abs(dy);valid=true}
    if(direction==='right' && dx >  6){primary= dx;cross=Math.abs(dy);valid=true}
    if(direction==='up'    && dy < -6){primary=-dy;cross=Math.abs(dx);valid=true}
    if(direction==='down'  && dy >  6){primary= dy;cross=Math.abs(dx);valid=true}
    if(!valid)continue;

    // Prefer controls in the intended direction and roughly on the same row/column.
    const score=primary + cross*2.25;
    if(score<bestScore){bestScore=score;best=el}
  }

  if(best){
    best.focus({preventScroll:true});
    best.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  }
}

function tvActivateFocused(){
  const el=document.activeElement;
  if(!el||el===document.body)return false;
  if(el.tagName==='SELECT'){el.focus();return true}
  if(el.tagName==='INPUT'){el.focus();return true}
  if(typeof el.click==='function'){el.click();return true}
  return false;
}

function tvFocusFirst(){
  const remembered=tvLastFocusByView[currentView];
  if(remembered){
    const found=[...tvFocusables()].find(x=>x.dataset?.tvFocusId===remembered);
    if(found){found.focus({preventScroll:true});return}
  }
  const first=document.querySelector('#content button,#content a[href],nav button[data-view]');
  first?.focus({preventScroll:true});
}

document.addEventListener('focusin',e=>{
  const el=e.target;
  if(!el?.matches?.('button,a[href],input,select,[tabindex]'))return;
  if(!el.dataset.tvFocusId){
    el.dataset.tvFocusId='tv-'+Math.random().toString(36).slice(2,10);
  }
  if(currentView)tvLastFocusByView[currentView]=el.dataset.tvFocusId;
});

document.addEventListener('keydown',e=>{
  const tag=document.activeElement?.tagName;
  const editing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT';

  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape','Backspace'].includes(e.key)){
    tvRemoteMode=true;
    document.documentElement.classList.add('tvRemoteMode');
  }

  if(editing){
    if(e.key==='Escape'){
      document.activeElement.blur();
      e.preventDefault();
    }
    return;
  }

  if(e.key==='ArrowLeft'){tvMoveSpatial('left');e.preventDefault()}
  else if(e.key==='ArrowRight'){tvMoveSpatial('right');e.preventDefault()}
  else if(e.key==='ArrowUp'){tvMoveSpatial('up');e.preventDefault()}
  else if(e.key==='ArrowDown'){tvMoveSpatial('down');e.preventDefault()}
  else if(e.key==='Enter'){
    if(document.activeElement?.tagName!=='VIDEO' && tvActivateFocused())e.preventDefault();
  }
  else if((e.key==='Escape'||e.key==='Backspace')&&!document.fullscreenElement){
    const picker=$('#profilePicker');
    if(picker){picker.remove();e.preventDefault();return}
    if(currentView!=='home'){show('home');e.preventDefault()}
  }
});

// Common Smart TV / media-remote keys.
document.addEventListener('keydown',e=>{
  const v=$('#video');
  if(!v)return;

  if(e.key==='MediaPlayPause'||e.key===' '){
    if(!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){
      v.paused?v.play().catch(()=>{}):v.pause();
      e.preventDefault();
    }
  }
  if(e.key==='MediaPlay')v.play().catch(()=>{});
  if(e.key==='MediaPause')v.pause();

  // VOD only: seek with media keys / J-L. Live playback is left untouched.
  const isVod=currentView==='movies'||currentView==='series';
  if(isVod&&(e.key==='MediaRewind'||e.key==='j'||e.key==='J')){
    if(Number.isFinite(v.duration))v.currentTime=Math.max(0,v.currentTime-10);
    e.preventDefault();
  }
  if(isVod&&(e.key==='MediaFastForward'||e.key==='l'||e.key==='L')){
    if(Number.isFinite(v.duration))v.currentTime=Math.min(v.duration||Infinity,v.currentTime+10);
    e.preventDefault();
  }

  if(e.key==='f'||e.key==='F'){
    (v.closest('.playerCard')||v).requestFullscreen?.();
    e.preventDefault();
  }
  if(e.key==='Escape'&&document.fullscreenElement)document.exitFullscreen?.();
});


// v0.7.0 profiles polish
document.addEventListener('click',e=>{if(!e.target.closest?.('#profilePicker')&&!e.target.closest?.('.profileBadge'))$('#profilePicker')?.remove()});

// v0.7.0 debounce
function debounce(fn,ms=180){let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

// v0.7.0 player recovery
function installVideoRecovery(video){
  if(!video||video.dataset.recoveryInstalled)return;
  video.dataset.recoveryInstalled='1';
  let lastKick=0;
  video.addEventListener('stalled',()=>{if(Date.now()-lastKick<5000)return;lastKick=Date.now();if(!video.paused)video.play().catch(()=>{})});
  video.addEventListener('waiting',()=>{const s=$('#mediaPlaybackStatus')||$('#livePlaybackStatus');if(s&&!s.classList.contains('error'))s.textContent='Buffering…'});
  video.addEventListener('playing',()=>{const s=$('#mediaPlaybackStatus')||$('#livePlaybackStatus');if(s&&!s.classList.contains('error'))s.textContent='Playing'});
}
document.addEventListener('play',e=>{if(e.target?.tagName==='VIDEO')installVideoRecovery(e.target)},true);

// v0.7.0 system auto refresh
let systemRefreshTimer=null;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentView==='system')systemView().catch(()=>{})});

// v0.7.0 accessibility
function syncNavAria(){
  document.querySelectorAll('nav button[data-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.view===currentView?'page':'false'));
}
const originalShowForAria=show;
show=async function(v){
  await originalShowForAria(v);
  syncNavAria();
  if(tvRemoteMode)setTimeout(tvFocusFirst,0);
}

async function refreshMovies(){
  try{
    const st=$('#moviesStatus');if(st)st.textContent='Refreshing…';
    sessionStorage.removeItem(catalogueCacheKey('movies',currentProvider,$('#category')?.value||''));
    await api('/api/catalogue-cache/clear/'+encodeURIComponent(currentProvider),{method:'POST'});
    await loadMovies();
  }catch(e){const st=$('#moviesStatus');if(st)st.textContent='Refresh failed: '+friendlyError(e)}
}

async function refreshSeries(){
  try{
    const st=$('#seriesStatus');if(st)st.textContent='Refreshing…';
    sessionStorage.removeItem(catalogueCacheKey('series',currentProvider,$('#category')?.value||''));
    await api('/api/catalogue-cache/clear/'+encodeURIComponent(currentProvider),{method:'POST'});
    await loadSeries();
  }catch(e){const st=$('#seriesStatus');if(st)st.textContent='Refresh failed: '+friendlyError(e)}
}


function ensureTvRemoteHint(){
  if($('#tvRemoteHint'))return;
  const hint=document.createElement('div');
  hint.id='tvRemoteHint';
  hint.className='tvRemoteHint';
  hint.textContent='Remote: arrows navigate · OK/Enter select · Back/Esc Home · F fullscreen · J/L ±10s in VOD';
  document.body.appendChild(hint);
}
document.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)){
    ensureTvRemoteHint();
    const h=$('#tvRemoteHint');
    h.classList.add('visible');
    clearTimeout(window.__tvHintTimer);
    window.__tvHintTimer=setTimeout(()=>h.classList.remove('visible'),3500);
  }
});

async function saveUserAccess(id,username){
  try{
    const sel=[...document.querySelectorAll('#ua-'+CSS.escape(id)+' option:checked')].map(x=>x.value);
    if(!sel.length){alert('Select at least one profile.');return}
    await jpost('/api/admin/profile-access/user/'+encodeURIComponent(username),{allowedProfileIds:sel,defaultProfileId:sel[0]});
    alert('Profile access saved.');
  }catch(e){alert(friendlyError(e))}
}
async function saveProfilePolicy(id){
  try{
    const providerIds=[...document.querySelectorAll('#pp-'+CSS.escape(id)+' option:checked')].map(x=>x.value);
    await jpost('/api/admin/profile-access/profile/'+encodeURIComponent(id),{
      live:$('#pl-'+id).checked,movies:$('#pm-'+id).checked,series:$('#ps-'+id).checked,downloads:$('#pd-'+id).checked,
      allowedProviderIds:providerIds,pin:$('#pin-'+id).value||null,clearPin:false
    });
    alert('Profile permissions saved.');
  }catch(e){alert(friendlyError(e))}
}

let globalSearchFilter='all';
let lastGlobalSearchResult={live:[],movies:[],series:[]};


function toLocalInputValue(d){
  const x=new Date(d),pad=n=>String(n).padStart(2,'0');
  return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

async function scheduleGuideRecording(channelKey,channelName,programJson){
  try{
    const pr=JSON.parse(programJson);
    await jpost('/api/recordings',{
      providerId:currentProvider,
      channelKey,
      channelName,
      title:pr.title||channelName,
      start:pr.start,
      end:pr.stop
    });
    alert('Recording scheduled: '+(pr.title||channelName));
  }catch(e){alert(friendlyError(e))}
}

async function recordingsView(){
  if(!await ensureProvider()){content.innerHTML=noProvider();return}
  const rows=await api('/api/recordings');
  const ch=await api('/api/channels/'+currentProvider);
  const now=new Date(),later=new Date(now.getTime()+60*60*1000);
  content.innerHTML=`<div class=hero><h2>Recordings & DVR</h2><p class=muted>Schedule Live TV recordings on the MyOnline TV server. Tip: Shift+click a programme in Guide to schedule it directly.</p></div>
  <div class=card><h3>New recording</h3><div class=recordForm>
    ${providerSelect()}
    <select id=recChannel>${ch.map(x=>`<option value="${escAttr(x.key)}">${esc(x.name)}</option>`).join('')}</select>
    <input id=recTitle placeholder="Recording title">
    <label>Start <input id=recStart type=datetime-local value="${toLocalInputValue(now)}"></label>
    <label>End <input id=recEnd type=datetime-local value="${toLocalInputValue(later)}"></label>
    <button class=btn id=recSchedule>Schedule recording</button>
  </div></div>
  <div class=recordingList>${rows.length?rows.map(recordingCard).join(''):'<div class=card>No recordings scheduled yet.</div>'}</div>`;

  $('#provider').onchange=async e=>{currentProvider=e.target.value;await recordingsView()};
  $('#recSchedule').onclick=async()=>{
    const c=$('#recChannel'),opt=c.options[c.selectedIndex];
    const start=new Date($('#recStart').value),end=new Date($('#recEnd').value);
    if(!(end>start)){alert('End must be after start.');return}
    try{
      await jpost('/api/recordings',{
        providerId:currentProvider,channelKey:c.value,channelName:opt?.textContent||'Channel',
        title:$('#recTitle').value||opt?.textContent||'Recording',
        start:start.toISOString(),end:end.toISOString()
      });
      recordingsView();
    }catch(e){alert(friendlyError(e))}
  };
}

function recordingCard(r){
  const duration=Math.max(0,Math.round((new Date(r.end)-new Date(r.start))/60000));
  return `<article class=recordingCard><div><span class="recordDot ${r.status==='Recording'?'active':''}">●</span><h3>${esc(r.title)}</h3><p>${esc(r.channelName)} · ${new Date(r.start).toLocaleString()} · ${duration} min</p>${r.error?`<p class=danger>${esc(r.error)}</p>`:''}</div>
  <div class=row><span class="status ${r.status==='Failed'?'bad':''}">${esc(r.status)}</span>
  ${r.completed?`<a class=btn href="/api/recordings/${r.id}/file">Play / save</a>`:''}
  ${r.status==='Scheduled'||r.status==='Recording'?`<button class=btn onclick="cancelRecording('${r.id}')">Cancel</button>`:''}
  <button class=btn onclick="deleteRecording('${r.id}')">Remove</button></div></article>`;
}
async function cancelRecording(id){await jpost('/api/recordings/'+id+'/cancel',{});recordingsView()}
async function deleteRecording(id){if(!confirm('Remove recording and file?'))return;await api('/api/recordings/'+id,{method:'DELETE'});recordingsView()}

async function searchView(){
  const initial=window.__pendingGlobalSearch||'';window.__pendingGlobalSearch='';
  content.innerHTML=`<div class=hero><h2>Search & Discovery</h2><p class=muted>Search Live TV, IPTV, Plex and Jellyfin.</p>
  <div class=row><input id=globalSearchBox value="${escAttr(initial)}" placeholder="Title, channel or programme"><button class=btn id=globalSearchButton>Search</button></div>
  <div class=searchFilters>
    <button class="btn searchFilter activeBtn" data-filter=all>All</button>
    <button class="btn searchFilter" data-filter=live>Live</button>
    <button class="btn searchFilter" data-filter=movies>Movies</button>
    <button class="btn searchFilter" data-filter=series>Series</button>
  </div></div>
  <div id=globalSearchStatus class=muted></div><div id=globalSearchResults></div>`;
  $('#globalSearchButton').onclick=runGlobalSearch;
  $('#globalSearchBox').onkeydown=e=>{if(e.key==='Enter')runGlobalSearch()};
  document.querySelectorAll('.searchFilter').forEach(b=>b.onclick=()=>{
    globalSearchFilter=b.dataset.filter;
    document.querySelectorAll('.searchFilter').forEach(x=>x.classList.toggle('activeBtn',x===b));
    renderGlobalSearchResults($('#globalSearchBox').value.trim());
  });
  if(initial)await runGlobalSearch();
}

function searchScore(x,q){
  const n=String(x.name||x.title||'').toLowerCase();
  if(n===q)return 0;
  if(n.startsWith(q))return 1;
  const at=n.indexOf(q);
  return at<0?999:10+at;
}

async function runGlobalSearch(){
  const original=$('#globalSearchBox').value.trim(),q=original.toLowerCase();
  if(q.length<2){$('#globalSearchStatus').textContent='Enter at least 2 characters.';return}
  if(!currentProvider){$('#globalSearchStatus').textContent='No provider selected.';return}
  $('#globalSearchStatus').textContent='Searching…';
  $('#globalSearchResults').innerHTML='';
  try{
    const p=currentPolicy(),tasks=[];
    if(p.live!==false)tasks.push(api('/api/channels/'+currentProvider).then(x=>({kind:'live',rows:x})).catch(()=>({kind:'live',rows:[]})));
    if(p.movies!==false){
      tasks.push(api('/api/vod/'+currentProvider+'/items?categoryId=',{timeoutMs:125000}).then(x=>({kind:'movies',rows:x})).catch(()=>({kind:'movies',rows:[]})));
      tasks.push(api('/api/unified/movies',{timeoutMs:65000}).then(x=>({kind:'movies-extra',rows:x})).catch(()=>({kind:'movies-extra',rows:[]})));
    }
    if(p.series!==false){
      tasks.push(api('/api/series/'+currentProvider+'/items?categoryId=',{timeoutMs:60000}).then(x=>({kind:'series',rows:x})).catch(()=>({kind:'series',rows:[]})));
      tasks.push(api('/api/unified/series',{timeoutMs:65000}).then(x=>({kind:'series-extra',rows:x})).catch(()=>({kind:'series-extra',rows:[]})));
    }
    const groups=await Promise.all(tasks),result={live:[],movies:[],series:[]};
    for(const g of groups){
      const rk=g.kind==='movies-extra'?'movies':g.kind==='series-extra'?'series':g.kind;
      result[rk]=[...(result[rk]||[]),...(g.rows||[]).filter(x=>searchScore(x,q)<999)];
    }
    for(const kind of Object.keys(result))
      result[kind]=result[kind].sort((a,b)=>searchScore(a,q)-searchScore(b,q)).slice(0,80);
    lastGlobalSearchResult=result;
    renderGlobalSearchResults(original);
  }catch(e){$('#globalSearchStatus').textContent='Search failed: '+friendlyError(e)}
}

function renderGlobalSearchResults(original=''){
  const result=lastGlobalSearchResult||{live:[],movies:[],series:[]};
  const visible=k=>globalSearchFilter==='all'||globalSearchFilter===k;
  const total=(visible('live')?result.live.length:0)+(visible('movies')?result.movies.length:0)+(visible('series')?result.series.length:0);
  $('#globalSearchStatus').textContent=`${total} result${total===1?'':'s'}${original?' for “'+original+'”':''}`;
  $('#globalSearchResults').innerHTML=`
    ${visible('live')&&result.live.length?`<h2>Live TV</h2><div class=grid>${result.live.map(c=>`<button class="card actionCard" onclick="show('live').then(()=>{const q=$('#q');if(q){q.value=${JSON.stringify(c.name||c.title||'')};renderFilter()}})"><h3>${esc(c.name||c.title||'Channel')}</h3><p>${esc(c.group||'')}</p></button>`).join('')}</div>`:''}
    ${visible('movies')&&result.movies.length?`<h2>Movies</h2><div class=posterGrid>${result.movies.map(m=>`<button class=posterCard onclick='searchOpenMovie(${JSON.stringify(m)})'>${m.poster?`<img loading=lazy decoding=async src="${escAttr(m.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(m.name)}</b><small>${m.source?`<span class=sourceBadge>${esc(m.source)}</span> `:''}${esc(m.year||'')} ${esc(m.rating||'')}</small></div></button>`).join('')}</div>`:''}
    ${visible('series')&&result.series.length?`<h2>Series</h2><div class=posterGrid>${result.series.map(s=>`<button class=posterCard onclick='searchOpenSeries(${JSON.stringify(s)})'>${s.poster?`<img loading=lazy decoding=async src="${escAttr(s.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(s.name)}</b><small>${s.source?`<span class=sourceBadge>${esc(s.source)}</span> `:''}${esc(s.year||'')} ${esc(s.rating||'')}</small></div></button>`).join('')}</div>`:''}
    ${!total?'<div class=card>No matching channels, movies or series were found.</div>':''}`;
}

async function searchOpenMovie(item){
  if(item?.source)return playUnifiedItem(item);
  await show('movies');
  const q=$('#mediaq');if(q){q.value=item.name||'';filterMedia()}
}
async function searchOpenSeries(item){
  if(item?.source)return playUnifiedItem({...item,kind:'series'});
  await show('series');
  const q=$('#seriesq');if(q){q.value=item.name||'';filterSeries()}
}

let editingMediaLibraryId=null;
let editingMediaLibraryIds=[];
async function editMediaLibrary(id){
  const x=await api('/api/media-libraries/'+encodeURIComponent(id)+'/edit');editingMediaLibraryId=id;
  editingMediaLibraryIds=Array.isArray(x.libraryIds)?x.libraryIds:[];
  $('#mlname').value=x.name;$('#mltype').value=x.type;$('#mlbase').value=x.baseUrl;$('#mltoken').value='';$('#mltoken').placeholder=x.tokenStored?'Leave blank to keep existing token':'Token/API key';$('#mlenabled').checked=x.enabled;
  $('#mlsave').textContent='Save media library';$('#mlcancel').disabled=false;$('#mlname').focus();
}
async function saveMediaLibrary(){
  try{
    await jpost('/api/media-libraries',{
      id:editingMediaLibraryId||'',
      name:$('#mlname').value,
      type:$('#mltype').value,
      baseUrl:$('#mlbase').value,
      token:$('#mltoken').value,
      enabled:$('#mlenabled').checked,
      libraryIds:editingMediaLibraryId?editingMediaLibraryIds:[],
      keepExistingToken:!!editingMediaLibraryId&&!$('#mltoken').value
    });
    editingMediaLibraryId=null;editingMediaLibraryIds=[];adminView()
  }catch(e){alert(friendlyError(e))}
}
async function testMediaLibrary(id){try{const r=await jpost('/api/media-libraries/'+id+'/test',{});$('#mlstat-'+id).textContent=r.ok?'Connection OK':'Connection failed: '+(r.error||r.status)}catch(e){$('#mlstat-'+id).textContent=friendlyError(e)}}
async function removeMediaLibrary(id){if(!confirm('Remove media library?'))return;try{await api('/api/media-libraries/'+id,{method:'DELETE'});adminView()}catch(e){alert(friendlyError(e))}}
async function chooseMediaLibraries(id){
  try{
    const [rows,current]=await Promise.all([
      api('/api/media-libraries/'+id+'/libraries'),
      api('/api/media-libraries/'+id+'/edit')
    ]);
    const host=$('#mlstat-'+id);
    if(!host)return;
    if(!rows.length){host.innerHTML='<div class="libraryPicker empty">No libraries returned by the server.</div>';return}
    const selected=new Set(current.libraryIds||[]);
    host.innerHTML=`<div class=libraryPicker>
      <b>Select libraries</b>
      ${rows.map((x,i)=>`<label class=libraryChoice><input type=checkbox data-library-id="${escAttr(x.id||'')}" ${selected.has(x.id)?'checked':''}> <span>${esc(x.name||'Unnamed')}</span><small>${esc(x.type||'library')}</small></label>`).join('')}
      <div class=row><button class=btn id="mlselect-${id}">Save selection</button><button class=btn onclick="$('#mlstat-${id}').innerHTML=''">Cancel</button></div>
    </div>`;
    $('#mlselect-'+id).onclick=async()=>{
      const ids=[...host.querySelectorAll('input[data-library-id]:checked')].map(x=>x.dataset.libraryId).filter(Boolean);
      await jpost('/api/media-libraries/'+id+'/libraries/selection',{libraryIds:ids});
      host.innerHTML=`<span class=ok>${ids.length} librar${ids.length===1?'y':'ies'} selected.</span>`;
    };
  }catch(e){alert(friendlyError(e))}
}

async function playUnifiedItem(item){
  try{
    if(item?.kind==='series'){
      await unifiedSeriesDetails(item);
      return true;
    }
    const parts=String(item.id||'').split(':');
    if(parts.length<3)return false;
    const source=parts[0],providerId=parts[1],itemId=parts.slice(2).join(':');

    nextUnifiedEpisode=null;
    if(item?.kind==='episode'&&Array.isArray(unifiedEpisodeContext)){
      const idx=unifiedEpisodeContext.findIndex(x=>String(x.id)===String(item.id));
      if(idx>=0&&idx+1<unifiedEpisodeContext.length)
        nextUnifiedEpisode={...unifiedEpisodeContext[idx+1],kind:'episode'};
    }

    const r=await api(`/api/unified/${encodeURIComponent(source)}/${encodeURIComponent(providerId)}/${encodeURIComponent(itemId)}/play`);
    await playServerMedia(r.playToken,item.name||'Media','unified:'+String(item.id||''));
    return true;
  }catch(e){alert(friendlyError(e));return true}
}

async function unifiedSeriesDetails(item){
  const parts=String(item.id||'').split(':');
  if(parts.length<3)return;
  const source=parts[0],providerId=parts[1],seriesId=parts.slice(2).join(':');
  content.innerHTML=`<div class=hero><button class=btn onclick="show('series')">← Series</button><h2>${esc(item.name||'Series')}</h2><p class=muted><span class=sourceBadge>${esc(source)}</span> Loading episodes…</p></div><div id=unifiedEpisodeList></div><div id=mediaPlayer></div>`;
  try{
    const episodes=await api(`/api/unified/${encodeURIComponent(source)}/${encodeURIComponent(providerId)}/${encodeURIComponent(seriesId)}/episodes`,{timeoutMs:65000});
    unifiedEpisodeContext=episodes.map(x=>({...x,kind:'episode'}));
    const host=$('#unifiedEpisodeList');
    if(!episodes.length){host.innerHTML='<div class=empty>No episodes found.</div>';return}
    let lastSeason=null,html='';
    for(const e of episodes){
      if(e.seasonNumber!==lastSeason){lastSeason=e.seasonNumber;html+=`<h3>Season ${e.seasonNumber||'Specials'}</h3><div class=episodeGrid>`}
      const label=e.seasonNumber>0&&e.episodeNumber>0?`S${String(e.seasonNumber).padStart(2,'0')}E${String(e.episodeNumber).padStart(2,'0')}`:'Episode';
      html+=`<button class=episodeCard onclick='playUnifiedItem(${JSON.stringify({...e,kind:"episode",id:e.id})})'>${e.poster?`<img loading=lazy decoding=async src="${escAttr(e.poster)}">`:posterPlaceholder()}<span><b>${esc(label+' · '+e.name)}</b><small>${esc(e.year||'')} ${e.rating?'· '+esc(e.rating):''}</small></span></button>`;
      const next=episodes[episodes.indexOf(e)+1];
      if(!next||next.seasonNumber!==lastSeason)html+='</div>';
    }
    host.innerHTML=html;
  }catch(e){const host=$('#unifiedEpisodeList');if(host)host.innerHTML=`<div class=error>${esc(friendlyError(e))}</div>`}
}

async function resumeContinueItem(item){
  pendingResumeSeconds=Math.max(0,Number(item?.positionSeconds)||0);
  if(item?.id?.startsWith('unified:')){
    const unifiedId=item.id.substring('unified:'.length);
    const parts=unifiedId.split(':');
    if(parts.length>=3)return playUnifiedItem({id:unifiedId,kind:'episode',name:item.title||'Media'});
  }
  if(item?.url)return playMedia(item.url,item.title,item.id);
  pendingResumeSeconds=0;
  return false;
}
