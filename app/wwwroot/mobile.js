// Mobile enhancements share the application's permissions, media state and players.
function mobileNavigationItems(){
  return [...document.querySelectorAll('#app > aside nav button[data-view]')]
    .filter(b=>!b.classList.contains('hidden')&&!b.classList.contains('navConfigHidden')&&
      (!b.hasAttribute('data-admin-only')||authState.role==='Admin')&&viewAllowed(b.dataset.view));
}
renderMobileNavigation=function(){
  const host=$('#mobileBottomNav');if(!host)return;
  const items=mobileNavigationItems(),primary=items.slice(0,4);
  host.style.setProperty('--nav-columns',primary.length+1);
  host.innerHTML=primary.map(b=>`<button data-mobile-view="${escAttr(b.dataset.view)}" ${currentView===b.dataset.view?'class="active" aria-current="page"':''}><span aria-hidden="true">${esc(b.textContent.trim().split(' ')[0])}</span><small>${esc(navigationLabels[b.dataset.view]||b.textContent.trim())}</small></button>`).join('')+
    `<button id="mobileMoreButton" aria-haspopup="dialog" aria-expanded="false" ${items.slice(4).some(b=>b.dataset.view===currentView)?'class="active"':''}><span aria-hidden="true">•••</span><small>More</small></button>`;
  host.querySelectorAll('[data-mobile-view]').forEach(b=>b.onclick=()=>show(b.dataset.mobileView));
  $('#mobileMoreButton').onclick=toggleMobileMore;
};
let mobileSheetFocus=null;
function closeMobileMore(restoreFocus=true){
  const sheet=$('#mobileMoreSheet');if(!sheet)return;
  sheet.classList.add('hidden');sheet.setAttribute('aria-hidden','true');
  document.body.classList.remove('mobileSheetOpen');
  $('#mobileMoreButton')?.setAttribute('aria-expanded','false');
  if(restoreFocus&&mobileSheetFocus?.isConnected)mobileSheetFocus.focus();
  mobileSheetFocus=null;
}
toggleMobileMore=function(){
  const sheet=$('#mobileMoreSheet');if(!sheet)return;
  if(!sheet.classList.contains('hidden')){closeMobileMore();return;}
  mobileSheetFocus=document.activeElement;
  sheet.innerHTML='<div class="mobileSheetHeading"><h2 id="moreHeading">More</h2><button class="btn" id="closeMobileMore" aria-label="Close menu">×</button></div><div class="mobileMoreGrid"></div>';
  sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','moreHeading');
  const grid=sheet.querySelector('.mobileMoreGrid');
  mobileNavigationItems().slice(4).forEach(source=>{
    const button=document.createElement('button');button.textContent=source.textContent;
    if(source.dataset.view===currentView)button.setAttribute('aria-current','page');
    button.onclick=()=>{closeMobileMore(false);show(source.dataset.view);};grid.append(button);
  });
  sheet.classList.remove('hidden');sheet.setAttribute('aria-hidden','false');document.body.classList.add('mobileSheetOpen');
  $('#mobileMoreButton')?.setAttribute('aria-expanded','true');
  $('#closeMobileMore').onclick=()=>closeMobileMore();$('#closeMobileMore').focus();
};
document.addEventListener('click',e=>{
  if(mobileSheetFocus&&!e.target.closest('#mobileMoreSheet,#mobileMoreButton'))closeMobileMore();
},true);
document.addEventListener('keydown',e=>{
  if(!mobileSheetFocus)return;
  if(e.key==='Escape'){e.preventDefault();closeMobileMore();return;}
  if(e.key==='Tab'){
    const buttons=[...$('#mobileMoreSheet').querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
},true);

// A phone remains a phone in landscape; keyboard resizing does not change mode.
const originalResponsiveMode=updateResponsiveMode;
updateResponsiveMode=function(){
  originalResponsiveMode();
  const phone=matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<720;
  if(phone){
    const root=document.documentElement;root.classList.add('isMobile');root.classList.remove('isTablet','isTV','isDesktop');
    document.body.dataset.clientMode='mobile';
  }
};
updateResponsiveMode();

let mobileGuideLayout='list';
function mobileGuideControls(){
  return `<div class="row mobileGuideSwitch" aria-label="Guide layout"><button class="btn" aria-pressed="${mobileGuideLayout==='list'}" onclick="mobileGuideLayout='list';guide()">List</button><button class="btn" aria-pressed="${mobileGuideLayout==='timeline'}" onclick="mobileGuideLayout='timeline';guide()">Timeline</button></div>`;
}
const originalRenderGuide=renderGuide;
renderGuide=function(start,hours){
  originalRenderGuide(start,hours);
  if(document.body.dataset.clientMode!=='mobile')return;
  $('.guideHeader').insertAdjacentHTML('beforeend',mobileGuideControls());
  if(mobileGuideLayout==='timeline')return;
  const timeline=$('.timelineWrap'),list=document.createElement('div');list.className='mobileGuideList';
  const reference=guideWindow==='now'?Date.now():start.getTime();
  channels.filter(c=>!isChannelHidden(c)).forEach(c=>{
    const programs=epg.filter(p=>String(p.channel)===String(c.id)||String(p.channel)===String(c.epgId))
      .filter(p=>new Date(p.stop).getTime()>reference).sort((a,b)=>new Date(a.start)-new Date(b.start));
    const card=document.createElement('section');card.className='card';
    const heading=document.createElement('button');heading.className='btn';heading.textContent=channelName(c)+' · Live';heading.onclick=()=>playLive(c.key,c.name);card.append(heading);
    programs.slice(0,guideWindow==='now'?2:6).forEach((p,i)=>{
      const button=document.createElement('button');button.className='mobileGuideProgramme';
      const active=new Date(p.start).getTime()<=reference;
      button.textContent=`${guideWindow==='now'?(i===0&&active?'Now · ':'Next · '):''}${liveProgramTimes(p)} — ${p.title}`;
      button.onclick=()=>showGuideProgramActions(c.key,channelName(c),JSON.stringify(p));card.append(button);
    });
    if(!programs.length){const empty=document.createElement('p');empty.textContent='No programme information available.';card.append(empty);}
    list.append(card);
  });
  if(!list.children.length)list.textContent='No visible channels. Choose another source.';
  timeline.replaceWith(list);
};

function mobileLiveQuickFilter(value){
  const select=$('#group');if(!select)return;select.value=value;renderFilter();
  $('#mobile371GroupLabel').textContent=select.selectedOptions[0].textContent;
  document.querySelectorAll('[data-live-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.liveFilter===value)));
}
let mobilePlayerObserver=null;
const originalMobileChannels=renderMobile371Channels;
renderMobile371Channels=function(){
  mobilePlayerObserver?.disconnect();originalMobileChannels();
  $('.mobile371LiveTools').insertAdjacentHTML('afterend',`<div class="row mobileQuickFilters">${[['','All'],['__favorites','★ Favourites'],['__recent','Recent']].map(([value,label])=>`<button class="btn" data-live-filter="${value}" aria-pressed="${value===''}" onclick="mobileLiveQuickFilter(this.dataset.liveFilter)">${label}</button>`).join('')}</div>`);
  const stage=$('.mobile371PlayerStage'),anchor=document.createElement('div');anchor.className='mobilePlayerAnchor';stage.before(anchor);
  const restore=document.createElement('button');restore.className='btn mobileRestorePlayer';restore.textContent='Expand player';
  restore.onclick=()=>{stage.classList.remove('isMini');anchor.scrollIntoView({block:'start'});};stage.append(restore);
  mobilePlayerObserver=new IntersectionObserver(entries=>{
    const above=entries[0].boundingClientRect.top<0;
    stage.classList.toggle('isMini',above&&!!stage.querySelector('video')&&!document.fullscreenElement);
  },{threshold:0,rootMargin:'-64px 0px 0px 0px'});
  mobilePlayerObserver.observe(anchor);
};

let mobileCollectionKind='continue',mobileCollectionSort='recent';
async function mobileCollectionView(){
  const kind=mobileCollectionKind;
  content.innerHTML='<div class="card" role="status">Loading your list…</div>';
  try{
    const rows=kind==='continue'?await api('/api/continue'):getMediaFavs();
    if(currentView!=='collection')return;
    if(mobileCollectionSort==='title')rows.sort((a,b)=>String(a.title||a.name).localeCompare(String(b.title||b.name)));
    content.innerHTML=`<div class="sectionHead"><h1>${kind==='continue'?'Continue Watching':'My List'}</h1><label>Sort <select id="collectionSort"><option value="recent">Recent</option><option value="title">Title</option></select></label></div><div id="collectionItems" class="mobileCollection"></div><div id="mediaPlayer"></div>`;
    $('#collectionSort').value=mobileCollectionSort;$('#collectionSort').onchange=e=>{mobileCollectionSort=e.target.value;mobileCollectionView();};
    if(kind==='continue'&&rows.length){const clear=document.createElement('button');clear.className='btn';clear.textContent='Clear Continue Watching';clear.onclick=clearContinueWatching;$('.sectionHead').append(clear);}
    if(!rows.length){$('#collectionItems').textContent=kind==='continue'?'Start watching something to see it here.':'Add favourites to build your list.';return;}
    rows.forEach(item=>{
      const card=document.createElement('article');card.className='card';
      if(kind==='continue')card.dataset.continueId=item.id;
      const play=document.createElement('button');play.className='mobileCollectionPlay';
      if(item.poster){const img=document.createElement('img');img.src=item.poster;img.alt='';img.loading='lazy';play.append(img);}
      const label=document.createElement('span');label.textContent=item.title||item.name||'Media';play.append(label);
      play.onclick=()=>kind==='continue'?resumeContinueItem(item):openHomeFavourite(item);
      const remove=document.createElement('button');remove.className='btn';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+label.textContent);
      remove.onclick=async()=>{
        remove.disabled=true;
        try{
          if(kind==='continue')await removeContinueWatching(item.id);
          else{
            localStorage.setItem(mediaFavKey(),JSON.stringify(getMediaFavs().filter(x=>!(x.type===item.type&&String(x.id)===String(item.id)&&x.providerId===item.providerId))));
            await syncProfileMediaState(`${item.type}:${item.id}`,{title:item.name||item.title,kind:item.type,favourite:false,poster:item.poster||''});
          }
          await mobileCollectionView();
        }catch(e){remove.disabled=false;alert(friendlyError(e));}
      };
      card.append(play,remove);$('#collectionItems').append(card);
    });
  }catch(e){content.innerHTML=`${errorCard(e)}<button class="btn" onclick="mobileCollectionView()">Try again</button>`;}
}
function openMobileCollection(kind){mobileCollectionKind=kind;return show('collection');}
async function openHomeFavourite(item){
  if(String(item.id).includes(':')&&['plex','jellyfin'].includes(String(item.id).split(':')[0]))return playUnifiedItem({...item,kind:item.type});
  if(item.providerId)currentProvider=item.providerId;
  if(item.type==='series'){await show('series');await openSeries(item.id);}
  else{await show('movies');movieDetails(item.id);}
}

function mobileHomeStatus(label,state,hasItems){
  if(state==='loading')return `<section class="mobileHomeState" role="status"><h2>${label}</h2><div class="mobileSkeleton" aria-hidden="true"></div><p>Loading…</p></section>`;
  if(state==='error')return `<section class="mobileHomeState" role="status"><h2>${label}</h2><p>${hasItems?'Showing saved items. Could not refresh.':'Could not load this section.'}</p><button class="btn" onclick="home()">Try again</button></section>`;
  if(!hasItems)return `<section class="mobileHomeState"><h2>${label}</h2><p>${label==='Continue Watching'?'Start watching something to see it here.':'No items available from your sources.'}</p></section>`;
  return '';
}

function openMobileMediaMenu(kind,item){
  document.querySelector('.mobileMediaMenu')?.remove();
  const dialog=document.createElement('dialog');dialog.className='mobileMediaMenu';
  dialog.setAttribute('aria-labelledby','mobileMediaMenuTitle');
  const heading=document.createElement('h2');heading.id='mobileMediaMenuTitle';heading.textContent=item.name||item.title||'Media';dialog.append(heading);
  const actions=[
    ['Details',()=>kind==='movie'?movieDetails(item.id):openSeries(item.id)],
    [isMediaFav(kind,item.id)?'Remove favourite':'Add favourite',()=>toggleMediaFav(kind,item)]
  ];
  if(kind==='movie')actions.push(['Play',()=>playMovie(item.id,item.name)],['Download',()=>downloadMovie(item.id,item.name)]);
  actions.push(['Close',()=>{}]);
  actions.forEach(([label,action])=>{const button=document.createElement('button');button.className='btn';button.textContent=label;button.onclick=()=>{dialog.close();action();};dialog.append(button);});
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  document.body.append(dialog);dialog.showModal();
}
const originalFilterMedia=filterMedia;
filterMedia=function(){
  originalFilterMedia();if(document.body.dataset.clientMode!=='mobile')return;
  const q=($('#mediaq')?.value||'').trim().toLowerCase(),sort=$('#movieSort')?.value||'name';
  const rows=mediaSortRows(mediaItems.filter(x=>!q||String(x.name||'').toLowerCase().includes(q)||String(x.genre||'').toLowerCase().includes(q)),sort).slice(0,1000);
  document.querySelectorAll('#mediaGrid .mediaCardActions').forEach((host,i)=>{
    const item=rows[i];if(!item)return;
    const favorite=host.querySelector('button:last-child');favorite?.setAttribute('aria-label',isMediaFav('movie',item.id)?'Remove favourite':'Add favourite');
    const button=document.createElement('button');button.className='btn';button.textContent='More';button.setAttribute('aria-label','More actions for '+item.name);button.onclick=e=>{e.stopPropagation();openMobileMediaMenu('movie',item);};host.append(button);
  });
};
const originalFilterSeries=filterSeries;
filterSeries=function(){
  originalFilterSeries();if(document.body.dataset.clientMode!=='mobile')return;
  const q=($('#seriesq')?.value||'').trim().toLowerCase(),sort=$('#seriesSort')?.value||'name';
  const rows=mediaSortRows(seriesItems.filter(x=>!q||String(x.name||'').toLowerCase().includes(q)),sort).slice(0,1000);
  document.querySelectorAll('#seriesContent .seriesButton').forEach((card,i)=>{
    const item=rows[i];if(!item)return;
    const wrapper=document.createElement('div');wrapper.className='mobileSeriesCard';card.before(wrapper);wrapper.append(card);
    const button=document.createElement('button');button.className='btn';button.textContent='More';button.setAttribute('aria-label','More actions for '+item.name);button.onclick=()=>openMobileMediaMenu('series',item);wrapper.append(button);
  });
};

// History stores routes and form values, never DOM/video objects or credentials.
let mobileRoute=null,mobileNavigationDepth=0,mobileHistoryRestoring=false;
const routeActions={};
function captureMobileRoute(){
  if(!mobileRoute)return;
  mobileRoute.scroll=window.scrollY;
  if(!mobileRoute.steps.length)mobileRoute.provider=currentProvider;
  mobileRoute.sort=mobileCollectionSort;
  // Keep the original search when details replace its input; exclude source credentials.
  mobileRoute.form||={};
  for(const id of ['provider','category','mediaq','movieSort','seriesq','seriesSort','globalq','q','group','collectionSort']){
    const el=document.getElementById(id);if(el&&content.contains(el))mobileRoute.form[id]=el.value;
  }
  mobileRoute.season=$('.seasonTab.activeBtn')?.dataset.seasonTab;
  history.replaceState({myonline:structuredClone(mobileRoute)},'');
}
const originalShow=show;
show=async function(view){
  const top=mobileNavigationDepth===0&&!mobileHistoryRestoring;
  if(top)captureMobileRoute();
  closeMobileMore(false);mobilePlayerObserver?.disconnect();
  mobileNavigationDepth++;
  try{
    if(view==='collection'){destroyPlayer();currentView=view;renderMobileNavigation();title.textContent=mobileCollectionKind==='continue'?'Continue Watching':'My List';await mobileCollectionView();}
    else await originalShow(view);
  }finally{mobileNavigationDepth--;}
  if(top){
    const replace=!mobileRoute||(mobileRoute.view===currentView&&!mobileRoute.steps.length&&mobileRoute.collection===mobileCollectionKind);
    mobileRoute={view:currentView,steps:[],provider:currentProvider,collection:mobileCollectionKind,sort:mobileCollectionSort,form:{},scroll:0};
    history[replace?'replaceState':'pushState']({myonline:structuredClone(mobileRoute)},'');
    window.scrollTo(0,0);
  }
};
function routeAction(name,fn){
  routeActions[name]=fn;
  return async function(...args){
    const top=mobileNavigationDepth===0&&!mobileHistoryRestoring;
    if(top){captureMobileRoute();homeRefreshGeneration++;}
    mobileNavigationDepth++;
    try{return await fn(...args);}
    finally{
      mobileNavigationDepth--;
      if(top&&mobileRoute){
        const last=mobileRoute.steps.at(-1),step={name,args};
        if(JSON.stringify(last)!==JSON.stringify(step)){
          mobileRoute={...mobileRoute,steps:[...mobileRoute.steps,step],scroll:window.scrollY};
          history.pushState({myonline:structuredClone(mobileRoute)},'');
        }
      }
    }
  };
}
movieDetails=routeAction('movieDetails',movieDetails);
openSeries=routeAction('openSeries',openSeries);
playMovie=routeAction('playMovie',playMovie);
playEpisode=routeAction('playEpisode',playEpisode);
playUnifiedItem=routeAction('playUnifiedItem',playUnifiedItem);
resumeContinueItem=routeAction('resumeContinueItem',resumeContinueItem);
openHomeFavourite=routeAction('openHomeFavourite',openHomeFavourite);
window.addEventListener('popstate',async e=>{
  if(!e.state?.myonline)return;
  mobileHistoryRestoring=true;
  try{
    const route=structuredClone(e.state.myonline);mobileRoute=route;currentProvider=route.provider;
    mobileCollectionKind=route.collection||'continue';mobileCollectionSort=route.sort||'recent';
    await show(route.view);
    for(const [id,value] of Object.entries(route.form||{})){
      const el=document.getElementById(id);if(!el||!content.contains(el))continue;
      const changed=el.value!==value;el.value=value;
      if(changed&&el.tagName==='SELECT')await el.onchange?.({target:el});
    }
    if($('#mediaq'))filterMedia();if($('#seriesq'))filterSeries();if($('#q'))renderFilter();
    if($('#globalq')?.value)await $('#globalSearchBtn')?.onclick?.();
    if(route.steps.length)homeRefreshGeneration++;
    for(const step of route.steps)await routeActions[step.name]?.(...step.args);
    if(route.season){const button=content.querySelector(`[data-season-tab="${CSS.escape(route.season)}"]`);if(button)selectSeriesSeason(route.season,button);}
    requestAnimationFrame(()=>window.scrollTo(0,route.scroll||0));
  }catch(e){content.innerHTML=errorCard(e);}
  finally{mobileHistoryRestoring=false;}
});
// The existing detail buttons should follow the same route as the browser Back button.
document.addEventListener('click',e=>{
  if(e.target.closest('.cinemaBack')&&mobileRoute?.steps.length){e.preventDefault();e.stopImmediatePropagation();history.back();}
},true);
new MutationObserver(()=>renderMobileNavigation()).observe(document.querySelector('#app > aside nav'),{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
renderMobileNavigation();
// Start only after all view enhancements and history handlers are installed.
boot().catch(e=>{$('#auth').classList.remove('hidden');$('#auth').innerHTML=`<div class=authCard><h2>Startup error</h2><pre>${esc(e.message)}</pre></div>`});
