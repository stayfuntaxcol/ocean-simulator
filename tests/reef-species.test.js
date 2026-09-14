import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {REEF_SPECIES,createReefSpeciesBody,createReefSpeciesLibrary} from '../graphics/ReefSpecies.js';
import * as behavior from '../graphics/SpeciesBehavior.js';
import * as interactions from '../graphics/FishInteractions.js';

const ids=Object.keys(REEF_SPECIES);
function shader(material){const s={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(s);return s;}
function closed(geometry){
  const p=geometry.attributes.position,n=geometry.attributes.normal,edges=new Map(),a=geometry.index.array;
  assert.ok([...p.array,...n.array].every(Number.isFinite));
  for(let i=0;i<a.length;i+=3)for(let j=0;j<3;j++){const x=a[i+j],y=a[i+(j+1)%3],key=[Math.min(x,y),Math.max(x,y)].join(',');edges.set(key,(edges.get(key)||0)+1);}
  assert.ok([...edges.values()].every(v=>v===2));
  for(let i=0;i<p.count-2;i++)assert.ok(p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)>0);
  assert.ok(n.getX(p.count-2)<-.99&&n.getX(p.count-1)>.99);
  geometry.computeBoundingBox();return geometry.boundingBox.getSize(new THREE.Vector3());
}

test('three closed, distinct body profiles preserve their silhouette at lower detail',()=>{
  const heights=[];
  for(const id of ids){
    const near=createReefSpeciesBody(id),far=createReefSpeciesBody(id,true),size=closed(near),farSize=closed(far);
    heights.push(size.y);assert.ok(size.distanceTo(farSize)<.04);assert.ok(near.index.count>far.index.count*3);
    near.dispose();far.dispose();
  }
  assert.ok(heights[0]>heights[1]*1.3&&heights[1]>heights[2]*1.15,'Tang, cardinal and chromis have different proportions');
  assert.throws(()=>createReefSpeciesBody('unknown'),/Unknown/);
});

