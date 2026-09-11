const $=s=>document.querySelector(s), content=$('#content'), title=$('#title');
let providers=[], currentProvider=null, channels=[], epg=[], fav=new Set(), hls=null, currentView='home', profiles=[], currentProfile=localStorage.getItem('myonline-profile')||'default', channelPrefs={hiddenGroups:[],hiddenChannels:[],aliases:{}}, authState={user:'',role:''}, accessState={allowedProfileIds:[],defaultProfileId:'default',policies:{}}, mediaLibraries=[];

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

function updateResponsiveMode(){
  const w=window.innerWidth;
  const coarse=window.matchMedia?.('(pointer:coarse)')?.matches===true;
  const root=document.documentElement;
  root.classList.toggle('isMobile',w<720);
  root.classList.toggle('isTablet',w>=720&&w<1180);
  root.classList.toggle('isTV',w>=1400&&coarse);
  root.classList.toggle('isDesktop',w>=1180&&!coarse);
}

function renderMobileNavigation(){
  const host=$('#mobileBottomNav');
  if(!host)return;
  const primary=[
    ['home','⌂','Home'],
    ['live','▣','Live'],
    ['guide','▤','Guide'],
    ['movies','▶','Movies']
  ];
  host.innerHTML=primary.map(([view,icon,label])=>`<button data-mobile-view="${view}" class="${currentView===view?'active':''}"><span>${icon}</span><small>${label}</small></button>`).join('')+
    `<button id=mobileMoreButton class="${['series','plex','jellyfin','downloads','recordings','search','system','admin'].includes(currentView)?'active':''}"><span>•••</span><small>More</small></button>`;
  host.querySelectorAll('[data-mobile-view]').forEach(b=>b.onclick=()=>show(b.dataset.mobileView));
  $('#mobileMoreButton').onclick=toggleMobileMore;
}

function toggleMobileMore(){
  const sheet=$('#mobileMoreSheet');
  if(!sheet)return;
  const open=sheet.classList.contains('hidden');
  if(!open){sheet.classList.add('hidden');sheet.setAttribute('aria-hidden','true');document.body.classList.remove('mobileSheetOpen');return}
  const items=[
    ['series','▦','Series'],
    ['plex','◆','Plex'],
    ['jellyfin','◇','Jellyfin'],
    ['downloads','↓','Downloads'],
    ['recordings','●','DVR'],
    ['system','◉','System'],
    ['completion','✓','Completion'],
    ['admin','🛡','Admin']
  ];
  sheet.innerHTML=`<div class=mobileMoreHandle></div><div class=mobileMoreGrid>${
    items.map(([view,icon,label])=>{
      const desktop=document.querySelector(`nav button[data-view="${view}"]`);
      if(desktop?.classList.contains('hidden'))return '';
      if((view==='system'||view==='completion'||view==='admin')&&authState.role!=='Admin')return '';
      return `<button data-more-view="${view}"><span>${icon}</span><b>${label}</b></button>`;
    }).join('')
  }</div>`;
  sheet.classList.remove('hidden');
  sheet.setAttribute('aria-hidden','false');
  document.body.classList.add('mobileSheetOpen');
  sheet.querySelectorAll('[data-more-view]').forEach(b=>b.onclick=()=>{sheet.classList.add('hidden');show(b.dataset.moreView)});
}

window.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const sheet=$('#mobileMoreSheet');
  if(sheet&&!sheet.classList.contains('hidden')){
    sheet.classList.add('hidden');
    sheet.setAttribute('aria-hidden','true');
    document.body.classList.remove('mobileSheetOpen');
  }
});
window.addEventListener('resize',debounce(()=>{updateResponsiveMode();renderMobileNavigation()},120));
document.addEventListener('click',e=>{
  const sheet=$('#mobileMoreSheet');
  if(!sheet||sheet.classList.contains('hidden'))return;
  if(e.target.closest('#mobileMoreSheet')||e.target.closest('#mobileMoreButton'))return;
  sheet.classList.add('hidden');
  sheet.setAttribute('aria-hidden','true');
});
updateResponsiveMode();

async function boot(){
  const st=await fetch('/api/auth/status',{credentials:'same-origin'}).then(r=>r.json());
  if(!st.configured||!st.authenticated){await authGate(st);return}
  await enterApp(st);
}

