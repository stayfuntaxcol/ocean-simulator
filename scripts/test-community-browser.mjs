const {chromium:playwright}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const chromium=process.env.CHROMIUM_BUNDLE ? (await import(process.env.CHROMIUM_MODULE||'@sparticuz/chromium')).default : null;
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,''),bin=process.env.CHROMIUM_BUNDLE,executable=process.env.CHROMIUM_EXECUTABLE;
const artifacts=process.env.OCEAN_BROWSER_ARTIFACTS||root+'/docs/community-review';
const browser=await playwright.launch(bin
  ? {headless:true,executablePath:bin+'/chromium',args:chromium.args,env:{...process.env,LD_LIBRARY_PATH:bin,FONTCONFIG_PATH:bin+'/fonts'}}
  : executable
    ? {headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-webgl']}
    : {headless:true});
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
  const id=path.split('/')[1],names={A:'Mijn koraaltuin',B:'Diepe buurwereld',C:'Verre rifwereld'},record={name:names[id]||id,ownerId:id==='A'?'owner-A':'owner-B',visibility:'link',world:{version:4,worldHalf:144,cellSize:12,cells:[{key:id==='A'?'0,0':'1,1',layers:[{id:1,type:'coral'}]}],terrain:id==='B'?Array.from({length:25},(_,i)=>({key:((i%5)-2)+','+(Math.floor(i/5)+8),offset:-12})):[],hexWorld:{hexQ:0,hexR:0},orca:null,whale:null,lavaVents:[]}};
  return {exists:()=>['A','B','C'].includes(id),val:()=>record};
 };
 export const set=async()=>{window.__writes=(window.__writes??0)+1;throw Error('Unexpected write in travel test');};
 `}));
await page.route('http://127.0.0.1:8765/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 if(path==='/'){
  let html=await fs.readFile(root+'/index.html','utf8');
  const qa=`
   const nativeRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='animate'?0:nativeRAF(cb);
   window.__communityQA={state:()=>({id:communityOcean.activeId,busy:communityOcean.busy,cells:worldData().cells,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),editable:canEditCurrentWorld(),status:communityOcean.lastStatus,floor:terrainHeightAt(camera.position.x,camera.position.z),neighbors:SIDES.map((_,side)=>communityOcean.engine.neighbor(side))}),
    navigation:()=>{
      const check=(condition,message)=>{if(!condition)throw Error(message);};
      const pose=camera.position.clone(),rotation=camera.quaternion.clone(),zoom=minimapZoom;
      const originalTranslate=minimapCtx.translate,originalRotate=minimapCtx.rotate;
      let arrow,angle;
      minimapCtx.translate=function(x,y){arrow={x,y};return originalTranslate.call(this,x,y);};
      minimapCtx.rotate=function(a){angle=a;return originalRotate.call(this,a);};
      const press=(code,dt=.1)=>{dispatchEvent(new KeyboardEvent('keydown',{code}));updateMovement(dt);dispatchEvent(new KeyboardEvent('keyup',{code}));};
      const probe=new THREE.Object3D();probe.position.set(0,10,0);probe.userData.velocity=new THREE.Vector3(0,0,-1);probe.userData.schoolId='navigation-probe';
      scene.add(probe);schools.set('navigation-probe',{members:[probe],avgVelocity:probe.userData.velocity.clone(),speciesId:'navigation-probe'});
      try{
        minimapZoom=1;
        for(const [x,z,dx,dz] of [[0,-72,0,-1],[72,0,1,0],[0,72,0,1],[-72,0,-1,0]]){
          camera.position.set(x,10,z);camera.lookAt(x+dx,10,z+dz);drawMinimap();
          check(Math.abs(arrow.x-(x+144)/288*minimap.width)<1e-7,'player map X');
          check(Math.abs(arrow.y-(z+144)/288*minimap.height)<1e-7,'player map north/south');
          check(Math.abs(Math.sin(angle)-dx)<1e-7&&Math.abs(-Math.cos(angle)-dz)<1e-7,'player arrow heading');
        }
        const rect=minimap.getBoundingClientRect();
        const target=minimapWorldFromEvent({clientX:rect.left+rect.width*.25,clientY:rect.top+rect.height*.25});
        check(target.x===-72&&target.z===-72,'northwest map click is not mirrored');
        for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const code of ['KeyA','KeyD']){
          camera.position.set(0,10,0);camera.up.set(0,1,0);camera.rotation.set(0,yaw,0);camera.updateMatrixWorld(true);
          const screenRight=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),before=camera.position.clone();
          controls.isLocked=true;press(code);controls.isLocked=false;
          check(camera.position.clone().sub(before).dot(screenRight)*(code==='KeyD'?1:-1)>.1,'A/D screen direction while swimming');
        }
        for(const mode of ['fish','school'])for(const orbit of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const code of ['KeyA','KeyD']){
          camera.position.set(Math.sin(orbit)*9,10,Math.cos(orbit)*9);camera.lookAt(probe.position);camera.updateMatrixWorld(true);
          const screenRight=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),before=camera.position.clone();
          startFollowing(probe,mode);press(code);
          check(camera.position.clone().sub(before).dot(screenRight)*(code==='KeyD'?1:-1)>.01,'A/D screen direction while following '+mode);
          stopFollowing(false);
        }
        startFollowing(probe,'fish');setEditMode(true);
        check(editMode&&followMode===null,'entering editor stops follow camera');camera.updateMatrixWorld(true);
        check(hexBoundaryGroup.visible,'hex boundary is visible in editor');
        check(hexBoundaryGroup.children.length===2&&hexBoundaryGroup.children.every(line=>line.material.depthTest===false),'hex boundary stays above raised terrain');
        for(const [x,z] of [[-24,-24],[24,-24],[-24,24],[24,24]]){
          const projected=new THREE.Vector3(x,-18,z).project(camera);
          check(projected.x*x>0&&projected.y*z<0,'editor landmark matches map quadrant');
        }
        for(const [code,axis,sign] of [['KeyA','x',-1],['KeyD','x',1],['KeyW','z',-1],['KeyS','z',1]]){
          const before=camera.position[axis];press(code);check((camera.position[axis]-before)*sign>0,'editor key '+code);
        }
        teleportEditorTo(target.x,target.z);check(camera.position.x===-72&&camera.position.z===-72,'editor map teleport');
        camera.updateMatrixWorld(true);check(new THREE.Vector3(-72,-18,-90).project(camera).y>0,'editor stays north-up after teleport');
        drawMinimap();check(angle===0,'editor map arrow points north');
        setEditMode(false);return {maps:true,freeSwim:true,fishFollow:true,schoolFollow:true,editor:true,hexBoundary:true};
      }finally{
        if(editMode)setEditMode(false);stopFollowing(false);scene.remove(probe);schools.delete('navigation-probe');
        minimapCtx.translate=originalTranslate;minimapCtx.rotate=originalRotate;
        Object.keys(keys).forEach(k=>keys[k]=false);controls.isLocked=false;minimapZoom=zoom;
        camera.position.copy(pose);camera.quaternion.copy(rotation);camera.up.set(0,1,0);drawMinimap();
      }
    },
    edit:()=>{addLayerToCell(0,0,'sponge');},render:()=>renderer.render(scene,camera),
    cross:()=>{camera.position.set(0,-20,-124);const previous=camera.position.clone();controls.isLocked=true;keys.KeyW=true;updateMovement(.2);keys.KeyW=false;controls.isLocked=false;communityOcean.update(previous,{revision:habitatRevision});},
    visit:id=>communityOcean.visit(id),sync:()=>communityOcean.rebuild(),
    addFar:()=>{const position={hexQ:0,hexR:-2};communityOcean.engine.setPosition('C',position);registerAtlasWorld({id:'C',name:'Verre rifwereld',ownerId:'owner-B',visibility:'link',...position});communityOcean.refreshHUD();renderWorldAtlas();},
    orient:()=>{camera.rotation.set(.05,.3,0);},move:()=>{controls.isLocked=true;keys.KeyW=true;updateMovement(.01);keys.KeyW=false;controls.isLocked=false;}};
  `;
  return route.fulfill({body:html.replace('</script>\n</body>',qa+'</script>\n</body>'),contentType:'text/html'});
 }
 return route.fulfill({path:root+path,contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});
});
await page.goto('http://127.0.0.1:8765/?world=A&reef=organic');
await page.waitForFunction(()=>window.__communityQA?.state().id==='A'&&!window.__communityQA.state().busy,null,{timeout:60000});
assert.deepEqual(errors,[]);
const navigation=await page.evaluate(()=>window.__communityQA.navigation());
assert.deepEqual(navigation,{maps:true,freeSwim:true,fishFollow:true,schoolFollow:true,editor:true,hexBoundary:true});
await page.evaluate(()=>window.__communityQA.edit());
const own=await page.evaluate(()=>window.__communityQA.state());assert.equal(own.cells[0].layers.length,2);
await page.locator('#journeyAtlas').click();
await page.locator('#journeyWorldLink').fill('http://localhost/?world=B');
await page.locator('#journeyConnect').click();
await page.waitForFunction(()=>document.getElementById('journeyStatus').textContent.includes('Verbonden met'),null,{timeout:60000});
assert.equal(await page.locator('#worldAtlasSvg .atlas-world').count(),2);
const atlasLabels=await page.locator('#worldAtlasSvg .atlas-world-label').evaluateAll(elements=>elements.map(e=>({name:e.textContent,y:Number(e.getAttribute('y'))})));
assert.ok(atlasLabels.find(e=>e.name==='Diepe buurwereld').y<atlasLabels.find(e=>e.name==='Mijn koraaltuin').y,'north neighbor is above source');
await fs.mkdir(artifacts,{recursive:true});
await page.screenshot({path:artifacts+'/atlas.png'});

// De primaire atlasknop opent een aangrenzende wereld direct.
await page.locator('#worldAtlasSvg .atlas-world').filter({hasText:'Diepe buurwereld'}).click();
await page.locator('#worldAtlasEnterBtn').click();
await page.waitForFunction(()=>window.__communityQA.state().id==='B'&&!window.__communityQA.state().busy,null,{timeout:60000});
assert.equal(await page.evaluate(()=>window.__communityQA.visit('A')),true);
await page.waitForFunction(()=>window.__communityQA.state().id==='A'&&!window.__communityQA.state().busy,null,{timeout:60000});
assert.deepEqual((await page.evaluate(()=>window.__communityQA.state())).cells,own.cells,'atlas round trip preserves own draft');

// De atlas is een transportkaart: ook een bekende wereld die twee hexen verder
// ligt kan rechtstreeks worden geopend. Zwemmen blijft wel buur-gebonden.
await page.evaluate(()=>window.__communityQA.addFar());
await page.locator('#journeyAtlas').click();
await page.locator('#worldAtlasSvg .atlas-world').filter({hasText:'Verre rifwereld'}).press('Enter');
await page.locator('#worldAtlasEnterBtn').click();
await page.waitForFunction(()=>window.__communityQA.state().id==='C'&&!window.__communityQA.state().busy,null,{timeout:60000});
let state=await page.evaluate(()=>window.__communityQA.state());assert.ok(Math.abs(state.position[0])<1e-8&&Math.abs(state.position[2])<1e-8,'distant atlas arrival is central');
assert.equal(await page.evaluate(()=>window.__communityQA.visit('A')),true);
await page.waitForFunction(()=>window.__communityQA.state().id==='A'&&!window.__communityQA.state().busy,null,{timeout:60000});

// Een Firebase-fout blijft zichtbaar in de atlas in plaats van een schijnbaar
// dode knop of een gesloten scherm op te leveren.
await page.locator('#journeyAtlas').click();await page.locator('#worldAtlasSvg .atlas-world').filter({hasText:'Diepe buurwereld'}).click();
await page.evaluate(()=>window.__deny=true);await page.locator('#worldAtlasEnterBtn').click();
await page.waitForFunction(()=>document.getElementById('worldAtlasStatus').textContent.includes('permission_denied'),null,{timeout:60000});
assert.ok(await page.locator('#worldAtlasOverlay').evaluate(element=>element.classList.contains('open')),'failed atlas travel remains open');
await page.evaluate(()=>window.__deny=false);await page.locator('#worldAtlasClose').click();
await page.evaluate(()=>{window.__communityQA.orient();window.__communityQA.cross();});
await page.waitForFunction(()=>window.__communityQA.state().id==='B'&&!window.__communityQA.state().busy,null,{timeout:60000});
state=await page.evaluate(()=>window.__communityQA.state());
assert.ok(Math.abs(state.quaternion[1]-.14939143548941183)<1e-10,'swimming direction preserved');
assert.equal(state.editable,false);assert.equal(state.cells[0].key,'1,1');assert.ok(state.position[2]>120);assert.ok(state.position[1]>=state.floor+1-1e-5);assert.ok(state.position[1]<-15);
assert.ok(await page.locator('#editModeBtn').isDisabled());
await page.evaluate(()=>window.__communityQA.move());assert.ok((await page.evaluate(()=>window.__communityQA.state())).position[1]<-15);
await page.evaluate(()=>window.__communityQA.render());await page.screenshot({path:artifacts+'/neighbor.png'});
await page.evaluate(()=>window.__deny=true);
assert.equal(await page.evaluate(()=>window.__communityQA.visit('A')),false);assert.equal((await page.evaluate(()=>window.__communityQA.state())).id,'B');
await page.evaluate(()=>window.__deny=false);
assert.equal(await page.evaluate(()=>window.__communityQA.visit('A')),true);
state=await page.evaluate(()=>window.__communityQA.state());
assert.deepEqual(state.cells.map(cell=>({key:cell.key,layers:cell.layers.map(layer=>({id:layer.id,type:layer.type}))})),own.cells.map(cell=>({key:cell.key,layers:cell.layers.map(layer=>({id:layer.id,type:layer.type}))})),'repeated travel preserves own designed layers');assert.equal(state.editable,true);
await page.locator('#journeyMenu').click();assert.ok(await page.evaluate(()=>{const e=document.getElementById('hud');return e.scrollHeight>e.clientHeight&&getComputedStyle(e).overflowY==='auto';}));
assert.equal(await page.evaluate(()=>window.__writes??0),0);assert.deepEqual(errors,[]);

// De atlas is de duurzame fallback wanneer browser-/poortwijzigingen de losse
// bezoekroute wissen. Na herladen moeten het hexkader en de doorgang terugkomen.
await page.evaluate(()=>localStorage.removeItem('fiveLoavesOceanVisitRoutesV1'));
await page.reload({waitUntil:'load'});
await page.waitForFunction(()=>window.__communityQA?.state().id==='A'&&!window.__communityQA.state().busy,null,{timeout:60000});
state=await page.evaluate(()=>window.__communityQA.state());assert.equal(state.neighbors[0],'B','north route restored from atlas');
await page.locator('#journeyAtlas').click();assert.ok(await page.locator('#worldAtlasSvg .atlas-world').count()>=2,'saved atlas hexes remain visible');
await page.locator('#worldAtlasClose').click();
await page.evaluate(()=>window.__communityQA.cross());
await page.waitForFunction(()=>window.__communityQA.state().id==='B'&&!window.__communityQA.state().busy,null,{timeout:60000});
assert.equal(await page.evaluate(()=>window.__communityQA.visit('A')),true,'restored route remains swimmable');
await page.waitForFunction(()=>window.__communityQA.state().id==='A'&&!window.__communityQA.state().busy,null,{timeout:60000});
assert.deepEqual(errors,[]);

await page.setViewportSize({width:390,height:844});await page.locator('#journeyAtlas').click();
assert.ok(await page.evaluate(()=>{const e=document.getElementById('worldAtlasDetails');e.scrollTop=e.scrollHeight;return e.clientHeight>0&&e.scrollTop>0;}),'mobile atlas form scrolls');
await page.screenshot({path:artifacts+'/mobile-atlas.png'});
console.log(JSON.stringify({passed:true,navigation,checks:['Firebase read adapter','two atlas hexes','atlas button opens adjacent world','atlas directly opens distant known world','failed atlas travel remains visible','visible editor hex boundary','natural north crossing','opposite entrance','deep arrival and continued swimming','visitor build lock','permission failure preserves world','round trip preserves own draft','atlas route recovery after local route loss','scrollable menu','zero cloud writes','zero browser errors'],state},null,2));
await fs.writeFile(artifacts+'/browser-result.json',JSON.stringify({passed:true,navigation,errors,cloudWrites:0,ownDraftPreserved:true,oppositeEntrance:true,deepSwimming:true,atlasRouteRecovered:true},null,2));
}finally{await browser.close();}
