// All layouts use the same profile-scoped Continue Watching API.
let continueHomeSnapshot=null;
function continueCardActions(markup,item){
  return `<div class="continueManagedCard" data-continue-id="${escAttr(item.id)}">${markup}<button class="btn continueMenuButton" aria-haspopup="dialog" aria-label="Actions for ${escAttr(item.title||item.name||'Continue Watching')}" onclick="openContinueActions(this.closest('[data-continue-id]').dataset.continueId,this)">•••</button></div>`;
}
const continueMobileCard=mobile364ContinueCard;
mobile364ContinueCard=item=>continueCardActions(continueMobileCard(item),item);
const continueTabletCard=tablet365ContinueCard;
tablet365ContinueCard=item=>continueCardActions(continueTabletCard(item),item);
const continueDesktopCard=desktop362MediaCard;
desktop362MediaCard=(item,kind)=>kind==='continue'?continueCardActions(continueDesktopCard(item,kind),item):continueDesktopCard(item,kind);
const continueTvCard=tvHome361Poster;
tvHome361Poster=(item,kind)=>kind==='continue'?continueCardActions(continueTvCard(item,kind),item):continueTvCard(item,kind);
const continueRenderHome=renderHomeContent;
renderHomeContent=function(data){
  continueHomeSnapshot={...data,continueItems:[...(data.continueItems||[])]};
  continueRenderHome(data);
  const section=content.querySelector('[data-continue-id]')?.closest('section');
  if(section){
    const header=section.querySelector('header');
    if(header){const button=document.createElement('button');button.className='btn continueClearButton';button.textContent='Clear Continue Watching';button.onclick=clearContinueWatching;header.append(button);}
  }
};
function continueDialog(title,actions,trigger){
  const dialog=document.createElement('dialog');dialog.className='continueActionsDialog';
  const heading=document.createElement('h2');heading.id='continueDialogTitle';heading.textContent=title;
  dialog.setAttribute('aria-labelledby',heading.id);dialog.append(heading);
  actions.forEach(([label,action])=>{
    const button=document.createElement('button');button.className='btn';button.textContent=label;
    button.onclick=async()=>{button.disabled=true;try{await action();dialog.close();}catch(e){button.disabled=false;let error=dialog.querySelector('[role=alert]');if(!error){error=document.createElement('p');error.setAttribute('role','alert');dialog.append(error);}error.textContent=friendlyError(e);}};
    dialog.append(button);
  });
  dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus();else content.querySelector('.continueMenuButton,button')?.focus({preventScroll:true});});
  document.body.append(dialog);dialog.showModal();
}
function openContinueActions(id,trigger){
  continueDialog('Continue Watching',[
    ['Remove from Continue Watching',()=>removeContinueWatching(id)],
    ['Cancel',()=>{}]
  ],trigger);
}
function updateContinueAfterRemoval(id){
  homeRefreshGeneration++; // Discard stale catalogue/poster refreshes containing removed items.
  document.querySelectorAll('video').forEach(video=>{if(id===null||video.dataset.continueId===id)video.dataset.continueRemoved='true';});
  if(continueHomeSnapshot){
    continueHomeSnapshot.continueItems=id===null?[]:continueHomeSnapshot.continueItems.filter(x=>String(x.id)!==id);
    if(currentView==='home'&&!content.querySelector('video')){
      const scroll=window.scrollY;renderHomeContent(continueHomeSnapshot);window.scrollTo(0,scroll);
    }
  }
  content.querySelectorAll('[data-continue-id]').forEach(card=>{if(id===null||card.dataset.continueId===id)card.remove();});
}
removeContinueWatching=async function(id){
  await api('/api/continue/'+encodeURIComponent(id),{method:'DELETE'});
  updateContinueAfterRemoval(String(id));
};
clearContinueWatching=function(){
  continueDialog('Clear Continue Watching? This removes watch progress from this list only. Media and favourites are kept.',[
    ['Cancel',()=>{}],
    ['Clear Continue Watching',async()=>{await api('/api/continue',{method:'DELETE'});updateContinueAfterRemoval(null);if(currentView==='collection')await mobileCollectionView();}]
  ],document.activeElement);
};