let sourceAccess={adminIptv:true,adminPlex:true,adminJellyfin:true};
let navigationConfig={items:[]};
const navigationLabels={home:'Home',live:'Live TV',guide:'Guide',movies:'Movies',series:'Series',plex:'Plex',jellyfin:'Jellyfin',downloads:'Downloads',recordings:'DVR',notifications:'Alerts',rooms:'Rooms',library:'Library',search:'Search',sources:'My Sources',system:'System',platform:'System overview',diagnostics:'Diagnostics',appliance:'Appliance',completion:'Feature Completion',admin:'Admin'};
async function loadNavigationConfig(){try{navigationConfig=await api('/api/navigation')}catch{navigationConfig={items:[]}}applyNavigationConfig()}
function applyNavigationConfig(){
 const items=navigationConfig?.items||[],map=new Map(items.map(x=>[x.id,x]));
 document.querySelectorAll('nav button[data-view]').forEach(b=>{const x=map.get(b.dataset.view);if(x)b.classList.toggle('navConfigHidden',x.enabled===false)});
 const n=document.querySelector('aside nav')||document.querySelector('nav');
 if(n&&items.length){const o=new Map(items.map((x,i)=>[x.id,Number.isFinite(x.order)?x.order:i]));[...n.querySelectorAll('button[data-view]')].sort((a,b)=>(o.get(a.dataset.view)??999)-(o.get(b.dataset.view)??999)).forEach(b=>n.appendChild(b))}
 renderMobileNavigation();
}
async function saveNavigationManager(){
 const rows=[...document.querySelectorAll('#navigationManager [data-nav-id]')].map((r,i)=>({id:r.dataset.navId,enabled:r.querySelector('input[type=checkbox]').checked,order:i}));
 navigationConfig=await api('/api/admin/navigation',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:rows})});
 applyNavigationConfig();await adminView();
}
function moveNavigationItem(id,d){const box=$('#navigationManager'),r=box?.querySelector(`[data-nav-id="${CSS.escape(id)}"]`);if(!r)return;const n=d<0?r.previousElementSibling:r.nextElementSibling;if(!n)return;if(d<0)box.insertBefore(r,n);else box.insertBefore(n,r)}
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
  providers=await api('/api/providers');fav=new Set(await api('/api/favourites'));profiles=await api('/api/profiles');try{sourceAccess=await api('/api/source-access/me')}catch{sourceAccess={adminIptv:true,adminPlex:true,adminJellyfin:true}};try{mediaLibraries=await api('/api/media-libraries')}catch{mediaLibraries=[]}try{accessState=await api('/api/access/me')}catch{accessState={allowedProfileIds:profiles.map(p=>p.id),defaultProfileId:profiles[0]?.id||'default',policies:{}}}profiles=profiles.filter(p=>authState.role==='Admin'||(accessState.allowedProfileIds||[]).includes(p.id));if(!profiles.some(p=>p.id===currentProfile))currentProfile=accessState.defaultProfileId||profiles[0]?.id||'default';applyPermissions();renderMediaLibraryNav();renderProfileBadge();
  if(!currentProvider&&providers.length)currentProvider=providers[0].id;
  updateResponsiveMode();
  renderMobileNavigation();
  await loadNavigationConfig();
  show('home');
}
$('#logout').onclick=async()=>{await api('/api/auth/logout',{method:'POST'});await authGate()};
document.querySelectorAll('nav button[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));

function renderMediaLibraryNav(){
  const enabled=(mediaLibraries||[]).filter(x=>x.enabled!==false);
  const hasPlex=enabled.some(x=>String(x.type||'').toLowerCase()==='plex');
  const hasJellyfin=enabled.some(x=>String(x.type||'').toLowerCase()==='jellyfin');
  const plex=document.querySelector('nav button[data-view="plex"]');
  const jelly=document.querySelector('nav button[data-view="jellyfin"]');
  if(plex)plex.classList.toggle('hidden',!hasPlex);
  if(jelly)jelly.classList.toggle('hidden',!hasJellyfin);
}

async function refreshMediaLibraryNav(){
  try{mediaLibraries=await api('/api/media-libraries')}catch{mediaLibraries=[]}
  renderMediaLibraryNav();
}

async function show(v){
  if(!viewAllowed(v)){v='home'}
  currentView=v;destroyPlayer();
  renderMobileNavigation();
  const moreSheet=$('#mobileMoreSheet');if(moreSheet){moreSheet.classList.add('hidden');moreSheet.setAttribute('aria-hidden','true');document.body.classList.remove('mobileSheetOpen')}
  title.textContent=({home:'Home',live:'Live TV',guide:'Guide',movies:'Movies',series:'Series',plex:'Plex',jellyfin:'Jellyfin',downloads:'Downloads',recordings:'Recordings',platform:'Platform','profile-sync':'Profile Sync',diagnostics:'Diagnostics',appliance:'Appliance',notifications:'Notifications',rooms:'Rooms',library:'Library',search:'Search',sources:'My Sources',system:'System',completion:'Feature Completion',admin:'Admin'})[v]||v;
  if(v==='home')await home();
  if(v==='live')await live();
  if(v==='guide')await guide();
  if(v==='movies')await movies();
  if(v==='series')await series();
  if(v==='plex')await mediaLibraryView('plex');
  if(v==='jellyfin')await mediaLibraryView('jellyfin');
  if(v==='downloads')await downloadView();
  if(v==='recordings')await recordingsView();
  if(v==='platform')await platformView();
  if(v==='profile-sync')await profileSyncView();
  if(v==='diagnostics')await diagnosticsView();
  if(v==='appliance')await applianceView();
  if(v==='notifications')await notificationsView();
  if(v==='rooms')await roomsView();
  if(v==='library')await unifiedLibraryView();
  if(v==='search')await searchView();
  if(v==='sources')await sourcesView();
  if(v==='system')await systemView();
  if(v==='completion')await featureCompletionView();
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


function homePrefsKey(){return `myonline-home-prefs-v1:${currentProfile||'default'}`}
function getHomePrefs(){try{return JSON.parse(localStorage.getItem(homePrefsKey())||'{}')}catch{return {}}}
function saveHomePrefs(p){localStorage.setItem(homePrefsKey(),JSON.stringify(p||{}))}
function smartHomeGreeting(){
  const h=new Date().getHours();
  return h<11?'Good morning':h<17?'Good afternoon':'Good evening';
}
function smartHomeStatus(){
  const watched=getWatchedSet().size,hist=getMediaHistory().length;
  return `<div class=smartHomeStrip><span>${smartHomeGreeting()}</span><small>${watched} watched · ${hist} recent</small><button class=linkButton onclick="show('library')">Open Library</button></div>`;
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
  let homeHistory=getMediaHistory();
  let continueItems=cont.map(x=>({...x,poster:findLegacyPoster(x,homeHistory,unifiedMovies,unifiedSeries)}));
  if(continueItems.some(x=>!x.poster)||homeHistory.some(x=>!x.poster)){
    const repaired=await repairMissingHomePosters(continueItems,homeHistory);
    continueItems=repaired.continueItems;
    homeHistory=repaired.history;
  }

  const recentlyAdded=[...unifiedMovies,...unifiedSeries]
    .filter(x=>x.addedAt)
    .sort((a,b)=>new Date(b.addedAt)-new Date(a.addedAt))
    .slice(0,16);
  const hasPlex=(mediaLibraries||[]).some(x=>x.enabled!==false&&String(x.type).toLowerCase()==='plex');
  const hasJellyfin=(mediaLibraries||[]).some(x=>x.enabled!==false&&String(x.type).toLowerCase()==='jellyfin');
  const mediaFavs=getMediaFavs().slice(0,12);

  content.innerHTML=`${smartHomeStatus()}<div class="hero homeHero"><div><span class=kicker>MYONLINE TV</span><h2>What do you want to watch?</h2>
  <p class=muted>Live TV, IPTV, Plex and Jellyfin — one home screen.</p>
  <div class=row><input id=homeSearch placeholder="Search everything"><button class=btn id=homeSearchButton>Search</button></div></div></div>

  <div class=homeSourceGrid>
    <button class=homeSourceCard onclick="show('live')"><span>▣</span><b>Live TV</b><small>Channels</small></button>
    <button class=homeSourceCard onclick="show('guide')"><span>▤</span><b>Guide</b><small>What's on</small></button>
    <button class=homeSourceCard onclick="show('movies')"><span>▶</span><b>IPTV Movies</b><small>On demand</small></button>
    <button class=homeSourceCard onclick="show('series')"><span>▦</span><b>IPTV Series</b><small>Episodes</small></button>
    ${hasPlex?`<button class=homeSourceCard onclick="show('plex')"><span>◆</span><b>Plex</b><small>Media library</small></button>`:''}
    ${hasJellyfin?`<button class=homeSourceCard onclick="show('jellyfin')"><span>◇</span><b>Jellyfin</b><small>Media library</small></button>`:''}
  </div>

  ${continueItems.length?`<div class=sectionHead><h2>Continue watching</h2><button class=linkButton onclick="clearContinueWatching()">Clear all</button></div><div class="continueRow mediaHistoryRail">${continueItems.slice(0,16).map(x=>`<div class="continueCard historyCard"><button class=historyMain onclick='resumeContinueItem(${JSON.stringify(x)})'>${mediaPosterMarkup(x.poster,x.title)}<div class=historyCardBody><b>${esc(x.title)}</b><small>${formatMediaTime(x.positionSeconds||0)}${x.durationSeconds?' / '+formatMediaTime(x.durationSeconds):''}</small>${x.durationSeconds?`<div class=continueProgress><span style="width:${continueProgress(x)}%"></span></div>`:''}</div></button><div class=historyActions><button class=historyWatched title="Mark as watched" onclick='markContinueWatched(${JSON.stringify(x.id)})'>✓</button><button class=historyRemove title="Remove" onclick='removeContinueWatching(${JSON.stringify(x.id)})'>×</button></div></div>`).join('')}</div><div id=mediaPlayer></div>`:''}

  ${recentlyAdded.length?`<div class=sectionHead><h2>New for you</h2><button class=linkButton onclick="show('search')">Browse all</button></div><div class=posterRail>${recentlyAdded.map(x=>`<button class=posterCard onclick='playUnifiedItem(${JSON.stringify(x.kind==='series'?{...x,kind:"series"}:x)})'>${x.poster?`<img loading=lazy decoding=async src="${escAttr(x.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(x.name)}</b><small><span class=sourceBadge>${esc(x.source||'media')}</span> ${esc(x.year||'')}</small></div></button>`).join('')}</div>`:''}

  ${homeMediaRails(homeHistory)}

  ${mediaFavs.length?`<div class=sectionHead><h2>Your favourites</h2></div><div class=posterRail>${mediaFavs.map(x=>`<button class=posterCard onclick='openHomeFavourite(${JSON.stringify(x)})'>${x.poster?`<img loading=lazy decoding=async src="${escAttr(x.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(x.name)}</b><small>${esc(x.type||'')}</small></div></button>`).join('')}</div>`:''}

  ${unifiedMovies.length?`<div class=sectionHead><h2>Movies from media libraries</h2></div><div class=posterRail>${unifiedMovies.slice(0,14).map(m=>`<button class=posterCard onclick='playUnifiedItem(${JSON.stringify(m)})'>${m.poster?`<img loading=lazy decoding=async src="${escAttr(m.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(m.name)}</b><small><span class=sourceBadge>${esc(m.source)}</span> ${esc(m.year||'')}</small></div></button>`).join('')}</div>`:''}

  ${unifiedSeries.length?`<div class=sectionHead><h2>Series from media libraries</h2></div><div class=posterRail>${unifiedSeries.slice(0,14).map(s=>`<button class=posterCard onclick='playUnifiedItem(${JSON.stringify({...s,kind:"series"})})'>${s.poster?`<img loading=lazy decoding=async src="${escAttr(s.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(s.name)}</b><small><span class=sourceBadge>${esc(s.source)}</span> ${esc(s.year||'')}</small></div></button>`).join('')}</div>`:''}

  <details class=streamingServices><summary>Official streaming services</summary><div class=serviceRow>
    <a class=service href="https://www.netflix.com" target=_blank rel=noopener>Netflix</a>
    <a class=service href="https://www.disneyplus.com" target=_blank rel=noopener>Disney+</a>
    <a class=service href="https://www.max.com" target=_blank rel=noopener>Max</a>
    <a class=service href="https://www.primevideo.com" target=_blank rel=noopener>Prime Video</a>
    <a class=service href="https://www.svtplay.se" target=_blank rel=noopener>SVT Play</a>
  </div></details>`;

  $('#homeSearchButton').onclick=homeQuickSearch;
  $('#homeSearch').onkeydown=e=>{if(e.key==='Enter')homeQuickSearch()};
}

async function openHomeFavourite(item){
  if(item.type==='movie'){
    if(item.providerId)currentProvider=item.providerId;
    await show('movies');
    const q=$('#mediaq');if(q){q.value=item.name||'';filterMedia()}
  }else{
    if(item.providerId)currentProvider=item.providerId;
    await show('series');
    if(item.id)await openSeries(item.id);
  }
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
      <button class="round recordRound" title="Record Live TV" onclick='recordLiveNow(${JSON.stringify(c.key)},${JSON.stringify(channelName(c))})'>●</button>
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
    <div class="liveControls"><button class=btn onclick="stepLiveChannel(-1)">← Previous</button><button class=btn onclick="stepLiveChannel(1)">Next →</button><button class="btn recordBtn" onclick='recordLiveNow(${JSON.stringify(channelKey)},${JSON.stringify(name)})'>● Record</button><button class=btn onclick="togglePlayerFit()">▣ Fit</button><button class=btn onclick="toggleLiveFullscreen()">⛶ Fullscreen</button></div>
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
let nextIptvEpisode=null;
let iptvEpisodeContext=[];

function mediaPosterMarkup(poster,alt=''){
  if(poster){
    return `<div class=historyPoster><img loading=lazy decoding=async src="${escAttr(poster)}" alt="${escAttr(alt)}" onerror="this.closest('.historyPoster').classList.add('posterFailed');this.remove()"><span class=historyPosterFallback>▶</span></div>`;
  }
  return `<div class="historyPoster posterFailed"><span class=historyPosterFallback>▶</span></div>`;
}

function normalizeHistoryTitle(value){
  return String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
}

function posterMatchTitle(value){
  return normalizeHistoryTitle(value)
    .replace(/^sc\s*[-–—:]\s*/i,'')
    .replace(/^episode\s*[-–—:]\s*/i,'')
    .replace(/\s*\((?:19|20)\d{2}[^)]*\).*$/,'')
    .replace(/\s+s\d{1,2}\s*e\d{1,3}.*$/i,'')
    .replace(/\s*[-–—:]\s*(?:s\d{1,2}\s*)?e\d{1,3}.*$/i,'')
    .replace(/\s+/g,' ')
    .trim();
}

function bestPosterMatch(title,rows){
  const q=posterMatchTitle(title);
  if(!q)return null;
  let best=null,bestScore=0;
  for(const x of rows||[]){
    if(!x?.poster)continue;
    const n=posterMatchTitle(x.name||x.title);
    if(!n)continue;
    let score=0;
    if(n===q)score=100;
    else if(q.startsWith(n)||n.startsWith(q))score=85-Math.min(20,Math.abs(q.length-n.length));
    else if(q.includes(n)||n.includes(q))score=70-Math.min(20,Math.abs(q.length-n.length));
    if(score>bestScore){bestScore=score;best=x}
  }
  return bestScore>=50?best:null;
}

function findLegacyPoster(item,history,unifiedMovies,unifiedSeries){
  if(item?.poster)return item.poster;
  const title=item?.title||item?.name||'';
  const exact=normalizeHistoryTitle(title);
  if(!exact)return '';
  const h=(history||[]).find(x=>normalizeHistoryTitle(x.name)===exact&&x.poster);
  if(h?.poster)return h.poster;
  const u=bestPosterMatch(title,[...(unifiedMovies||[]),...(unifiedSeries||[])]);
  return u?.poster||'';
}

async function repairMissingHomePosters(continueItems,history){
  const missingContinue=(continueItems||[]).filter(x=>!x.poster);
  const missingHistory=(history||[]).filter(x=>!x.poster);
  if(!missingContinue.length&&!missingHistory.length)return {continueItems,history};

  const providerIds=new Set();
  const addProviderFromId=id=>{
    const s=String(id||'');
    if(s.startsWith('iptv-movie:')||s.startsWith('iptv-episode:')){
      const parts=s.split(':');
      if(parts.length>=3&&parts[1])providerIds.add(parts[1]);
    }
  };
  missingContinue.forEach(x=>addProviderFromId(x.id));
  missingHistory.forEach(x=>{if(x.providerId)providerIds.add(x.providerId)});

  // Legacy rows can predate provider-aware history. In that case use the current provider.
  if(!providerIds.size&&currentProvider)providerIds.add(currentProvider);

  const catalogByProvider=new Map();
  await Promise.all([...providerIds].map(async providerId=>{
    const bucket={movies:[],series:[]};
    try{bucket.movies=await api(`/api/vod/${encodeURIComponent(providerId)}/items?categoryId=`,{timeoutMs:125000})}catch{}
    try{bucket.series=await api(`/api/series/${encodeURIComponent(providerId)}/items?categoryId=`,{timeoutMs:65000})}catch{}
    catalogByProvider.set(providerId,bucket);
  }));

  let historyChanged=false;
  const repairedHistory=(history||[]).map(x=>{
    if(x.poster)return x;
    const providerId=x.providerId||currentProvider;
    const bucket=catalogByProvider.get(providerId)||{movies:[],series:[]};
    const candidates=x.type==='movie'?bucket.movies:bucket.series;
    const title=x.seriesName||x.name;
    const match=bestPosterMatch(title,candidates);
    if(!match?.poster)return x;
    historyChanged=true;
    return {...x,poster:match.poster};
  });
  if(historyChanged)saveMediaHistory(repairedHistory);

  const repairedContinue=(continueItems||[]).map(x=>{
    if(x.poster)return x;
    const title=x.title||'';
    const hist=repairedHistory.find(h=>h.poster&&(
      normalizeHistoryTitle(h.name)===normalizeHistoryTitle(title) ||
      posterMatchTitle(h.seriesName||h.name)===posterMatchTitle(title)
    ));
    if(hist?.poster)return {...x,poster:hist.poster};

    const id=String(x.id||'');
    let providerId=currentProvider,type='series';
    if(id.startsWith('iptv-movie:')){const p=id.split(':');providerId=p[1]||providerId;type='movie'}
    else if(id.startsWith('iptv-episode:')){const p=id.split(':');providerId=p[1]||providerId;type='series'}
    const bucket=catalogByProvider.get(providerId)||{movies:[],series:[]};
    const match=bestPosterMatch(title,type==='movie'?bucket.movies:bucket.series);
    return match?.poster?{...x,poster:match.poster}:x;
  });

  // Persist recovered artwork without touching watch position or Updated timestamp.
  await Promise.all(repairedContinue.map(async x=>{
    const before=(continueItems||[]).find(y=>String(y.id)===String(x.id));
    if(!before?.poster&&x.poster){
      try{
        await api('/api/continue/'+encodeURIComponent(x.id)+'/poster',{
          method:'PUT',
          headers:{'content-type':'application/json'},
          body:JSON.stringify({poster:x.poster})
        });
      }catch{}
    }
  }));

  return {continueItems:repairedContinue,history:repairedHistory};
}

function continueProgress(item){
  const pos=Math.max(0,Number(item?.positionSeconds)||0);
  const dur=Math.max(0,Number(item?.durationSeconds)||0);
  return dur>0?Math.max(0,Math.min(100,pos/dur*100)):0;
}

function formatMediaTime(seconds){
  const s=Math.max(0,Math.floor(Number(seconds)||0));
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  if(h>0)return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function installMediaDurationDisplay(video,totalSeconds){
  const totalEl=$('#mediaTotalTime'),currentEl=$('#mediaCurrentTime');
  let total=Number(totalSeconds)||0;

  const refresh=()=>{
    if(currentEl)currentEl.textContent=formatMediaTime(video.currentTime||0);
    // Prefer ffprobe duration. Fall back to browser duration when it becomes finite.
    if(!(total>0) && Number.isFinite(video.duration) && video.duration>0) total=video.duration;
    if(totalEl) totalEl.textContent=total>0?formatMediaTime(total):'--:--';
  };

  video.addEventListener('timeupdate',refresh);
  video.addEventListener('loadedmetadata',refresh);
  video.addEventListener('durationchange',refresh);
  refresh();
}

async function playServerMedia(token,name,mediaId=null,forceTranscode=false,poster=''){
  if(!forceTranscode)mediaFallbackTried=false;
  destroyPlayer();
  const wrap=$('#playerWrap')||$('#mediaPlayer');
  if(!wrap)return;
  wrap.innerHTML=`<div class=playerCard><video id=video controls autoplay playsinline></video><div class=mediaTimeBar><span id=mediaCurrentTime>00:00</span><span>/</span><span id=mediaTotalTime>--:--</span></div><div id=mediaPlaybackStatus class=livePlaybackStatus>Preparing video…</div><div class=nowPlaying>${esc(name)}</div></div>`;
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
    const mediaDurationSeconds=Number(state.durationSeconds||info.durationSeconds)||0;
    installMediaDurationDisplay(video,mediaDurationSeconds);

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
        const dur=mediaDurationSeconds>0?mediaDurationSeconds:(Number.isFinite(video.duration)?video.duration:0);
        if(sec<5)return;
        if(dur>0&&sec/dur>=.92){
          api('/api/continue/'+encodeURIComponent(String(mediaId)),{method:'DELETE'}).catch(()=>{});
          return;
        }
        if(sec===last)return;
        last=sec;
        jpost('/api/continue',{
          id:String(mediaId),title:name,url:'',positionSeconds:sec,
          updated:new Date().toISOString(),poster:poster||'',durationSeconds:dur>0?dur:null
        }).catch(()=>{});
      };
      video.addEventListener('timeupdate',()=>{if(Math.floor(video.currentTime)%15===0)save()});
      video.addEventListener('pause',save);
      video.addEventListener('ended',()=>{
        api('/api/continue/'+encodeURIComponent(String(mediaId)),{method:'DELETE'}).catch(()=>{});
      });
    };

    video.addEventListener('ended',()=>{
      if(mediaId)markMediaWatched(mediaId,true);
      const unified=nextUnifiedEpisode;
      const iptv=nextIptvEpisode;
      nextUnifiedEpisode=null;
      nextIptvEpisode=null;
      const card=video.closest('.playerCard');
      if(!card||(!unified&&!iptv))return;
      const bar=document.createElement('div');
      bar.className='nextEpisodeBar';
      const title=unified?.name||iptv?.title||'Next episode';
      bar.innerHTML=`<span>Up next: <b>${esc(title)}</b></span><button class=btn id=playNextMedia>Play next episode</button>`;
      card.appendChild(bar);
      $('#playNextMedia').onclick=()=>{
        if(unified)return playUnifiedItem(unified);
        if(iptv)return playEpisode(iptv.id,iptv.extension,iptv.title,iptv.mediaId,iptv.poster,iptv.seriesId,iptv.seriesName,iptv.season,iptv.episode);
      };
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
          await playServerMedia(token,name,mediaId,true,poster);
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
  wrap.innerHTML=`<div class=playerCard><video id=video controls autoplay playsinline></video><div class=mediaTimeBar><span id=mediaCurrentTime>00:00</span><span>/</span><span id=mediaTotalTime>--:--</span></div><div class=nowPlaying>${esc(name)}</div></div>`;
  const video=$('#video');
  installMediaDurationDisplay(video,0);
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
    return `<button class="prog ${isNow?'currentProgram':''}" style="left:${left}%;width:${width}%" onclick='showGuideProgramActions(${JSON.stringify(c.key)},${JSON.stringify(channelName(c))},decodeURIComponent("${payload}"))' data-epg-action="play-record" title="Play or record ${escAttr(pr.title)}"><b>${esc(pr.title)}</b><small>${new Date(pr.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></button>`;
  }).join('');
  return `<div class=timelineRow><button class=timelineChannel onclick='playLive(${JSON.stringify(c.key)},${JSON.stringify(channelName(c))})'>${c.logo?`<img src="${escAttr(c.logo)}">`:''}<span>${esc(channelName(c))}</span><small>▶ Live</small></button><div class=programLane>${line}${blocks}</div></div>`;
}
function showProgramDetails(channelKey,channelNameText,payload){
  playLive(channelKey,channelNameText);
}

let mediaLibraryTabs={plex:'movies',jellyfin:'movies'};

async function mediaLibraryView(type){
  const source=String(type||'').toLowerCase();
  const label=source==='plex'?'Plex':'Jellyfin';
  const configured=(mediaLibraries||[]).filter(x=>x.enabled!==false&&String(x.type||'').toLowerCase()===source);
  if(!configured.length){
    content.innerHTML=`<div class=card>No enabled ${label} connection is configured. Add one in Admin → Media libraries.</div>`;
    return;
  }

  const tab=mediaLibraryTabs[source]||'movies';
  content.innerHTML=`<div class=hero><h2>${label}</h2><p class=muted>${configured.length} connected ${label} server${configured.length===1?'':'s'} · Movies and Series are kept separate from IPTV.</p>
    <div class=mediaSourceTabs>
      <button class="btn ${tab==='movies'?'activeBtn':''}" id=sourceMovies>Movies</button>
      <button class="btn ${tab==='series'?'activeBtn':''}" id=sourceSeries>Series</button>
      <button class=btn id=sourceRefresh>Refresh</button>
    </div>
  </div><div id=mediaPlayer></div><div id=sourceLibraryContent><div class=card>Loading ${label} ${tab}…</div></div>`;

  $('#sourceMovies').onclick=()=>{mediaLibraryTabs[source]='movies';mediaLibraryView(source)};
  $('#sourceSeries').onclick=()=>{mediaLibraryTabs[source]='series';mediaLibraryView(source)};
  $('#sourceRefresh').onclick=()=>mediaLibraryView(source);

  try{
    const endpoint=tab==='movies'?'/api/unified/movies':'/api/unified/series';
    const rows=(await api(endpoint,{timeoutMs:65000}))
      .filter(x=>String(x.source||'').toLowerCase()===source);

    const host=$('#sourceLibraryContent');
    if(!rows.length){
      host.innerHTML=`<div class=card>No ${tab} were returned from the configured ${label} libraries.</div>`;
      return;
    }

    host.innerHTML=`<div class=sourceLibrarySummary><span>${rows.length} ${tab}</span><input id=sourceFilter placeholder="Search ${label} ${tab}"></div><div id=sourcePosterGrid class=posterGrid></div>`;
    const render=()=>{
      const q=($('#sourceFilter')?.value||'').trim().toLowerCase();
      const filtered=rows.filter(x=>!q||String(x.name||'').toLowerCase().includes(q));
      $('#sourcePosterGrid').innerHTML=filtered.map(item=>`<button class=posterCard onclick='playUnifiedItem(${JSON.stringify(tab==='series'?{...item,kind:"series"}:item)})'>${item.poster?`<img loading=lazy decoding=async src="${escAttr(item.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(item.name)}</b><small>${esc(item.year||'')} ${item.rating?'· ★ '+esc(item.rating):''}</small>${configured.length>1?`<small class=sourceBadge>${esc(configured.find(x=>x.id===item.sourceProviderId)?.name||label)}</small>`:''}</div></button>`).join('');
    };
    $('#sourceFilter').oninput=debounce(render);
    render();
  }catch(e){
    const host=$('#sourceLibraryContent');
    if(host)host.innerHTML=errorCard(new Error(`${label} library could not be loaded. ${friendlyError(e)}`));
  }
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
function watchedKey(){return `myonline-watched-v1:${currentProfile||'default'}`}
function getWatchedSet(){try{return new Set(JSON.parse(localStorage.getItem(watchedKey())||'[]'))}catch{return new Set()}}
function isMediaWatched(id){return getWatchedSet().has(String(id))}
function markMediaWatched(id,watched=true){
  const set=getWatchedSet(),key=String(id||'');
  if(!key)return;
  if(watched)set.add(key);else set.delete(key);
  localStorage.setItem(watchedKey(),JSON.stringify([...set].slice(-5000)));
}
function toggleEpisodeWatched(id,seriesId){
  markMediaWatched(id,!isMediaWatched(id));
  if(seriesId)openSeries(seriesId);
}
async function playNextIptvUnwatched(){
  const next=iptvEpisodeContext.find(x=>!isMediaWatched(x.mediaId));
  if(!next){alert('All episodes in this series are marked as watched.');return}
  await playEpisode(next.id,next.extension,next.title,next.mediaId,next.poster,next.seriesId,next.seriesName,next.season,next.episode);
}

async function openSeries(id){
  $('#seriesContent').innerHTML='<div class=card>Loading episodes…</div>';
  try{
    const s=await api(`/api/series/${currentProvider}/${encodeURIComponent(id)}`);
    const listPoster=seriesItems.find(x=>String(x.id)===String(id))?.poster||'';
    const seriesPoster=s.cover||listPoster||'';
    const episodes=(s.episodes||[]).slice().sort((a,b)=>
      Number(a.season||0)-Number(b.season||0) || Number(a.episode||0)-Number(b.episode||0));
    iptvEpisodeContext=episodes.map(e=>({
      ...e,
      extension:e.extension||'mp4',
      title:e.title||'Episode',
      poster:e.poster||seriesPoster||'',
      seriesId:s.id||id,
      seriesName:s.name||'',
      mediaId:`iptv-episode:${currentProvider}:${e.id}:${e.extension||'mp4'}`
    }));
    const watched=getWatchedSet();
    const by={};iptvEpisodeContext.forEach(e=>(by[e.season]??=[]).push(e));
    const nextUnwatched=iptvEpisodeContext.find(e=>!watched.has(e.mediaId));

    $('#seriesContent').innerHTML=`<div class=seriesHero>${seriesPoster?`<img src="${escAttr(seriesPoster)}">`:''}<div><button class=btn onclick=filterSeries()>← Back</button><h2>${esc(s.name)}</h2><p>${esc(s.plot||'')}</p><div class=row>${nextUnwatched?`<button class="btn primaryBtn" onclick="playNextIptvUnwatched()">▶ Play next unwatched</button><small class=muted>${esc(`S${nextUnwatched.season}E${nextUnwatched.episode} · ${nextUnwatched.title}`)}</small>`:'<span class=watchedBadge>✓ All episodes watched</span>'}</div></div></div>
    ${Object.keys(by).sort((a,b)=>Number(a)-Number(b)).map(season=>`<section><h3>Season ${esc(season)}</h3><div class=episodeList>${by[season].map(e=>`<div class="episode ${watched.has(e.mediaId)?'episodeWatched':''}"><span><b>${watched.has(e.mediaId)?'✓ ':''}E${esc(e.episode)}</b> ${esc(e.title||'Episode')}</span><div class=row><button class=btn onclick='playEpisode(${JSON.stringify(e.id)},${JSON.stringify(e.extension)},${JSON.stringify(e.title)},${JSON.stringify(e.mediaId)},${JSON.stringify(e.poster)},${JSON.stringify(e.seriesId)},${JSON.stringify(e.seriesName)},${JSON.stringify(e.season)},${JSON.stringify(e.episode)})'>${watched.has(e.mediaId)?'Replay':'Play'}</button><button class=btn title="Toggle watched" onclick='toggleEpisodeWatched(${JSON.stringify(e.mediaId)},${JSON.stringify(e.seriesId)})'>${watched.has(e.mediaId)?'↶ Unwatch':'✓ Watched'}</button><button class=btn onclick='downloadEpisode(${JSON.stringify(e.id)},${JSON.stringify(e.extension)},${JSON.stringify((s.name||'Series')+' - S'+season+'E'+e.episode)})'>↓</button></div></div>`).join('')}</div></section>`).join('')}`;
  }catch(e){$('#seriesContent').innerHTML=errorCard(e)}
}

async function movieToken(id){
  return await api(`/api/vod/${currentProvider}/${encodeURIComponent(id)}/token`,{method:'POST'});
}
async function playMovie(id,name){
  try{
    const item=mediaItems.find(x=>String(x.id)===String(id))||{id,name};
    rememberMediaHistory('movie',{...item,providerId:currentProvider});
    const t=await movieToken(id);
    await playServerMedia(t.playToken,name,`iptv-movie:${currentProvider}:${id}`,false,item.poster||'');
  }catch(e){alert(e.message)}
}
async function downloadMovie(id,name){
  try{const t=await movieToken(id);await startMediaDownload(t.downloadToken,name)}catch(e){alert(e.message)}
}
async function episodeToken(id,ext){
  return await api(`/api/series/${currentProvider}/episode/${encodeURIComponent(id)}/token?ext=${encodeURIComponent(ext||'mp4')}`,{method:'POST'});
}
async function playEpisode(id,ext,name,mediaId,poster='',seriesId=null,seriesName=null,season=null,episode=null){
  try{
    const stableId=mediaId&&mediaId.startsWith('iptv-episode:')?mediaId:`iptv-episode:${currentProvider}:${id}:${ext||'mp4'}`;
    rememberMediaHistory('episode',{id,name,extension:ext,providerId:currentProvider,poster,seriesId,seriesName,season,episode});
    const idx=iptvEpisodeContext.findIndex(x=>String(x.mediaId)===String(stableId));
    nextIptvEpisode=idx>=0&&idx+1<iptvEpisodeContext.length?iptvEpisodeContext[idx+1]:null;
    const t=await episodeToken(id,ext);
    await playServerMedia(t.playToken,name,stableId,false,poster||'');
  }catch(e){alert(e.message)}
}
async function downloadEpisode(id,ext,name){
  try{const t=await episodeToken(id,ext);await startMediaDownload(t.downloadToken,name)}catch(e){alert(e.message)}
}

async function startMediaDownload(token,name){
  const targets=await storageTargets();
  const box=document.createElement('div');
  box.id='downloadDestinationSheet';box.className='programActionSheet';
  box.innerHTML=`<div class=programActionCard><button class=dialogClose onclick="$('#downloadDestinationSheet')?.remove()">×</button><span class=kicker>DOWNLOAD</span><h3>${esc(name)}</h3><p class=muted>Choose where to save this media.</p><div class=destinationList>
    <button class="destinationCard deviceDestination" id=downloadDevice><b>↓ This device</b><small>Browser download to your phone, tablet or computer</small></button>
    ${targets.map(t=>`<button class=destinationCard data-target="${escAttr(t.id)}"><b>${t.type==='rclone'?'☁':'▣'} ${esc(t.name)}</b><small>${esc(t.type==='rclone'?'Cloud / rclone':'NAS / mounted path')}</small></button>`).join('')}
  </div>${!targets.length?'<p class=muted>No server-side Storage targets configured. Device download is still available.</p>':''}</div>`;
  document.body.appendChild(box);

  $('#downloadDevice').onclick=()=>{
    box.remove();
    window.location.href=`/api/downloads/device/${encodeURIComponent(token)}?title=${encodeURIComponent(name)}`;
  };
  box.querySelectorAll('[data-target]').forEach(b=>b.onclick=async()=>{
    const targetId=b.dataset.target;box.remove();
    try{await jpost('/api/downloads/media',{token,title:name,storageTargetId:targetId});show('downloads')}catch(e){alert(friendlyError(e))}
  });
}

async function downloadView(){
  const [jobs,targets]=await Promise.all([api('/api/downloads'),storageTargets()]);
  content.innerHTML=`<div class=hero><span class=kicker>DOWNLOADS 2.0</span><h2>Downloads</h2><p class=muted>Downloads are saved to your device or to a configured Storage target. The LXC is only used for temporary transfer files when a cloud/rclone target requires it.</p><div class=row><button class=btn id=refreshDl>Refresh</button>${authState.role==='Admin'?'<button class=btn onclick="show(\'admin\')">Storage settings</button>':''}</div></div>
  <div class=storageSummary>${targets.length?targets.map(t=>`<span class=storageChip>${t.type==='rclone'?'☁':'▣'} ${esc(t.name)}${t.defaultDownload?' · default':''}</span>`).join(''):'<span class=muted>No server-side Storage targets configured.</span>'}</div>
  <div class=downloadList>${jobs.length?jobs.map(j=>`<article class=downloadCard><div><h3>${esc(j.title)}</h3><span class="status ${j.status==='Failed'?'bad':''}">${esc(j.status)}</span></div><div class=progress><div style="width:${j.progress<0?35:Math.max(0,j.progress)}%"></div></div><small>${j.progress<0?'Working…':Math.round(j.progress)+'%'} · ${esc(j.storageTargetName||'')} ${j.fileName?'· '+esc(j.fileName):''}</small>${j.error?`<p class=danger>${esc(j.error)}</p>`:''}<div class=row>${j.completed&&j.storageType==='path'?`<a class=btn href="/api/downloads/${j.id}/file">Download copy to device</a>`:''}${['Queued','Downloading','Uploading'].includes(j.status)?`<button class=btn onclick="cancelDownload('${j.id}')">Cancel</button>`:''}${['Failed','Cancelled'].includes(j.status)?`<button class=btn onclick="retryDownload('${j.id}')">Retry</button>`:''}<button class=btn onclick="deleteDownload('${j.id}')">Remove</button></div></article>`).join(''):'<div class=card>No server-side downloads. Open Movies or Series and click ↓ to choose a destination.</div>'}</div>`;
  $('#refreshDl').onclick=downloadView;
}
async function deleteDownload(id){if(!confirm('Remove this download and its stored file?'))return;await api('/api/downloads/'+id,{method:'DELETE'});downloadView()}



async function sourcesView(){
 let rows=[];try{rows=await api('/api/my-sources')}catch{}
 const defs=[['iptv','IPTV',sourceAccess.adminIptv],['plex','Plex',sourceAccess.adminPlex],['jellyfin','Jellyfin',sourceAccess.adminJellyfin]];
 content.innerHTML=`<div class=hero><h2>My Sources</h2><p class=muted>Admin-managed sources are ready to use. Add your own only where self-management is enabled.</p></div><div class=grid>${defs.map(([t,n,m])=>`<div class=card><h3>${n}</h3>${m?'<p>Managed by administrator.</p>':`<p>You manage this source.</p><div class=formGrid><div class=field><label>Name</label><input id="src-name-${t}" value="${n}"></div><div class=field><label>Base URL</label><input id="src-base-${t}"></div>${t==='iptv'?'<div class=field><label>M3U URL</label><input id=src-playlist-iptv></div><div class=field><label>EPG URL</label><input id=src-epg-iptv></div><div class=field><label>Username</label><input id=src-user-iptv></div><div class=field><label>Password</label><input type=password id=src-secret-iptv></div>':'<div class=field><label>Token / API key</label><input type=password id="src-secret-'+t+'"></div>'}</div><button class=btn onclick="saveMySource('${t}')">Save</button>`}</div>`).join('')}</div><h2>Saved personal sources</h2><div class=grid>${rows.map(x=>`<div class=card><h3>${esc(x.name)}</h3><p>${esc(x.type)}</p><button class=btn onclick="deleteMySource('${escAttr(x.id)}')">Remove</button></div>`).join('')||'<div class=card>No personal sources saved.</div>'}</div>`;
}
async function saveMySource(t){const b={type:t,name:$('#src-name-'+t)?.value||t,baseUrl:$('#src-base-'+t)?.value||'',playlistUrl:$('#src-playlist-'+t)?.value||'',epgUrl:$('#src-epg-'+t)?.value||'',username:$('#src-user-'+t)?.value||'',enabled:true};const x=$('#src-secret-'+t)?.value||'';if(t==='iptv')b.password=x;else b.token=x;try{await jpost('/api/my-sources',b);await sourcesView()}catch(e){alert(friendlyError(e))}}
async function deleteMySource(id){if(!confirm('Remove source?'))return;await api('/api/my-sources/'+encodeURIComponent(id),{method:'DELETE'});await sourcesView()}
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


let adminSourceAccess={};
function editUserSources(u){const x=adminSourceAccess[u]||{adminIptv:true,adminPlex:true,adminJellyfin:true};const b=$('#userSourceAccessEditor');b.style.display='block';b.innerHTML=`<h3>Source access · ${esc(u)}</h3><p class=muted>Checked = use Admin configuration. Unchecked = user manages own source.</p><label class=checkline><input id=usaIptv type=checkbox ${x.adminIptv?'checked':''}> IPTV — Admin configuration</label><label class=checkline><input id=usaPlex type=checkbox ${x.adminPlex?'checked':''}> Plex — Admin configuration</label><label class=checkline><input id=usaJelly type=checkbox ${x.adminJellyfin?'checked':''}> Jellyfin — Admin configuration</label><div class=row><button class=btn onclick="saveUserSources('${escAttr(u)}')">Save source access</button></div>`;b.scrollIntoView({behavior:'smooth',block:'center'})}
async function saveUserSources(u){const x={adminIptv:$('#usaIptv').checked,adminPlex:$('#usaPlex').checked,adminJellyfin:$('#usaJelly').checked};await api('/api/admin/source-access/'+encodeURIComponent(u),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(x)});adminSourceAccess[u]=x;await adminView()}

async function featureCompletionView(){
  if(authState.role!=='Admin'){content.innerHTML='<div class=card>Administrator access is required.</div>';return}
  try{
    const data=await api('/api/admin/feature-completion');
    const sum=data.summary||{};
    const features=data.features||[];
    const statusLabel={
      fullyImplemented:'FULLY IMPLEMENTED',
      partial:'PARTIAL',
      foundation:'FOUNDATION',
      missing:'MISSING',
      FullyImplemented:'FULLY IMPLEMENTED',
      Partial:'PARTIAL',
      Foundation:'FOUNDATION',
      Missing:'MISSING',
      0:'FULLY IMPLEMENTED',1:'PARTIAL',2:'FOUNDATION',3:'MISSING'
    };
    const statusClass=x=>{
      const v=String(x);
      if(v==='0'||/FullyImplemented|fullyImplemented/.test(v))return 'ok';
      if(v==='1'||/Partial|partial/.test(v))return 'warn';
      if(v==='2'||/Foundation|foundation/.test(v))return 'info';
      return 'danger';
    };
    const groups=[...new Set(features.map(x=>x.area))];
    content.innerHTML=`
      <div class=hero>
        <span class=kicker>v20.1.0 FEATURE COMPLETION</span>
        <h2>Feature Completion audit</h2>
        <p class=muted>This page distinguishes working features from partial implementations, foundations and missing functionality. It intentionally does not count a contract/model as a finished feature.</p>
      </div>
      <div class=statsGrid>
        <div class=statCard><b>${sum.fullyImplemented??0}</b><small>Fully implemented</small></div>
        <div class=statCard><b>${sum.partial??0}</b><small>Partial</small></div>
        <div class=statCard><b>${sum.foundation??0}</b><small>Foundation</small></div>
        <div class=statCard><b>${sum.missing??0}</b><small>Missing</small></div>
      </div>
      <div class="card ${sum.zeroMandatoryCost?'':'danger'}">
        <h3>Cost policy</h3>
        <p><b>Mandatory MyOnline TV runtime cost: 0 SEK</b></p>
        <p class=muted>Paid AI, metadata, monitoring and automation services are not required by the application.</p>
      </div>
      ${groups.map(area=>`<h2>${esc(area)}</h2><div class=manageList>${
        features.filter(x=>x.area===area).map(x=>{
          const raw=x.status;
          const key=typeof raw==='number'?String(raw):String(raw);
          return `<div class="card featureAuditCard">
            <div class=row><h3>${esc(x.name)}</h3><span class="statusBadge ${statusClass(raw)}">${esc(statusLabel[key]||key)}</span></div>
            <p>${esc(x.evidence||'')}</p>
            <p class=muted><b>Next:</b> ${esc(x.nextAction||'')}</p>
          </div>`;
        }).join('')
      }</div>`).join('')}
    `;
  }catch(e){content.innerHTML=errorCard(e)}
}

async function adminView(){
  if(authState.role!=='Admin'){content.innerHTML='<div class=card>Administrator access is required.</div>';return}
  providers=await api('/api/providers');profiles=await api('/api/profiles');
  const users=await api('/api/admin/users');const accessCfg=await api('/api/admin/profile-access');const sourceCfg=await api('/api/admin/source-access');adminSourceAccess=sourceCfg||{};mediaLibraries=await api('/api/media-libraries');const adminStorage=await api('/api/admin/storage-targets');renderMediaLibraryNav();

  content.innerHTML=`
  <div class=hero><h2>Administration</h2><p class=muted>Manage users, IPTV providers, Plex/Jellyfin libraries and viewer profiles.</p></div>
  <h2>Menu & navigation</h2>
  <div class=card>
    <p class=muted>Choose which pages are visible and their order. Home and Admin are always available.</p>
    <div id=navigationManager class=manageList>${(navigationConfig?.items||[]).map(x=>`<div class=manageChannel data-nav-id="${escAttr(x.id)}"><span><b>${esc(navigationLabels[x.id]||x.id)}</b></span><label class=checkline><input type=checkbox ${x.enabled?'checked':''} ${x.id==='home'||x.id==='admin'?'disabled':''}> Visible</label><span class=row><button class=btn type=button onclick="moveNavigationItem('${escAttr(x.id)}',-1)">↑</button><button class=btn type=button onclick="moveNavigationItem('${escAttr(x.id)}',1)">↓</button></span></div>`).join('')}</div>
    <div class=row><button class=btn id=saveNavigation>Save menu</button></div>
  </div>
  <h2>System tools</h2>
  <div class="grid adminSystemTools">
    <div class=card><h3>System overview</h3><p class=muted>Platform status, configured services and capabilities.</p><button class=btn onclick="show('platform')">Open system overview</button></div>
    <div class=card><h3>Diagnostics</h3><p class=muted>Check FFmpeg, FFprobe, rclone, storage, providers and disk space.</p><button class=btn onclick="show('diagnostics')">Open diagnostics</button></div>
    <div class=card><h3>Appliance</h3><p class=muted>Health, backup and appliance maintenance.</p><button class=btn onclick="show('appliance')">Open appliance tools</button></div>
    <div class=card><h3>Feature Completion</h3><p class=muted>Audited status of planned features: complete, partial, foundation or missing.</p><button class=btn onclick="show('completion')">Open feature audit</button></div>
  </div>


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
  <div class=manageList>${users.map(u=>{const ua=accessCfg.userAccess[u.username]||{allowedProfileIds:profiles.map(p=>p.id),defaultProfileId:profiles[0]?.id||'default'};return `<div class=manageChannel><span><b>${esc(u.username)}</b> · ${esc(u.role)} ${u.enabled?'':'· Disabled'}</span><span><select multiple id="ua-${u.id}">${profiles.map(p=>`<option value="${p.id}" ${ua.allowedProfileIds.includes(p.id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></span><button class=btn onclick="saveUserAccess('${escAttr(u.id)}','${escAttr(u.username)}')">Profiles</button><button class=btn onclick="editUserSources('${escAttr(u.username)}')">Sources</button><button class=btn onclick="editUser('${escAttr(u.id)}')">Edit</button><button class=btn onclick="deleteUser('${escAttr(u.id)}','${escAttr(u.username)}')">Remove</button></div>`}).join('')}</div>

  <div id=userSourceAccessEditor class=card style="display:none"></div>

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

  <h2>Storage</h2>
  <div class=card>
    <p class=muted>Use a mounted NAS/local path, or an rclone remote for cloud storage. DVR and server-side downloads never need to remain permanently inside the LXC.</p>
    <input id=stid type=hidden>
    <div class=formGrid>
      <div class=field><label>Name</label><input id=stname placeholder="NAS, OneDrive, Google Drive..."></div>
      <div class=field><label>Type</label><select id=sttype><option value=path>Mounted path / NAS</option><option value=rclone>Cloud via rclone</option></select></div>
      <div class=field><label>Destination</label><input id=stdest placeholder="/mnt/media or myremote:MyOnlineTV"></div>
      <div class=field><label>Status</label><label class=checkline><input id=stenabled type=checkbox checked> Enabled</label></div>
      <div class=field><label><input id=stdefaultdvr type=checkbox> Default for DVR</label></div>
      <div class=field><label><input id=stdefaultdownload type=checkbox> Default for Downloads</label></div>
    </div>
    <div class=row><button class=btn id=stsave>Add storage target</button><button class=btn id=stcancel disabled>Cancel edit</button></div>
    <p class=muted>For SMB/NFS, mount the share on the LXC/host and use that path. For cloud, configure the rclone remote in the LXC and use e.g. <code>onedrive:MyOnlineTV</code>.</p>
  </div>
  <div class=grid>${adminStorage.map(s=>`<div class=card><h3>${esc(s.name)}</h3><p>${esc(s.type)} · ${esc(s.destination)}</p><p>${s.defaultDvr?'● DVR default ':''}${s.defaultDownload?'↓ Download default':''}</p><div class=row><button class=btn onclick='editStorageTarget(${JSON.stringify(s)})'>Edit</button><button class=btn onclick="testStorageTarget('${escAttr(s.id)}')">Test</button><button class=btn onclick="removeStorageTarget('${escAttr(s.id)}')">Remove</button></div><div id="ststat-${s.id}" class=muted></div></div>`).join('')}</div>

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

  $('#saveNavigation').onclick=saveNavigationManager;
  $('#manageChannels').onclick=manageChannels;
  $('#addProfile').onclick=async()=>{try{await jpost('/api/profiles',{id:null,name:$('#profileName').value,isKids:$('#profileKids').checked,icon:$('#profileIcon').value});profiles=await api('/api/profiles');adminView()}catch(e){alert(friendlyError(e))}};

  $('#stsave').onclick=saveStorageTarget;$('#stcancel').onclick=()=>adminView();
  $('#mlsave').onclick=saveMediaLibrary;$('#mlcancel').onclick=()=>{editingMediaLibraryId=null;adminView()};
  $('#saveUser').onclick=saveAdminUser;
  $('#cancelUser').onclick=()=>{editingUserId=null;adminView()};
  $('#savep').onclick=saveProvider;
  $('#cancelProvider').onclick=()=>{editingProviderId=null;adminView()};
}

function editStorageTarget(s){
  $('#stid').value=s.id||'';$('#stname').value=s.name||'';$('#sttype').value=s.type||'path';$('#stdest').value=s.destination||'';
  $('#stdefaultdvr').checked=!!s.defaultDvr;$('#stdefaultdownload').checked=!!s.defaultDownload;$('#stenabled').checked=s.enabled!==false;
  $('#stsave').textContent='Save storage target';$('#stcancel').disabled=false;$('#stname').scrollIntoView({behavior:'smooth',block:'center'});
}
async function saveStorageTarget(){
  const body={id:$('#stid').value||'',name:$('#stname').value,type:$('#sttype').value,destination:$('#stdest').value,
    defaultDvr:$('#stdefaultdvr').checked,defaultDownload:$('#stdefaultdownload').checked,enabled:$('#stenabled').checked};
  try{await jpost('/api/admin/storage-targets',body);adminView()}catch(e){alert(friendlyError(e))}
}
async function testStorageTarget(id){
  const box=$('#ststat-'+id);if(box)box.textContent='Testing…';
  try{const r=await jpost('/api/admin/storage-targets/'+encodeURIComponent(id)+'/test',{});if(box)box.textContent=r.message||'OK'}catch(e){if(box)box.textContent=friendlyError(e)}
}
async function removeStorageTarget(id){
  if(!confirm('Remove this storage target? Existing files are not deleted.'))return;
  try{await api('/api/admin/storage-targets/'+encodeURIComponent(id),{method:'DELETE'});adminView()}catch(e){alert(friendlyError(e))}
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
  rows.unshift({
    type,
    id:String(item.id),
    name:item.name||item.title||'Untitled',
    poster:item.poster||'',
    providerId:item.providerId||currentProvider,
    seriesId:item.seriesId||null,
    seriesName:item.seriesName||null,
    extension:item.extension||null,
    season:item.season??null,
    episode:item.episode??null,
    updated:Date.now()
  });
  localStorage.setItem(historyKey(),JSON.stringify(rows.slice(0,100)));
}

// v0.7.0 home rails
function homeMediaRails(historyRows=null){
  const hist=(historyRows||getMediaHistory()).slice(0,14);
  return `${hist.length?`<div class=sectionHead><h2>Recently watched</h2><button class=linkButton onclick="clearRecentlyWatched()">Clear all</button></div><div class="continueRow mediaHistoryRail">${hist.map(x=>`<div class="continueCard historyCard"><button class=historyMain onclick='openRecentlyWatched(${JSON.stringify(x)})'>${mediaPosterMarkup(x.poster,x.name)}<div class=historyCardBody><b>${esc(x.name)}</b><small>${new Date(x.updated).toLocaleString()}</small></div></button><button class=historyRemove title="Remove from Recently Watched" onclick='removeRecentlyWatched(${JSON.stringify(x.type)},${JSON.stringify(x.id)})'>×</button></div>`).join('')}</div>`:''}`;
}

function saveMediaHistory(rows){
  localStorage.setItem(historyKey(),JSON.stringify(rows.slice(0,100)));
}
async function removeRecentlyWatched(type,id){
  saveMediaHistory(getMediaHistory().filter(x=>!(x.type===type&&String(x.id)===String(id))));
  await home();
}
async function clearRecentlyWatched(){
  if(!confirm('Remove all Recently Watched items?'))return;
  localStorage.removeItem(historyKey());
  await home();
}
async function removeContinueWatching(id){
  try{await api('/api/continue/'+encodeURIComponent(id),{method:'DELETE'});await home()}catch(e){alert(friendlyError(e))}
}
async function markContinueWatched(id){
  try{await api('/api/continue/'+encodeURIComponent(id),{method:'DELETE'});await home()}catch(e){alert(friendlyError(e))}
}
async function clearContinueWatching(){
  if(!confirm('Remove all Continue Watching items?'))return;
  try{await api('/api/continue',{method:'DELETE'});await home()}catch(e){alert(friendlyError(e))}
}

async function openRecentlyWatched(item){
  try{
    if(item.providerId)currentProvider=item.providerId;

    if(item.type==='movie'){
      await show('movies');
      const match=mediaItems.find(x=>String(x.id)===String(item.id));
      if(match){
        movieDetails(match.id);
        return;
      }
      const q=$('#mediaq');
      if(q){q.value=item.name||'';filterMedia()}
      return;
    }

    if(item.type==='episode'){
      // New v0.8.2 entries retain exact episode metadata and can start directly.
      if(item.extension){
        await show('series');
        await playEpisode(item.id,item.extension,item.name||'Episode',
          `iptv-episode:${item.providerId||currentProvider}:${item.id}:${item.extension}`,
          item.poster||'',item.seriesId||null,item.seriesName||null,item.season??null,item.episode??null);
        return;
      }
      // Legacy history items did not store extension/series id. Fall back to exact title search.
      await show('series');
      const q=$('#seriesq');
      if(q){q.value=item.seriesName||item.name||'';filterSeries()}
      return;
    }

    if(item.type==='series'&&item.id){
      await show('series');
      await openSeries(item.id);
      return;
    }

    await show(item.type==='movie'?'movies':'series');
  }catch(e){alert(friendlyError(e))}
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
  }else{
    tvScrollRailFromFocused(direction);
  }
}

function tvScrollRailFromFocused(direction){
  const focused=document.activeElement;
  const rail=focused?.closest?.('.posterRail,.continueRow,.mediaHistoryRail');
  if(!rail)return false;
  if(direction!=='left'&&direction!=='right')return false;
  const delta=Math.max(220,Math.floor(rail.clientWidth*.72))*(direction==='left'?-1:1);
  rail.scrollBy({left:delta,behavior:'smooth'});
  return true;
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
    window.__tvFocusSeq=(window.__tvFocusSeq||0)+1;
    el.dataset.tvFocusId='tv-'+window.__tvFocusSeq;
  }
  if(currentView)tvLastFocusByView[currentView]=el.dataset.tvFocusId;
});

document.addEventListener('keydown',e=>{
  const tag=document.activeElement?.tagName;
  const editing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT';
  const remoteKey=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape','Backspace'].includes(e.key);
  const coarse=window.matchMedia?.('(pointer:coarse)')?.matches===true;
  const focusedControl=document.activeElement?.matches?.('button,a[href],[tabindex],video')===true;
  const remoteEligible=document.documentElement.classList.contains('isTV')||coarse||focusedControl;

  if(remoteKey&&remoteEligible){
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

  if(!tvRemoteMode)return;

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

async function storageTargets(){
  try{return await api('/api/storage-targets')}catch{return []}
}

async function recordLiveNow(channelKey,channelName){
  const targets=await storageTargets();
  const dvrTarget=targets.find(x=>x.defaultDvr)||targets[0];
  if(!dvrTarget){alert('No DVR storage is configured. Open Admin → Storage first.');return}
  const minsRaw=prompt('Record Live TV for how many minutes?','60');
  if(minsRaw===null)return;
  const minutes=Math.max(1,Math.min(1440,Number(minsRaw)||60));
  const start=new Date(),end=new Date(start.getTime()+minutes*60000);
  try{
    await jpost('/api/recordings',{
      providerId:currentProvider,channelKey,channelName,title:channelName,
      start:start.toISOString(),end:end.toISOString(),storageTargetId:dvrTarget.id
    });
    alert(`Recording started/scheduled to ${dvrTarget.name}.`);
  }catch(e){alert(friendlyError(e))}
}

function closeProgramActions(){$('#programActionSheet')?.remove()}
function showGuideProgramActions(channelKey,channelName,programJson){
  closeProgramActions();
  let pr;try{pr=JSON.parse(programJson)}catch{return}
  const box=document.createElement('div');
  box.id='programActionSheet';box.className='programActionSheet';
  box.innerHTML=`<div class=programActionCard><button class=dialogClose onclick="closeProgramActions()">×</button><span class=kicker>TV GUIDE</span><h3>${esc(pr.title||channelName)}</h3><p>${esc(channelName)} · ${new Date(pr.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}–${new Date(pr.stop).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p><div class=row><button class=btn id=guidePlay>▶ Play channel</button><button class="btn recordBtn" id=guideRecord>● Record programme</button><button class=btn id=guideSeries>● Record series</button></div></div>`;
  document.body.appendChild(box);
  $('#guidePlay').onclick=()=>{closeProgramActions();playLive(channelKey,channelName)};
  $('#guideRecord').onclick=()=>{closeProgramActions();scheduleGuideRecording(channelKey,channelName,programJson)};$('#guideSeries').onclick=()=>{closeProgramActions();createSeriesDvrRule(channelKey,channelName,programJson)};
}

async function createSeriesDvrRule(channelKey,channelName,programJson){
  try{
    const pr=JSON.parse(programJson),targets=await storageTargets(),target=targets.find(x=>x.defaultDvr)||targets[0];
    if(!target){alert('Configure DVR Storage first.');return}
    await jpost('/api/dvr/rules',{providerId:currentProvider,channelKey,channelName,titlePattern:pr.title||channelName,newOnly:true,enabled:true,paddingBeforeMinutes:5,paddingAfterMinutes:10,keepLatest:5,storageTargetId:target.id});
    alert('Series recording rule created.');
  }catch(e){alert(friendlyError(e))}
}
async function scheduleGuideRecording(channelKey,channelName,programJson){
  try{
    const pr=JSON.parse(programJson);
    const targets=await storageTargets();
    const dvrTarget=targets.find(x=>x.defaultDvr)||targets[0];
    if(!dvrTarget){alert('No DVR storage is configured. Open Admin → Storage first.');return}
    await jpost('/api/recordings',{
      providerId:currentProvider,
      channelKey,
      channelName,
      title:pr.title||channelName,
      start:pr.start,
      end:pr.stop,
      storageTargetId:dvrTarget.id
    });
    alert('Recording scheduled: '+(pr.title||channelName));
  }catch(e){alert(friendlyError(e))}
}

async function recordingsView(){
  if(!await ensureProvider()){content.innerHTML=noProvider();return}
  const [rows,targets,dvrRules,dvrStatus,dvrConflicts]=await Promise.all([api('/api/recordings'),storageTargets(),api('/api/dvr/rules'),api('/api/dvr/status'),api('/api/dvr/conflicts')]);
  const ch=await api('/api/channels/'+currentProvider);
  const now=new Date(),later=new Date(now.getTime()+60*60*1000);
  content.innerHTML=`<div class=hero><h2>DVR · Live TV recordings</h2><p class=muted>Record Live TV now or schedule programmes from Guide. Recordings are written to your configured Storage target, not kept permanently in the LXC.</p><div class=row><button class=btn onclick="show('live')">● Record Live TV</button><button class=btn onclick="show('guide')">▤ Schedule from Guide</button>${authState.role==='Admin'?'<button class=btn onclick="show(\'admin\')">Storage settings</button>':''}</div></div>
  ${!targets.length?'<div class="card warningCard"><b>No DVR storage configured.</b><p>Add a Storage target in Admin → Storage before recording.</p></div>':''}
  <div class=card><h3>New recording</h3><div class=recordForm>
    ${providerSelect()}
    <select id=recStorage>${targets.map(t=>`<option value="${escAttr(t.id)}" ${t.defaultDvr?'selected':''}>${esc(t.name)}${t.defaultDvr?' · DVR default':''}</option>`).join('')}</select>
    <select id=recChannel>${ch.map(x=>`<option value="${escAttr(x.key)}">${esc(x.name)}</option>`).join('')}</select>
    <input id=recTitle placeholder="Recording title">
    <label>Start <input id=recStart type=datetime-local value="${toLocalInputValue(now)}"></label>
    <label>End <input id=recEnd type=datetime-local value="${toLocalInputValue(later)}"></label>
    <button class=btn id=recSchedule>Schedule recording</button>
  </div></div>
  <div class=dvrStatusBar><span>Scheduled <b>${dvrStatus.scheduled}</b></span><span>Recording <b>${dvrStatus.recording}</b></span><span>Completed <b>${dvrStatus.completed}</b></span><span>Failed <b>${dvrStatus.failed}</b></span><span>Conflicts <b>${dvrConflicts.length}</b></span></div>${dvrConflicts.length?`<div class="card warningCard"><b>DVR conflicts detected</b><p>${dvrConflicts.length} overlapping recording pair(s). Review scheduled recordings.</p></div>`:''}<div class=card><h3>Series recording rules</h3>${dvrRules.length?dvrRules.map(r=>`<div class=episode><span><b>${esc(r.titlePattern)}</b><small>${esc(r.channelName)} · ${r.newOnly?'New episodes only':'All episodes'} · ${r.paddingBeforeMinutes}m before / ${r.paddingAfterMinutes}m after · keep ${r.keepLatest}</small></span><button class=btn onclick="deleteDvrRule('${r.id}')">Remove</button></div>`).join(''):'<p class=muted>No series recording rules yet. Create one from Guide.</p>'}</div><div class=sectionHead><h2>DVR Library</h2></div>${dvrLibraryMarkup(rows)}<div class=recordingList>${rows.length?rows.map(recordingCard).join(''):'<div class=card>No recordings scheduled yet.</div>'}</div>`;

  $('#provider').onchange=async e=>{currentProvider=e.target.value;await recordingsView()};
  $('#recSchedule').onclick=async()=>{
    const c=$('#recChannel'),opt=c.options[c.selectedIndex];
    const start=new Date($('#recStart').value),end=new Date($('#recEnd').value);
    if(!(end>start)){alert('End must be after start.');return}
    try{
      await jpost('/api/recordings',{
        providerId:currentProvider,channelKey:c.value,channelName:opt?.textContent||'Channel',
        title:$('#recTitle').value||opt?.textContent||'Recording',
        start:start.toISOString(),end:end.toISOString(),storageTargetId:$('#recStorage')?.value||null
      });
      recordingsView();
    }catch(e){alert(friendlyError(e))}
  };
}

function recordingCard(r){
  const duration=Math.max(0,Math.round((new Date(r.end)-new Date(r.start))/60000));
  return `<article class=recordingCard><div><span class="recordDot ${r.status==='Recording'?'active':''}">●</span><h3>${esc(r.title)}</h3><p>${esc(r.channelName)} · ${new Date(r.start).toLocaleString()} · ${duration} min</p><small class=muted>${r.storageTargetName?'Saved to '+esc(r.storageTargetName):'Storage target selected when recording starts'}</small>${r.error?`<p class=danger>${esc(r.error)}</p>`:''}</div>
  <div class=row><span class="status ${r.status==='Failed'?'bad':''}">${esc(r.status)}</span>
  ${r.playable?`<a class=btn href="/api/recordings/${r.id}/file">Play / save</a>`:r.completed?'<span class=muted>Stored externally</span>':''}
  ${r.status==='Scheduled'||r.status==='Recording'?`<button class=btn onclick="cancelRecording('${r.id}')">Cancel</button>`:''}
  <button class=btn onclick="deleteRecording('${r.id}')">Remove</button></div></article>`;
}
async function cancelRecording(id){await jpost('/api/recordings/'+id+'/cancel',{});recordingsView()}
async function deleteRecording(id){if(!confirm('Remove recording and its stored file?'))return;await api('/api/recordings/'+id,{method:'DELETE'});recordingsView()}

async function searchView(){
  content.innerHTML=`<div class=hero><span class=kicker>SEARCH 2.0</span><h2>Search everything</h2><p class=muted>Movies, series, media libraries, DVR recordings and Live TV.</p><div class=row><input id=globalq placeholder="Search all sources"><button class=btn id=globalSearchBtn>Search</button></div></div><div id=globalSearchResults></div>`;
  const run=async()=>{
    const q=$('#globalq').value.trim().toLowerCase();if(!q){$('#globalSearchResults').innerHTML='';return}
    $('#globalSearchResults').innerHTML='<div class=card>Searching…</div>';
    try{
      const tasks=[
        api('/api/unified/movies',{timeoutMs:65000}).catch(()=>[]),
        api('/api/unified/series',{timeoutMs:65000}).catch(()=>[]),
        api('/api/recordings').catch(()=>[]),
        currentProvider?api('/api/channels/'+currentProvider).catch(()=>[]):Promise.resolve([])
      ];
      const [movies,series,recs,channels]=await Promise.all(tasks);
      const media=[...movies.map(x=>({...x,resultType:'Movie'})),...series.map(x=>({...x,resultType:'Series',kind:'series'}))].filter(x=>(x.name||'').toLowerCase().includes(q));
      const rr=recs.filter(x=>(x.title||'').toLowerCase().includes(q));
      const cc=channels.filter(x=>(x.name||'').toLowerCase().includes(q));
      $('#globalSearchResults').innerHTML=`${media.length?`<h2>Movies & Series</h2><div class=posterGrid>${media.slice(0,30).map(x=>`<button class=posterCard onclick='playUnifiedItem(${JSON.stringify(x)})'>${x.poster?`<img src="${escAttr(x.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(x.name)}</b><small>${esc(x.resultType)} · ${esc(x.source||'')}</small></div></button>`).join('')}</div>`:''}${cc.length?`<h2>Live TV</h2><div class=grid>${cc.slice(0,20).map(c=>`<button class=card onclick='playLive(${JSON.stringify(c.key)},${JSON.stringify(c.name)})'><b>${esc(c.name)}</b><small>Live channel</small></button>`).join('')}</div>`:''}${rr.length?`<h2>DVR</h2>${dvrLibraryMarkup(rr)}`:''}${!media.length&&!cc.length&&!rr.length?'<div class=card>No matches.</div>':''}`;
    }catch(e){$('#globalSearchResults').innerHTML=errorCard(e)}
  };
  $('#globalSearchBtn').onclick=run;$('#globalq').onkeydown=e=>{if(e.key==='Enter')run()};$('#globalq').focus();
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
    editingMediaLibraryId=null;editingMediaLibraryIds=[];await refreshMediaLibraryNav();adminView()
  }catch(e){alert(friendlyError(e))}
}
async function testMediaLibrary(id){try{const r=await jpost('/api/media-libraries/'+id+'/test',{});$('#mlstat-'+id).textContent=r.ok?'Connection OK':'Connection failed: '+(r.error||r.status)}catch(e){$('#mlstat-'+id).textContent=friendlyError(e)}}
async function removeMediaLibrary(id){if(!confirm('Remove media library?'))return;try{await api('/api/media-libraries/'+id,{method:'DELETE'});await refreshMediaLibraryNav();adminView()}catch(e){alert(friendlyError(e))}}
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
    rememberMediaHistory(item?.kind==='episode'?'episode':'movie',{
      id:item.id,
      name:item.name||'Media',
      poster:item.poster||'',
      providerId,
      extension:null,
      seriesId:item.seriesId||null,
      seriesName:item.seriesName||null,
      season:item.seasonNumber??null,
      episode:item.episodeNumber??null
    });
    await playServerMedia(r.playToken,item.name||'Media','unified:'+String(item.id||''),false,item.poster||'');
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
    const watched=getWatchedSet();
    const nextUnwatched=unifiedEpisodeContext.find(x=>!watched.has('unified:'+String(x.id||'')));
    const host=$('#unifiedEpisodeList');
    if(!episodes.length){host.innerHTML='<div class=empty>No episodes found.</div>';return}
    let lastSeason=null,html=nextUnwatched?`<div class=seriesNextBar><button class="btn primaryBtn" onclick='playUnifiedItem(${JSON.stringify(nextUnwatched)})'>▶ Play next unwatched</button><span>${esc(nextUnwatched.name||'Next episode')}</span></div>`:'<div class=seriesNextBar><span class=watchedBadge>✓ All episodes watched</span></div>';
    for(const e of episodes){
      if(e.seasonNumber!==lastSeason){lastSeason=e.seasonNumber;html+=`<h3>Season ${e.seasonNumber||'Specials'}</h3><div class=episodeGrid>`}
      const label=e.seasonNumber>0&&e.episodeNumber>0?`S${String(e.seasonNumber).padStart(2,'0')}E${String(e.episodeNumber).padStart(2,'0')}`:'Episode';
      html+=`<button class="episodeCard ${watched.has('unified:'+String(e.id||''))?'episodeWatched':''}" onclick='playUnifiedItem(${JSON.stringify({...e,kind:"episode",id:e.id})})'>${e.poster?`<img loading=lazy decoding=async src="${escAttr(e.poster)}">`:posterPlaceholder()}<span><b>${watched.has('unified:'+String(e.id||''))?'✓ ':''}${esc(label+' · '+e.name)}</b><small>${esc(e.year||'')} ${e.rating?'· '+esc(e.rating):''}</small></span></button>`;
      const next=episodes[episodes.indexOf(e)+1];
      if(!next||next.seasonNumber!==lastSeason)html+='</div>';
    }
    host.innerHTML=html;
  }catch(e){const host=$('#unifiedEpisodeList');if(host)host.innerHTML=`<div class=error>${esc(friendlyError(e))}</div>`}
}

async function resumeContinueItem(item){
  pendingResumeSeconds=Math.max(0,Number(item?.positionSeconds)||0);
  const id=String(item?.id||'');

  if(id.startsWith('unified:')){
    const unifiedId=id.substring('unified:'.length);
    const parts=unifiedId.split(':');
    if(parts.length>=3)return playUnifiedItem({id:unifiedId,kind:'episode',name:item.title||'Media'});
  }

  if(id.startsWith('iptv-movie:')){
    const parts=id.split(':');
    if(parts.length>=3){
      currentProvider=parts[1];
      const movieId=parts.slice(2).join(':');
      const t=await api(`/api/vod/${currentProvider}/${encodeURIComponent(movieId)}/token`,{method:'POST'});
      return playServerMedia(t.playToken,item.title||'Movie',id,false,item.poster||'');
    }
  }

  if(id.startsWith('iptv-episode:')){
    const parts=id.split(':');
    if(parts.length>=4){
      currentProvider=parts[1];
      const ext=parts.pop()||'mp4';
      const episodeId=parts.slice(2).join(':');
      const t=await api(`/api/series/${currentProvider}/episode/${encodeURIComponent(episodeId)}/token?ext=${encodeURIComponent(ext)}`,{method:'POST'});
      return playServerMedia(t.playToken,item.title||'Episode',id,false,item.poster||'');
    }
  }

  // Backward compatibility for v0.8.1 movie entries.
  if(id.startsWith('movie:')){
    const movieId=id.substring('movie:'.length);
    if(currentProvider&&movieId){
      const t=await api(`/api/vod/${currentProvider}/${encodeURIComponent(movieId)}/token`,{method:'POST'});
      return playServerMedia(t.playToken,item.title||'Movie',id,false,item.poster||'');
    }
  }

  if(item?.url)return playMedia(item.url,item.title,item.id);
  pendingResumeSeconds=0;
  alert('This older Continue Watching entry does not contain enough playback information. Remove it and play the item once again to create a new resumable entry.');
  return false;
}

async function deleteDvrRule(id){if(!confirm('Remove DVR rule?'))return;await api('/api/dvr/rules/'+encodeURIComponent(id),{method:'DELETE'});recordingsView()}

function normalizedMediaKey(x){
  return String(x?.name||x?.title||'').toLowerCase().replace(/\(\d{4}\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function mergeUnifiedSources(rows){
  const map=new Map();
  for(const x of rows||[]){
    const key=normalizedMediaKey(x);
    if(!key)continue;
    const cur=map.get(key)||{...x,sources:[]};
    cur.sources.push(x);
    if(!cur.poster&&x.poster)cur.poster=x.poster;
    map.set(key,cur);
  }
  return [...map.values()];
}
async function unifiedLibraryView(){
  content.innerHTML='<div class=card>Loading unified library…</div>';
  try{
    const [movies,series]=await Promise.all([api('/api/unified/movies',{timeoutMs:65000}),api('/api/unified/series',{timeoutMs:65000})]);
    const rows=mergeUnifiedSources([...movies.map(x=>({...x,mediaKind:'movie'})),...series.map(x=>({...x,mediaKind:'series'}))]);
    content.innerHTML=`<div class=hero><span class=kicker>LIBRARY 2.0</span><h2>All your media, one library</h2><p class=muted>Duplicates are grouped and every available source stays selectable.</p><div class=row><input id=unifiedLibrarySearch placeholder="Search library"><select id=librarySort><option value=title>Title</option><option value=year>Year</option><option value=added>Recently added</option></select></div></div><div id=unifiedLibraryGrid class=posterGrid>${rows.map(unifiedLibraryCard).join('')}</div>`;
    $('#unifiedLibrarySearch').oninput=e=>{const q=e.target.value.toLowerCase();$('#unifiedLibraryGrid').innerHTML=rows.filter(x=>(x.name||'').toLowerCase().includes(q)).map(unifiedLibraryCard).join('')};
    $('#librarySort').onchange=e=>{$('#unifiedLibraryGrid').innerHTML=library2Sort(rows,e.target.value).map(unifiedLibraryCard).join('')};
  }catch(e){content.innerHTML=errorCard(e)}
}
function unifiedLibraryCard(x){
  return `<article class=posterCard>${x.poster?`<img loading=lazy src="${escAttr(x.poster)}">`:posterPlaceholder()}<div class=posterBody><b>${esc(x.name)}</b><small>${esc(x.mediaKind)} · ${x.sources.length} source${x.sources.length===1?'':'s'}</small><div class=sourceChoices>${x.sources.map(s=>`<button class=btn onclick='playUnifiedItem(${JSON.stringify(s.mediaKind==="series"?{...s,kind:"series"}:s)})'>${esc(s.source||'Play')}</button>`).join('')}</div></div></article>`;
}

function recordingSeriesName(title){
  return String(title||'Recording').replace(/\s+[Ss]\d{1,2}[Ee]\d{1,3}.*$/,'').replace(/\s+-\s+Episode.*$/i,'').trim();
}
function dvrLibraryGroups(rows){
  const groups=new Map();
  for(const r of rows.filter(x=>x.completed)){
    const key=recordingSeriesName(r.title);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(r);
  }
  return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function dvrLibraryMarkup(rows){
  const groups=dvrLibraryGroups(rows);
  if(!groups.length)return '<div class=card>No completed recordings yet.</div>';
  return `<div class=dvrLibrary>${groups.map(([name,items])=>`<section class=card><h3>${esc(name)}</h3><small>${items.length} recording${items.length===1?'':'s'}</small><div class=episodeList>${items.sort((a,b)=>new Date(b.start)-new Date(a.start)).map(r=>`<div class=episode><span><b>${esc(r.title)}</b><small>${esc(r.channelName)} · ${new Date(r.start).toLocaleString()} · ${esc(r.storageTargetName||'Storage')}</small></span><div class=row>${r.playable?`<a class=btn href="/api/recordings/${r.id}/file">Play</a>`:'<span class=muted>External storage</span>'}</div></div>`).join('')}</div></section>`).join('')}</div>`;
}

async function roomsView(){
  const rooms=await api('/api/rooms');
  content.innerHTML=`<div class=hero><span class=kicker>MULTI-ROOM</span><h2>Your screens</h2><p class=muted>Register browsers/TVs and see the latest media handoff state.</p><div class=row><input id=roomName placeholder="Living room TV"><button class=btn id=registerRoom>Register this device</button></div></div><div class=grid>${rooms.map(r=>`<div class=card><h3>${esc(r.name)}</h3><p>${esc(r.deviceType)} · ${new Date(r.updated).toLocaleString()}</p>${r.activeTitle?`<small>Last handoff: ${esc(r.activeTitle)} · ${formatMediaTime(r.positionSeconds)}</small>`:''}</div>`).join('')}</div>`;
  $('#registerRoom').onclick=async()=>{const name=$('#roomName').value.trim();if(!name)return;await jpost('/api/rooms/register',{name,deviceType:document.documentElement.classList.contains('isTV')?'TV':'Browser'});roomsView()};
}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}

async function enableBrowserNotifications(){
  if(!('Notification' in window)){alert('Notifications are not supported by this browser.');return}
  const p=await Notification.requestPermission();alert(p==='granted'?'Browser notifications enabled.':'Notification permission was not granted.');
}
async function notificationsView(){
  const rows=await api('/api/notifications');
  content.innerHTML=`<div class=hero><span class=kicker>NOTIFICATIONS</span><h2>Alerts</h2><p class=muted>DVR, storage and media alerts in one place.</p><button class=btn id=enableNotify>Enable browser notifications</button></div><div class=notificationList>${rows.length?rows.map(n=>`<div class="card ${n.read?'':'unreadNotification'}"><div class=row><b>${esc(n.title)}</b><small>${new Date(n.created).toLocaleString()}</small></div><p>${esc(n.message)}</p>${!n.read?`<button class=btn onclick="readNotification('${n.id}')">Mark read</button>`:''}</div>`).join(''):'<div class=card>No notifications.</div>'}</div>`;
  $('#enableNotify').onclick=enableBrowserNotifications;
}
async function readNotification(id){await jpost('/api/notifications/'+encodeURIComponent(id)+'/read',{});notificationsView()}

async function applianceView(){
  const h=await api('/api/appliance/health');
  const pct=h.diskTotalBytes?Math.round((1-h.diskFreeBytes/h.diskTotalBytes)*100):0;
  content.innerHTML=`<div class=hero><span class=kicker>MYONLINE TV 2.0</span><h2>Appliance</h2><div class=row><button class=btn onclick="installMyOnlineTv()">Install app</button><button class=btn onclick="mobileShareCurrent()">Share</button></div><p class=muted>Health, backup and setup status for the self-hosted MyOnline TV appliance.</p></div><div class=statsGrid><div class=statCard><b>v${esc(h.version)}</b><small>Version</small></div><div class=statCard><b>${h.storageTargets}</b><small>Storage targets</small></div><div class=statCard><b>${h.dvrRules}</b><small>DVR rules</small></div><div class=statCard><b>${h.rooms}</b><small>Rooms</small></div></div><div class=card><h3>System storage</h3><div class=progress><div style="width:${pct}%"></div></div><p>${pct}% used · ${Math.round(h.diskFreeBytes/1073741824)} GB free</p></div>${authState.role==='Admin'?`<div class=card><h3>Backup</h3><p>Download the core MyOnline TV configuration as a ZIP backup.</p><a class=btn href="/api/appliance/backup">Download backup</a></div>`:''}<div class=card><h3>Setup checklist</h3><p>${h.storageTargets?'✓':'○'} Storage configured</p><p>${h.dvrRules?'✓':'○'} Smart DVR rules</p><p>${h.rooms?'✓':'○'} Multi-room device registered</p><p>✓ PWA install support</p></div>`;
}



async function diagnosticsView(){
  content.innerHTML='<div class=card>Running diagnostics…</div>';
  try{
    const d=await api('/api/diagnostics');
    content.innerHTML=`<div class=hero><span class=kicker>STABILITY & DIAGNOSTICS</span><h2>Diagnostics</h2><p class=muted>Runtime prerequisites and configuration health.</p><button class=btn onclick="diagnosticsView()">Run diagnostics</button></div><div class=diagGrid>${d.checks.map(c=>`<div class="card diagCard ${c.ok?'diagOk':'diagBad'}"><b>${c.ok?'✓':'!'} ${esc(c.name)}</b><small>${esc(c.detail)}</small></div>`).join('')}</div>`;
  }catch(e){content.innerHTML=errorCard(e)}
}




async function serverProfileState(){
  if(!currentProfile)return [];
  try{return await api('/api/profile-state/'+encodeURIComponent(currentProfile))}catch{return []}
}
async function syncProfileMediaState(mediaId,state){
  if(!currentProfile||!mediaId)return;
  try{await api('/api/profile-state/'+encodeURIComponent(currentProfile)+'/'+encodeURIComponent(mediaId),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)})}catch{}
}
async function profileSyncView(){
  const rows=await serverProfileState();
  content.innerHTML=`<div class=hero><span class=kicker>PROFILE SYNC</span><h2>Synced watch state</h2><p class=muted>Server-side state follows the selected profile across browsers and TVs.</p></div><div class=grid>${rows.length?rows.slice(0,100).map(x=>`<div class=card><b>${esc(x.title)}</b><small>${esc(x.kind)} · ${x.watched?'Watched':formatMediaTime(x.positionSeconds)}</small></div>`).join(''):'<div class=card>No synced state yet.</div>'}</div>`;
}




function epgNowNext(programmes,now=new Date()){
  const n=now.getTime();
  const sorted=[...(programmes||[])].sort((a,b)=>new Date(a.start)-new Date(b.start));
  const current=sorted.find(p=>new Date(p.start).getTime()<=n&&new Date(p.stop).getTime()>n);
  const next=sorted.find(p=>new Date(p.start).getTime()>n);
  return {current,next};
}
function epgProgress(pr){
  if(!pr)return 0;const now=Date.now(),a=new Date(pr.start).getTime(),b=new Date(pr.stop).getTime();
  return Math.max(0,Math.min(100,((now-a)/(b-a))*100));
}




function installPlayer2(video,context={}){
  if(!video)return;
  video.dataset.player2='true';
  video.addEventListener('loadedmetadata',()=>{
    try{
      if(context.resumeSeconds>5 && context.resumeSeconds<video.duration-10) video.currentTime=context.resumeSeconds;
    }catch{}
  },{once:true});
  video.addEventListener('ended',()=>document.body.classList.add('playerEnded'),{once:true});
}
function player2Tracks(video){
  if(!video)return {audio:0,text:0};
  return {audio:video.audioTracks?.length||0,text:video.textTracks?.length||0};
}
function togglePlayerFit(){
  const v=document.querySelector('video');if(!v)return;
  v.classList.toggle('playerContain');
}




function libraryFacetValues(rows,key){
  return [...new Set((rows||[]).map(x=>x?.[key]).filter(Boolean))].sort();
}
function library2Sort(rows,mode){
  const r=[...(rows||[])];
  if(mode==='title')r.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(mode==='year')r.sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0));
  if(mode==='added')r.sort((a,b)=>new Date(b.addedAt||0)-new Date(a.addedAt||0));
  return r;
}




async function cancelDownload(id){await jpost('/api/downloads/'+encodeURIComponent(id)+'/cancel',{});downloadView()}
async function retryDownload(id){await jpost('/api/downloads/'+encodeURIComponent(id)+'/retry',{});downloadView()}




function showTvMiniGuide(){
  if(!document.documentElement.classList.contains('isTV'))return;
  let box=$('#tvMiniGuide');if(box){box.remove();return}
  box=document.createElement('div');box.id='tvMiniGuide';box.className='tvMiniGuide';
  box.innerHTML=`<b>TV quick menu</b><button onclick="show('guide');$('#tvMiniGuide')?.remove()">Guide</button><button onclick="show('recordings');$('#tvMiniGuide')?.remove()">DVR</button><button onclick="show('search');$('#tvMiniGuide')?.remove()">Search</button>`;
  document.body.appendChild(box);box.querySelector('button')?.focus();
}
window.addEventListener('keydown',e=>{
  if(!document.documentElement.classList.contains('isTV'))return;
  if(e.key==='g'||e.key==='G'||e.key==='Guide'){e.preventDefault();showTvMiniGuide()}
});




let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e});
async function installMyOnlineTv(){
  if(!deferredInstallPrompt){alert('Use your browser menu to install/add MyOnline TV to the home screen.');return}
  deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;
}
function mobileShareCurrent(){
  if(navigator.share)navigator.share({title:'MyOnline TV',url:location.href}).catch(()=>{});
}




async function platformView(){
  const s=await api('/api/platform/status');
  content.innerHTML=`<div class="hero platformHero"><span class=kicker>MYONLINE TV 3.0</span><h2>${esc(s.platform)}</h2><p>One self-hosted platform for Live TV, DVR, Movies, Series and personal media.</p></div><div class=statsGrid><div class=statCard><b>${s.providers}</b><small>IPTV providers</small></div><div class=statCard><b>${s.storageTargets}</b><small>Storage targets</small></div><div class=statCard><b>${s.dvrRules}</b><small>DVR rules</small></div><div class=statCard><b>${s.rooms}</b><small>Rooms</small></div></div><div class=card><h3>Platform capabilities</h3><div class=capabilityGrid>${s.features.map(x=>`<span>✓ ${esc(x)}</span>`).join('')}</div></div><div class=row><button class=btn onclick="show('diagnostics')">Run diagnostics</button><button class=btn onclick="show('appliance')">Appliance</button><button class=btn onclick="show('library')">Library</button><button class=btn onclick="show('recordings')">DVR</button></div>`;
}



// v3.1.0 Source architecture
let effectiveSources=null;
async function refreshEffectiveSources(){try{effectiveSources=await api('/api/sources/effective')}catch{effectiveSources=null}}


// v3.2.0 Player 3.0 shortcuts and preferences
document.addEventListener('keydown',e=>{
 const v=document.querySelector('video'); if(!v||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(e.key===' '){e.preventDefault();v.paused?v.play():v.pause()}
 if(e.key==='ArrowRight')v.currentTime=Math.min(v.duration||1e12,v.currentTime+10);
 if(e.key==='ArrowLeft')v.currentTime=Math.max(0,v.currentTime-10);
 if(e.key.toLowerCase()==='m')v.muted=!v.muted;
 if(e.key.toLowerCase()==='f'&&v.requestFullscreen)v.requestFullscreen().catch(()=>{});
});


// v3.3.0 DVR helpers
async function dvrEngineStatus(){try{return await api('/api/dvr/engine')}catch{return null}}


// v3.4.0 Live mini-guide state
let miniGuideEnabled=true;
function toggleMiniGuide(){miniGuideEnabled=!miniGuideEnabled;document.body.classList.toggle('miniGuideOff',!miniGuideEnabled)}


// v3.5.0 Unified-library preference helper
async function libraryPreferences(){try{return await api('/api/library/preferences')}catch{return {mergeDuplicates:true,preferredSource:'auto'}}}


// v3.7.0 Admin overview helper
async function adminOverview(){try{return await api('/api/admin/overview')}catch{return null}}


// v3.9.0 TV/mobile focus recovery
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&matchMedia('(pointer:coarse)').matches){document.querySelector('nav button:not(.hidden):not(.navConfigHidden)')?.focus({preventScroll:true})}});
window.addEventListener('pageshow',()=>{document.body.dataset.clientMode=innerWidth<721?'mobile':innerWidth>1400?'tv':'desktop'});
window.addEventListener('resize',()=>{document.body.dataset.clientMode=innerWidth<721?'mobile':innerWidth>1400?'tv':'desktop'});


