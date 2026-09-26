import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||(runtime?runtime+'/playwright/index.mjs':'playwright'));
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const origin='http://127.0.0.1:8875',errors=[];
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:null)});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));

await context.route('https://cdn.jsdelivr.net/npm/three@0.179.1/**',route=>route.fulfill({
  path:root+'/node_modules/three/'+route.request().url().split('three@0.179.1/')[1],contentType:'text/javascript'
}));
await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`
  export const initializeApp=()=>({}),getAuth=()=>({}),getDatabase=()=>({});
  export const onAuthStateChanged=(auth,callback)=>setTimeout(()=>callback({uid:'ecosystem-owner'}),0),signInAnonymously=async()=>({});
  export const ref=(db,path)=>path,push=()=>({key:'test'}),serverTimestamp=()=>123,set=async()=>{window.__firebaseWrites=(window.__firebaseWrites||0)+1;};
  export const get=async()=>({exists:()=>false,val:()=>null});
`}));
await context.route(origin+'/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/'||path==='/index.html'){
    let html=await fs.readFile(root+'/index.html','utf8');
    const marker='drawMinimap();\nanimate();';
    assert.ok(html.includes(marker));
    html=html.replace(marker,`const nativeRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='animate'?0:nativeRAF(cb);
      window.__ecosystemQA={
        lateUnlock:()=>controls.dispatchEvent({type:'unlock'}),
        snapshot:()=>({score:ecosystemState.score,stage:ecosystemState.stageId,capacity:ecosystemState.capacity,natural:livingNaturalFish(),imported:livingImportedFish().length,target:ecosystemState.naturalTarget,shortage:ecosystemState.shortage,health:livingImportedFish().map(f=>f.userData.health),reserves:livingImportedFish().map(f=>f.userData.foodReserve),states:livingImportedFish().map(f=>f.userData.vitalState),sectors:foodSectorSummary,saved:worldData()}),
        addGuests:(count=3)=>{const school=makeSchool('qa-guests');for(let i=0;i<count;i++){const fish=new THREE.Group();fish.position.set(i,-10,0);fish.userData.velocity=new THREE.Vector3(1,0,0);fish.userData.imported=true;fish.userData.health=100;registerFish(fish,'qa-guests',school);scene.add(fish);fishes.push(fish);}updateEcosystem(performance.now()/1000,true);updateLocalFood(.5);return window.__ecosystemQA.snapshot();},
        starve:(seconds=5)=>{for(let t=0;t<seconds;t+=.25){updateLocalFood(.25);updateImportedHealth(.25);}return window.__ecosystemQA.snapshot();},
        exhaust:()=>{for(const fish of livingImportedFish()){fish.userData.foodReserve=0;fish.userData.starvationSeconds=31;}},
        buryOne:()=>{const fish=livingImportedFish()[0];fish.userData.health=0;fish.userData.vitalState='sinking';fish.position.y=terrainHeightAt(fish.position.x,fish.position.z)+.08;updateFish(.04,10);const began=fish.userData.vitalState;for(let i=0;i<140;i++)updateFish(.04,10+i*.04);return {began,remaining:livingImportedFish().length,stillInScene:Boolean(fish.parent)};},
        buildRich:()=>{const types=['coral','seagrass','sponge','rocks','mixed'];for(let i=0;i<60;i++)addLayerToCell(i%10-5,Math.floor(i/10)-3,types[i%types.length]);for(let i=0;i<60;i++)updateEcosystem(100+i*2,true);updateLocalFood(.5);updateEcosystem(230,true);return window.__ecosystemQA.snapshot();},
        migrate:()=>{const school=[...schools.values()].find(item=>item.natural&&item.members.length);school.center.copy(school.members[0].position);const from=foodSectorKey(school.center.x,school.center.z,FOOD_SECTOR_SIZE);school.currentFoodSector=from;school.forceMigration=true;chooseSchoolTarget(school,500);return {from,to:foodSectorKey(school.target.x,school.target.z,FOOD_SECTOR_SIZE),forced:school.forceMigration};}
      };
      drawMinimap();animate();`);
    return route.fulfill({contentType:'text/html',body:html});
  }
  const file=path.endsWith('/')?path+'index.html':path;
  return route.fulfill({path:root+file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
});

