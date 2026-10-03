import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||(runtime?runtime+'/playwright/index.mjs':'playwright'));
const origin='http://127.0.0.1:8875',root=new URL('../',import.meta.url).pathname.replace(/\/$/,''),errors=[];
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:null)});
try{
 const context=await browser.newContext({viewport:{width:1200,height:800}}),page=await context.newPage();
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await context.route('https://cdn.jsdelivr.net/npm/three@0.179.1/**',route=>route.fulfill({path:root+'/node_modules/three/'+route.request().url().split('three@0.179.1/')[1],contentType:'text/javascript'}));
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`
 export const initializeApp=()=>({}),getAuth=()=>({}),getDatabase=()=>({});
 export const onAuthStateChanged=()=>{},signInAnonymously=async()=>({});
 export const ref=(db,path)=>path,push=()=>({key:'test'}),serverTimestamp=()=>123,set=async()=>{};
 export const get=async()=>({exists:()=>true,val:()=>({name:'Neighbor',ownerId:'test-owner',world:{version:4,worldHalf:144,cells:[],terrain:[]}})});`}));
 await context.route(origin+'/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path!=='/'){
   try{return await route.fulfill({body:await fs.readFile(root+path),contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'application/octet-stream'});}
   catch{return route.fulfill({status:404,body:''});}
  }
  let html=await fs.readFile(root+'/index.html','utf8');
  const marker='drawMinimap();\nanimate();';assert.ok(html.includes(marker));
  html=html.replace(marker,`const nativeRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='animate'?0:nativeRAF(cb);
  let qaNow=0;simulationTime=()=>qaNow;
  window.__recoveryQA={
   depth:async()=>{
    firebaseUser={uid:"test-owner"};
    restoreWorld({version:4,worldHalf:144,cells:[],terrain:[{key:'0,0',offset:-180}],megafaunaDisabled:{orca:true,whale:true}});
    communityOcean.syncCurrent();const before=rawTerrainHeightAt(0,0),saved=worldData();
    communityOcean.engine.setPosition('neighbor-deep',{hexQ:1,hexR:0});
    const away=await communityOcean.visit('neighbor-deep');
    const back=await communityOcean.visit('local-world');
    const after=terrainHeightAt(0,0);
    const draft=await readWorldDraft('test-owner','local-world');
    return {before,after,away,back,terrain:worldData().terrain,savedTerrain:saved.terrain,draftTerrain:draft.world.terrain};
   },
   fish:(hour=12,distant=false,freeze=true)=>{
    for(const fish of [...fishes])scene.remove(fish);fishes.length=0;schools.clear();schoolThinkAccumulator=0;qaNow=100;
    restoreWorld({version:4,worldHalf:144,cells:[],terrain:[],megafaunaDisabled:{orca:true,whale:true}});
    oceanWeather.setHour(hour);currentWeatherState=oceanWeather.snapshot();
    const cells=[];for(let iy=-6;iy<=0;iy++)for(let iz=-15;iz<=15;iz++)cells.push({ix:0,iy,iz,density:1});
    volumeSculpt.load({format:'ocean-volume-sculpt-v1',cellSize:3,cells});
    const formation=currentSculptFormations()[0];
    rockFormationMeshes.build(formation,{shapeLevel:3});
    const school=makeSchool('recovery-test',{cohesion:1,alignment:.6,habitatPull:.5,cruiseSpeed:1.2});
    school.importTemplate=new THREE.Group();school.oceanProfile=oceanPreset('balanced');school.sleeping=hour>=21;school.retargetAt=1000;
    school.target.set(hour>=21?-3.25:0,-10,0);school.sourceName='Recovery';
    const anchors=[];
    for(let i=0;i<12;i++){
     const fish=new THREE.Group();fish.add(new THREE.Mesh(new THREE.SphereGeometry(.2,6,4),new THREE.MeshBasicMaterial({color:0xffcc00})));
     fish.position.set(i<6?-3.25:3.25,-10,(i%6-2.5)*1.1);fish.userData.imported=true;
     registerFish(fish,'recovery-test',school);scene.add(fish);fishes.push(fish);anchors.push(fish.position.clone());
    }
    camera.position.set(distant?120:0,-5,12);const kicks=[];
    const originalStartle=startleStuckFish;startleStuckFish=(f,t)=>{const success=originalStartle(f,t);kicks.push({fish:f.uuid,t,success});return success;};
    const originalThink=updateSchoolBrains;
    // Freeze positions to model a persistent jam, while running production movement,
    // collision, recovery timing and school release. Successful escape is tested separately.
    updateSchoolBrains=t=>{updateRecoverySchools(t);splitImportedSchools(t);};
    for(let frame=0;frame<750;frame++){
     qaNow=100+frame/30;
     if(freeze)fishes.forEach((fish,i)=>fish.position.copy(anchors[i]));
     updateFish(1/30,qaNow);
    }
    updateSchoolBrains=originalThink;startleStuckFish=originalStartle;
    return {hour,distant,freeze,kicks,groups:[...schools.values()].map(s=>s.members.length),
     trapped:fishes.filter(f=>pointInsideRock(f.position,Math.max(FISH_RADIUS,f.userData.contactRadius))).length,
     asleep:fishes.filter(f=>f.userData.sleeping).length};
   }
  };drawMinimap();animate();`);
  await route.fulfill({body:html,contentType:'text/html'});
 });
 await page.goto(origin);await page.waitForFunction(()=>window.__recoveryQA,null,{timeout:60000});
 const depth=await page.evaluate(()=>window.__recoveryQA.depth());
 assert.equal(depth.away,true);assert.equal(depth.back,true);assert.equal(depth.before,depth.after);
 assert.deepEqual(depth.terrain,depth.savedTerrain);assert.deepEqual(depth.draftTerrain,depth.savedTerrain);
 const day=await page.evaluate(()=>window.__recoveryQA.fish(12,false,true));
 const far=await page.evaluate(()=>window.__recoveryQA.fish(12,true,true));
 const night=await page.evaluate(()=>window.__recoveryQA.fish(21,false,true));
 const escaped=await page.evaluate(()=>window.__recoveryQA.fish(12,false,false));
 for(const result of [day,far]){
  assert.deepEqual(result.groups.sort((a,b)=>a-b),[6,6]);assert.equal(result.trapped,0);
  const byFish=new Map();for(const kick of result.kicks){const times=byFish.get(kick.fish)||[];times.push(kick);byFish.set(kick.fish,times);}
  assert.equal(byFish.size,12);
  for(const times of byFish.values()){
   assert.equal(times.length,2);assert.ok(times.every(k=>k.success));assert.ok(Math.abs(times[1].t-times[0].t-10)<.04);
  }
 }
 assert.equal(night.kicks.length,0);assert.deepEqual(night.groups,[12]);assert.ok(night.asleep>=6);assert.equal(escaped.trapped,0);
 // IndexedDB survives a reload in the same browsing context.
 await page.reload();await page.waitForFunction(()=>window.__recoveryQA);
 const persisted=await page.evaluate(async()=>{const {readWorldDraft}=await import('/worlds/WorldDraftStore.js');return (await readWorldDraft('test-owner','local-world')).world.terrain;});
 assert.deepEqual(persisted,depth.savedTerrain);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({depth,day:{kicks:day.kicks.length,groups:day.groups},far:{kicks:far.kicks.length,groups:far.groups},night:{kicks:night.kicks.length,groups:night.groups},escaped:{kicks:escaped.kicks.length,trapped:escaped.trapped},persisted,errors},null,2));
}finally{await browser.close();}