// v4.2.0 Sources 2.0
async function refreshSourceAvailability(){
  try{
    const s=await api('/api/sources/effective');
    document.body.dataset.iptvSourceMode=(s&&s.iptv&&s.iptv.mode)||'unknown';
    document.body.dataset.plexSourceMode=(s&&s.plex&&s.plex.mode)||'unknown';
    document.body.dataset.jellyfinSourceMode=(s&&s.jellyfin&&s.jellyfin.mode)||'unknown';
    document.querySelectorAll('[data-requires-source]').forEach(el=>{
      const k=el.dataset.requiresSource, state=s&&s[k];
      el.classList.toggle('sourceUnavailable',!!state&&!state.available);
      el.setAttribute('aria-disabled',state&&!state.available?'true':'false');
    });
    return s;
  }catch{return null;}
}
window.addEventListener('pageshow',refreshSourceAvailability);


// v4.3.0 Unified Home
const homeSections=['continue','live','nextup','recent','favorites','library'];
function applyHomeLayout(order){
 const host=document.querySelector('#homeView,#view-home,[data-view="home"]'); if(!host)return;
 (order||homeSections).forEach(id=>{const el=host.querySelector(`[data-home-section="${id}"]`);if(el)host.appendChild(el)});
}
function personalizeHome(){
 const h=new Date().getHours();
 document.body.dataset.daypart=h<11?'morning':h<17?'day':h<22?'evening':'night';
 applyHomeLayout();
}
window.addEventListener('pageshow',personalizeHome);


