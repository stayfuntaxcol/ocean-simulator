import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||(runtime?runtime+'/playwright/index.mjs':'playwright'));
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const origin='http://127.0.0.1:8875',errors=[];
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:null)});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(message.text()))errors.push(message.text());});

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
        visitors:()=>{
          restoreWorld({version:4,cellSize:12,worldHalf:144,cells:[],terrain:[],orca:null,whale:null,megafaunaDisabled:{orca:true,whale:true}});
          editMode=false;referencePaused=false;camera.position.set(0,-10,15);camera.lookAt(0,-15,0);
          const result={};
          for(const [kind,suffix] of Object.entries(visitorIds)){
            document.getElementById('place'+suffix).click();
            const a=reefVisitors.get(kind);if(!a)throw Error(kind+' placement failed: '+document.getElementById(kind+'Status').textContent);
            result[kind]={followed:selectedFish===a.root,buttons:document.getElementById('place'+suffix).hidden&&!document.getElementById('follow'+suffix).hidden&&!document.getElementById('remove'+suffix).hidden};
          }
          stopFollowing(false);
          const before=Object.fromEntries([...reefVisitors].map(([k,a])=>[k,a.root.position.clone()]));
          for(let i=0;i<700;i++){updateMegafauna(.04,500+i*.04);updateFish(.04,500+i*.04);}
          for(const [kind,a] of reefVisitors)result[kind].travel=a.root.position.distanceTo(before[kind]);
          const saved=worldData();restoreWorld(saved);result.restored=reefVisitors.size===2;
          const owner=currentCloudOwnerId,id=currentCloudWorldId,loaded=cloudWorldLoaded;
          currentCloudOwnerId='different-owner';currentCloudWorldId='test-visit';cloudWorldLoaded=true;refreshWorldPermissions();
          result.readOnly=document.getElementById('removeStingray').disabled&&document.getElementById('placeTurtle').disabled&&!document.getElementById('followStingray').disabled;
          document.getElementById('removeStingray').click();result.protected=reefVisitors.has('stingray');
          document.getElementById('followStingray').click();result.guestFollow=selectedFish===reefVisitors.get('stingray').root;
          currentCloudOwnerId=owner;currentCloudWorldId=id;cloudWorldLoaded=loaded;refreshWorldPermissions();
          document.getElementById('removeStingray').click();document.getElementById('removeTurtle').click();
          result.removed=reefVisitors.size===0&&!document.getElementById('placeStingray').hidden;
          result.saved=Object.keys(saved.reefVisitors);restoreWorld(saved);return result;
        },
        viewVisitor:(kind,style)=>{
          stopFollowing(false);fishRenderStyle.value=style;fishRenderStyle.dispatchEvent(new Event('change'));
          const a=reefVisitors.get(kind);for(const [k,b] of reefVisitors)b.root.visible=k===kind;
          a.root.position.set(0,-9,0);a.root.rotation.set(0,.35,0);a.animate(.04,3);
          camera.position.set(4,-5,6);camera.lookAt(0,-9,0);renderer.render(scene,camera);
        },
        streamingRocks:()=>{
          const result=[];
          for(const type of ['rocks','mixed','seagrass']){
            const key=cellKey(8,0);addLayerToCell(8,0,type);instantiateCell(key);
            const roots=activeRockRoots().filter(r=>r.userData.editorCell===key);
            const original=roots.flatMap(rockVolumesForRoot);
            importedRockBoxes();unloadCellVisuals(key);
            const unloaded=importedRockBoxes();
            const preserved=original.every(b=>unloaded.some(o=>o.equals(b)));
            instantiateCell(key);
            const loaded=activeRockRoots().filter(r=>r.userData.editorCell===key).flatMap(rockVolumesForRoot);
            const stable=original.length===loaded.length&&original.every((b,i)=>b.min.distanceTo(loaded[i].min)<1e-6&&b.max.distanceTo(loaded[i].max)<1e-6);
            const fresh=loaded.every(b=>importedRockBoxes().some(o=>o.equals(b)));
            result.push({type,count:original.length,preserved,stable,fresh});
            clearCell(key);activeWorldCells.delete(key);
          }
          return result;
        },
        rockInteraction:()=>{
          const previouslyActive=new Set(activeWorldCells);
          for(const [key,layers] of worldCells)if(layers.some(l=>l.type==='mixed'))instantiateCell(key);
          const mixed=reef.children.filter(r=>r.userData.editorLayerType==='mixed'&&r.userData.orcaRock);
          const coverage=mixed.length>0&&mixed.every(r=>r.userData.isSolidRock&&rockCollisionRoots.has(r));
          const renderedBoxes=importedRockBoxes();
          const enclosed=mixed.every(r=>r.children.filter(o=>o.isMesh).every(o=>{
            const b=new THREE.Box3().setFromObject(o);
            return renderedBoxes.some(box=>box.containsBox(b));
          }));
          const source=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),new THREE.MeshStandardMaterial());
          const sample=spawnImportedSchool(source,'Rotscontacttest',1),fish=sample.members[0];
          const saved={schools:[...schools],roots:[...rockCollisionRoots],camera:camera.position.clone(),boxes:importBoxes,time:importBoxTime,stamp:importBoxStamp,think:schoolThinkAccumulator,habitats:habitatCells,food:foodSectors};
          const wall=new THREE.Box3(new THREE.Vector3(-2,-30,-3),new THREE.Vector3(2,30,3));
          let overlaps=0,arrived=false,maxY=-Infinity;
          try{
            schools.clear();schools.set(sample.id,sample);rockCollisionRoots.clear();
            camera.position.set(0,6,20);fish.position.set(-10,6,0);fish.userData.velocity.set(1,0,0);
            sample.target.set(10,6,0);sample.retargetAt=1e9;sample.migrationAt=1e9;sample.forceMigration=false;sample.cruiseSpeed=1.8;
            for(let i=0;i<2400;i++){
              importBoxes=[wall];importBoxTime=performance.now()/1000;importBoxStamp=String(habitatRevision)+':'+lastStreamingCell+':'+rockCollisionRevision;
              updateFish(.04,1100+i*.04);
              if(wall.clone().expandByScalar(fish.userData.contactRadius).containsPoint(fish.position))overlaps++;
              maxY=Math.max(maxY,fish.position.y);
              if(fish.position.x>7){arrived=true;break;}
            }
            sample.speciesId='reef_5';sample.cruiseSpeed=SPECIES_POLICY.reef_5.cruiseSpeed;sample.habitatPull=1.3;
            fish.userData.speciesId='reef_5';fish.userData.imported=false;fish.userData.rockRoute=null;fish.userData.lastRockSafe=null;
            fish.position.set(-10,6,0);fish.userData.velocity.set(0,0,0);sample.target.set(10,6,0);sample.navWaypoint=null;sample.navRemaining=null;
            for(let i=0;i<600;i++){
              importBoxes=[];importBoxTime=performance.now()/1000;importBoxStamp=String(habitatRevision)+':'+lastStreamingCell+':'+rockCollisionRevision;
              updateFish(.04,1500+i*.04);
            }
            const cardinalTravel=fish.position.x+10;
            const key=foodSectorKey(10,0,FOOD_SECTOR_SIZE);
            foodSectors=new Map([[key,{key,x:10,z:0,capacity:10,demand:0,stock:10,maxFood:10}]]);
            habitatCells=[{key:'test-food',x:10,z:0,hasLife:true,livingPoints:[{x:10,y:35,z:0,score:4}]}];
            const rejectsDryFood=!chooseImportedFeedingTarget(sample,2000);
            habitatCells[0].livingPoints[0].y=6;
            const acceptsWetFood=chooseImportedFeedingTarget(sample,2001)&&sample.target.y<waterLimit(fish);
            return {coverage,enclosed,overlaps,arrived,maxY,ceiling:waterLimit(fish),end:fish.position.toArray(),rejectsDryFood,acceptsWetFood,cardinalTravel};
          }finally{
            schools.clear();for(const [id,s] of saved.schools)if(s!==sample)schools.set(id,s);
            rockCollisionRoots.clear();for(const r of saved.roots)rockCollisionRoots.add(r);
            camera.position.copy(saved.camera);importBoxes=saved.boxes;importBoxTime=saved.time;importBoxStamp=saved.stamp;schoolThinkAccumulator=saved.think;
            habitatCells=saved.habitats;foodSectors=saved.food;
            scene.remove(fish);const index=fishes.indexOf(fish);if(index>=0)fishes.splice(index,1);
            for(const key of [...activeWorldCells])if(!previouslyActive.has(key))unloadCellVisuals(key);
            importBoxTime=-Infinity;megafaunaRockTime=-Infinity;
          }
        },
        surfaceRoute:()=>{
          const source=new THREE.Mesh(new THREE.SphereGeometry(.25,8,6),new THREE.MeshStandardMaterial());
          const previousSchools=[...schools];
          const school=spawnImportedSchool(source,'Rotsroute',8);
          schools.clear();schools.set(school.id,school);
          school.members.forEach((fish,i)=>{fish.position.set(-6-(i%2)*4,6,(Math.floor(i/2)-1.5)*4);fish.userData.velocity.set(1,0,0);fish.userData.foodReserve=fish.userData.maxFoodReserve*.25;});
          school.target.set(22,6,0);school.retargetAt=1e9;school.migrationAt=1e9;school.navRetryAt=0;
          school.forceMigration=false;
          const previous={boxes:importBoxes,time:importBoxTime,stamp:importBoxStamp,camera:camera.position.clone()};
          const wall=new THREE.Box3(new THREE.Vector3(6,-30,-3),new THREE.Vector3(11,30,3));
          let overlaps=0,above=0;
          try{
            camera.position.set(0,6,20);
            for(let i=0;i<2400;i++){
              importBoxes=[wall];importBoxTime=performance.now()/1000;importBoxStamp=String(habitatRevision)+':'+lastStreamingCell+':'+rockCollisionRevision;
              updateFish(.04,1000+i*.04);
              for(const fish of school.members){
                if(wall.clone().expandByScalar(fish.userData.contactRadius).containsPoint(fish.position))overlaps++;
                if(fish.position.y>waterLimit(fish)+.001)above++;
              }
            }
            return {arrived:school.members.filter(f=>f.position.x>15).length,overlaps,above};
          }finally{
            importBoxes=previous.boxes;importBoxTime=previous.time;importBoxStamp=previous.stamp;camera.position.copy(previous.camera);
            for(const fish of school.members){scene.remove(fish);const i=fishes.indexOf(fish);if(i>=0)fishes.splice(i,1);}
            schools.clear();for(const [id,s] of previousSchools)schools.set(id,s);
          }
        },
        splitSchool:()=>{
          const source=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),new THREE.MeshStandardMaterial({color:0x77bbee}));
          const original=spawnImportedSchool(source,'Deelbare school',16);
          original.birthCredit=.6;const before=fishes.length;
          splitImportedSchools(600);
          const sibling=[...schools.values()].find(s=>s!==original&&s.importTemplate===original.importTemplate&&s.sourceName===original.sourceName);
          if(!sibling)throw Error('School did not split at 16 fish');
          const members=[...original.members,...sibling.members];
          const result={count:[original.members.length,sibling.members.length],unchanged:fishes.length===before,
            unique:new Set(members).size===16,ids:members.every(f=>f.userData.schoolId===(original.members.includes(f)?original.id:sibling.id)),
            sector:[original.feedingSector,sibling.feedingSector],source:sibling.libraryId===original.libraryId,credit:original.birthCredit+sibling.birthCredit};
          return result;
        },
        survivalCheck:()=>{
          const school=[...schools.values()].find(s=>s.importTemplate),fish=school.members[0];
          const sectors=[...foodSectors.values()];const destination=sectors.at(-1);
          school.center.set(sectors[0].x,-8,sectors[0].z);school.currentFoodSector=sectors[0].key;
          for(const sector of sectors){sector.demand=sector.capacity*2;sector.stock=0;}
          destination.demand=0;destination.stock=destination.maxFood;destination.capacity=20;
          let suitable=0;for(let i=0;i<100;i++){school.forceMigration=true;chooseSchoolTarget(school,2000+i);if(school.feedingSector===destination.key)suitable++;}
          for(const member of school.members)member.userData.foodReserve=member.userData.maxFoodReserve*.2;
          let hungrySuitable=0;for(let i=0;i<20;i++){school.forceMigration=true;chooseSchoolTarget(school,2200+i);if(school.feedingSector===destination.key)hungrySuitable++;}
          fish.userData.health=42;fish.userData.foodReserve=fish.userData.maxFoodReserve*.6;fish.userData.localFoodSupply=.8;
          startFollowing(fish);refreshFollowMeters();refreshImportInventory();
          const meters=[...document.querySelectorAll('#followMeters [role="meter"]')].map(n=>Number(n.getAttribute('aria-valuenow')));
          const source=new THREE.Mesh(new THREE.SphereGeometry(.2,6,4),new THREE.MeshStandardMaterial());
          const extinct=spawnImportedSchool(source,'Verdwenen testsoort',1);refreshImportInventory();removeBuriedFish(extinct.members[0]);refreshImportInventory();
          const row=[...document.querySelectorAll('.import-species-row')].find(n=>n.textContent.includes('Verdwenen testsoort'));
          return {suitable,hungrySuitable,meters,extinct:row?.textContent,disabled:row?.querySelector('button').disabled};
        },
        clockCheck:()=>{
          const fish=livingImportedFish()[0];fish.position.set(135,-8,135);fish.userData.localFoodSupply=0;
          const result={};populationGrowth.checked=false;
          for(const speed of [0,1,8]){
            ecologySpeed.value=String(speed);fish.userData.foodReserve=180;fish.userData.health=100;
            for(let i=0;i<100;i++)updateEcology(.04);
            result[speed]=180-fish.userData.foodReserve;
          }
          ecologySpeed.value='1';return result;
        },
        growthCheck:()=>{
          for(const school of [...schools.values()])if(school.natural)removeNaturalSchool(school);
          for(const fish of [...livingImportedFish()])removeBuriedFish(fish);
          const source=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),new THREE.MeshStandardMaterial({color:0xffaa33}));
          const school=spawnImportedSchool(source,'Test growth',2);
          const sector=[...foodSectors.values()].sort((a,b)=>b.capacity-a.capacity)[0];
          for(const fish of school.members){fish.position.set(sector.x,terrainHeightAt(sector.x,sector.z)+8,sector.z);fish.userData.localFoodSupply=1;}
          updateLocalFood(.5);const before=livingImportedFish().length;
          populationGrowth.checked=false;school.birthCredit=.999;updatePopulationGrowth(.25);
          const disabled=livingImportedFish().length===before;
          populationGrowth.checked=true;reproductionFactor.value='10';school.birthCredit=.999;
          updatePopulationGrowth(.25);const child=school.members.find(f=>f.userData.growthAge===0);
          if(!child)throw Error('Expected juvenile; sector '+JSON.stringify(localFoodAt(sector.x,sector.z)));
          const initial=child.scale.x,initialRadius=child.userData.contactRadius;
          populationGrowth.checked=false;
          child.userData.localFoodSupply=0;updatePopulationGrowth(.25);
          if(child.userData.growthAge!==0)throw Error('Juvenile grew without food');
          child.userData.localFoodSupply=1;
          for(let i=0;i<2400;i++)updatePopulationGrowth(.25);
          const mature=child.userData.growthAge===MATURITY_SECONDS&&child.scale.x>initial&&child.userData.contactRadius>initialRadius;
          populationGrowth.checked=true;foodSectorSummary.capacity=livingImportedFish().length;school.birthCredit=.999;
          const full=livingImportedFish().length;updatePopulationGrowth(.25);
          const capped=livingImportedFish().length===full;
          populationGrowth.checked=false;foodSectorSummary=summarizeFoodSectors(foodSectors);
          return {disabled,mature,capped,children:full-before,scaleRatio:child.scale.x/initial};
        },
        animalCheck:()=>{
          clearOrca();clearWhale();megafaunaDisabled={orca:false,whale:false};megafaunaAttempt=-Infinity;
          ecosystemState={...ecosystemState,capacity:100};restoreResidentMegafauna(1000);
          const restored=Boolean(orca&&whale);if(!restored)throw Error('Resident animals not restored');
          camera.position.set(-120,0,-100);orca.root.position.set(60,6,40);whale.root.position.set(60,6,-40);
          const a=orca.root.position.clone(),b=whale.root.position.clone();
          for(let i=0;i<100;i++)updateMegafauna(.04,1001+i*.04);
          const moved={orca:orca.root.position.distanceTo(a),whale:whale.root.position.distanceTo(b)};
          megafaunaDisabled.orca=true;clearOrca();restoreResidentMegafauna(1020);
          const removalRespected=!orca;return {restored,moved,removalRespected};
        },
        lateUnlock:()=>controls.dispatchEvent({type:'unlock'}),
        viewSmallSchool:(distance=6)=>{
          microLife.update(0,camera,{quality:'high',revision:habitatRevision,worldKey:currentAtlasWorldId()});
          const before=microLife.schoolSnapshot(),fish=before[0]?.members[0];if(!fish)throw Error('No small school in rich test habitat');
          const target=new THREE.Vector3().fromArray(fish.position);camera.position.copy(target).add(new THREE.Vector3(distance,.4,0));camera.lookAt(target);camera.updateMatrixWorld(true);
          microLife.update(0,camera,{quality:'high',revision:habitatRevision,worldKey:currentAtlasWorldId()});
          renderer.render(scene,camera);return {before,after:microLife.schoolSnapshot(),visible:microLife.stats.fish};
        },
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
await page.waitForFunction(()=>window.__ecosystemQA).catch(error=>{
  console.error('Simulator startup errors:',errors);
  throw error;
});
const ui=await page.evaluate(()=>{
  const panel=document.getElementById('graphicsOptionsPanel');
  const collapsedInitially=!panel.open;
  const style=document.getElementById('fishRenderStyle');
  style.value='realistic';style.dispatchEvent(new Event('change',{bubbles:true}));
  const styleStatus=document.getElementById('fishStyleStatus').textContent;
  return {collapsedInitially,style:style.value,status:styleStatus};
});
assert.equal(ui.collapsedInitially,true);assert.equal(ui.style,'realistic');assert.match(ui.status,/Realistische animatie actief/);
assert.equal(await page.locator('#swimmingSettingsBtn').count(),0,'one menu entry instead of a duplicate graphics button');
await page.waitForFunction(()=>document.getElementById('hud').getBoundingClientRect().top>=document.getElementById('journeyHud').getBoundingClientRect().bottom);
const worldPanel=await page.locator('#journeyHud').boundingBox();
assert.ok(worldPanel.x<20&&worldPanel.y<20&&worldPanel.x+worldPanel.width<1440*.35,'world panel leaves center clear');
// Actual pointer-lock lifecycle, not a manual CSS class toggle.
await page.locator('#startBtn').click();
await page.waitForFunction(()=>Boolean(document.pointerLockElement)&&document.getElementById('startBtn').textContent==='Verkennen actief'&&!document.getElementById('hud').classList.contains('settings-open'));
assert.equal(await page.locator('#hud').isVisible(),false);
await page.keyboard.press('Escape');
// Headless Chromium may not run the browser-chrome Escape action. In that case
// exit via the native API; PointerLockControls still receives the real event.
await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();});
await page.waitForFunction(()=>!document.pointerLockElement&&document.getElementById('startBtn').textContent==='Verder verkennen');
assert.equal(await page.locator('#journeyMenu').isVisible(),true,'world menu survives Escape/unlock');
await page.locator('#journeyMenu').click();
assert.equal(await page.locator('#hud').isVisible(),true);
await page.locator('#graphicsOptionsPanel > summary').click();
assert.equal(await page.locator('#graphicsOptionsPanel').evaluate(e=>e.open),true);
await page.evaluate(()=>window.__ecosystemQA.lateUnlock());
assert.equal(await page.locator('#hud').isVisible(),true,'late unlock cannot hide the open panel');
assert.equal(await page.locator('#journeyMenu').getAttribute('aria-expanded'),'true');
await page.locator('#journeyMenu').click();assert.equal(await page.locator('#hud').isVisible(),false);
await page.locator('#journeyMenu').click();assert.equal(await page.locator('#hud').isVisible(),true);
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
ui.pointerLockOptions=true;ui.keyboardOptions=true;ui.lateUnlockSafe=true;ui.singleLeftMenu=true;
const streaming=await page.evaluate(()=>window.__ecosystemQA.streamingRocks());
console.log(JSON.stringify({streaming}));
for(const row of streaming){assert.equal(row.preserved,true);assert.equal(row.stable,true);assert.equal(row.fresh,true);assert.equal(row.count>0,row.type!=='seagrass');}
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
assert.ok(rich.capacity>10&&rich.capacity<30);assert.equal(rich.stage,5);assert.ok(rich.natural>0);assert.ok(rich.target>0);
assert.ok(rich.sectors.active>0);
const migration=await page.evaluate(()=>window.__ecosystemQA.migrate());
assert.notEqual(migration.to,migration.from);assert.equal(migration.forced,false);
assert.equal('ecosystem' in rich.saved,false);assert.equal(await page.evaluate(()=>window.__firebaseWrites||0),0);
await page.screenshot({path:'/tmp/ecosystem-dashboard.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
const mobile=await page.evaluate(()=>{const panel=document.getElementById('ecosystemPanel').getBoundingClientRect(),hud=document.getElementById('hud').getBoundingClientRect();return {panelRight:panel.right,hudRight:hud.right,viewport:innerWidth};});
assert.ok(mobile.panelRight<=mobile.viewport&&mobile.hudRight<=mobile.viewport);
await page.waitForFunction(()=>document.getElementById('hud').getBoundingClientRect().top>=document.getElementById('journeyHud').getBoundingClientRect().bottom);
await page.screenshot({path:'/tmp/ecosystem-dashboard-mobile.png',fullPage:true});
assert.equal(await page.locator('#minimapWrap').isVisible(),false,'mobile map cannot cover menu controls');
await page.setViewportSize({width:1440,height:1000});
await page.locator('#journeyMenu').click();
for(const distance of [6,1]){
  const shoals=await page.evaluate(distance=>window.__ecosystemQA.viewSmallSchool(distance),distance);
  assert.deepEqual(shoals.after,shoals.before,'moving the camera closer leaves each small fish intact');
  assert.ok(shoals.visible>0);
  await page.screenshot({path:'/tmp/ocean-small-school-'+distance+'m.png'});
}
assert.deepEqual(errors,[]);
const growth=await page.evaluate(()=>window.__ecosystemQA.growthCheck());
assert.equal(growth.disabled,true);assert.equal(growth.mature,true);assert.equal(growth.capped,true);assert.equal(growth.children,1);
const rockInteraction=await page.evaluate(()=>window.__ecosystemQA.rockInteraction());
console.log(JSON.stringify({rockInteraction}));
assert.equal(rockInteraction.coverage,true,'mixed habitat stones are solid');
assert.equal(rockInteraction.enclosed,true,'collision volumes enclose rendered mixed stones');
assert.equal(rockInteraction.overlaps,0,'actual fish update never enters stone');
assert.equal(rockInteraction.arrived,true,'fish actually passes the emerged rock');
assert.ok(rockInteraction.maxY<=rockInteraction.ceiling);
assert.equal(rockInteraction.rejectsDryFood,true);assert.equal(rockInteraction.acceptsWetFood,true);
assert.ok(rockInteraction.cardinalTravel>4,'cardinal travels toward its destination');
const split=await page.evaluate(()=>window.__ecosystemQA.splitSchool());
assert.deepEqual(split.count,[8,8]);assert.equal(split.unchanged,true);assert.equal(split.unique,true);assert.equal(split.ids,true);
assert.notEqual(split.sector[0],split.sector[1]);assert.equal(split.source,true);assert.ok(Math.abs(split.credit-.6)<1e-9);
const surfaceRoute=await page.evaluate(()=>window.__ecosystemQA.surfaceRoute());
console.log(JSON.stringify({surfaceRoute}));
assert.ok(surfaceRoute.arrived>=6,'school members travel around the rock to food');
assert.equal(surfaceRoute.overlaps,0);assert.equal(surfaceRoute.above,0);
const animals=await page.evaluate(()=>window.__ecosystemQA.animalCheck());
assert.equal(animals.restored,true);assert.ok(animals.moved.orca>1);assert.ok(animals.moved.whale>1);assert.equal(animals.removalRespected,true);
const clock=await page.evaluate(()=>window.__ecosystemQA.clockCheck());
assert.equal(clock[0],0);assert.ok(Math.abs(clock[1]-4)<.01);assert.ok(Math.abs(clock[8]-32)<.01);
const survival=await page.evaluate(()=>window.__ecosystemQA.survivalCheck());
assert.ok(survival.suitable>=95);assert.deepEqual(survival.meters,[42,60,80]);assert.match(survival.extinct,/0 · uitgestorven/);assert.equal(survival.disabled,true);
assert.equal(survival.hungrySuitable,20,'hungry school consistently selects the available feeding ground');
await page.screenshot({path:'/tmp/ocean-follow-meters.png'});
assert.equal(await page.evaluate(()=>window.__firebaseWrites||0),0);assert.deepEqual(errors,[]);
console.log(JSON.stringify({growth,split,surfaceRoute,animals,clock,survival}));
await page.locator('#journeyMenu').click();
await page.getByText('Populatiegroei en tijd',{exact:true}).click();
assert.equal(await page.locator('#ecologySpeed').isVisible(),true);
await page.screenshot({path:'/tmp/ocean-population-controls.png'});
console.log(JSON.stringify({ui,empty,starving:{capacity:starving.capacity,shortage:starving.shortage,health:starving.health,reserves:starving.reserves},depleted:{health:depleted.health},burial,rich:{score:rich.score,stage:rich.stage,capacity:rich.capacity,natural:rich.natural,target:rich.target,sectors:rich.sectors.active},migration,mobile,firebaseWrites:0,errors},null,2));
const visitors=await page.evaluate(()=>window.__ecosystemQA.visitors());
for(const kind of ['stingray','turtle']){assert.equal(visitors[kind].followed,true);assert.equal(visitors[kind].buttons,true);assert.ok(visitors[kind].travel>2,kind+' swims');}
for(const key of ['restored','readOnly','protected','guestFollow','removed'])assert.equal(visitors[key],true,key);
assert.deepEqual(visitors.saved,['stingray','turtle']);
for(const kind of ['stingray','turtle'])for(const style of ['cartoon','realistic']){
  await page.evaluate(([kind,style])=>window.__ecosystemQA.viewVisitor(kind,style),[kind,style]);
  await page.screenshot({path:'/tmp/ocean-'+kind+'-'+style+'.png'});
}
assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>window.__firebaseWrites||0),0);console.log(JSON.stringify({visitors}));
await browser.close();
