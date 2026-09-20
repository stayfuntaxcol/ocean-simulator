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
    html=html.replace(marker,`window.requestAnimationFrame=()=>0;
      window.__ecosystemQA={
        snapshot:()=>({score:ecosystemState.score,stage:ecosystemState.stageId,capacity:ecosystemState.capacity,natural:livingNaturalFish(),imported:livingImportedFish().length,target:ecosystemState.naturalTarget,shortage:ecosystemState.shortage,health:livingImportedFish().map(f=>f.userData.health),saved:worldData()}),
        addGuests:(count=3)=>{const school=makeSchool('qa-guests');for(let i=0;i<count;i++){const fish=new THREE.Group();fish.position.set(i,-10,0);fish.userData.velocity=new THREE.Vector3(1,0,0);registerFish(fish,'qa-guests',school);fish.userData.imported=true;fish.userData.health=100;scene.add(fish);fishes.push(fish);}updateEcosystem(performance.now()/1000,true);return window.__ecosystemQA.snapshot();},
        starve:(seconds=5)=>{for(let t=0;t<seconds;t+=.25)updateImportedHealth(.25);return window.__ecosystemQA.snapshot();},
        buildRich:()=>{const types=['coral','seagrass','sponge','rocks','mixed'];for(let i=0;i<60;i++)addLayerToCell(i%10-5,Math.floor(i/10)-3,types[i%types.length]);for(let i=0;i<60;i++)updateEcosystem(100+i*2,true);return window.__ecosystemQA.snapshot();}
      };
      drawMinimap();animate();`);
    return route.fulfill({contentType:'text/html',body:html});
  }
  const file=path.endsWith('/')?path+'index.html':path;
  return route.fulfill({path:root+file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
});

await page.goto(origin+'/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__ecosystemQA);
const empty=await page.evaluate(()=>window.__ecosystemQA.snapshot());
assert.equal(empty.capacity,0);assert.equal(empty.natural,0);assert.equal(empty.stage,0);
await page.evaluate(()=>window.__ecosystemQA.addGuests(3));
const starving=await page.evaluate(()=>window.__ecosystemQA.starve(5));
assert.ok(starving.shortage>.9);assert.ok(starving.health.every(value=>value<100));
const rich=await page.evaluate(()=>window.__ecosystemQA.buildRich());
assert.ok(rich.capacity>100);assert.equal(rich.stage,5);assert.ok(rich.natural>0);assert.ok(rich.target>0);
assert.equal('ecosystem' in rich.saved,false);assert.equal(await page.evaluate(()=>window.__firebaseWrites||0),0);
await page.screenshot({path:'/tmp/ecosystem-dashboard.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
const mobile=await page.evaluate(()=>{const panel=document.getElementById('ecosystemPanel').getBoundingClientRect(),hud=document.getElementById('hud').getBoundingClientRect();return {panelRight:panel.right,hudRight:hud.right,viewport:innerWidth};});
assert.ok(mobile.panelRight<=mobile.viewport&&mobile.hudRight<=mobile.viewport);
await page.screenshot({path:'/tmp/ecosystem-dashboard-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);
console.log(JSON.stringify({empty,starving:{capacity:starving.capacity,shortage:starving.shortage,health:starving.health},rich:{score:rich.score,stage:rich.stage,capacity:rich.capacity,natural:rich.natural,target:rich.target},mobile,firebaseWrites:0,errors},null,2));
await browser.close();
