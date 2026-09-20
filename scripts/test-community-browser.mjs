const {chromium:playwright}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const chromium=process.env.CHROMIUM_BUNDLE ? (await import(process.env.CHROMIUM_MODULE||'@sparticuz/chromium')).default : null;
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,''),bin=process.env.CHROMIUM_BUNDLE;
const browser=await playwright.launch(bin?{headless:true,executablePath:bin+'/chromium',args:chromium.args,env:{...process.env,LD_LIBRARY_PATH:bin,FONTCONFIG_PATH:bin+'/fonts'}}:{headless:true});
try{
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
await page.route('https://cdn.jsdelivr.net/npm/three@0.179.1/**',route=>route.fulfill({path:root+'/node_modules/three/'+route.request().url().split('three@0.179.1/')[1],contentType:'text/javascript'}));
await page.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`
 export const initializeApp=()=>({}),getAuth=()=>({}),getDatabase=()=>({});
 export const onAuthStateChanged=(auth,cb)=>setTimeout(()=>cb({uid:'owner-A'}),0),signInAnonymously=async()=>({});
 export const ref=(db,path)=>path,push=()=>({key:'new-world'}),serverTimestamp=()=>123;
 export const get=async path=>{
  (window.__reads??=[]).push(path);if(path==='worldIndex')return {exists:()=>false};
  if(window.__deny)throw Error('permission_denied');
  const id=path.split('/')[1],record={name:id==='A'?'Mijn koraaltuin':'Diepe buurwereld',ownerId:id==='A'?'owner-A':'owner-B',visibility:'link',world:{version:4,worldHalf:144,cellSize:12,cells:[{key:id==='A'?'0,0':'1,1',layers:[{id:1,type:'coral'}]}],terrain:id==='B'?Array.from({length:25},(_,i)=>({key:((i%5)-2)+','+(Math.floor(i/5)+8),offset:-12})):[],hexWorld:{hexQ:0,hexR:0},orca:null,whale:null,lavaVents:[]}};
  return {exists:()=>['A','B'].includes(id),val:()=>record};
 };
 export const set=async()=>{window.__writes=(window.__writes??0)+1;throw Error('Unexpected write in travel test');};
 `}));
await page.route('http://127.0.0.1:8765/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 if(path==='/'){
  let html=await fs.readFile(root+'/index.html','utf8');
  const qa=`
   const nativeRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='animate'?0:nativeRAF(cb);
   window.__communityQA={state:()=>({id:communityOcean.activeId,busy:communityOcean.busy,cells:worldData().cells,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),editable:canEditCurrentWorld(),status:communityOcean.lastStatus,floor:terrainHeightAt(camera.position.x,camera.position.z)}),
    edit:()=>{addLayerToCell(0,0,'sponge');},render:()=>renderer.render(scene,camera),
    cross:()=>{const previous=camera.position.clone();camera.position.set(0,-20,-125);communityOcean.update(previous,{revision:habitatRevision});},
    visit:id=>communityOcean.visit(id),sync:()=>communityOcean.rebuild(),
    orient:()=>{camera.rotation.set(.05,.3,0);},move:()=>{controls.isLocked=true;keys.KeyW=true;updateMovement(.01);keys.KeyW=false;controls.isLocked=false;}};
  `;
  return route.fulfill({body:html.replace('</script>\n</body>',qa+'</script>\n</body>'),contentType:'text/html'});
 }
 return route.fulfill({path:root+path,contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});
});
await page.goto('http://127.0.0.1:8765/?world=A&reef=organic');
await page.waitForFunction(()=>window.__communityQA?.state().id==='A'&&!window.__communityQA.state().busy,null,{timeout:60000});
assert.deepEqual(errors,[]);
await page.evaluate(()=>window.__communityQA.edit());
const own=await page.evaluate(()=>window.__communityQA.state());assert.equal(own.cells[0].layers.length,2);
await page.locator('#journeyAtlas').click();
await page.locator('#journeyWorldLink').fill('http://localhost/?world=B');
await page.locator('#journeyConnect').click();
await page.waitForFunction(()=>document.getElementById('journeyStatus').textContent.includes('Verbonden met'),null,{timeout:60000});
assert.equal(await page.locator('#worldAtlasSvg .atlas-world').count(),2);
await fs.mkdir(root+'/docs/community-review',{recursive:true});
await page.screenshot({path:root+'/docs/community-review/atlas.png'});
await page.locator('#worldAtlasClose').click();
await page.evaluate(()=>{window.__communityQA.orient();window.__communityQA.cross();});
await page.waitForFunction(()=>window.__communityQA.state().id==='B'&&!window.__communityQA.state().busy,null,{timeout:60000});
let state=await page.evaluate(()=>window.__communityQA.state());
assert.ok(Math.abs(state.quaternion[1]-.14939143548941183)<1e-10,'swimming direction preserved');
assert.equal(state.editable,false);assert.equal(state.cells[0].key,'1,1');assert.ok(state.position[2]>120);assert.ok(state.position[1]>=state.floor+1-1e-5);assert.ok(state.position[1]<-15);
assert.ok(await page.locator('#editModeBtn').isDisabled());
await page.evaluate(()=>window.__communityQA.move());assert.ok((await page.evaluate(()=>window.__communityQA.state())).position[1]<-15);
await page.evaluate(()=>window.__communityQA.render());await page.screenshot({path:root+'/docs/community-review/neighbor.png'});
await page.evaluate(()=>window.__deny=true);
assert.equal(await page.evaluate(()=>window.__communityQA.visit('A')),false);assert.equal((await page.evaluate(()=>window.__communityQA.state())).id,'B');
await page.evaluate(()=>window.__deny=false);
assert.equal(await page.evaluate(()=>window.__communityQA.visit('A')),true);
state=await page.evaluate(()=>window.__communityQA.state());assert.deepEqual(state.cells,own.cells);assert.equal(state.editable,true);
await page.locator('#journeyMenu').click();assert.ok(await page.evaluate(()=>{const e=document.getElementById('hud');return e.scrollHeight>e.clientHeight&&getComputedStyle(e).overflowY==='auto';}));
assert.equal(await page.evaluate(()=>window.__writes??0),0);assert.deepEqual(errors,[]);
await page.setViewportSize({width:390,height:844});await page.locator('#journeyAtlas').click();
assert.ok(await page.evaluate(()=>{const e=document.getElementById('worldAtlasDetails');e.scrollTop=e.scrollHeight;return e.clientHeight>0&&e.scrollTop>0;}),'mobile atlas form scrolls');
await page.screenshot({path:root+'/docs/community-review/mobile-atlas.png'});
console.log(JSON.stringify({passed:true,checks:['Firebase read adapter','two atlas hexes','natural north crossing','opposite entrance','deep arrival and continued swimming','visitor build lock','permission failure preserves world','round trip preserves own draft','scrollable menu','zero cloud writes','zero browser errors'],state},null,2));
await fs.writeFile(root+'/docs/community-review/browser-result.json',JSON.stringify({passed:true,errors,cloudWrites:0,ownDraftPreserved:true,oppositeEntrance:true,deepSwimming:true},null,2));
}finally{await browser.close();}
