import * as THREE from 'three';
import { createMicroGeometry, MICRO_TYPES } from './MicroLifeGeometry.js';
import { createMicroMaterial, createMicroContactMesh } from './MicroLifeMaterials.js';
import { seededRandom } from './UnderwaterAtmosphere.js';
import { createMicroBehavior } from './MicroLifeBehavior.js';
export { createMicroMaterial } from './MicroLifeMaterials.js';

export const MICRO_QUALITY=Object.freeze({
  low:{patches:6,copies:1,schools:2,fishPerSchool:24,plankton:160,detailRange:0},
  medium:{patches:14,copies:2,schools:3,fishPerSchool:32,plankton:440,detailRange:7},
  high:{patches:24,copies:2,schools:4,fishPerSchool:40,plankton:800,detailRange:10},
});
const SURFACE=19.55;
const FOOTPRINT={shrimp:.40,starfish:.46,urchin:.40,shell:.35,crab:.53};
const seedFor=(x,z)=>((Math.imul(Math.round(x*10),73856093)^Math.imul(Math.round(z*10),19349663))>>>0);
export function createMicroLife({scene,terrain=()=>-18,getHabitats=()=>[],getObstacles=()=>[],getShelters=()=>[],getThreats=()=>[],boundary=144,caustics}={}) {
  const root=new THREE.Group();root.name='Microleven';scene.add(root);
  const clock={value:0},dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),color=new THREE.Color(),probe=new THREE.Vector3();
  const assets=new Map();let disposed=false,records=[],schools=[],boxes=[],lastKey='',sinceRefresh=3;
  let settings=MICRO_QUALITY.medium,quality='medium',visibleSchools=0;
  for(const type of [...MICRO_TYPES,'minnow']) {
    const material=createMicroMaterial(type,clock,caustics),capacity=type==='minnow'?160:48;
    const levels=[false,true].map(low=>{
      const geometry=createMicroGeometry(type,low);
      const state=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4);state.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('microState',state);
      const mesh=new THREE.InstancedMesh(geometry,material,capacity);
      mesh.name=type+(low?'-far':'');mesh.count=0;mesh.frustumCulled=false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,new THREE.Color(0xffffff));
      mesh.raycast=()=>{};root.add(mesh);return {geometry,state,mesh};
    });
    assets.set(type,{material,levels});
  }
  const contact=createMicroContactMesh();root.add(contact);
  const particleGeometry=new THREE.BufferGeometry(),particlePositions=new Float32Array(800*3),particleSeeds=new Float32Array(800);
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
  particleGeometry.setAttribute('microSeed',new THREE.BufferAttribute(particleSeeds,1));particleGeometry.setDrawRange(0,0);
  const particleMaterial=new THREE.PointsMaterial({color:0xd5e7d7,size:.050,transparent:true,opacity:.26,depthWrite:false});
  particleMaterial.onBeforeCompile=s=>{
    s.uniforms.microTime=clock;
    s.vertexShader='uniform float microTime; attribute float microSeed; varying float vMicroRange; varying float vMicroSeed;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vMicroSeed=microSeed;
      transformed+=vec3(sin(microTime*.13+microSeed)*.25,sin(microTime*.09+microSeed*2.0)*.14,cos(microTime*.11+microSeed)*.25);
      vMicroRange=distance(cameraPosition,transformed);
    `).replace('gl_PointSize = size;','gl_PointSize = size * (.65 + fract(microSeed * 3.17) * .85);');
    s.fragmentShader='varying float vMicroRange; varying float vMicroSeed;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      diffuseColor.rgb*=mix(vec3(.71,.89,1.0),vec3(1.0,.96,.76),fract(vMicroSeed*2.6));
      diffuseColor.a*=(1.0-smoothstep(.04,.5,length(gl_PointCoord-.5)))*smoothstep(.5,1.8,vMicroRange)*(1.0-smoothstep(22.0,34.0,vMicroRange));
    `);
  };
  particleMaterial.customProgramCacheKey=()=>'micro-plankton-layers-v2';
  const plankton=new THREE.Points(particleGeometry,particleMaterial);plankton.name='Planktonlagen';plankton.frustumCulled=false;plankton.raycast=()=>{};root.add(plankton);

  function blocked(p,r) {return boxes.some(b=>p.x>=b.min.x-r&&p.x<=b.max.x+r&&p.y>=b.min.y-r&&p.y<=b.max.y+r&&p.z>=b.min.z-r&&p.z<=b.max.z+r);}
  function groundPose(x,z,r=.45) {
    if(Math.abs(x)>boundary-r||Math.abs(z)>boundary-r)return null;
    const h=terrain(x,z),a=terrain(x-r,z),b=terrain(x+r,z),c=terrain(x,z-r),d=terrain(x,z+r);
    if(![h,a,b,c,d].every(Number.isFinite)||Math.max(h,a,b,c,d)>SURFACE-.7)return null;
    const dx=(b-a)/(2*r),dz=(d-c)/(2*r);
    // A continuous slope is safe: reject cliffs/curvature, not every gentle hill.
    if(Math.hypot(dx,dz)>.62||Math.max(Math.abs((a+b)/2-h),Math.abs((c+d)/2-h))>.06)return null;
    const position=new THREE.Vector3(x,h+.016,z);
    probe.set(x,h+.20,z);if(blocked(probe,r))return null;
    return {position,normal:new THREE.Vector3(-dx,1,-dz).normalize()};
  }
  function swimSafe(x,y,z,margin=.45) {
    if(Math.abs(x)>boundary-margin||Math.abs(z)>boundary-margin||y>SURFACE-margin)return false;
    const h=terrain(x,z);return Number.isFinite(h)&&y>h+.70&&!blocked(probe.set(x,y,z),margin);
  }
  const behavior=createMicroBehavior({terrain,groundPose,getThreats,swimSafe:(p,r)=>
    Math.abs(p.x)<boundary-r&&Math.abs(p.z)<boundary-r&&p.y<SURFACE-r&&
    Number.isFinite(terrain(p.x,p.z))&&p.y>terrain(p.x,p.z)+r&&!blocked(p,r)});
  function schoolCandidate(h) {
    const random=seededRandom(seedFor(h.x,h.z)+101),start=random()*Math.PI*2;
    for(let attempt=0;attempt<13;attempt++) {
      const radius=attempt===0?0:7+Math.floor((attempt-1)/6)*7,a=start+attempt*Math.PI/3;
      const x=h.x+Math.cos(a)*radius,z=h.z+Math.sin(a)*radius;
      if(Math.abs(x)>boundary-8||Math.abs(z)>boundary-8||schools.some(s=>Math.hypot(s.x-x,s.z-z)<18))continue;
      let floor=-Infinity;
      for(let dx=-6;dx<=6;dx+=3)for(let dz=-6;dz<=6;dz+=3)floor=Math.max(floor,terrain(x+dx,z+dz));
      if(!Number.isFinite(floor))continue;
      for(const lift of [3,5.5,8]) {
        const y=floor+lift;if(y>SURFACE-1.8)continue;
        // Reserve the complete turning volume, not just the centre. Try nearby
        // open water when a rock blocks it instead of dropping the whole shoal.
        const volume=new THREE.Box3(new THREE.Vector3(x-6,y-1.5,z-6),new THREE.Vector3(x+6,y+1.5,z+6));
        if(boxes.some(b=>b.intersectsBox(volume)))continue;
        return {x,y,z,phase:random()*Math.PI*2};
      }
    }
    return null;
  }
  function refresh(camera,revision) {
    boxes=getObstacles().filter(b=>b&&!b.isEmpty()).map(b=>b.clone());
    const allHabitats=getHabitats().filter(h=>Number.isFinite(h.x)&&Number.isFinite(h.z)&&Math.abs(h.x)<boundary-2&&Math.abs(h.z)<boundary-2);
    behavior.sync(allHabitats,boxes,getShelters().filter(b=>b&&!b.isEmpty()));
    const habitats=allHabitats
      .filter(h=>Math.hypot(h.x-camera.position.x,h.z-camera.position.z)<60)
      .sort((a,b)=>Math.hypot(a.x-camera.position.x,a.z-camera.position.z)-Math.hypot(b.x-camera.position.x,b.z-camera.position.z));
    records=[];
    for(let copy=0;copy<settings.copies;copy++)for(const h of habitats.slice(0,settings.patches))for(const [typeIndex,type] of MICRO_TYPES.entries()) {
      if(type==='crab'||type==='shrimp')continue;
      // A separate seed per animal prevents rejected neighbours or quality
      // changes from relocating the rest of the colony.
      const random=seededRandom(seedFor(h.x,h.z)+typeIndex*709+copy*7919),phase=random()*Math.PI*2,scale=.86+random()*.25,yaw=random()*Math.PI*2;
      const anchors=[...(h.livingPoints??[]),...(h.rockPoints??[])].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z));
      const anchor=anchors.length?anchors[(typeIndex+copy)%anchors.length]:h;
      const footprint=FOOTPRINT[type]*scale;
      for(let attempt=0;attempt<26;attempt++) {
        const a=random()*Math.PI*2,r=1.1+random()*6.0,x=anchor.x+Math.cos(a)*r,z=anchor.z+Math.sin(a)*r,pose=groundPose(x,z,footprint);
        if(!pose||records.some(o=>Math.hypot(o.x-x,o.z-z)<o.footprint+footprint+.20))continue;
        records.push({type,x,z,phase,scale,yaw,pose,footprint});break;
      }
    }
    schools=[];
    for(const h of habitats) {
      if(schools.length>=settings.schools)break;
      const s=schoolCandidate(h);if(!s)continue;
      const random=seededRandom(seedFor(s.x,s.z)+911),members=[];
      for(let attempt=0;attempt<1500&&members.length<settings.fishPerSchool;attempt++) {
        const f={x:(random()-.5)*4.3,y:(random()-.5)*1.8,z:(random()-.5)*3.5,scale:.76+random()*.34,phase:random()*6.28};
        if(Math.hypot(f.x/2.4,f.z/2.0)>1||members.some(o=>Math.hypot(o.x-f.x,o.y-f.y,o.z-f.z)<.85))continue;
        members.push(f);
      }
      schools.push({...s,members});
    }
    const cx=Math.floor(camera.position.x/12)*12,cz=Math.floor(camera.position.z/12)*12,cy=Math.floor(camera.position.y/8)*8;
    let count=0;
    for(let tx=-2;tx<=2;tx++)for(let tz=-2;tz<=2;tz++)for(let layer=-1;layer<=1;layer++) {
      const tileX=cx+tx*12,tileZ=cz+tz*12,level=cy+layer*8,random=seededRandom(seedFor(tileX,tileZ)+level*11+307);
      for(let i=0;i<Math.floor(settings.plankton/75);i++) {
        const x=tileX+random()*12,z=tileZ+random()*12,y=level+(random()-.5)*2.3,seed=random()*6.28;
        const floor=Math.max(terrain(x,z),terrain(x-.4,z),terrain(x+.4,z),terrain(x,z-.4),terrain(x,z+.4));
        if(!Number.isFinite(floor)||Math.abs(x)>boundary-.5||Math.abs(z)>boundary-.5||y<=floor+.7||y>SURFACE-.5||blocked(probe.set(x,y,z),.6))continue;
        particlePositions.set([x,y,z],count*3);particleSeeds[count++]=seed;
      }
    }
    particleGeometry.attributes.position.needsUpdate=true;particleGeometry.attributes.microSeed.needsUpdate=true;particleGeometry.setDrawRange(0,count);
    lastKey=`${cx},${cy},${cz},${quality},${revision}`;sinceRefresh=0;
  }
  function instance(type,position,normal,yaw,scale,phase,gait,distance,pitch=0,roll=0,fold=0) {
    const levels=assets.get(type).levels,level=levels[distance<settings.detailRange?0:1],mesh=level.mesh,i=mesh.count++;
    dummy.position.copy(position);dummy.quaternion.setFromUnitVectors(up,normal);dummy.rotateY(yaw);
    if(pitch)dummy.rotateZ(pitch);if(roll)dummy.rotateX(roll);
    dummy.scale.setScalar(scale);dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);level.state.setXYZW(i,phase,gait,fold,type==='shrimp'||type==='crab'?1:0);
    // Close to white: the old multiplicative brown tint hid the anatomy.
    color.setRGB(1,.94+.06*Math.sin(scale*7)**2,.89+.10*Math.cos(scale*7)**2);mesh.setColorAt(i,color);
  }
  function update(dt,camera,{enabled=true,editor=false,inspect=false,paused=false,quality:nextQuality='medium',revision=0,showSchools=true,showPlankton=true}={}) {
    if(disposed)return;
    root.visible=enabled&&!editor&&!inspect;if(!root.visible){lastKey='';return;}
    quality=Object.hasOwn(MICRO_QUALITY,nextQuality)?nextQuality:'medium';settings=MICRO_QUALITY[quality];
    const delta=!paused&&Number.isFinite(dt)?THREE.MathUtils.clamp(dt,0,.08):0;clock.value+=delta;sinceRefresh+=delta;
    const key=`${Math.floor(camera.position.x/12)*12},${Math.floor(camera.position.y/8)*8},${Math.floor(camera.position.z/12)*12},${quality},${revision}`;
    if(key!==lastKey||sinceRefresh>=2)refresh(camera,revision);
    behavior.update(delta);
    for(const asset of assets.values())for(const level of asset.levels)level.mesh.count=0;
    contact.count=0;
    for(const r of records) {
      const distance=r.pose.position.distanceTo(camera.position);if(distance>34)continue;
      const pose=r.pose;
      instance(r.type,pose.position,pose.normal,r.yaw,r.scale,r.phase,0,distance);
      dummy.position.addScaledVector(pose.normal,-.012);dummy.scale.set(r.footprint*.85,1,r.footprint*.85);dummy.updateMatrix();
      contact.setMatrixAt(contact.count++,dummy.matrix);
    }
    for(const a of behavior.animals) {
      const distance=a.position.distanceTo(camera.position);if(distance>34)continue;
      instance(a.type,a.position,a.normal,a.yaw,a.scale,a.phase,a.gait,distance,a.pitch,0,a.fold);
      if(a.type==='crab'){
        dummy.position.addScaledVector(a.normal,-.012);dummy.scale.set(.48,1,.48);dummy.updateMatrix();contact.setMatrixAt(contact.count++,dummy.matrix);
      }
    }
    visibleSchools=0;
    if(showSchools)for(const s of schools) {
      const angle=clock.value*.10+s.phase,x=s.x+Math.cos(angle)*2.5,z=s.z+Math.sin(angle)*2.2;
      const heading=-Math.atan2(2.2*Math.cos(angle),-2.5*Math.sin(angle)),c=Math.cos(heading),sine=Math.sin(heading);
      const spread=1+.04*Math.sin(clock.value*.31+s.phase);
      let shown=false;
      for(const f of s.members) {
        const px=x+(c*f.x+sine*f.z)*spread,py=s.y+f.y+Math.sin(clock.value*.6+s.phase)*.12+Math.sin(clock.value*.83+f.phase)*.022,pz=z+(-sine*f.x+c*f.z)*spread;
        probe.set(px,py,pz);const distance=probe.distanceTo(camera.position);
        if(distance<1.2||distance>56||!swimSafe(px,py,pz))continue;
        // swimSafe uses the scratch vector; its final coordinates equal px,py,pz.
        instance('minnow',probe,up,heading,f.scale,f.phase,1,distance,Math.cos(clock.value*.6+s.phase)*.045,.10+.05*Math.sin(clock.value*.7+f.phase));shown=true;
      }
      if(shown)visibleSchools++;
    }
    for(const asset of assets.values())for(const level of asset.levels) {
      level.mesh.instanceMatrix.needsUpdate=true;level.state.needsUpdate=true;
      level.mesh.instanceColor.needsUpdate=true;
    }
    contact.instanceMatrix.needsUpdate=true;plankton.visible=showPlankton;
  }
  function dispose() {
    if(disposed)return;disposed=true;scene.remove(root);
    assets.forEach(asset=>{asset.levels.forEach(l=>{l.mesh.dispose();l.geometry.dispose();});asset.material.dispose();});
    contact.dispose();contact.geometry.dispose();contact.material.dispose();
    particleGeometry.dispose();particleMaterial.dispose();records=[];schools=[];
  }
  return {root,update,dispose,get stats(){
    const species=Object.fromEntries(MICRO_TYPES.map(type=>[type,root.visible?assets.get(type).levels.reduce((n,l)=>n+l.mesh.count,0):0]));
    return {bottom:species.crab+species.starfish+species.urchin+species.shell,shrimp:species.shrimp,
      crabs:behavior.animals.filter(a=>a.type==='crab').length,hiddenCrabs:behavior.animals.filter(a=>a.type==='crab'&&a.state==='HIDE').length,
      escaping:behavior.animals.filter(a=>a.type==='shrimp'&&a.state==='EVADE').length,
      fish:root.visible?assets.get('minnow').levels.reduce((n,l)=>n+l.mesh.count,0):0,
      plankton:root.visible&&plankton.visible?particleGeometry.drawRange.count:0,schools:root.visible?visibleSchools:0,species};
  },get clock(){return clock.value;},snapshot:behavior.snapshot};
}
