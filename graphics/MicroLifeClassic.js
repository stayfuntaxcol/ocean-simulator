import * as THREE from 'three';
import {createMicroGeometry,MICRO_TYPES} from './MicroLifeGeometryClassic.js';
import {installCaustics,seededRandom} from './UnderwaterAtmosphere.js';
import {addSurfaceRelief} from './FishSurfaceDetail.js';

export const MICRO_QUALITY=Object.freeze({
  low:{patches:6,schools:2,fishPerSchool:24,plankton:160},
  medium:{patches:14,schools:3,fishPerSchool:32,plankton:440},
  high:{patches:24,schools:4,fishPerSchool:40,plankton:800},
});
const SURFACE=19.55;
const seedFor=(x,z)=>((Math.imul(Math.round(x*10),73856093)^Math.imul(Math.round(z*10),19349663))>>>0);

export function createMicroMaterial(type,clock,caustics={oceanTime:{value:0},oceanStrength:{value:0}},rangeFade=true){
  const m=installCaustics(new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:type==='urchin'?.75:.53,side:THREE.DoubleSide}),caustics);
  const hook=m.onBeforeCompile.bind(m);
  m.onBeforeCompile=s=>{
    hook(s);s.uniforms.microTime=clock;
    s.vertexShader='attribute float microFlex; uniform float microTime; varying vec3 vMicroLocal; varying float vMicroRange;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float microPhase=microTime*${type==='minnow'?'6.0':'2.1'};
      #ifdef USE_INSTANCING
        microPhase+=instanceMatrix[3].x*1.3+instanceMatrix[3].z*.7;
      #endif
      transformed.z+=sin(microPhase+position.x*11.0)*microFlex*${type==='minnow'?'.035':'.008'};
      vMicroLocal=position;
    `);
    s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 microWorld=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        microWorld=instanceMatrix*microWorld;
      #endif
      vMicroRange=distance(cameraPosition,(modelMatrix*microWorld).xyz);
    `);
    s.fragmentShader='varying vec3 vMicroLocal; varying float vMicroRange;\n'+s.fragmentShader;
    if(rangeFade)s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
      float visibility=${type==='minnow'?'smoothstep(12.0,20.0,vMicroRange)*(1.0-smoothstep(46.0,58.0,vMicroRange))':'1.0-smoothstep(16.0,24.0,vMicroRange)'};
      if(visibility<fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453))discard;
    `);
    addSurfaceRelief(s,'(fishNoise(vMicroLocal*65.0)-.5)*.18','(fishNoise(vMicroLocal*35.0)-.5)*.10',.0005);
  };
  m.customProgramCacheKey=()=>`micro-life-${type}-${rangeFade}-v1`;return m;
}

export function createMicroLife({scene,terrain=()=>-18,getHabitats=()=>[],getObstacles=()=>[],boundary=144,caustics}={}){
  const root=new THREE.Group();root.name='Microleven';scene.add(root);
  const clock={value:0},dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),color=new THREE.Color();
  const assets=new Map();let disposed=false,records=[],schools=[],boxes=[],lastKey='',sinceRefresh=1;
  let settings=MICRO_QUALITY.medium,quality='medium';
  for(const type of [...MICRO_TYPES,'minnow']){
    const near=createMicroGeometry(type),far=createMicroGeometry(type,true),material=createMicroMaterial(type,clock,caustics);
    const mesh=new THREE.InstancedMesh(near,material,type==='minnow'?160:24);mesh.name=type;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
    if(type!=='minnow')mesh.setColorAt(0,new THREE.Color(0xffffff));
    // Decorative animals cannot intercept fish clicks or editor placement rays.
    mesh.raycast=()=>{};root.add(mesh);assets.set(type,{near,far,material,mesh});
  }
  const particleGeometry=new THREE.BufferGeometry(),particlePositions=new Float32Array(800*3),particleSeeds=new Float32Array(800);
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));particleGeometry.setAttribute('microSeed',new THREE.BufferAttribute(particleSeeds,1));particleGeometry.setDrawRange(0,0);
  const particleMaterial=new THREE.PointsMaterial({color:0xb9dfc9,size:.07,transparent:true,opacity:.32,depthWrite:false});
  particleMaterial.onBeforeCompile=s=>{
    s.uniforms.microTime=clock;
    s.vertexShader='uniform float microTime; attribute float microSeed; varying float vMicroRange;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed+=vec3(sin(microTime*.13+microSeed)*.25,sin(microTime*.09+microSeed*2.0)*.14,cos(microTime*.11+microSeed)*.25);
      vMicroRange=distance(cameraPosition,transformed);
    `);
    s.fragmentShader='varying float vMicroRange;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      diffuseColor.a*=(1.0-smoothstep(.08,.5,length(gl_PointCoord-.5)))*smoothstep(.7,2.0,vMicroRange)*(1.0-smoothstep(20.0,34.0,vMicroRange));
    `);
  };
  particleMaterial.customProgramCacheKey=()=>'micro-plankton-layers-v1';
  const plankton=new THREE.Points(particleGeometry,particleMaterial);plankton.name='Planktonlagen';plankton.frustumCulled=false;plankton.raycast=()=>{};root.add(plankton);

  function blocked(p,r){return boxes.some(b=>p.x>=b.min.x-r&&p.x<=b.max.x+r&&p.y>=b.min.y-r&&p.y<=b.max.y+r&&p.z>=b.min.z-r&&p.z<=b.max.z+r);}
  function groundPose(x,z,r=.9){
    if(Math.abs(x)>boundary-r||Math.abs(z)>boundary-r)return null;
    const h=terrain(x,z),a=terrain(x-r,z),b=terrain(x+r,z),c=terrain(x,z-r),d=terrain(x,z+r);
    if(![h,a,b,c,d].every(Number.isFinite)||h>SURFACE-.9||Math.max(h,a,b,c,d)-Math.min(h,a,b,c,d)>.35)return null;
    const p=new THREE.Vector3(x,h+.016,z);
    if(blocked(p.clone().add(new THREE.Vector3(0,.24,0)),r))return null;
    return {position:p,normal:new THREE.Vector3(a-b,2*r,c-d).normalize()};
  }
  function refresh(camera,revision){
    boxes=getObstacles().filter(b=>b&&!b.isEmpty()).map(b=>b.clone());
    const habitats=getHabitats().filter(h=>Number.isFinite(h.x)&&Number.isFinite(h.z)&&Math.abs(h.x)<boundary-10&&Math.abs(h.z)<boundary-10)
      .filter(h=>Math.hypot(h.x-camera.position.x,h.z-camera.position.z)<64)
      .sort((a,b)=>Math.hypot(a.x-camera.position.x,a.z-camera.position.z)-Math.hypot(b.x-camera.position.x,b.z-camera.position.z));
    const chosen=habitats.slice(0,settings.patches);records=[];
    for(const h of chosen){
      const random=seededRandom(seedFor(h.x,h.z));
      for(const type of MICRO_TYPES){
        const phase=random()*Math.PI*2,scale=.8+random()*.4,yaw=random()*Math.PI*2;
        for(let attempt=0;attempt<10;attempt++){
          const a=random()*Math.PI*2,r=1.8+random()*5.5,x=h.x+Math.cos(a)*r,z=h.z+Math.sin(a)*r,pose=groundPose(x,z);
          if(!pose||records.some(o=>o.hx===h.x&&o.hz===h.z&&Math.hypot(o.x-x,o.z-z)<1.25))continue;
          records.push({type,x,z,hx:h.x,hz:h.z,phase,scale,yaw,pose});break;
        }
      }
    }
    schools=[];
    for(const h of habitats){
      if(schools.length>=settings.schools)break;
      if(schools.some(s=>Math.hypot(s.x-h.x,s.z-h.z)<19))continue;
      if(Math.abs(h.x)>boundary-10||Math.abs(h.z)>boundary-10)continue;
      let floor=-Infinity;
      for(let dx=-8;dx<=8;dx+=4)for(let dz=-8;dz<=8;dz+=4)floor=Math.max(floor,terrain(h.x+dx,h.z+dz));
      const y=floor+9;
      if(!Number.isFinite(y)||y>SURFACE-3)continue;
      const volume=new THREE.Box3(new THREE.Vector3(h.x-8,y-2,h.z-8),new THREE.Vector3(h.x+8,y+2,h.z+8));
      if(boxes.some(b=>b.intersectsBox(volume)))continue;
      const random=seededRandom(seedFor(h.x,h.z)+101),members=[];
      for(let attempt=0;attempt<1000&&members.length<settings.fishPerSchool;attempt++){
        const f={x:(random()-.5)*3.8,y:(random()-.5)*1.8,z:(random()-.5)*3.5,scale:.7+random()*.5};
        if(members.some(o=>Math.hypot(o.x-f.x,o.y-f.y,o.z-f.z)<.8))continue;
        members.push(f);
      }
      schools.push({x:h.x,y,z:h.z,phase:random()*6.28,members});
    }
    const cx=Math.floor(camera.position.x/12)*12,cz=Math.floor(camera.position.z/12)*12,cy=Math.floor(camera.position.y/8)*8;
    let count=0;
    // Tile-local seeds preserve overlapping particles as the camera changes tiles.
    for(let tx=-2;tx<=2;tx++)for(let tz=-2;tz<=2;tz++)for(let layer=-1;layer<=1;layer++){
      const tileX=cx+tx*12,tileZ=cz+tz*12,level=cy+layer*8,random=seededRandom(seedFor(tileX,tileZ)+level*11+307);
      for(let i=0;i<Math.floor(settings.plankton/75);i++){
        const x=tileX+random()*12,z=tileZ+random()*12,y=level+(random()-.5)*2.3,seed=random()*6.28;
        const floor=Math.max(terrain(x,z),terrain(x-.4,z),terrain(x+.4,z),terrain(x,z-.4),terrain(x,z+.4));
        const p=new THREE.Vector3(x,y,z);
        if(!Number.isFinite(floor)||Math.abs(x)>boundary-.5||Math.abs(z)>boundary-.5||y<=floor+.7||y>SURFACE-.5||blocked(p,.6))continue;
        p.toArray(particlePositions,count*3);particleSeeds[count]=seed;count++;
      }
    }
    particleGeometry.attributes.position.needsUpdate=true;particleGeometry.attributes.microSeed.needsUpdate=true;particleGeometry.setDrawRange(0,count);
    lastKey=`${cx},${cy},${cz},${quality},${revision}`;sinceRefresh=0;
  }
  function update(dt,camera,{enabled=true,editor=false,inspect=false,paused=false,quality:nextQuality='medium',revision=0,showSchools=true,showPlankton=true}={}){
    if(disposed)return;
    root.visible=enabled&&!editor&&!inspect;
    if(!root.visible){lastKey='';return;}
    quality=Object.hasOwn(MICRO_QUALITY,nextQuality)?nextQuality:'medium';settings=MICRO_QUALITY[quality];
    const delta=!paused&&Number.isFinite(dt)?THREE.MathUtils.clamp(dt,0,.08):0;clock.value+=delta;sinceRefresh+=delta;
    const key=`${Math.floor(camera.position.x/12)*12},${Math.floor(camera.position.y/8)*8},${Math.floor(camera.position.z/12)*12},${quality},${revision}`;
    if(key!==lastKey||sinceRefresh>=1)refresh(camera,revision);
    const counts=Object.fromEntries(MICRO_TYPES.map(t=>[t,0]));
    for(const r of records){
      const a=assets.get(r.type);a.mesh.geometry=quality==='low'?a.far:a.near;
      if(r.pose.position.distanceToSquared(camera.position)>24*24)continue;
      const cycle=(clock.value+r.phase*7)%28,active=Math.sin(Math.PI*THREE.MathUtils.clamp((cycle-17)/7,0,1))**2;
      const offset=r.type==='crab'?active*.30:r.type==='shrimp'?active*.16:0;
      // Recheck moving animals at the current terrain and obstacle boundaries.
      const pose=offset?(groundPose(r.x+Math.cos(r.yaw)*offset,r.z+Math.sin(r.yaw)*offset)||r.pose):r.pose;
      if(!pose)continue;
      dummy.position.copy(pose.position);dummy.quaternion.setFromUnitVectors(up,pose.normal);dummy.rotateY(r.yaw);dummy.scale.setScalar(r.scale);dummy.updateMatrix();
      const i=counts[r.type]++;a.mesh.setMatrixAt(i,dummy.matrix);color.setHSL(.04+(r.phase%1)*.045,.12,.78);a.mesh.setColorAt(i,color);
    }
    for(const type of MICRO_TYPES){const m=assets.get(type).mesh;m.count=counts[type];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
    const shoal=assets.get('minnow');shoal.mesh.visible=showSchools;shoal.mesh.geometry=quality==='low'?shoal.far:shoal.near;let n=0;
    if(showSchools)for(const s of schools){
      const angle=clock.value*.115+s.phase,x=s.x+Math.cos(angle)*4,z=s.z+Math.sin(angle)*4;
      for(const f of s.members){
        dummy.position.set(x+f.x,s.y+f.y+Math.sin(clock.value*.6+s.phase)*.14,z+f.z);
        const distance=dummy.position.distanceTo(camera.position);
        if(distance<11||distance>59||dummy.position.y>SURFACE-.3||dummy.position.y<terrain(dummy.position.x,dummy.position.z)+.7||blocked(dummy.position,.35))continue;
        dummy.quaternion.setFromAxisAngle(up,-Math.atan2(Math.cos(angle),-Math.sin(angle)));dummy.scale.setScalar(f.scale);dummy.updateMatrix();shoal.mesh.setMatrixAt(n++,dummy.matrix);
      }
    }
    shoal.mesh.count=n;shoal.mesh.instanceMatrix.needsUpdate=true;plankton.visible=showPlankton;
  }
  function dispose(){
    if(disposed)return;disposed=true;scene.remove(root);
    assets.forEach(a=>{a.mesh.dispose();a.near.dispose();a.far.dispose();a.material.dispose();});particleGeometry.dispose();particleMaterial.dispose();records=[];schools=[];
  }
  return {root,update,dispose,get stats(){return {bottom:root.visible?MICRO_TYPES.reduce((n,t)=>n+assets.get(t).mesh.count,0):0,fish:root.visible&&assets.get('minnow').mesh.visible?assets.get('minnow').mesh.count:0,plankton:root.visible&&plankton.visible?particleGeometry.drawRange.count:0};},get clock(){return clock.value;}};
}