// v4.4.0 Player 4.0
function attachPlayerRecovery(video){
 if(!video||video.dataset.recoveryAttached)return; video.dataset.recoveryAttached='1';
 let retries=0;
 video.addEventListener('stalled',()=>{
   if(retries++<2&&video.currentTime>0){
     const pos=video.currentTime; video.load();
     try{video.currentTime=pos}catch{}
     video.play().catch(()=>{});
   }
 });
 video.addEventListener('playing',()=>{retries=0});
 video.addEventListener('dblclick',()=>video.requestFullscreen&&video.requestFullscreen().catch(()=>{}));
}
function scanPlayers(){document.querySelectorAll('video').forEach(attachPlayerRecovery)}
new MutationObserver(scanPlayers).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pageshow',scanPlayers);


// v4.5.0 Live TV & EPG 4.0
document.addEventListener('keydown',e=>{
 if(!['PageUp','PageDown'].includes(e.key))return;
 const rows=[...document.querySelectorAll('[data-channel-key],.channelRow,.liveChannel')].filter(x=>x.offsetParent!==null);
 if(!rows.length)return;
 const current=rows.indexOf(document.activeElement);
 const i=current<0?0:current;
 const n=e.key==='PageDown'?Math.min(rows.length-1,i+1):Math.max(0,i-1);
 if(rows[n]&&rows[n].focus){rows[n].focus();rows[n].scrollIntoView({block:'nearest'});e.preventDefault()}
});


