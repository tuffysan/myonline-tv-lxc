const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../../app/wwwroot');
const server = http.createServer(async (req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await fs.readFile(file);
    res.setHeader('Content-Type', ({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true,...(process.env.MOBILE_BROWSER_CHANNEL?{channel:process.env.MOBILE_BROWSER_CHANNEL}:{})});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
    let failCatalogue=false,searchFixture=false;
    const now=Date.now();
    const channels=Array.from({length:30},(_,i)=>({id:String(i),key:'c'+i,name:'Channel '+i,group:'News',epgId:'epg'+i}));
    const epg=channels.flatMap(c=>[{channel:c.id,title:'Current programme',start:new Date(now-1800000),stop:new Date(now+1800000)},{channel:c.id,title:'Next programme',start:new Date(now+1800000),stop:new Date(now+3600000)}]);
    let continueItems=[{id:'iptv-movie:p:1',title:'Ångström',positionSeconds:90,durationSeconds:500}];
    const apiRoutes=async route=>{
      const url=new URL(route.request().url());
      if(url.hostname!=='127.0.0.1'){await route.fulfill({body:'',status:200});return;}
      if(!url.pathname.startsWith('/api/')){await route.continue();return;}
      const p=url.pathname;let body=[];
      if(p==='/api/auth/status')body={configured:false,authenticated:false};
      else if(p==='/api/providers')body=[{id:'p',name:'Test source',type:'xtream'}];
      else if(p.startsWith('/api/channel-preferences/'))body={hiddenGroups:[],hiddenChannels:[],aliases:{}};
      else if(p.startsWith('/api/channels/'))body=channels;
      else if(p.startsWith('/api/epg/'))body=epg;
      else if(p==='/api/continue'&&route.request().method()==='DELETE')continueItems=[];
      else if(p==='/api/continue')body=continueItems;
      else if(p.startsWith('/api/continue/')&&route.request().method()==='DELETE')continueItems=continueItems.filter(x=>x.id!==decodeURIComponent(p.slice('/api/continue/'.length)));
      else if(p.endsWith('/categories'))body=[{id:'a',name:'Drama'}];
      else if(p.includes('/vod/')&&p.endsWith('/items'))body=[{id:'1',name:'Ångström',year:2024},{id:'2',name:'Other movie',year:2023}];
      else if(p.includes('/series/')&&p.endsWith('/items'))body=[{id:'s1',name:'Test series'}];
      else if(p==='/api/series/p/s1')body={id:'s1',name:'Test series',episodes:[{id:'e1',season:1,episode:1,title:'First',extension:'mp4'}]};
      else if(p.startsWith('/api/unified/')){
        await new Promise(resolve=>setTimeout(resolve,100));
        if(failCatalogue){await route.fulfill({status:500,body:'Test catalogue unavailable'});return;}
        if(searchFixture&&p==='/api/unified/series')body=[{id:'plex:library:s1',name:'Search series',kind:'series'}];
        if(searchFixture&&p.endsWith('/episodes'))body=[{id:'plex:library:e1',name:'First episode',seasonNumber:1,episodeNumber:1}];
      }
      await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
    };
    await page.route('**/*',apiRoutes);
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.waitForFunction(()=>typeof mobileNavigationItems==='function');
    await page.evaluate(()=>{
      $('#auth').classList.add('hidden');$('#app').classList.remove('hidden');
      authState={user:'Mobile test',role:'Admin'};providers=[{id:'p',name:'Test source',type:'xtream'}];currentProvider='p';
      renderMobileNavigation();
    });

    // Menu parity, one active destination, configuration and role filtering.
    await page.evaluate(()=>show('series'));
    assert.equal(await page.locator('#mobileBottomNav .active').count(),1);
    await page.locator('#mobileMoreButton').click();
    for(const label of ['Library','Alerts','Rooms'])assert.ok((await page.locator('#mobileMoreSheet').innerText()).includes(label));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('mobileSheetOpen')),false);
    await page.locator('#mobileMoreButton').click();
    await page.locator('main > header').click({position:{x:5,y:5}});
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('mobileSheetOpen')),false);
    await page.evaluate(()=>{authState.role='User';navigationConfig={items:[{id:'movies',enabled:false}]};applyNavigationConfig();});
    await page.locator('#mobileMoreButton').click();
    assert.equal(await page.locator('#mobileMoreSheet button').filter({hasText:'Admin'}).count(),0);
    assert.equal(await page.locator('#mobileBottomNav [data-mobile-view="movies"]').count(),0);
    await page.keyboard.press('Escape');
    console.log('PASS navigation and menu dismissal');

    // Movie details -> Back restores catalogue filters and selection.
    await page.evaluate(()=>{authState.role='Admin';navigationConfig={items:[{id:'movies',enabled:true}]};applyNavigationConfig();return show('movies');});
    await page.locator('#mediaq').fill('Ång');
    await page.waitForFunction(()=>document.querySelectorAll('#mediaGrid .posterCard').length===1);
    await page.locator('#mediaGrid .posterCard').click();
    await page.waitForSelector('.movieCinemaDetail');
    await page.goBack();
    await page.waitForFunction(()=>!document.querySelector('.movieCinemaDetail')&&document.querySelector('#mediaq')?.value==='Ång');
    assert.equal(await page.locator('#mediaGrid .posterCard').count(),1);
    assert.notEqual(await page.locator('.mediaCardActions').evaluate(el=>getComputedStyle(el).display),'none');
    await page.getByRole('button',{name:'More actions for Ångström'}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Add favourite',exact:true}).click();
    assert.equal(await page.evaluate(()=>isMediaFav('movie','1')),true);
    console.log('PASS detail history, filters and visible actions');

    // Search -> series -> episode -> Back twice restores both details and query.
    searchFixture=true;
    await page.evaluate(()=>{
      window.savedPlayback=playServerMedia;
      playServerMedia=async()=>{const video=document.createElement('video');video.dataset.testPlayback='true';$('#mediaPlayer').replaceChildren(video);};
      return show('search');
    });
    await page.locator('#globalq').fill('Search series');
    await page.locator('#globalSearchBtn').click();
    await page.locator('#globalSearchResults .posterCard').click();
    await page.locator('#unifiedEpisodeList .episodeCard').click();
    await page.waitForSelector('video[data-test-playback]');
    await page.goBack();
    await page.waitForSelector('#unifiedEpisodeList .episodeCard');
    assert.equal(await page.locator('video').count(),0);
    await page.goBack();
    await page.waitForFunction(()=>document.querySelector('#globalq')?.value==='Search series'&&!document.querySelector('#unifiedEpisodeList'));
    await page.waitForSelector('#globalSearchResults .posterCard');
    await page.evaluate(()=>{playServerMedia=window.savedPlayback;delete window.savedPlayback;});
    searchFixture=false;
    console.log('PASS search -> series -> episode history');

    await page.evaluate(()=>show('guide'));
    assert.equal(await page.locator('.mobileGuideList .card').count(),30);
    await page.locator('.mobileGuideProgramme').first().click();
    await page.waitForSelector('#programActionSheet');
    await page.evaluate(()=>closeProgramActions());
    await page.getByRole('button',{name:'Timeline',exact:true}).click();
    await page.waitForSelector('.timelineWrap');
    console.log('PASS guide list, programme actions and timeline');

    await page.evaluate(()=>show('live'));
    await page.evaluate(()=>{fav=new Set(['1']);mobileLiveQuickFilter('__favorites');});
    assert.equal(await page.locator('.mobile371Channel').count(),1);
    await page.evaluate(()=>{
      mobileLiveQuickFilter('');const video=document.createElement('video');video.dataset.identity='retained';$('#playerWrap').replaceChildren(video);
    });
    await page.evaluate(()=>window.scrollTo(0,900));
    await page.waitForSelector('.mobile371PlayerStage.isMini');
    await page.setViewportSize({width:844,height:390});
    await page.waitForTimeout(200);
    assert.equal(await page.locator('body').getAttribute('data-client-mode'),'mobile');
    assert.equal(await page.locator('video').getAttribute('data-identity'),'retained');
    await page.evaluate(()=>mobile371OpenGroups());
    assert.equal(await page.locator('.mobile371Sheet').evaluate(el=>getComputedStyle(el).position),'fixed');
    await page.locator('.mobile371Sheet header button').click();
    await page.setViewportSize({width:390,height:844});
    console.log('PASS live favourites, miniplayer and rotation');

    await page.evaluate(()=>openMobileCollection('continue'));
    assert.match(await page.locator('#collectionItems').innerText(),/Ångström/);
    await page.getByRole('button',{name:'Remove Ångström'}).click();
    await page.waitForFunction(()=>document.querySelector('#collectionItems')?.textContent.includes('Start watching'));
    await page.evaluate(()=>{localStorage.setItem(mediaFavKey(),JSON.stringify([{type:'movie',id:'1',name:'Ångström',providerId:'p'}]));return openMobileCollection('favourites');});
    await page.getByRole('button',{name:'Remove Ångström'}).click();
    await page.waitForFunction(()=>getMediaFavs().length===0);
    console.log('PASS full collections and removal');

    failCatalogue=true;
    await page.evaluate(()=>{sessionStorage.clear();return show('home');});
    await page.waitForFunction(()=>document.querySelector('#content').textContent.includes('Could not load this section'));
    failCatalogue=false;
    await page.getByRole('button',{name:'Try again'}).first().click();
    await page.waitForFunction(()=>document.querySelector('#content').textContent.includes('No items available from your sources.'));
    assert.equal(await page.locator('.mobileSkeleton').count(),0);
    for(const width of [320,390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow at '+width);
    }
    console.log('PASS home error/retry/empty states and phone widths');
    for(const device of [
      {name:'desktop',width:1440,height:900,touch:false},
      {name:'phone',width:390,height:844,touch:true},
      {name:'tablet',width:1024,height:900,touch:true},
      {name:'TV',width:1920,height:1080,touch:true}
    ]){
      continueItems=[{id:'iptv-movie:p:1',title:'Movie progress',positionSeconds:90},{id:'iptv-episode:p:2:mp4',title:'Episode progress',positionSeconds:80}];
      const devicePage=await browser.newPage({viewport:{width:device.width,height:device.height},screen:{width:device.width,height:device.height},hasTouch:device.touch,isMobile:device.name==='phone'});
      devicePage.on('pageerror',e=>errors.push(device.name+': '+e.message));
      await devicePage.route('**/*',apiRoutes);
      await devicePage.goto('http://127.0.0.1:'+server.address().port);
      await devicePage.waitForFunction(()=>typeof openContinueActions==='function'&&typeof mobileRoute!=='undefined');
      await devicePage.evaluate(()=>{
        $('#auth').classList.add('hidden');$('#app').classList.remove('hidden');authState={user:'Test',role:'Admin'};
        providers=[{id:'p',name:'Test source',type:'xtream'}];currentProvider='p';return show('home');
      });
      await devicePage.waitForTimeout(250);
      const menu=devicePage.locator('[data-continue-id="iptv-movie:p:1"] .continueMenuButton');
      await menu.focus();await devicePage.keyboard.press('Enter');
      await devicePage.getByRole('dialog').getByRole('button',{name:'Remove from Continue Watching',exact:true}).click();
      await devicePage.waitForFunction(()=>!document.querySelector('[data-continue-id="iptv-movie:p:1"]'));
      assert.equal(await devicePage.locator('[data-continue-id="iptv-episode:p:2:mp4"]').count(),1);
      await devicePage.getByRole('button',{name:'Clear Continue Watching',exact:true}).click();
      await devicePage.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
      assert.equal(continueItems.length,1);
      await devicePage.getByRole('button',{name:'Clear Continue Watching',exact:true}).click();
      await devicePage.getByRole('dialog').getByRole('button',{name:'Clear Continue Watching',exact:true}).click();
      await devicePage.waitForFunction(()=>document.querySelectorAll('[data-continue-id]').length===0);
      assert.equal(continueItems.length,0);
      await devicePage.close();console.log('PASS Continue Watching remove/clear/confirmation: '+device.name);
    }
    await page.setViewportSize({width:844,height:390});
    assert.notEqual(await page.locator('.mobile364Home').evaluate(el=>getComputedStyle(el).display),'none');
    await page.setViewportSize({width:390,height:844});
    assert.deepEqual(errors,[],'No browser JavaScript errors');
    if(process.env.MOBILE_SCREENSHOT)await page.screenshot({path:process.env.MOBILE_SCREENSHOT,fullPage:true});
    console.log('All mobile regression checks passed.');
  } catch(e) {
    const page=browser.contexts()[0]?.pages()[0];
    if(page){console.error('Visible content:',await page.locator('#content').innerText());if(process.env.MOBILE_SCREENSHOT)await page.screenshot({path:process.env.MOBILE_SCREENSHOT,fullPage:true});}
    throw e;
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