await page.goto(origin+'/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__ecosystemQA);
const ui=await page.evaluate(()=>{
  const panel=document.getElementById('graphicsOptionsPanel');
  const collapsedInitially=!panel.open;
  const style=document.getElementById('fishRenderStyle');
  style.value='realistic';style.dispatchEvent(new Event('change',{bubbles:true}));
  const styleStatus=document.getElementById('fishStyleStatus').textContent;
  return {collapsedInitially,style:style.value,status:styleStatus};
});
assert.equal(ui.collapsedInitially,true);assert.equal(ui.style,'realistic');assert.match(ui.status,/Realistische animatie actief/);
// Actual pointer-lock lifecycle, not a manual CSS class toggle.
await page.locator('#startBtn').click();
await page.waitForFunction(()=>Boolean(document.pointerLockElement)&&document.getElementById('startBtn').textContent==='Verkennen actief'&&!document.getElementById('hud').classList.contains('settings-open'));
assert.equal(await page.locator('#hud').isVisible(),false);
await page.keyboard.press('Escape');
// Headless Chromium may not run the browser-chrome Escape action. In that case
// exit via the native API; PointerLockControls still receives the real event.
await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();});
await page.waitForFunction(()=>!document.pointerLockElement&&document.getElementById('startBtn').textContent==='Verder verkennen');
assert.equal(await page.locator('#swimmingSettingsBtn').isVisible(),true,'settings shortcut survives Escape/unlock');
await page.locator('#swimmingSettingsBtn').click();
assert.equal(await page.locator('#hud').isVisible(),true);
assert.equal(await page.locator('#graphicsOptionsPanel').evaluate(e=>e.open),true);
await page.evaluate(()=>window.__ecosystemQA.lateUnlock());
assert.equal(await page.locator('#hud').isVisible(),true,'late unlock cannot hide the open panel');
assert.equal(await page.locator('#swimmingSettingsBtn').isVisible(),false);
await page.locator('#fishRenderStyle').selectOption('cartoon');
await page.locator('#fishRenderStyle').selectOption('realistic');
await page.locator('#startBtn').click();
await page.waitForFunction(()=>Boolean(document.pointerLockElement)&&document.getElementById('startBtn').textContent==='Verkennen actief'&&!document.getElementById('hud').classList.contains('settings-open'));
assert.equal(await page.locator('#hud').isVisible(),false,'resuming swimming hides settings again');
await page.keyboard.press('o');
await page.waitForFunction(()=>!document.pointerLockElement&&document.getElementById('hud').classList.contains('settings-open'));
assert.equal(await page.locator('#hud').isVisible(),true,'O opens options directly during swimming');
assert.equal(await page.locator('#graphicsOptionsPanel').evaluate(e=>e.open),true);
await page.locator('#cloudWorldName').fill('Mijn oceaan');await page.keyboard.press('o');
assert.equal(await page.locator('#cloudWorldName').inputValue(),'Mijn oceaano','O remains text in input fields');
ui.pointerLockOptions=true;ui.keyboardOptions=true;ui.lateUnlockSafe=true;
const empty=await page.evaluate(()=>window.__ecosystemQA.snapshot());
assert.equal(empty.capacity,0);assert.equal(empty.natural,0);assert.equal(empty.stage,0);
await page.evaluate(()=>window.__ecosystemQA.addGuests(3));
const starving=await page.evaluate(()=>window.__ecosystemQA.starve(5));
assert.ok(starving.shortage>.9);assert.ok(starving.health.every(value=>value===100));assert.ok(starving.reserves.every(value=>value>170));
await page.evaluate(()=>window.__ecosystemQA.exhaust());
const depleted=await page.evaluate(()=>window.__ecosystemQA.starve(5));
assert.ok(depleted.health.every(value=>value<100));
const burial=await page.evaluate(()=>window.__ecosystemQA.buryOne());
assert.deepEqual(burial,{began:'burial',remaining:2,stillInScene:false});
const rich=await page.evaluate(()=>window.__ecosystemQA.buildRich());
assert.ok(rich.capacity>100);assert.equal(rich.stage,5);assert.ok(rich.natural>0);assert.ok(rich.target>0);
assert.ok(rich.sectors.active>0);
const migration=await page.evaluate(()=>window.__ecosystemQA.migrate());
assert.notEqual(migration.to,migration.from);assert.equal(migration.forced,false);
assert.equal('ecosystem' in rich.saved,false);assert.equal(await page.evaluate(()=>window.__firebaseWrites||0),0);
await page.screenshot({path:'/tmp/ecosystem-dashboard.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
const mobile=await page.evaluate(()=>{const panel=document.getElementById('ecosystemPanel').getBoundingClientRect(),hud=document.getElementById('hud').getBoundingClientRect();return {panelRight:panel.right,hudRight:hud.right,viewport:innerWidth};});
assert.ok(mobile.panelRight<=mobile.viewport&&mobile.hudRight<=mobile.viewport);
await page.screenshot({path:'/tmp/ecosystem-dashboard-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);
console.log(JSON.stringify({ui,empty,starving:{capacity:starving.capacity,shortage:starving.shortage,health:starving.health,reserves:starving.reserves},depleted:{health:depleted.health},burial,rich:{score:rich.score,stage:rich.stage,capacity:rich.capacity,natural:rich.natural,target:rich.target,sectors:rich.sectors.active},migration,mobile,firebaseWrites:0,errors},null,2));
await browser.close();