// v4.6.0 DVR 4.0
async function refreshDvrOverview(){
 try{
  const values=await Promise.all([api('/api/dvr/engine'),api('/api/dvr/upcoming'),api('/api/dvr/conflicts')]);
  window.__myOnlineDvr={engine:values[0],upcoming:values[1],conflicts:values[2],refreshedAt:new Date().toISOString()};
  document.body.dataset.dvrConflicts=Array.isArray(values[2])&&values[2].length?'true':'false';
  return window.__myOnlineDvr;
 }catch{return null;}
}
window.addEventListener('pageshow',refreshDvrOverview);


// v4.7.0 Household
async function refreshHouseholdState(){
 try{
  const values=await Promise.all([api('/api/household/preferences'),api('/api/household/sync-status')]);
  window.__myOnlineHousehold={prefs:values[0],sync:values[1]};
  document.body.dataset.handoffEnabled=values[0]&&values[0].handoffEnabled===false?'false':'true';
  return window.__myOnlineHousehold;
 }catch{return null;}
}
window.addEventListener('pageshow',refreshHouseholdState);


// v4.8.0 PWA 3.0
let myOnlineInstallPrompt=null;
window.addEventListener('online',()=>{document.body.dataset.network='online'});
window.addEventListener('offline',()=>{document.body.dataset.network='offline'});
window.addEventListener('beforeinstallprompt',e=>{
 e.preventDefault();
 myOnlineInstallPrompt=e;
 document.body.dataset.pwaInstallable='true';
});
async function installMyOnlineTv(){
 if(!myOnlineInstallPrompt)return false;
 myOnlineInstallPrompt.prompt();
 await myOnlineInstallPrompt.userChoice;
 myOnlineInstallPrompt=null;
 document.body.dataset.pwaInstallable='false';
 return true;
}
window.addEventListener('pageshow',()=>{document.body.dataset.network=navigator.onLine?'online':'offline'});