test('natural anatomy, mirrored fins and both styles fit the existing fish contact envelope',()=>{
  for(const id of ids){
    const library=createReefSpeciesLibrary(),fish=new THREE.Group(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();scene.add(fish);
    fish.userData={speciesId:id,motionSpeed:1,swimPhase:.3,finPhase:.5};
    const m=library.attach(fish,id),extent=interactions.fishExtent(fish);
    for(const style of ['cartoon','realistic']){
      library.update(1,camera,'high',style);m.group.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(m.group);let count=0;
      for(const p of [box.min,box.max])for(const axis of ['x','y','z'])assert.ok(Math.abs(p[axis])<extent[axis]-.02);
      m.group.traverse(o=>{if(o.geometry){assert.ok([...o.geometry.attributes.position.array,...o.geometry.attributes.normal.array].every(Number.isFinite));count+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
      assert.ok(count<12000);assert.equal(m.group.getObjectByName('Cartoon eye white').visible,style==='cartoon');
      assert.ok(!m.basic.visible);
    }
    const fins=m.group.children.filter(c=>c.name==='Pectoral membrane');
    assert.equal(fins.length,2);assert.equal(fins[0].position.z,-fins[1].position.z);assert.equal(fins[0].scale.z,-fins[1].scale.z);assert.equal(fins[0].rotation.y,-fins[1].rotation.y);
    // Free ends of the pectorals must emerge outside the body, not fold inside it.
    for(const f of fins){const p=f.geometry.attributes.position;let reach=0;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(f.matrix);reach=Math.max(reach,Math.abs(v.z));}assert.ok(reach>.43);}
    if(id==='reef_3')assert.ok(m.group.getObjectByName('Caudal scalpel'));
    if(id==='reef_5')assert.ok(m.group.getObjectByName('First dorsal membrane')&&m.group.getObjectByName('Second dorsal membrane'));
    library.dispose();
  }
});

test('species shaders compose skin relief, roughness and membrane rays with Three lighting',()=>{
  for(const id of ids){
    const library=createReefSpeciesLibrary(),fish=new THREE.Group(),scene=new THREE.Scene();scene.add(fish);
    const m=library.attach(fish,id);
    const keys=[];
    for(const style of ['cartoon','realistic']){
      library.update(0,{position:new THREE.Vector3()},'high',style);const s=shader(m.body.material);keys.push(m.body.material.customProgramCacheKey());
      assert.match(s.fragmentShader,/#include <lights_fragment_begin>/);assert.match(s.fragmentShader,/normal=fishMicroNormal/);assert.match(s.fragmentShader,/roughnessFactor=clamp/);
      assert.match(s.vertexShader,/objectNormal.x-=/);assert.ok(s.uniforms.reefPhase);
      for(const fin of m.group.children.filter(c=>c.name.includes('membrane'))){const f=shader(fin.material);assert.ok(fin.geometry.attributes.uv);assert.match(f.fragmentShader,/rayPhase/);assert.match(f.fragmentShader,/#include <lights_fragment_begin>/);}
    }
    assert.notEqual(keys[0],keys[1]);library.dispose();
  }
});

test('switching style and LOD preserves root state, shares geometry and cleans up once',()=>{
  for(const id of ids){
    const library=createReefSpeciesLibrary(),scene=new THREE.Scene(),fish=new THREE.Group(),other=new THREE.Group(),original=new THREE.Group();fish.add(original);scene.add(fish,other);
    fish.scale.setScalar(.32);fish.position.set(2,-14,5);fish.userData={speciesId:id,schoolId:'school',health:76,phase:.2,swimPhase:.7,finPhase:.8,motionSpeed:.4,velocity:new THREE.Vector3(.4,0,0)};
    const m=library.attach(fish,id),n=library.attach(other,id);assert.equal(library.attach(fish,id),m);
    const before={...fish.userData},position=fish.position.clone(),geometry=m.body.geometry;
    assert.equal(geometry,n.body.geometry);assert.notEqual(m.body.material,n.body.material);
    for(let i=0;i<12;i++)library.update(1,{position:position.clone()},'high',i%2?'cartoon':'realistic');
    assert.deepEqual(fish.userData,before);assert.deepEqual(fish.position,position);assert.equal(fish.scale.x,.32);assert.equal(fish.children.length,2);
    library.update(1,{position:new THREE.Vector3(0,0,100)},'low','realistic');assert.ok(m.body.geometry.index.count<geometry.index.count);assert.ok(!m.basic.visible);
    library.update(1,{position:position.clone()},'high','realistic');assert.equal(m.body.geometry,geometry);
    let md=0,gd=0;m.body.material.addEventListener('dispose',()=>md++);geometry.addEventListener('dispose',()=>gd++);
    scene.remove(fish);library.update(2,{position});assert.equal(md,1);assert.equal(gd,0);assert.equal(m.group.parent,null);assert.equal(original.parent,fish);
    library.dispose();library.dispose();assert.equal(md,1);assert.equal(gd,1);assert.equal(library.size,0);
  }
});

test('zero travel stops the body wave while hover fins use the pausable integrated clock',()=>{
  const library=createReefSpeciesLibrary(),fish=new THREE.Group();new THREE.Scene().add(fish);
  fish.userData={speciesId:'reef_5',motionSpeed:0,swimPhase:2,finPhase:1};
  const m=library.attach(fish,'reef_5'),camera={position:new THREE.Vector3()};library.update(1,camera,'high','realistic');
  const fin=m.group.getObjectByName('Pectoral membrane'),initial=fin.rotation.toArray();
  assert.equal(m.uniforms.reefAmplitude.value,0);behavior.advanceFinPhase(fish,.2);library.update(2,camera,'high','realistic');assert.notDeepEqual(fin.rotation.toArray(),initial);
  const paused=fin.rotation.toArray();behavior.advanceFinPhase(fish,0);library.update(200,camera,'high','cartoon');assert.deepEqual(fin.rotation.toArray(),paused);assert.equal(m.uniforms.reefPhase.value,2);
  fish.userData.motionSpeed=1;library.update(200,camera,'high','realistic');assert.ok(m.uniforms.reefAmplitude.value>0);library.dispose();
});

test('new groups replace the three old palette populations without adding animals',()=>{
  for(const count of [40,90,220]){
    const plan=behavior.populationPlan(count),totals=Array.from({length:8},(_,i)=>plan.filter(g=>g.species===i).reduce((a,g)=>a+g.count,0));
    const expected=Array.from({length:8},(_,i)=>Math.floor(count/8)+(i<count%8?1:0));expected[0]+=4;expected[3]-=4;
    assert.deepEqual(totals,expected);
    for(const [species,max] of [[3,3],[5,4],[7,10]])assert.ok(plan.filter(g=>g.species===species).every(g=>g.count<=max));
  }
  const cell=(types,rocks=[])=>({livingPoints:types.map(type=>({type})),rockPoints:rocks});
  assert.ok(behavior.habitatPreference('reef_3',cell(['seagrass'],[{}]))>behavior.habitatPreference('reef_3',cell(['sponge'])));
  assert.ok(behavior.habitatPreference('reef_5',cell(['anemone']))>behavior.habitatPreference('reef_5',cell(['sponge'])));
  assert.ok(behavior.habitatPreference('reef_7',cell(['coral']))>behavior.habitatPreference('reef_7',cell(['seagrass'])));
  for(const id of ids){const y=behavior.reefTargetHeight(id,-17,-15,.1);assert.ok(y>=-14.65&&y<=-12.8);}
});

test('actual simulation gives the new species distinct pace, safe depth and frozen pause',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const code=html.slice(html.indexOf('function updateFish(dt,t){'),html.indexOf('// --- Cinematische vis- en schoolvolgmodus ---'));
  const distances=[];
  for(const id of ids){
    const fish=new THREE.Group();new THREE.Scene().add(fish);fish.position.set(0,-14,0);fish.scale.setScalar(.32);
    fish.userData={speciesId:id,velocity:new THREE.Vector3(),personality:1,phase:.3,wanderPhase:.2};
    const school={...behavior.SPECIES_POLICY[id],speciesId:id,members:[fish],center:fish.position.clone(),avgVelocity:new THREE.Vector3(),target:new THREE.Vector3(25,-14,0),behaviorPhase:.2};
    const ctx={THREE,...behavior,...interactions,orca:null,whale:null,schools:new Map([['reef',school]]),schoolThinkAccumulator:0,camera:new THREE.PerspectiveCamera(),CULL_RADIUS:80,FISH_ANIMATION_RADIUS:80,WORLD_HALF:144,FISH_RADIUS:.38,editMode:false,visibleFishText:{},updateSchoolBrains:()=>{},terrainHeightAt:()=>-17,cellHasRockAt:()=>false,segmentRockHit:()=>null,disturbanceLevel:()=>0,simulationTime:()=>0,orientFishForward:()=>{}};
    for(const name of ['targetV','collisionTmp','collisionTmp2','sepV','aliV','cohV','tmpV','desiredV','wanderV'])ctx[name]=new THREE.Vector3();ctx.collisionBox=new THREE.Box3();
    vm.createContext(ctx);vm.runInContext(code,ctx);const speeds=[];
    for(let i=0;i<600;i++){ctx.updateFish(.04,i*.04);speeds.push(fish.userData.motionSpeed);assert.ok(fish.position.y<=interactions.waterLimit(fish));assert.ok(fish.position.y>=-16.55);assert.ok(Math.abs(fish.userData.velocity.y)<=school.verticalSpeed+.001);}
    distances.push(fish.position.x);assert.ok(Math.abs(fish.position.y+14)<.5);assert.ok(fish.userData.swimPhase>0&&fish.userData.finPhase>0);
    if(id==='reef_5')assert.ok(speeds.filter(v=>v<.04).length>150,'Cardinal spends long periods hovering');
    const p=fish.position.clone(),clock=fish.userData.finPhase;ctx.updateFish(0,25);assert.deepEqual(fish.position,p);assert.equal(fish.userData.finPhase,clock);
  }
  assert.ok(distances[0]>distances[1]*3&&distances[2]>distances[1]*3);
});

test('real app factory replaces all three slots; review imports the actual models',()=>{
  const app=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const start=app.indexOf('function createFish('),end=app.indexOf('const isMobile =',start),palette=app.match(/const fishPalette = (\[[\s\S]*?\]);/)[1];
  const library=createReefSpeciesLibrary(),ctx={THREE,newReefSpecies:library,fishPalette:vm.runInNewContext(palette),oceanRandom:()=>.5,butterflyLibrary:{attach(){}},blueReefLibrary:{attach(){}},clownReefLibrary:{attach(){}},greenReefLibrary:{attach(){}},pufferLibrary:{attach(){}}};
  vm.createContext(ctx);vm.runInContext(app.slice(start,end),ctx);
  for(const id of ids){const fish=ctx.createFish(ctx.fishPalette[Number(id.slice(-1))],.4);assert.equal(fish.userData.visualSpecies,REEF_SPECIES[id].name);assert.equal(fish.getObjectByName('Legacy palette fish').visible,false);}
  assert.equal(library.size,3);library.dispose();
  const url=new URL('../graphics/reef-species-review.html',import.meta.url),html=fs.readFileSync(url,'utf8'),script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  for(const m of script.matchAll(/from '([^']+)'/g))if(m[1].startsWith('.'))assert.ok(fs.existsSync(new URL(m[1],url)));
  assert.doesNotThrow(()=>new vm.Script(script.replace(/^import .*$/gm,'')));assert.doesNotMatch(html,/firebase|apiKey/);
});
