const $=s=>document.querySelector(s), content=$('#content'), title=$('#title');
let providers=[], currentProvider=null, channels=[], epg=[], fav=new Set(), hls=null, currentView='home', profiles=[], currentProfile=localStorage.getItem('myonline-profile')||'default', channelPrefs={hiddenGroups:[],hiddenChannels:[],aliases:{}};

async function api(url,opt={}){
  const r=await fetch(url,{credentials:'same-origin',...opt});
  if(r.status===401){await authGate();throw new Error('Authentication required');}
  if(!r.ok)throw new Error(await r.text());
  if(r.status===204)return null;
  const t=r.headers.get('content-type')||'';
  return t.includes('json')?r.json():r.text();
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
      try{await jpost('/api/auth/setup',{username:$('#su').value,password:p});await enterApp({authenticated:true,user:$('#su').value})}
      catch(e){$('#authmsg').textContent=e.message}
    }
  }else{
    $('#auth').innerHTML=`<div class="authCard"><h1>MyOnline TV</h1><p>Sign in to your private entertainment server.</p>
      <label>Username</label><input id=lu value=admin autocomplete=username>
      <label>Password</label><input id=lp type=password autocomplete=current-password>
      <button id=login class=btn>Sign in</button><div id=authmsg></div></div>`;
    const go=async()=>{try{const r=await jpost('/api/auth/login',{username:$('#lu').value,password:$('#lp').value});await enterApp({authenticated:true,user:r.user})}catch(e){$('#authmsg').textContent='Sign-in failed.'}};
    $('#login').onclick=go;$('#lp').onkeydown=e=>{if(e.key==='Enter')go()}
  }
}
async function enterApp(st){
  $('#auth').classList.add('hidden');$('#app').classList.remove('hidden');
  $('#userBadge').textContent=st.user||'admin';
  const s=await api('/api/status');$('#status').textContent=`${s.version} · ${s.platform}`;
  const brandVersion=$('#brandVersion');if(brandVersion)brandVersion.textContent=`Web v${s.version}`;
  providers=await api('/api/providers');fav=new Set(await api('/api/favourites'));profiles=await api('/api/profiles');if(!profiles.some(p=>p.id===currentProfile))currentProfile=profiles[0]?.id||'default';renderProfileBadge();
  if(!currentProvider&&providers.length)currentProvider=providers[0].id;
  show('home');
}
$('#logout').onclick=async()=>{await api('/api/auth/logout',{method:'POST'});await authGate()};
document.querySelectorAll('nav button[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));

async function show(v){
  currentView=v;destroyPlayer();
  title.textContent=({home:'Home',live:'Live TV',guide:'Guide',movies:'Movies',series:'Series',downloads:'Downloads',system:'System',settings:'Settings'})[v]||v;
  if(v==='home')await home();
  if(v==='live')await live();
  if(v==='guide')await guide();
  if(v==='movies')await movies();
  if(v==='series')await series();
  if(v==='downloads')await downloadView();
  if(v==='system')await systemView();
  if(v==='settings')await settings();
}

function renderProfileBadge(){const p=profiles.find(x=>x.id===currentProfile);const b=$('#userBadge');if(b&&p)b.innerHTML=`<button class=profileBadge onclick="profilePicker()">${esc(p.icon)} ${esc(p.name)} ▾</button>`}
function profilePicker(){let box=$('#profilePicker');if(box){box.remove();return}box=document.createElement('div');box.id='profilePicker';box.className='profilePicker';box.innerHTML=profiles.map(p=>`<button onclick="selectProfile('${escAttr(p.id)}')">${esc(p.icon)} ${esc(p.name)}${p.isKids?' · Kids':''}</button>`).join('')+`<button onclick="show('settings')">⚙ Manage profiles</button>`;document.body.appendChild(box)}
function selectProfile(id){currentProfile=id;localStorage.setItem('myonline-profile',id);$('#profilePicker')?.remove();renderProfileBadge();show('home')}

async function home(){
  const cont=await api('/api/continue');
  content.innerHTML=`<div class=hero><div><span class=kicker>MYONLINE TV WEB</span><h2>Everything. One interface.</h2>
  <p class=muted>Self-hosted on Proxmox. IPTV, EPG, movies, series, secure provider storage, favourites, downloads and browser playback.</p></div></div>
  <div class=stats>
    <div class=stat><b>${providers.length}</b><span>Providers</span></div>
    <div class=stat><b>${fav.size}</b><span>Favourites</span></div>
    <div class=stat><b>${cont.length}</b><span>Continue watching</span></div>
  </div>
  ${cont.length?`<h2>Continue watching</h2><div class=continueRow>${cont.slice(0,12).map(x=>`<button class=continueCard onclick='playMedia(${JSON.stringify(x.url)},${JSON.stringify(x.title)},${JSON.stringify(x.id)})'><span>▶</span><b>${esc(x.title)}</b><small>Resume around ${Math.floor((x.positionSeconds||0)/60)} min</small></button>`).join('')}</div><div id=mediaPlayer></div>`:''}
  <h2>Quick access</h2><div class=grid>
    <button class="card actionCard" onclick="show('live')"><h3>Live TV</h3><p>Channels and groups</p></button>
    <button class="card actionCard" onclick="show('guide')"><h3>TV Guide</h3><p>Timeline EPG</p></button>
    <button class="card actionCard" onclick="show('movies')"><h3>Movies</h3><p>Xtream VOD library</p></button>
    <button class="card actionCard" onclick="show('series')"><h3>Series</h3><p>Seasons and episodes</p></button>
  </div>
  <h2>Official streaming services</h2>
  <div class=serviceRow>
    <a class=service href="https://www.netflix.com" target=_blank>Netflix</a>
    <a class=service href="https://www.disneyplus.com" target=_blank>Disney+</a>
    <a class=service href="https://www.max.com" target=_blank>Max</a>
    <a class=service href="https://www.primevideo.com" target=_blank>Prime Video</a>
    <a class=service href="https://www.svtplay.se" target=_blank>SVT Play</a>
  </div>`;
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
  content.innerHTML=`<div class=toolbar>${providerSelect()}<input id=q placeholder="Search channels"><select id=group><option value="">All groups</option><option value="__favorites">★ Favourites</option><option value="__recent">↻ Recently watched</option>${[...new Set(channels.map(x=>x.group).filter(Boolean).filter(g=>!channelPrefs.hiddenGroups.includes(g)))].sort().map(g=>`<option>${esc(g)}</option>`).join('')}</select><button class=btn id=hideGroupBtn>Hide group</button></div>
  <div class="liveHelp">Remote/keyboard: ↑ ↓ select · Enter play · ← → previous/next channel · F fullscreen · Esc exit</div>
  <div id=playerWrap></div><div id=chan class=channelGrid tabindex="0"></div>`;
  $('#provider').onchange=async e=>{currentProvider=e.target.value;await live()};
  $('#q').oninput=renderFilter;$('#group').onchange=renderFilter;$('#hideGroupBtn').onclick=()=>hideGroup($('#group').value);
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
      <div class=logoBox>${c.logo?`<img loading=lazy src="${escAttr(c.logo)}" onerror="this.style.display='none'">`:''}</div>
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
    return `<button class="prog ${isNow?'currentProgram':''}" style="left:${left}%;width:${width}%" onclick='playLive(${JSON.stringify(c.key)},${JSON.stringify(channelName(c))})' title="Play ${escAttr(pr.title)} live"><b>${esc(pr.title)}</b><small>${new Date(pr.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></button>`;
  }).join('');
  return `<div class=timelineRow><button class=timelineChannel onclick='playLive(${JSON.stringify(c.key)},${JSON.stringify(channelName(c))})'>${c.logo?`<img src="${escAttr(c.logo)}">`:''}<span>${esc(channelName(c))}</span><small>▶ Live</small></button><div class=programLane>${line}${blocks}</div></div>`;
}
function showProgramDetails(channelKey,channelNameText,payload){
  playLive(channelKey,channelNameText);
}