// v4.9.0 Appliance Manager
async function applianceManagerSnapshot(){
 try{
  const values=await Promise.all([
   api('/api/appliance/health'),
   api('/api/appliance/readiness'),
   api('/api/platform/status'),
   api('/api/system/backup-readiness')
  ]);
  window.__myOnlineAppliance={health:values[0],readiness:values[1],platform:values[2],backup:values[3],checkedAt:new Date().toISOString()};
  return window.__myOnlineAppliance;
 }catch{return null;}
}


// v5.0.0 Unified Media Appliance
window.MYONLINE_PRODUCT={name:'MyOnline TV',version:'5.0.0',generation:5,experience:'Unified Media Appliance'};
async function unifiedMediaReadiness(){
 const result={version:'5.0.0',network:navigator.onLine,checkedAt:new Date().toISOString()};
 try{result.sources=await api('/api/sources/effective')}catch{}
 try{result.appliance=await api('/api/appliance/readiness')}catch{}
 return result;
}


// v5.1.0 Stability & Performance
window.MYONLINE_RUNTIME={requests:0,failures:0,lastFailure:null,startedAt:new Date().toISOString()};
window.addEventListener('error',e=>{window.MYONLINE_RUNTIME.failures++;window.MYONLINE_RUNTIME.lastFailure=String(e.message||'error')});
window.addEventListener('unhandledrejection',e=>{window.MYONLINE_RUNTIME.failures++;window.MYONLINE_RUNTIME.lastFailure=String(e.reason||'promise rejection')});
function runtimeSnapshot(){return {...window.MYONLINE_RUNTIME,online:navigator.onLine,visibility:document.visibilityState,at:new Date().toISOString()}}


