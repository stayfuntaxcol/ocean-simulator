import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||(runtime?runtime+'/playwright/index.mjs':'playwright'));
const origin='http://127.0.0.1:8875',errors=[],root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:null)});
const context=await browser.newContext({viewport:{width:1200,height:800}}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text());});
await context.route('https://cdn.jsdelivr.net/npm/three@0.179.1/**',route=>route.fulfill({path:root+'/node_modules/three/'+route.request().url().split('three@0.179.1/')[1],contentType:'text/javascript'}));
await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`
export const initializeApp=()=>({}),getAuth=()=>({}),getDatabase=()=>({});
export const onAuthStateChanged=(a,cb)=>setTimeout(()=>cb(null),0),signInAnonymously=async()=>({});
export const ref=(db,path)=>path,push=()=>({key:'test'}),serverTimestamp=()=>123,set=async()=>{};
export const get=async()=>({exists:()=>false,val:()=>null});`}));
await context.route(origin+'/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/'||path==='/index.html'){
    let html=await fs.readFile(root+'/index.html','utf8');html=html.replace("powerPreference:'high-performance'","powerPreference:'high-performance',preserveDrawingBuffer:true");const marker='drawMinimap();\nanimate();';assert.ok(html.includes(marker));
    html=html.replace(marker,`const nativeRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='animate'?0:nativeRAF(cb);
window.__sculptQA={run:()=>{
  restoreWorld({version:4,cellSize:12,worldHalf:144,cells:[],terrain:[],orca:null,whale:null,megafaunaDisabled:{orca:true,whale:true}});
  camera.position.set(0,-5,25);camera.lookAt(0,-10,0);
  const cells=[];for(let ix=-5;ix<=24;ix++)for(let iy=-6;iy<=-1;iy++)for(let iz=-4;iz<=4;iz++){
    if(Math.abs(iz)<=1&&iy>=-5&&iy<=-3)continue;cells.push({ix,iy,iz,density:1});
  }
  volumeSculpt.load({format:'ocean-volume-sculpt-v1',cellSize:3,cells});volumeSculpt.setVisible(true);volumeSculpt.updateVisibility(camera);
  const preview={...volumeSculpt.stats};volumeSculpt.beginStroke();volumeSculpt.apply(new THREE.Vector3(-15,-12,0),'add');volumeSculpt.endStroke();
  volumeSculpt.undo();const formations=currentSculptFormations(),formation=formations[0];
  const descriptor=normalizeRockFormationDescriptor({formationId:formation.id,shapeLevel:3,skin:'grey_reef'});
  refreshRockFormationOptions(formation.id);rockShapeLevel.value='3';showSelectedFormationAsRock();
  if(rockFormationMeshes.get(formation.id)?.surfaceCount<1)throw Error('Preview has no visible surface cells');
  volumeSculpt.setVisible(false);rockFormationMeshes.update(camera);renderer.render(scene,camera);
  const rendered=renderer.info.render.triangles,near={...rockFormationMeshes.stats};
  const tunnel=!segmentRockHit(new THREE.Vector3(-25,-12,0),new THREE.Vector3(80,-12,0),.3);
  const wall=!!segmentRockHit(new THREE.Vector3(0,-12,0),new THREE.Vector3(0,-12,12),.3);
  const rock=rockFormationMeshes.get(formation.id);rock.root.position.z+=5;rock.root.rotation.y=.1;refreshRockFormationOptions(formation.id);rockFormationSkin.value='algae_reef';changeCurrentFormationSkin();
  const saved=worldData();restoreWorld(saved);const restored=rockFormationMeshes.get(formation.id);
  const transformed=restored&&Math.abs(restored.root.position.z-formation.center.z-5)<1e-5&&Math.abs(restored.root.rotation.y-.1)<1e-5;
  camera.position.set(100,-5,25);camera.lookAt(60,-10,0);rockFormationMeshes.update(camera);renderer.render(scene,camera);
  const far={...rockFormationMeshes.stats};
  camera.position.set(-35,-4,22);camera.lookAt(0,-11,0);oceanWeather.setHour(12);currentWeatherState=oceanWeather.snapshot();atmosphere.update(10,{weather:currentWeatherState});rockFormationMeshes.update(camera);renderer.render(scene,camera);
  const gl=renderer.getContext(),pixel=new Uint8Array(4);gl.readPixels(600,400,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
  return {pixel:[...pixel],exposure:renderer.toneMappingExposure,background:scene.background.getHexString(),camera:camera.position.toArray(),ambient:ambient.intensity,preview,near,far,rendered,tunnel,wall,transformed,restored:!!restored,savedSkin:saved.rockFormations[0]?.skin,savedCells:saved.sculpt.cells.length};
}};
${marker}`);await route.fulfill({body:html,contentType:'text/html'});
  }else {try{await route.fulfill({path:root+decodeURIComponent(path),contentType:path.endsWith('.js')?'text/javascript':undefined});}catch{await route.fulfill({status:404,body:''});}}
});
try{
  await page.goto(origin);await page.waitForFunction(()=>window.__sculptQA,{timeout:60000});
  const result=await page.evaluate(()=>window.__sculptQA.run());
  console.log(JSON.stringify(result,null,2));assert.ok(result.rendered>0);assert.ok(result.near.visibleChunks>0);
  assert.ok(result.tunnel);assert.ok(result.wall);assert.ok(result.restored);assert.ok(result.transformed);assert.equal(result.savedSkin,'algae_reef');
  assert.equal(errors.length,0,JSON.stringify(errors));
  if(process.env.SCULPT_SCREENSHOT)await page.screenshot({path:process.env.SCULPT_SCREENSHOT});
}finally{await browser.close();}