async function movies(){
  if(!await ensureProvider('xtream')){content.innerHTML='<div class=card>Movies require an Xtream-compatible provider.</div>';return}
  content.innerHTML='<div class=card>Loading movies…</div>';
  try{
    const cats=await api(`/api/vod/${currentProvider}/categories`);
    content.innerHTML=`<div class=toolbar>${providerSelect('xtream')}<select id=category><option value="">All categories</option>${cats.map(c=>`<option value="${escAttr(c.id)}">${esc(c.name)}</option>`).join('')}</select><input id=mediaq placeholder="Search movies"></div><div id=mediaPlayer></div><div id=mediaGrid class=posterGrid></div>`;
    $('#provider').onchange=async e=>{currentProvider=e.target.value;await movies()};
    $('#category').onchange=loadMovies;$('#mediaq').oninput=filterMedia;
    await loadMovies();
  }catch(e){content.innerHTML=errorCard(e)}
}
let mediaItems=[];
async function loadMovies(){
  const grid=$('#mediaGrid');if(grid)grid.innerHTML='<div class=card>Loading movies…</div>';
  try{
    mediaItems=await api(`/api/vod/${currentProvider}/items?categoryId=${encodeURIComponent($('#category')?.value||'')}`);
    filterMedia();
  }catch(e){if(grid)grid.innerHTML=errorCard(e)}
}
function filterMedia(){
  const q=($('#mediaq')?.value||'').toLowerCase();
  const rows=mediaItems.filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,1000);
  $('#mediaGrid').innerHTML=rows.map(m=>`<article class=posterCard>${m.poster?`<img loading=lazy src="${escAttr(m.poster)}">`:'<div class=posterPlaceholder>▶</div>'}<div class=posterBody><b>${esc(m.name)}</b><small>${esc(m.year||'')} ${m.rating?'· '+esc(m.rating):''}</small><div class=row><button class=btn onclick='playMovie(${JSON.stringify(m.id)},${JSON.stringify(m.name)})'>Play</button><button class=btn onclick='movieDetails(${JSON.stringify(m.id)})'>Info</button><button class=btn onclick='downloadMovie(${JSON.stringify(m.id)},${JSON.stringify(m.name)})'>↓</button></div></div></article>`).join('');
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
    content.innerHTML=`<div class=toolbar>${providerSelect('xtream')}<select id=category><option value="">All categories</option>${cats.map(c=>`<option value="${escAttr(c.id)}">${esc(c.name)}</option>`).join('')}</select><input id=seriesq placeholder="Search series"></div><div id=mediaPlayer></div><div id=seriesContent></div>`;
    $('#provider').onchange=async e=>{currentProvider=e.target.value;await series()};
    $('#category').onchange=loadSeries;$('#seriesq').oninput=filterSeries;
    await loadSeries();
  }catch(e){content.innerHTML=errorCard(e)}
}
let seriesItems=[];
async function loadSeries(){
  const box=$('#seriesContent');if(box)box.innerHTML='<div class=card>Loading series…</div>';
  try{
    seriesItems=await api(`/api/series/${currentProvider}/items?categoryId=${encodeURIComponent($('#category')?.value||'')}`);
    filterSeries();
  }catch(e){if(box)box.innerHTML=errorCard(e)}
}
function filterSeries(){
  const q=($('#seriesq')?.value||'').toLowerCase(),rows=seriesItems.filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,1000);
  $('#seriesContent').innerHTML=`<div class=posterGrid>${rows.map(s=>`<button class="posterCard seriesButton" onclick="openSeries('${escAttr(s.id)}')">${s.poster?`<img loading=lazy src="${escAttr(s.poster)}">`:'<div class=posterPlaceholder>▦</div>'}<div class=posterBody><b>${esc(s.name)}</b><small>${esc(s.year||'')} ${s.rating?'· ★ '+esc(s.rating):''}</small><small>${esc(s.genre||'')}</small></div></button>`).join('')}</div>`;
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
  try{const t=await movieToken(id);await playServerMedia(t.playToken,name,'movie:'+id)}catch(e){alert(e.message)}
}
async function downloadMovie(id,name){
  try{const t=await movieToken(id);await startMediaDownload(t.downloadToken,name)}catch(e){alert(e.message)}
}
async function episodeToken(id,ext){
  return await api(`/api/series/${currentProvider}/episode/${encodeURIComponent(id)}/token?ext=${encodeURIComponent(ext||'mp4')}`,{method:'POST'});
}
async function playEpisode(id,ext,name,mediaId){
  try{const t=await episodeToken(id,ext);await playServerMedia(t.playToken,name,mediaId)}catch(e){alert(e.message)}
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
      <div class=row><button class=btn id=createBackup>Create backup</button><button class=btn id=refreshSystem>Refresh</button></div></div>
      <div class=stats>
        <div class=stat><b>${sys.providers}</b><span>Providers</span></div>
        <div class=stat><b>${sys.downloads}</b><span>Downloaded files</span></div>
        <div class=stat><b>${sys.backups}</b><span>Backups</span></div><div class=stat><b>${sys.activeLiveStreams}</b><span>Live streams</span></div><div class=stat><b>${sys.profiles}</b><span>Profiles</span></div><div class=stat><b>${(sys.processWorkingSetBytes/1024/1024).toFixed(0)} MB</b><span>App memory</span></div>
      </div>
      <div class=grid>
        <div class=card><h3>Runtime</h3><p>${esc(sys.framework)}</p><p class=muted>${esc(sys.os)}</p><p>FFmpeg: <b>${sys.ffmpeg?'OK':'Missing'}</b></p></div>
        <div class=card><h3>Disk</h3><p><b>${gb(sys.disk.usedBytes)} GB</b> used of ${gb(sys.disk.totalBytes)} GB</p><p>${gb(sys.disk.freeBytes)} GB free</p></div>
      </div>
      <h2>Provider health</h2>
      <div class=downloadList>${health.length?health.map(h=>`<article class=downloadCard><div class=row><span class="healthDot ${h.ok?'ok':'fail'}"></span><h3>${esc(h.name)}</h3></div><p>${esc(h.type)} · ${h.latencyMs} ms</p><small>${esc(h.message)}</small></article>`).join(''):'<div class=card>No providers configured.</div>'}</div>
      <h2>Backups</h2>
      <div class=downloadList>${backs.length?backs.map(b=>`<article class=downloadCard><b>${esc(b.fileName)}</b><small>${(b.sizeBytes/1024).toFixed(1)} KiB · ${new Date(b.created).toLocaleString()}</small><button class=btn onclick='restoreBackup(${JSON.stringify(b.fileName)})'>Restore data</button></article>`).join(''):'<div class=card>No backups yet.</div>'}</div>`;
    $('#createBackup').onclick=async()=>{try{const b=await api('/api/system/backup',{method:'POST'});alert('Backup created: '+b.fileName);systemView()}catch(e){alert(e.message)}};
    $('#refreshSystem').onclick=systemView;
  }catch(e){content.innerHTML=errorCard(e)}
}

async function restoreBackup(fileName){if(!confirm('Restore data from '+fileName+'? Restart is recommended afterwards.'))return;try{await api('/api/system/restore/'+encodeURIComponent(fileName),{method:'POST'});alert('Restore complete. Restart MyOnline TV when convenient.');systemView()}catch(e){alert(friendlyError(e))}}

async function settings(){
  providers=await api('/api/providers');profiles=await api('/api/profiles');
  content.innerHTML=`<div class=hero><h2>IPTV providers</h2><p class=muted>Connection details are encrypted at rest with an AES-256-GCM key stored only on this server.</p>
  <div class=formGrid><div class=field><label>Name</label><input id=pname></div><div class=field><label>Type</label><select id=ptype><option value=m3u>M3U + XMLTV</option><option value=xtream>Xtream-compatible</option></select></div>
  <div class=field><label>M3U playlist URL</label><input id=purl placeholder="https://.../playlist.m3u"></div><div class=field><label>XMLTV EPG URL</label><input id=pepg placeholder="https://.../epg.xml"></div>
  <div class=field><label>Xtream base URL</label><input id=pbase placeholder="https://provider.example:443"></div><div class=field><label>Username</label><input id=puser></div>
  <div class=field><label>Password</label><input id=ppass type=password></div></div><button class=btn id=savep>Add provider</button></div>
  <div class=grid>${providers.map(p=>`<div class=card><h3>${esc(p.name)}</h3><div class=muted>${esc(p.type)} · ${esc(p.host||'')}</div><p>${p.hasEpg?'EPG configured':'No explicit EPG'} · ${p.hasCredentials?'Credentials stored':'No credentials'}</p><div class=row><button class=btn onclick="testProvider('${p.id}',this)">Test</button><button class=btn onclick="removeProvider('${p.id}')">Remove</button></div><div id="ptest-${p.id}" class=muted></div></div>`).join('')}</div>
  <div class=card style="margin-top:18px"><h3>Channels & groups</h3><p class=muted>Hide groups/channels or give a channel a local display name. Settings are stored on the server.</p><div class=row><select id=manageProvider>${providers.map(p=>`<option value="${p.id}" ${p.id===currentProvider?'selected':''}>${esc(p.name)}</option>`).join('')}</select><button class=btn id=manageChannels>Manage channels</button></div><div id=channelManager></div></div>
  <div class=card style="margin-top:18px"><h3>Viewer profiles</h3><p class=muted>Create simple profiles and switch from the badge in the top-right corner.</p><div class=formGrid><div class=field><label>Name</label><input id=profileName placeholder="Profile name"></div><div class=field><label>Icon</label><select id=profileIcon><option>👤</option><option>🧑</option><option>👩</option><option>👨</option><option>🧒</option><option>🎬</option></select></div></div><label><input id=profileKids type=checkbox> Kids profile</label><button class=btn id=addProfile>Add profile</button><div class=manageList>${profiles.map(p=>`<div class=manageChannel><span>${esc(p.icon)} ${esc(p.name)} ${p.isKids?'· Kids':''}</span><span></span><button class=btn onclick="deleteProfile('${escAttr(p.id)}')" ${profiles.length<=1?'disabled':''}>Remove</button></div>`).join('')}</div></div>
  <div class=card style="margin-top:18px"><h3>Security</h3><p>Provider connection fields are never returned to the browser after saving. The password is not stored in plaintext.</p><p class=muted>For Internet exposure, use HTTPS and preferably Tailscale/VPN or an authenticated reverse proxy.</p></div>`;
  $('#manageChannels').onclick=manageChannels;$('#addProfile').onclick=async()=>{try{await jpost('/api/profiles',{id:null,name:$('#profileName').value,isKids:$('#profileKids').checked,icon:$('#profileIcon').value});profiles=await api('/api/profiles');settings()}catch(e){alert(friendlyError(e))}};
  $('#savep').onclick=async()=>{
    const p={id:'',name:$('#pname').value,type:$('#ptype').value,playlistUrl:$('#purl').value,epgUrl:$('#pepg').value,baseUrl:$('#pbase').value,username:$('#puser').value,password:$('#ppass').value,keepExistingConnection:false};
    try{await jpost('/api/providers',p);providers=await api('/api/providers');settings()}catch(e){alert(e.message)}
  };
}


async function deleteProfile(id){if(!confirm('Remove this viewer profile?'))return;try{await api('/api/profiles/'+encodeURIComponent(id),{method:'DELETE'});profiles=await api('/api/profiles');if(currentProfile===id){currentProfile=profiles[0].id;localStorage.setItem('myonline-profile',currentProfile)}renderProfileBadge();settings()}catch(e){alert(friendlyError(e))}}

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

async function removeProvider(id){if(!confirm('Remove this provider?'))return;await api('/api/providers/'+id,{method:'DELETE'});providers=await api('/api/providers');if(currentProvider===id)currentProvider=null;settings()}

function noProvider(){return '<div class=card>No IPTV provider configured. Open Settings and add one.</div>'}
function errorCard(e){return `<div class="card danger"><b>Error</b><p>${esc(friendlyError(e))}</p></div>`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escAttr(s){return esc(s)}
boot().catch(e=>{$('#auth').classList.remove('hidden');$('#auth').innerHTML=`<div class=authCard><h2>Startup error</h2><pre>${esc(e.message)}</pre></div>`});