// v5.2.0 Source Engine 3.0
window.MyOnlineSourceEngine={
 state:null,
 async refresh(){try{this.state=await api('/api/sources/effective');return this.state}catch{this.state=null;return null}},
 mode(type){return this.state&&this.state[type]?this.state[type].mode:'unknown'},
 available(type){return !!(this.state&&this.state[type]&&this.state[type].available)},
 async require(type){if(!this.state)await this.refresh();return this.available(type)}
};
window.addEventListener('pageshow',()=>window.MyOnlineSourceEngine.refresh());


// v5.3.0 Smart Player
window.MyOnlineSmartPlayer={
 attach(video){
  if(!video||video.dataset.smartPlayer)return; video.dataset.smartPlayer='1';
  video.addEventListener('loadedmetadata',()=>{video.dataset.durationKnown=Number.isFinite(video.duration)?'true':'false'});
  video.addEventListener('waiting',()=>document.body.dataset.playerState='buffering');
  video.addEventListener('playing',()=>document.body.dataset.playerState='playing');
  video.addEventListener('pause',()=>document.body.dataset.playerState='paused');
  video.addEventListener('ended',()=>document.body.dataset.playerState='ended');
 },
 scan(){document.querySelectorAll('video').forEach(v=>this.attach(v))}
};
new MutationObserver(()=>window.MyOnlineSmartPlayer.scan()).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('pageshow',()=>window.MyOnlineSmartPlayer.scan());


