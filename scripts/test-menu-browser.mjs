import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||(runtime?runtime+'/playwright/index.mjs':'playwright'));
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,''),origin='http://127.0.0.1:8875';
const artifacts=process.env.MENU_ARTIFACTS||'/tmp/ocean-menu-review';await fs.mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:null)});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
 page.setDefaultTimeout(12000);
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('https://cdn.jsdelivr.net/npm/three@0.179.1/**',route=>route.fulfill({path:root+'/node_modules/three/'+route.request().url().split('three@0.179.1/')[1],contentType:'text/javascript'}));
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`
 export const initializeApp=()=>({}),getAuth=()=>({}),getDatabase=()=>({});
 export const onAuthStateChanged=()=>{},signInAnonymously=async()=>({});
 export const ref=(db,path)=>path,push=()=>({key:'test'}),serverTimestamp=()=>123,set=async()=>{};
 export const get=async()=>({exists:()=>false,val:()=>null});`}));
 await context.route(origin+'/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path!=='/'){
   try{return await route.fulfill({path:root+path,contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':undefined});}
   catch{return route.fulfill({status:404,body:''});}
  }
  let html=await fs.readFile(root+'/index.html','utf8');
  const marker='drawMinimap();\nanimate();';assert.ok(html.includes(marker));
  html=html.replace(marker,`const nativeRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='animate'?0:nativeRAF(cb);
  window.__menuQA={
   state:()=>({mode:followMode,edit:editMode,view:editorView,locked:controls.isLocked,panel:menuPanels.active,angle:followOrbitAngle,distance:followDistance,height:followHeight,camera:camera.position.toArray()}),
   frame:(dt=.1)=>updateMovement(dt),
   follow:(mode='fish')=>{
    if(editMode)setEditMode(false);
    restoreWorld({version:4,worldHalf:144,cells:[],terrain:[],megafaunaDisabled:{orca:true,whale:true}});
    const school=makeSchool('control-test',{cruiseSpeed:1}),fish=new THREE.Group();
    fish.position.set(0,0,0);registerFish(fish,'control-test',school);fish.userData.velocity.set(0,0,-1);scene.add(fish);fishes.push(fish);
    camera.position.set(0,2,10);document.getElementById('timeOfDay').focus();startFollowing(fish,mode);updateMovement(.1);
    followDistance=10;followHeight=2;followOrbitAngle=0;followOrbitInitialized=true;
   },
   flashlight:()=>({angle:nightFlashlight.light.angle}),
   render:()=>renderer.render(scene,camera)
  };${marker}`);
  return route.fulfill({body:html,contentType:'text/html'});
 });
 await page.goto(origin);await page.waitForFunction(()=>window.__menuQA,null,{timeout:60000});
 assert.equal(await page.locator('.menu-clusters button').count(),4);
 assert.equal(await page.locator('#sculptMetrics,#mapZoomIn,#mapZoomOut').count(),0);
 assert.ok(await page.locator('#minimap').isVisible());
 await page.screenshot({path:artifacts+'/menu-desktop.png'});
 async function open(name){
  console.log('Opening '+name);
  await page.locator('#journeyMenu').click();
  // Menu starts open; a second click opens it if the first click closed it.
  if(!await page.locator('.menu-clusters').isVisible())await page.locator('#journeyMenu').click();
  await page.locator(`[data-menu-panel="${name}"]`).click();
  assert.equal(await page.locator('.ocean-menu-dialog[open]').count(),1);
  assert.equal((await page.evaluate(()=>window.__menuQA.state())).panel,name);
 }
 await open('settings');
 for(const id of ['visualQuality','fishRenderStyle','seabedDetail','weatherType','currentFlowCategory'])assert.equal(await page.locator('#'+id).evaluate(e=>e.closest('dialog').id),'settingsDialog');
 await page.locator('#visualQuality').selectOption('low');await page.locator('#fishRenderStyle').selectOption('realistic');
 await page.screenshot({path:artifacts+'/settings-desktop.png'});
 await page.keyboard.press('Escape');assert.equal(await page.locator('.ocean-menu-dialog[open]').count(),0);
 await open('design');
 await page.locator('#openFishLibrary').click();await page.locator('#fishLibraryDialog[open]').waitFor();
 await page.keyboard.press('Escape');await page.locator('#fishLibraryDialog').waitFor({state:'hidden'});
 await open('build');
 await page.locator('#worldBrush').selectOption('terrainCanyon');
 await page.locator('#editModeBtn').click();assert.equal((await page.evaluate(()=>window.__menuQA.state())).edit,true);
 await page.locator('#buildDialog summary').filter({hasText:'Expert'}).click();await page.locator('#openExpertBuild').click();
 assert.equal((await page.evaluate(()=>window.__menuQA.state())).view,'sculpt');
 await page.screenshot({path:artifacts+'/build-desktop.png'});
 await page.locator('#buildDialog summary').filter({hasText:'Generate AI World'}).click();
 await page.locator('#aiWorldDescription').fill('Een diep ravijn met koraal.');await page.locator('#generateWorldPrompt').click();
 assert.ok((await page.locator('#aiWorldPrompt').inputValue()).includes('Een diep ravijn met koraal.'));
 assert.ok((await page.locator('#aiWorldPrompt').inputValue()).includes('ocean-world-blueprint-v1'));
 await page.locator('#aiWorldDescription').focus();await page.keyboard.press('z');assert.equal((await page.evaluate(()=>window.__menuQA.state())).edit,true,'typing Z must not exit the editor');
 await page.locator('#freeSwimBtn').click();await page.waitForFunction(()=>window.__menuQA.state().locked);
 assert.equal((await page.evaluate(()=>window.__menuQA.state())).edit,false);
 await page.keyboard.press('Escape');await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!window.__menuQA.state().locked);
 await open('save');
 for(const id of ['cloudWorldName','shareWorldBtn','worldAtlasBtn','saveWorldBtn','cloudSaveBtn'])assert.equal(await page.locator('#'+id).evaluate(e=>e.closest('dialog').id),'saveDialog');
 await page.locator('#cloudWorldName').fill('Mijn testwereld');await page.locator('#saveWorldBtn').click();
 await page.locator('#worldAtlasBtn').click();await page.locator('#worldAtlasOverlay.open').waitFor();
 await page.locator('#worldAtlasClose').click();
 for(const mode of ['fish','school']){
  await page.evaluate(mode=>window.__menuQA.follow(mode),mode);
  assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BODY','follow clears retained form focus');
  for(const [code,property,sign] of [['a','angle',1],['d','angle',-1],['w','distance',-1],['s','distance',1],['q','height',1],['e','height',-1]]){
   const before=await page.evaluate(()=>window.__menuQA.state());
   await page.keyboard.down(code);await page.evaluate(()=>window.__menuQA.frame());await page.keyboard.up(code);
   const after=await page.evaluate(()=>window.__menuQA.state());
   assert.ok((after[property]-before[property])*sign>0,mode+' '+code+' works');
   assert.ok(after.camera.some((v,i)=>Math.abs(v-before.camera[i])>1e-5),'camera responds');
  }
  await page.keyboard.press('z');await page.waitForFunction(()=>window.__menuQA.state().locked);
  assert.equal((await page.evaluate(()=>window.__menuQA.state())).mode,null);
  await page.keyboard.press('Escape');await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!window.__menuQA.state().locked);
 }
 const torch=await page.evaluate(()=>window.__menuQA.flashlight());
 assert.ok(Math.abs(Math.tan(torch.angle)**2/Math.tan(Math.PI*.105)**2-2)<1e-10);
 await page.setViewportSize({width:390,height:844});await open('settings');
 assert.ok(await page.evaluate(()=>{const d=document.querySelector('#settingsDialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth;}),'mobile popup fits');
 assert.ok(await page.locator('#minimap').isVisible());await page.screenshot({path:artifacts+'/settings-mobile.png'});
 await page.goto(origin+'/?scene=reference');await page.waitForFunction(()=>window.__menuQA);
 assert.ok(await page.locator('#journeyMenu').isVisible());assert.equal(await page.locator('#journeyAtlas').isVisible(),false);
 await open('settings');assert.ok(await page.locator('#settingsDialog').isVisible(),'comparison scene retains menu access');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({menus:4,followKeys:'WASDQE in fish and school modes',swim:'button and Z',flashlightArea:2,mobile:true,errors,artifacts},null,2));
}finally{await browser.close();}
