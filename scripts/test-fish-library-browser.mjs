import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const bundle=process.env.CHROMIUM_BUNDLE;
const chromiumOptions=bundle?(await import(process.env.CHROMIUM_MODULE||'@sparticuz/chromium')).default:null;
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,''),origin='http://127.0.0.1:8765';
const artifacts=process.env.FISH_LIBRARY_ARTIFACTS||'/tmp/fish-library-review';await fs.mkdir(artifacts,{recursive:true});
const browser=await chromium.launch(bundle?{headless:true,executablePath:bundle+'/chromium',args:chromiumOptions.args.filter(arg=>arg!=='--single-process'),env:{...process.env,LD_LIBRARY_PATH:bundle,FONTCONFIG_PATH:bundle+'/fonts'}}:{headless:true});
const errors=[],requests=[];
async function context(){
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await ctx.route('https://cdn.jsdelivr.net/npm/three@0.179.1/**',route=>route.fulfill({path:root+'/node_modules/three/'+route.request().url().split('three@0.179.1/')[1],contentType:'text/javascript'}));
 await ctx.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`
  export const initializeApp=()=>({}),getAuth=()=>({}),getDatabase=()=>({});
  export const onAuthStateChanged=(a,cb)=>setTimeout(()=>cb({uid:'owner-A'}),0),signInAnonymously=async()=>({});
  export const ref=(db,path)=>path,push=()=>({key:'new-world'}),serverTimestamp=()=>123;
  export const get=async path=>{(window.__reads??=[]).push(path);if(path==='worldIndex')return {exists:()=>false};return {exists:()=>true,val:()=>({name:'Testoceaan',ownerId:path.endsWith('B')?'owner-B':'owner-A',visibility:'link',world:{version:4,worldHalf:144,cellSize:12,cells:[],terrain:[],hexWorld:{hexQ:0,hexR:0},orca:null,whale:null,lavaVents:[]}})};};
  export const set=async()=>{window.__writes=(window.__writes||0)+1;throw Error('Unexpected database write');};
 `}));
 await ctx.route(origin+'/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/'||path==='/index.html'){
   let html=await fs.readFile(root+'/index.html','utf8');
   html=html.replace('drawMinimap();\nanimate();',`const originalRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='animate'?0:originalRAF(cb);
   window.__libraryQA={state:()=>({fish:fishes.length,imports:fishes.filter(f=>f.userData.imported).length,editable:canEditCurrentWorld(),world:currentCloudWorldId}),swim:()=>fishes.filter(f=>f.userData.imported).map(f=>({name:f.userData.sourceName,tail:!!f.userData.tail,hasPaint:!!f.children[0]?.userData.fishStudio})),render:()=>renderer.render(scene,camera)};
   drawMinimap();animate();`);
   return route.fulfill({contentType:'text/html',body:html});
  }
  const file=path.endsWith('/')?path+'index.html':path;
  await route.fulfill({path:root+file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
 });
 ctx.on('request',r=>{if(/firebasedatabase|firebaseio|firebasestorage/.test(r.url()))requests.push(r.url());});return ctx;
}
const getRecords=page=>page.evaluate(async()=>{const {listFish}=await import('/library/FishStore.js');return listFish();});
async function waitIdle(page){await page.waitForFunction(()=>!document.querySelector('#fishLibraryDialog')?.hasAttribute('aria-busy'));}
try{
 const first=await context(),studio=await first.newPage();await studio.goto(origin+'/studio/?world=A');
 await studio.locator('#saveDesign:not([disabled])').waitFor({timeout:60000});
 await studio.locator('#designName').fill('Koraalvriend');await studio.locator('#designAuthor').fill('Stephan');
 const canvas=await studio.locator('#editor').boundingBox();await studio.locator('#color').fill('#c800be');
 await studio.mouse.move(canvas.x+canvas.width*.45,canvas.y+canvas.height*.5);await studio.mouse.down();await studio.mouse.move(canvas.x+canvas.width*.65,canvas.y+canvas.height*.5,{steps:8});await studio.mouse.up();
 await studio.locator('#saveDesign').click();await studio.waitForFunction(()=>document.getElementById('designStatus').textContent.includes('bewaard.'));
 let records=await getRecords(studio);assert.equal(records.length,1);assert.equal(records[0].name,'Koraalvriend');assert.equal(records[0].editable,true);
 const id=records[0].id,project=await studio.evaluate(async id=>(await(await import('/library/FishStore.js')).getFish(id)).project,id);
 await studio.reload();await studio.locator('#saveDesign:not([disabled])').waitFor();
 await studio.locator('#openFishLibrary').click();await studio.locator('.fl-card').waitFor();
 await studio.screenshot({path:artifacts+'/library-desktop.png'});
 await studio.getByRole('button',{name:'Verder ontwerpen',exact:true}).click();
 await studio.waitForFunction(()=>document.getElementById('designStatus').textContent.includes('geopend met originele verf'));
 assert.equal(await studio.locator('#designName').inputValue(),'Koraalvriend');
 await studio.locator('#saveDesign').click();await studio.waitForFunction(()=>document.getElementById('designStatus').textContent.includes('bewaard.'));
 const roundTrip=await studio.evaluate(async id=>(await(await import('/library/FishStore.js')).getFish(id)).project,id);
 assert.deepEqual(roundTrip,project,'paint and palettes survive editing and reload exactly');assert.equal((await getRecords(studio)).length,1);
 // Export includes editable paint, through the same action a user will use.
 const downloadPromise=studio.waitForEvent('download');await studio.locator('#exportGLB').click();const download=await downloadPromise;
 const file=artifacts+'/koraalvriend.glb';await download.saveAs(file);assert.ok((await fs.stat(file)).size>10000);
 await studio.locator('#openFishLibrary').click();await studio.locator('.fl-card').waitFor();
 await studio.locator('.fl-files').setInputFiles(file);await studio.waitForFunction(()=>document.querySelector('.fl-message').textContent.includes('1 al aanwezig'));await waitIdle(studio);
 assert.equal((await getRecords(studio)).length,1,'reimporting an exported backup does not duplicate it');
 await studio.getByRole('button',{name:'Maak favoriet',exact:true}).click();await waitIdle(studio);
 await studio.locator('.fl-filter').selectOption('favorite');assert.equal(await studio.locator('.fl-card').count(),1);
 await studio.locator('.fl-search input').fill('niet-bestaand');assert.equal(await studio.locator('.fl-card').count(),0);
 await studio.locator('.fl-search input').fill('Stephan');assert.equal(await studio.locator('.fl-card').count(),1);
 await studio.locator('.fl-search input').fill('');await studio.setViewportSize({width:390,height:844});await studio.screenshot({path:artifacts+'/library-mobile.png'});
 assert.ok(await studio.evaluate(()=>document.querySelector('.fish-library').scrollWidth<=innerWidth),'mobile has no horizontal overflow');
 await studio.setViewportSize({width:1440,height:1000});await studio.locator('.fl-close').click();
 await studio.locator('#designToOcean').click();
 await studio.waitForFunction(()=>window.__libraryQA?.state().world==='A',null,{timeout:60000});
 await studio.locator('#fishLibraryDialog[open] .fl-card').waitFor();
 assert.equal(new URL(studio.url()).searchParams.get('fish'),id,'studio opens the correct fish in the original world');
 assert.equal(await studio.locator('select[aria-label="Aantal vissen uit bibliotheek"]').inputValue(),'8');
 await studio.close();
 // Another browser/user receives the shared file; no existing library data.
 const second=await context(),ocean=await second.newPage();await ocean.goto(origin+'/?world=A');
 await ocean.waitForFunction(()=>window.__libraryQA?.state().world==='A'&&window.__libraryQA.state().editable,null,{timeout:60000});
 const before=await ocean.evaluate(()=>window.__libraryQA.state());
 assert.equal((await getRecords(ocean)).length,0,'second browser starts with an empty collection');
 await ocean.locator('#openFishLibrary').click();await ocean.locator('.fl-empty').waitFor();
 await ocean.locator('.fl-files').setInputFiles([file,file]);await ocean.waitForFunction(()=>document.querySelector('.fl-message').textContent.includes('1 al aanwezig'),null,{timeout:60000});await waitIdle(ocean);
 assert.equal((await getRecords(ocean)).length,1);assert.equal((await getRecords(ocean))[0].name,'Koraalvriend');
 await ocean.locator('select[aria-label="Aantal vissen uit bibliotheek"]').selectOption('8');
 await ocean.getByRole('button',{name:'Voeg toe aan mijn oceaan',exact:true}).click();
 await ocean.waitForFunction(()=>window.__libraryQA.state().imports===8,null,{timeout:60000});await waitIdle(ocean);
 assert.equal((await ocean.evaluate(()=>window.__libraryQA.state())).fish,before.fish+8);
 const fish=await ocean.evaluate(()=>window.__libraryQA.swim());assert.ok(fish.every(f=>f.tail&&!f.hasPaint));
 assert.equal(await ocean.evaluate(()=>window.__writes||0),0);
 // Imported sharing file opens as an editable project in the studio.
 const received=(await getRecords(ocean))[0];const edited=await second.newPage();await edited.goto(origin+'/studio/?edit='+received.id);
 await edited.waitForFunction(()=>document.getElementById('designStatus').textContent.includes('geopend met originele verf'),null,{timeout:60000});
 assert.equal(await edited.locator('#designName').inputValue(),'Koraalvriend');await edited.close();
 // Reject corrupt and external-resource GLBs without losing the collection.
 await ocean.locator('.fl-files').setInputFiles({name:'kapot.glb',mimeType:'model/gltf-binary',buffer:Buffer.from('broken')});await ocean.waitForFunction(()=>document.querySelector('.fl-message').classList.contains('fl-error'));await waitIdle(ocean);
 assert.equal((await getRecords(ocean)).length,1);
 await ocean.reload();await ocean.waitForFunction(()=>window.__libraryQA?.state().world==='A');await ocean.locator('#openFishLibrary').click();await ocean.locator('.fl-card').waitFor();
 assert.equal((await getRecords(ocean)).length,1,'library survives reload');
 await ocean.screenshot({path:artifacts+'/ocean-library.png'});
 await ocean.goto(origin+'/?world=B');await ocean.waitForFunction(()=>window.__libraryQA?.state().world==='B');await ocean.locator('#openFishLibrary').click();await ocean.locator('.fl-card').waitFor();
 assert.ok(await ocean.getByRole('button',{name:'Voeg toe aan mijn oceaan',exact:true}).isDisabled(),'visitor cannot place');
 // Metadata fields treat names as text, and deletion is a local operation.
 await ocean.locator('.fl-metadata summary').click();await ocean.locator('.fl-fields input').first().fill('<img src=x onerror=alert(1)>');await ocean.getByRole('button',{name:'Naam en maker bewaren',exact:true}).click();await waitIdle(ocean);
 assert.equal(await ocean.locator('.fl-card strong').textContent(),'<img src=x onerror=alert(1)>');assert.equal(await ocean.locator('.fl-card-info img').count(),0);
 ocean.once('dialog',d=>d.accept());await ocean.getByRole('button',{name:'Verwijder uit bibliotheek',exact:true}).click();await waitIdle(ocean);assert.equal((await getRecords(ocean)).length,0);
 // Export remains available when IndexedDB is blocked or unavailable.
 const blocked=await context();await blocked.addInitScript(()=>Object.defineProperty(window,'indexedDB',{value:undefined}));
 const fallback=await blocked.newPage();await fallback.goto(origin+'/studio/');await fallback.locator('#saveDesign:not([disabled])').waitFor();
 const backupEvent=fallback.waitForEvent('download');await fallback.locator('#exportGLB').click();const backup=await backupEvent;
 assert.ok(backup.suggestedFilename().endsWith('.glb'));
 await fallback.waitForFunction(()=>document.getElementById('designStatus').textContent.includes('Bewaren in deze browser mislukte'));
 await fallback.close();
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 const result={passed:true,checks:['paint round trip','persistent library','portable editable GLB','batch import and deduplication','search and favorites','8 fish placement with tails','no replicated paint data','visitor permissions','corrupt file rejection','safe names','local deletion','mobile layout','zero Firebase writes','backup deduplication','download when storage is unavailable','studio to original world'],errors};
 await fs.writeFile(artifacts+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