// v5.4.0 Live TV Experience
window.MyOnlineChannelHistory={
 key:'myonline-channel-history',
 load(){try{return JSON.parse(localStorage.getItem(this.key)||'[]')}catch{return []}},
 add(channel){if(!channel)return;let a=this.load().filter(x=>x.id!==channel.id);a.unshift(channel);localStorage.setItem(this.key,JSON.stringify(a.slice(0,12)))},
 clear(){localStorage.removeItem(this.key)}
};
let numericChannelBuffer='',numericChannelTimer=null;
document.addEventListener('keydown',e=>{
 if(!/^[0-9]$/.test(e.key)||['INPUT','TEXTAREA'].includes(document.activeElement&&document.activeElement.tagName))return;
 numericChannelBuffer=(numericChannelBuffer+e.key).slice(-4);
 document.body.dataset.channelNumber=numericChannelBuffer;
 clearTimeout(numericChannelTimer);
 numericChannelTimer=setTimeout(()=>{window.dispatchEvent(new CustomEvent('myonline:channel-number',{detail:numericChannelBuffer}));numericChannelBuffer='';delete document.body.dataset.channelNumber},900);
});


// v5.5.0 DVR Scheduler
window.MyOnlineDvrScheduler={
 state:null,
 async refresh(){
  try{
   const r=await Promise.all([api('/api/dvr/engine'),api('/api/dvr/upcoming'),api('/api/dvr/conflicts')]);
   this.state={engine:r[0],upcoming:r[1],conflicts:r[2],at:new Date().toISOString()};
   document.body.dataset.dvrConflict=this.state.conflicts&&this.state.conflicts.length?'true':'false';
   return this.state;
  }catch{return null}
 },
 next(){return this.state&&this.state.upcoming&&this.state.upcoming.length?this.state.upcoming[0]:null}
};
window.addEventListener('pageshow',()=>window.MyOnlineDvrScheduler.refresh());


// v5.6.0 Unified Library 4.0
window.MyOnlineLibrary={
 normalizeTitle(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,' ').trim()},
 key(item){return [this.normalizeTitle(item&&item.title),item&&item.year||''].join('|')},
 group(items){const m=new Map();(items||[]).forEach(x=>{const k=this.key(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)});return [...m.values()]},
 preferred(group,source){return (group||[]).find(x=>x.source===source)||(group||[])[0]||null}
};


// v5.7.0 Recommendations
window.MyOnlineRecommendations={
 score(item){
  let s=0;
  if(item&&item.continueWatching)s+=100;
  if(item&&item.nextEpisode)s+=80;
  if(item&&item.favorite)s+=40;
  if(item&&item.recentlyAdded)s+=20;
  if(item&&item.available===false)s-=1000;
  return s;
 },
 rank(items,limit=24){return [...(items||[])].sort((a,b)=>this.score(b)-this.score(a)).slice(0,limit)}
};


// v5.8.0 Multi-room & Remote
window.MyOnlineRemote={
 send(command,detail={}){window.dispatchEvent(new CustomEvent('myonline:remote',{detail:{command,...detail,at:Date.now()}}))},
 play(){this.send('play')},pause(){this.send('pause')},next(){this.send('next')},previous(){this.send('previous')},
 volume(value){this.send('volume',{value})}
};
window.addEventListener('myonline:remote',e=>{
 const v=document.querySelector('video'); if(!v)return;
 if(e.detail.command==='play')v.play().catch(()=>{});
 if(e.detail.command==='pause')v.pause();
 if(e.detail.command==='volume'&&Number.isFinite(Number(e.detail.value)))v.volume=Math.max(0,Math.min(1,Number(e.detail.value)));
});


// v5.9.0 Appliance Operations
window.MyOnlineOperations={
 snapshot:null,
 async refresh(){
  try{
   const r=await Promise.all([api('/api/appliance/health'),api('/api/appliance/readiness'),api('/api/system/backup-readiness'),api('/api/platform/status')]);
   this.snapshot={health:r[0],readiness:r[1],backup:r[2],platform:r[3],at:new Date().toISOString()};
   return this.snapshot;
  }catch{return null}
 },
 exportSupportSummary(){
  const data={product:window.MYONLINE_PRODUCT||null,runtime:runtimeSnapshot?runtimeSnapshot():null,operations:this.snapshot};
  return JSON.stringify(data,null,2);
 }
};


// v20.1.0 Native Client Generation
window.MYONLINE_PRODUCT={name:'MyOnline TV',version:'20.1.0',generation:6,experience:'Server + Web/PWA + Native Client API'};
window.MyOnlineClientBridge={
 version:1,
 capabilities(){return {sourceEngine:true,player:true,live:true,guide:true,library:true,dvr:true,profiles:true,rooms:true,remote:true}},
 emit(name,detail={}){window.dispatchEvent(new CustomEvent('myonline:client',{detail:{name,...detail,at:Date.now()}}))}
};
