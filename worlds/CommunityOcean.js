import * as THREE from 'three';
import { HEX, SIDES, axialPosition, apothem, fixedHexMeta, containsHex, closestInHex, edgeDistances, exitSide, neighborSide, parseWorldId } from './HexWorld.js';
import { createWorldTravel, validateWorldRecord } from './WorldTravel.js';
import { createTerrainBlend, terrainFromRecord, createHexTerrainGeometry } from './HexTerrain.js';

const ROUTES_KEY='fiveLoavesOceanVisitRoutesV1';
export function installCommunityOcean(api) {
  const {scene,camera,floor,readWorld,capture,applyRecord,getUserId}=api;
  const terrainGroup=new THREE.Group();terrainGroup.name='Aaneengesloten wereldbodems';scene.add(terrainGroup);
  const hud=document.getElementById('journeyHud'),status=document.getElementById('journeyStatus'),veil=document.getElementById('journeyWaterVeil');
  const link=document.getElementById('journeyWorldLink'),direction=document.getElementById('journeyDirection');
  const known=document.getElementById('journeyKnownWorlds'),connect=document.getElementById('journeyConnect');
  let activeId=null,sample=null,lastStatus='',lastPrefetch=0,revision=-1,disposed=false,rebuilding=false,lastBoundaryMessage=0;
  const localRoutes=new Map(),failures=new Map();
  function say(text){lastStatus=text;status.textContent=text;}
  function persist(){try{localStorage.setItem(ROUTES_KEY,JSON.stringify([...localRoutes].map(([id,p])=>({id,...p}))));}catch{say('De bezoekroute werkt, maar kon niet op dit apparaat worden bewaard.');}}
  try{for(const p of JSON.parse(localStorage.getItem(ROUTES_KEY)||'[]'))if(p&&typeof p.id==='string'&&Number.isSafeInteger(p.hexQ)&&Number.isSafeInteger(p.hexR))localRoutes.set(p.id,{hexQ:p.hexQ,hexR:p.hexR});}catch{}
  function clearTerrain(){for(const m of [...terrainGroup.children]){m.geometry.dispose();terrainGroup.remove(m);}}
  function rebuild() {
    if(disposed||rebuilding||!activeId)return;
    rebuilding=true;
    try{
      const current=engine.positions.get(activeId),ids=[activeId,...SIDES.map((_,s)=>engine.neighbor(s)).filter(Boolean)];
      const items=ids.map(id=>{
        const draft=engine.draft(id),cached=engine.cached(id);
        const record=id===activeId?capture():(draft&&(!draft.ownerId||draft.ownerId===getUserId())?draft:cached),position=engine.positions.get(id);
        return record&&position?{id,...position,height:terrainFromRecord(record)}:null;
      }).filter(Boolean);
      clearTerrain();
      if(items.length<2){sample=null;floor.visible=true;return;}
      sample=createTerrainBlend(items);floor.visible=false;
      const center=axialPosition(current.hexQ,current.hexR);
      for(const w of items){
        const geometry=createHexTerrainGeometry((x,z)=>sample(w.id,x,z)),mesh=new THREE.Mesh(geometry,floor.material);
        const p=axialPosition(w.hexQ,w.hexR);mesh.position.set(p.x-center.x,0,p.z-center.z);mesh.name=w.id;mesh.raycast=()=>{};terrainGroup.add(mesh);
      }
    }finally{rebuilding=false;}
  }
  const engine=createWorldTravel({readWorld,capture,getUserId,onStatus:say,onCache:()=>{rebuild();refreshHUD();},activate:async(id,record,arrival,context)=>{
    const oldPosition=camera.position.clone(),oldQuaternion=camera.quaternion.clone();
    veil.classList.add('visible');
    await new Promise(resolve=>setTimeout(resolve,160));
    try{
      activeId=id;
      await applyRecord(id,record,arrival,context);
      camera.quaternion.copy(oldQuaternion);
      rebuild();
      const floorY=sample?sample(id,camera.position.x,camera.position.z):api.rawTerrain(camera.position.x,camera.position.z);
      camera.position.y=Math.min(18.8,Math.max(camera.position.y,floorY+1.0));
      api.onChanged?.();refreshHUD();
    }catch(error){camera.position.copy(oldPosition);camera.quaternion.copy(oldQuaternion);throw error;}
    finally{requestAnimationFrame(()=>veil.classList.remove('visible'));}
  }});
  function firstFree(origin={hexQ:0,hexR:0}) {
    const occupied=new Set([...engine.positions.values()].map(p=>`${p.hexQ},${p.hexR}`));
    const queue=[origin],seen=new Set();
    for(let i=0;i<queue.length&&i<10000;i++){
      const p=queue[i],key=`${p.hexQ},${p.hexR}`;if(seen.has(key))continue;seen.add(key);
      if(!occupied.has(key))return p;
      for(const s of SIDES)queue.push({hexQ:p.hexQ+s.q,hexR:p.hexR+s.r});
    }
    throw Error('Geen vrije bezoekpositie gevonden.');
  }
  function syncCurrent() {
    const record=capture(),id=api.getWorldId();validateWorldRecord(record);
    // Renaming a newly saved local world keeps its visit position.
    if(activeId==='local-world'&&id!=='local-world'){
      const old=engine.positions.get(activeId);engine.positions.delete(activeId);localRoutes.delete(activeId);if(old)localRoutes.set(id,old);
    }
    activeId=id;
    for(const [other,p] of localRoutes){try{engine.setPosition(other,p);}catch{localRoutes.delete(other);}}
    let p=engine.positions.get(id)??fixedHexMeta(record.world.hexWorld);
    if([...engine.positions].some(([other,v])=>other!==id&&v.hexQ===p.hexQ&&v.hexR===p.hexR))p=firstFree(p);
    engine.setCurrent(id,record,p);localRoutes.set(id,{hexQ:p.hexQ,hexR:p.hexR});persist();rebuild();refreshHUD();
  }
  function refreshHUD() {
    const record=capture(),worldName=document.getElementById('journeyWorldName'),permission=document.getElementById('journeyPermission');
    worldName.textContent=record.name||'Mijn oceaanwereld';
    permission.textContent=record.ownerId&&record.ownerId!==getUserId()?'Bezoeker · alleen bekijken':'Eigen wereld · bouwen toegestaan';
    const before=known.value;known.replaceChildren(new Option('Kies een bekende wereld…',''));
    for(const w of api.getAtlasWorlds())if(w.id!==activeId&&w.id!=='local-world')known.add(new Option(w.name||w.id,w.id));
    known.value=before;
    document.getElementById('journeyNeighbors').replaceChildren(...SIDES.map((s,i)=>{
      const b=document.createElement('button'),id=engine.neighbor(i),world=api.getAtlasWorlds().find(w=>w.id===id);
      b.type='button';b.textContent=`${s.name}: ${id?(world?.name??id):'vrij'}`;b.disabled=!id;
      b.onclick=()=>approach(i);return b;
    }));
    hud.dataset.worldId=activeId??'';
    hud.dataset.busy=String(engine.busy);
  }
  async function connectWorld() {
    if(engine.busy||api.canTravel?.()===false)return;
    connect.disabled=true;
    const sourceId=activeId;
    try{
      const id=parseWorldId(link.value),side=Number(direction.value),origin=engine.positions.get(activeId),s=SIDES[side];
      if(!s||!origin)throw Error('Kies een aansluitzijde.');
      if(id===activeId)throw Error('Je bevindt je al in deze wereld.');
      const existing=engine.neighbor(side);if(existing&&existing!==id)throw Error('Deze zijde heeft al een bezoekwereld. Kies een vrije zijde.');
      if(engine.positions.has(id)&&neighborSide(origin,engine.positions.get(id))!==side)throw Error('Deze wereld heeft al een andere positie in je bezoekkaart.');
      say('De wereldlink en toegang worden gecontroleerd…');
      const record=await engine.prefetch(id,{fresh:true});
      if(engine.busy||activeId!==sourceId||api.canTravel?.()===false)throw Error('Wacht tot de huidige reis is afgerond.');
      const p={hexQ:origin.hexQ+s.q,hexR:origin.hexR+s.r};engine.setPosition(id,p);localRoutes.set(id,p);persist();
      api.registerAtlas({id,name:record.name,ownerId:record.ownerId,visibility:record.visibility,...p,routeOnly:true,unplaced:false});
      rebuild();refreshHUD();api.onChanged?.();say(`Verbonden met ${record.name||id} aan de ${s.name}kant. Dit is een bezoekroute op dit apparaat.`);
    }catch(error){say(error.message);}finally{connect.disabled=false;}
  }
  function approach(side) {
    const s=SIDES[side],id=engine.neighbor(side);if(!s||!id||engine.busy||api.canTravel?.()===false)return;
    api.prepareTravel?.();
    camera.position.set(s.nx*(apothem(HEX.radius)-27),0,s.nz*(apothem(HEX.radius)-27));
    const h=sample?sample(activeId,camera.position.x,camera.position.z):api.rawTerrain(camera.position.x,camera.position.z);camera.position.y=Math.max(-14,h+3);
    camera.lookAt(s.nx*apothem(HEX.radius),camera.position.y,s.nz*apothem(HEX.radius));
    say(`Doorgang naar ${s.name}. Klik op het water en zwem met W verder.`);
    engine.prefetch(id).catch(error=>say(`Doorgang niet beschikbaar: ${error.message}`));
  }
  async function visit(id) {
    if(engine.busy||api.canTravel?.()===false)return false;
    const target=engine.positions.get(id),origin=engine.positions.get(activeId),side=target&&origin?neighborSide(origin,target):-1;
    if(side<0){say('Verbind deze wereld eerst met een vrije zijde via de wereldlink.');return false;}
    const s=SIDES[side];api.prepareTravel?.();
    return engine.travelTo(id,{x:s.nx*(apothem(HEX.radius)+.2),y:camera.position.y,z:s.nz*(apothem(HEX.radius)+.2)});
  }
  function update(previous,{enabled=true,revision:nextRevision=0}={}) {
    if(disposed||!activeId)return;
    if(nextRevision!==revision){revision=nextRevision;rebuild();}
    if(!enabled||engine.busy||api.canTravel?.()===false)return;
    const now=performance.now();
    if(now-lastPrefetch>1000){
      lastPrefetch=now;
      for(const e of edgeDistances(camera.position))if(e.distance<35){
        const id=engine.neighbor(e.side);if(id&&now-(failures.get(id)??-Infinity)>15000)engine.prefetch(id).catch(()=>failures.set(id,performance.now()));
      }
    }
    if(containsHex(camera.position,HEX.radius-.01))return;
    const next={x:camera.position.x,y:camera.position.y,z:camera.position.z},side=exitSide(previous,next);
    const safe=closestInHex(next,HEX.radius-.7);camera.position.set(safe.x,safe.y,safe.z);
    const id=engine.neighbor(side);
    if(id&&now-(failures.get(id)??-Infinity)>5000){void engine.travelTo(id,next).then(ok=>{if(!ok)failures.set(id,performance.now());refreshHUD();});}
    else if(now-lastBoundaryMessage>5000){lastBoundaryMessage=now;say('Hier is nog geen bezoekwereld verbonden. Kies een wereldlink in de atlas.');}
  }
  connect.addEventListener('click',connectWorld);known.addEventListener('change',()=>{if(known.value)link.value=known.value;});
  document.getElementById('journeyAtlas').onclick=()=>api.openAtlas();
  document.getElementById('journeyMenu').onclick=()=>api.openMenu();
  addEventListener('pagehide',()=>{disposed=true;engine.dispose();clearTerrain();scene.remove(terrainGroup);},{once:true});
  syncCurrent();
  return {update,syncCurrent,refreshHUD,rebuild,connectWorld,visit,approach,
    positionFor:id=>engine.positions.get(id),
    sample:(x,z)=>sample?sample(activeId,x,z):null,
    get busy(){return engine.busy;},get activeId(){return activeId;},get lastStatus(){return lastStatus;},
    get cacheSize(){return engine.cacheSize;},get engine(){return engine;}};
}
