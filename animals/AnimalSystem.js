import * as THREE from 'three';
import {normalizeAnimalSettings,turtleLife,ANIMAL_KINDS} from './AnimalSettings.js';
import {SIDES,HEX,apothem,containsHex,closestInHex} from '../worlds/HexWorld.js';
let sequence=0;
const id=()=>`animal-${Date.now().toString(36)}-${(++sequence).toString(36)}`;
const clamp=THREE.MathUtils.clamp;
export function animalExtent(kind,s,age=0,role='adult'){
 const scale=kind==='turtle'?turtleLife(age,s).scale:s.size*(role==='calf'?s.calfSize:1);
 return new THREE.Vector3(...({orca:[6.6,1.65*(.7+1.75*s.dorsal)+.25,1.65*Math.max(1.4*s.tail,.48+1.5*s.flippers)+.2],whale:[14.8,Math.max(3.6,1.1+1.7*s.dorsal),2+6.7*s.flippers+.4],turtle:[1.9,.55,2.3],stingray:[3.3,.52,1.5]}[kind])).multiplyScalar(scale);
}
export function normalizeAnimalRecords(input){
 const raw=Array.isArray(input)?input:Object.values(input||{}),seen=new Set(),out=[];
 for(const r of raw.slice(0,512)){if(!r||!ANIMAL_KINDS.includes(r.kind)||typeof r.id!=='string'||!/^[-a-zA-Z0-9]{1,100}$/.test(r.id)||seen.has(r.id))continue;
 const p=Array.isArray(r.position)?r.position:Object.values(r.position||{});if(p.length!==3||!p.every(Number.isFinite)||p.some(x=>Math.abs(x)>650))continue;seen.add(r.id);
 const finite=(key,def,min,max)=>Number.isFinite(r[key])?clamp(r[key],min,max):def;
 out.push({id:r.id,kind:r.kind,worldId:String(r.worldId||'local-world').slice(0,128),homeId:String(r.homeId||r.worldId||'local-world').slice(0,128),groupId:String(r.groupId||r.id).slice(0,100),role:r.role==='calf'?'calf':r.role==='mother'?'mother':'adult',position:p.slice(),heading:finite('heading',0,-100,100),age:finite('age',0,0,250),hunger:finite('hunger',20,0,100),reserve:finite('reserve',80,0,100),residence:finite('residence',0,0,86400),crossings:finite('crossings',0,0,100000),revision:finite('revision',0,0,1e9),away:finite('away',0,0,86400),returnWorld:String(r.returnWorld||'').slice(0,128),surfaceClock:finite('surfaceClock',0,0,600),phase:['cruise','ascend','breathe','descend','migrate'].includes(r.phase)?r.phase:'cruise',baseY:finite('baseY',p[1],-600,18)});
 }return out;
}
export function createAnimalSystem({settings={},factory,worldId='local-world',terrain=()=>-18,clearPath=()=>true,neighbors=()=>[],corpses=()=>[],consume=()=>{},attach=()=>{},detach=()=>{},onMigration=()=>{},onDeparture=()=>{}}){
 let config=normalizeAnimalSettings(settings),current=worldId,time=0;const records=new Map(),models=new Map(),targets=new Map();
 function modelFor(r){
 if(models.has(r.id)||r.worldId!==current||r.away>0)return;
 const s=config[r.kind],e=animalExtent(r.kind,s,r.age,r.role),origin=new THREE.Vector3(...r.position);let chosen=null;
 for(const radius of [0,6,15,30,50]){for(let i=0;i<(radius?12:1);i++){const angle=i*Math.PI/6,q=origin.clone().add(new THREE.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius));const surfacing=['ascend','breathe','descend'].includes(r.phase);q.y=clamp(q.y,terrain(q.x,q.z)+e.y+.5,surfacing?19.8:19.3-e.y);if(clearPath(r,q,q,e,surfacing?r.phase:'cruise')){chosen=q;break;}}if(chosen)break;}
 if(!chosen)return;r.position=chosen.toArray();r.baseY=clamp(r.baseY,terrain(chosen.x,chosen.z)+e.y+.5,19.3-e.y);
 const m=factory(r.kind,s,r.age,r.role);models.set(r.id,m);m.root.position.copy(chosen);m.root.rotation.y=-r.heading;m.root.userData={...m.root.userData,isDesignedAnimal:true,animalId:r.id,animalKind:r.kind,animalExtent:e.toArray(),age:r.age,role:r.role,groupId:r.groupId,velocity:new THREE.Vector3(Math.cos(r.heading),0,Math.sin(r.heading)).multiplyScalar(s.speed),hunger:r.hunger,reserve:r.reserve};attach(m,r);
 }

 function removeModel(r){const m=models.get(r.id);if(!m)return;detach(m,r);m.dispose();models.delete(r.id);targets.delete(r.id);}
 function removeKind(kind){for(const r of [...records.values()])if(r.kind===kind&&r.worldId===current){removeModel(r);records.delete(r.id);}}
 function add(kind,position,heading=0){removeKind(kind);const s=config[kind],count=kind==='turtle'?20:s.count,group=id(),base=new THREE.Vector3(...position),forward=new THREE.Vector3(Math.cos(heading),0,Math.sin(heading)),side=new THREE.Vector3(-forward.z,0,forward.x);
 const created=[];for(let i=0;i<count+(kind==='orca'&&s.feeding?1:0);i++){
 const calf=kind==='orca'&&s.feeding&&i===count,spacing=kind==='whale'?s.groupDistance:kind==='orca'?15:kind==='turtle'?s.groupDistance:5;
 let p=base.clone();if(calf)p.addScaledVector(side,s.familyDistance);else if(kind==='turtle')p.addScaledVector(forward,-i*spacing);else p.addScaledVector(side,(i%3)*spacing).addScaledVector(forward,-Math.floor(i/3)*spacing*1.4);
 if(kind==='turtle'&&s.age>0){const life=turtleLife(s.age,s);p=base.clone().addScaledVector(side,(i%5)*Math.max(5,life.scale*6)).addScaledVector(forward,-Math.floor(i/5)*Math.max(5,life.scale*6));}
 const bounded=closestInHex(p,HEX.radius-20);p.set(bounded.x,bounded.y,bounded.z);const extent=animalExtent(kind,s,kind==='turtle'?s.age:0,calf?'calf':'adult');p.y=clamp(p.y,terrain(p.x,p.z)+extent.y+.5,19.3-extent.y);
 const age=kind==='turtle'?s.age:calf?1:20,role=calf?'calf':kind==='orca'&&s.feeding&&i===0?'mother':'adult';
 const r={id:id(),kind,worldId:current,homeId:current,groupId:kind==='turtle'&&age>=s.oldAge?id():group,role,position:p.toArray(),heading,age,hunger:kind==='orca'&&s.feeding?40:20,reserve:80,residence:0,crossings:0,revision:0,away:0,returnWorld:'',surfaceClock:i*3,phase:'cruise',baseY:p.y};
 records.set(r.id,r);modelFor(r);created.push(r);}
 regroupTurtles();return created;
 }
 function regroupTurtles(){const turtles=[...records.values()].filter(r=>r.kind==='turtle'&&r.worldId===current&&!r.away);const groups=new Map();for(const r of turtles){const key=r.homeId;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}for(const rows of groups.values()){rows.sort((a,b)=>a.id.localeCompare(b.id));for(let i=0;i<rows.length;){const size=turtleLife(rows[i].age,config.turtle).groupSize,g=rows[i].id;for(const r of rows.slice(i,i+size)){r.groupId=g;const m=models.get(r.id);if(m)m.root.userData.groupId=g;}i+=size;}}}
 function snapshot(){for(const r of records.values()){const m=models.get(r.id);if(m){r.position=m.root.position.toArray();r.heading=Math.atan2(m.root.userData.velocity.z,m.root.userData.velocity.x);}}return {version:1,activeWorld:current,settings:config,records:[...records.values()].map(r=>({...r,position:r.position.slice()}))};}
 function load(data,{replace=false}={}){if(replace){for(const r of records.values())removeModel(r);records.clear();}config=normalizeAnimalSettings(data?.settings||config);for(const r of normalizeAnimalRecords(data?.records)){const old=records.get(r.id);if(old&&old.revision>=r.revision)continue;if(old)removeModel(old);records.set(r.id,r);}for(const r of records.values())modelFor(r);regroupTurtles();}
 function activateWorld(next,data,{replace=false}={}){
 for(const r of records.values())removeModel(r);current=next;
 if(data?.activeWorld&&data.activeWorld!==next){const rows=normalizeAnimalRecords(data.records).map(r=>({...r,worldId:r.worldId===data.activeWorld?next:r.worldId,homeId:r.homeId===data.activeWorld?next:r.homeId,returnWorld:r.returnWorld===data.activeWorld?next:r.returnWorld}));data={...data,records:rows};for(const r of rows){const old=records.get(r.id);if(old&&old.revision===r.revision){records.set(r.id,r);}}}
 load(data,{replace:replace&&!!data});for(const r of records.values())modelFor(r);
}
 function configure(next){
 snapshot();const previous=config;config=normalizeAnimalSettings(next);
 const active=[...records.values()].filter(r=>r.worldId===current&&!r.away),byKind=new Map();for(const r of active)if(!byKind.has(r.kind))byKind.set(r.kind,r);
 for(const [kind,first] of byKind){const existing=active.filter(r=>r.kind===kind),wanted=kind==='turtle'?existing.length:config[kind].count+(kind==='orca'&&config.orca.feeding?1:0);
 if(wanted!==existing.length||(kind==='orca'&&config.orca.feeding!==existing.some(r=>r.role==='calf'))){
   const retained=existing.filter(r=>r.role!=='calf').slice(0,kind==='turtle'?20:config[kind].count).map(r=>({...r,position:r.position.slice()}));
   const calves=existing.filter(r=>r.role==='calf');add(kind,first.position,first.heading);
   const created=[...records.values()].filter(r=>r.kind===kind&&r.worldId===current),adults=created.filter(r=>r.role!=='calf');
   for(let i=0;i<retained.length;i++){const fresh=adults[i];if(!fresh)continue;removeModel(fresh);records.delete(fresh.id);const old={...retained[i],groupId:fresh.groupId,role:fresh.role};records.set(old.id,old);modelFor(old);}
   if(kind==='orca'&&config.orca.feeding&&calves.length){const fresh=created.find(r=>r.role==='calf');if(fresh){removeModel(fresh);records.delete(fresh.id);const old={...calves[0],groupId:fresh.groupId};records.set(old.id,old);modelFor(old);}}
 }else for(const r of existing){removeModel(r);if(kind==='turtle'&&config.turtle.age!==previous.turtle.age){r.age=config.turtle.age;r.revision++;}modelFor(r);}}
 regroupTurtles();return config;
 }

 function safe(r,from,to,phase=r.phase){return clearPath(r,from,to,animalExtent(r.kind,config[r.kind],r.age,r.role),phase);}
 function chooseTarget(r,m){const s=config[r.kind],p=m.root.position,h=r.heading;
 for(const turn of [.35,-.55,1,-1.4,2,-2.5,Math.PI]){const a=h+turn,q=p.clone().add(new THREE.Vector3(Math.cos(a)*30,0,Math.sin(a)*30));const floor=terrain(q.x,q.z),e=animalExtent(r.kind,s,r.age,r.role);q.y=clamp(r.baseY+Math.sin(time*.02+r.surfaceClock)*1.3,floor+e.y+.5,19.3-e.y);if(containsHex(q,HEX.radius-e.x-2)&&safe(r,p,q,'cruise'))return q;}return p.clone();}
 function cross(group,side,destination){const n=SIDES[side],shift=new THREE.Vector3(n.nx*apothem(HEX.radius)*2,0,n.nz*apothem(HEX.radius)*2),from=group[0].worldId;onDeparture({from,ids:group.map(r=>r.id)});for(const r of group){const m=models.get(r.id);if(m)r.position=m.root.position.toArray();removeModel(r);r.crossings++;r.revision++;if(r.kind==='turtle')r.age++;r.residence=0;r.phase='cruise';r.surfaceClock=0;
 if(destination){r.worldId=destination.id;r.position=new THREE.Vector3(...r.position).sub(shift).toArray();const p=closestInHex({x:r.position[0],y:r.position[1],z:r.position[2]},HEX.radius-22);r.position=[p.x,p.y,p.z];}else{r.returnWorld=from;r.worldId=`offshore-${from}`;r.away=config[r.kind].returnTime||90;}}
 onMigration({from,to:destination?.id||null,side,ids:group.map(r=>r.id),kind:group[0].kind});}
 function update(dt,{quality='medium',camera=null,paused=false}={}){
 if(paused||dt<=0||!Number.isFinite(dt))return;dt=Math.min(dt,.25);const oldTime=time;time+=dt;if(Math.floor(oldTime/2)!==Math.floor(time/2))for(const r of records.values())modelFor(r);
 // Dormant travellers return as the same individuals; no remote render meshes.
 for(const r of records.values())if(r.away>0){r.away=Math.max(0,r.away-dt);if(!r.away){r.worldId=r.returnWorld;r.returnWorld='';r.revision++;r.position=[-r.position[0]*.7,r.position[1],-r.position[2]*.7];r.heading+=Math.PI;modelFor(r);}}

 const remoteGroups=new Map();for(const r of records.values())if(r.worldId!==current&&!r.away&&!r.returnWorld){const s=config[r.kind];r.residence+=dt;r.hunger=clamp(r.hunger+(s.hungerRate||0)*dt/60,0,100);if(!remoteGroups.has(r.groupId))remoteGroups.set(r.groupId,[]);remoteGroups.get(r.groupId).push(r);}
 for(const group of remoteGroups.values()){const leader=group[0],s=config[leader.kind];if(!s.migration||leader.residence<s.residence+260/Math.max(.2,s.speed))continue;const options=neighbors(leader.worldId),destination=options.length?options[leader.crossings%options.length]:null,side=destination?.side??leader.crossings%6;const n=SIDES[side];for(const r of group)r.position=[n.nx*(apothem(HEX.radius)+25),r.position[1],n.nz*(apothem(HEX.radius)+25)];cross(group,side,destination);for(const r of group)modelFor(r);regroupTurtles();}
 const active=[...records.values()].filter(r=>r.worldId===current&&!r.away),groups=new Map();for(const r of active){const key=r.kind+':'+r.groupId;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const food=corpses().filter(f=>f.userData?.imported&&f.userData.health<=0&&f.userData.vitalState==='sinking'&&!f.userData.dead&&!f.userData.consumed),claimed=new Set(),eaten=new Set();
 for(const group of groups.values()){
 const leader=group.find(r=>r.role==='mother')||group.find(r=>r.role!=='calf')||group[0],lm=models.get(leader.id);if(!lm)continue;
 for(let i=0;i<group.length;i++){
 const r=group[i],m=models.get(r.id);if(!m)continue;const s=config[r.kind],p=m.root.position,e=animalExtent(r.kind,s,r.age,r.role),life=r.kind==='turtle'?turtleLife(r.age,s):null;
 r.residence+=dt;r.surfaceClock+=dt;r.hunger=clamp(r.hunger+(s.hungerRate||0)*dt/60,0,100);r.reserve=clamp(r.reserve-(s.hungerRate||0)*dt/120,0,100);let prey=null,desired=null,speed=life?life.speed:s.speed;
 const availability=food.filter(f=>!claimed.has(f)&&!eaten.has(f)&&f.position.distanceTo(p)<(s.sense||0));m.root.userData.foodAvailability=clamp(availability.length*25,0,100);
 if(r.kind==='orca'&&s.feeding&&r.role!=='calf'&&r.hunger>=s.huntThreshold){const reachable=availability.filter(f=>safe(r,p,f.position,'cruise')).sort((a,b)=>a.position.distanceToSquared(p)-b.position.distanceToSquared(p));prey=reachable[0];
 if(!prey&&s.turtleHunting){const young=active.filter(a=>a.kind==='turtle'&&a.age<config.turtle.adultAge*.4&&!eaten.has(a.id));prey=young.map(a=>models.get(a.id)?.root).filter(Boolean).filter(f=>f.position.distanceTo(p)<s.sense&&safe(r,p,f.position,'cruise')).sort((a,b)=>a.position.distanceToSquared(p)-b.position.distanceToSquared(p))[0];}
 if(prey){claimed.add(prey);desired=prey.position.clone();speed=s.huntSpeed;m.openMouth?.();r.phase='cruise';}}
 // Family tether applies to the mother as well as the calf.
 const calf=group.find(a=>a.role==='calf'),cm=calf&&models.get(calf.id);if(r.role==='mother'&&cm&&p.distanceTo(cm.root.position)>s.familyDistance*2){prey=null;desired=cm.root.position.clone();speed=s.speed*.8;}
 if(r!==leader&&!desired){const forward=lm.root.userData.velocity.clone().setY(0).normalize(),side=new THREE.Vector3(-forward.z,0,forward.x),spacing=r.kind==='whale'?s.groupDistance:r.kind==='turtle'?s.groupDistance:s.familyDistance;desired=lm.root.position.clone().addScaledVector(r.role==='calf'?side:forward,r.role==='calf'?spacing:-i*spacing);speed*=clamp(p.distanceTo(desired)/Math.max(1,spacing)+.4,.5,1.4);}
 if(!prey&&r.role!=='calf'&&['orca','whale'].includes(r.kind)){
 const surfaceY=19.8-(r.kind==='orca'?1.45*s.size:2.9*s.size),hold=s.surfaceDuration;
 if(r.phase==='cruise'&&r.surfaceClock>=s.surfaceInterval){r.phase='ascend';r.baseY=p.y;targets.delete(r.id);}
 if(r.phase==='ascend'){desired=(desired||p.clone().add(new THREE.Vector3(Math.cos(r.heading)*12,0,Math.sin(r.heading)*12))).clone();desired.y=surfaceY;speed=Math.min(speed,1.4);if(Math.abs(p.y-surfaceY)<.3){r.phase='breathe';r.surfaceClock=0;}}
 if(r.phase==='breathe'){desired=(desired||p.clone().add(new THREE.Vector3(Math.cos(r.heading)*10,0,Math.sin(r.heading)*10))).clone();desired.y=surfaceY;speed*=.45;if(r.surfaceClock>hold)r.phase='descend';}
 if(r.phase==='descend'){desired=(desired||p.clone().add(new THREE.Vector3(Math.cos(r.heading)*18,0,Math.sin(r.heading)*18))).clone();desired.y=r.baseY;speed*=.8;if(Math.abs(p.y-r.baseY)<.6){r.phase='cruise';r.surfaceClock=0;targets.delete(r.id);}}
 }
 if(r===leader&&s.migration&&r.residence>=s.residence&&['cruise','migrate'].includes(r.phase)&&!prey){r.phase='migrate';let route=targets.get('route-'+r.groupId);if(!route){const near=neighbors(current),destination=near.length?near[(r.crossings+Math.floor(time))%near.length]:null,side=destination?.side??(r.crossings%6);route={side,destination};targets.set('route-'+r.groupId,route);}const n=SIDES[route.side];const trail=group.length*(s.groupDistance||1.5);desired=new THREE.Vector3(n.nx*(apothem(HEX.radius)+25+trail),p.y,n.nz*(apothem(HEX.radius)+25+trail));if(group.every(a=>{const root=models.get(a.id)?.root;return root&&n.nx*root.position.x+n.nz*root.position.z>apothem(HEX.radius)+animalExtent(a.kind,config[a.kind],a.age,a.role).x+1;})){cross(group,route.side,route.destination);targets.delete('route-'+r.groupId);break;}}
 if(!desired){desired=targets.get(r.id);if(!desired||p.distanceTo(desired)<3){desired=chooseTarget(r,m);targets.set(r.id,desired);}}
 const d=desired.clone().sub(p);if(d.lengthSq()>1e-5)d.normalize().multiplyScalar(speed);const v=m.root.userData.velocity.clone().lerp(d,1-Math.exp(-dt*s.turnRate*2));
 // Separate pods without moving terrain or fish; flipper clearance remains checked below.
 for(const other of active){if(other===r||other.groupId===r.groupId)continue;const om=models.get(other.id);if(!om)continue;const gap=(e.z+animalExtent(other.kind,config[other.kind],other.age,other.role).z)*.7,delta=p.clone().sub(om.root.position),dist=delta.length();if(dist>0&&dist<gap)v.addScaledVector(delta.normalize(),(gap-dist)*dt);}
 const next=p.clone().addScaledVector(v,dt),floor=terrain(next.x,next.z);next.y=Math.max(next.y,floor+e.y+.4);
 if(r.phase==='cruise'||r.phase==='migrate')next.y=Math.min(next.y,19.3-e.y);
 const movingGroup=leader.phase==='migrate';if(safe(r,p,next,r.phase==='migrate'||movingGroup?'migrate':r.phase)){p.copy(next);m.root.userData.velocity.copy(v);}else{m.root.userData.velocity.multiplyScalar(.7);targets.delete(r.id);if(r.phase==='migrate'){targets.delete('route-'+r.groupId);r.phase='cruise';r.residence=s.residence-8;}if(r.phase==='ascend'){r.phase='descend';r.surfaceClock=0;}}
 if(v.lengthSq()>.001){r.heading=Math.atan2(v.z,v.x);const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-r.heading),pitch=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),clamp(Math.atan2(v.y,Math.hypot(v.x,v.z)),-.32,.32));m.root.quaternion.slerp(yaw.multiply(pitch),1-Math.exp(-dt*s.turnRate));}
 if(prey){const nose=new THREE.Vector3(e.x*.68,0,0).applyQuaternion(m.root.quaternion).add(p);if(nose.distanceTo(prey.position)<Math.max(1.8,e.z*.9)||p.distanceTo(prey.position)<e.x*.6){if(prey.userData.animalKind==='turtle'){const victim=records.get(prey.userData.animalId);if(victim){eaten.add(victim.id);removeModel(victim);records.delete(victim.id);}}else{eaten.add(prey);prey.userData.consumed=true;consume(prey,r);}r.hunger=Math.max(0,r.hunger-s.meal);r.reserve=clamp(r.reserve+s.meal,0,100);r.revision++;if(r.role==='mother'&&calf){calf.hunger=Math.max(0,calf.hunger-s.meal*.65);calf.reserve=clamp(calf.reserve+s.meal*.65,0,100);calf.revision++;}}}
 Object.assign(m.root.userData,{hunger:r.hunger,reserve:r.reserve,age:r.age,animalPhase:r.phase,crossings:r.crossings,residence:r.residence});m.setBreathing?.(r.phase==='breathe'&&r.surfaceClock<3?r.surfaceClock/3+.1:0);
 const distance=camera?p.distanceTo(camera.position):0;if(!camera||distance<180)m.animate(dt,time,quality,distance);r.position=p.toArray();
 }
 }
 }
 return {add,removeKind,configure,load,activateWorld,suspend(){snapshot();for(const r of records.values())removeModel(r);},snapshot,update,regroupTurtles,models,records,get settings(){return config;},get worldId(){return current;},get time(){return time;},hasKind:kind=>[...records.values()].some(r=>r.kind===kind&&(r.worldId===current||r.homeId===current)),get:root=>models.get(root.userData.animalId),dispose(){for(const r of records.values())removeModel(r);records.clear();}};
}
