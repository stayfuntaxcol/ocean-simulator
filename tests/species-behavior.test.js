import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {populationPlan,SPECIES_POLICY,habitatPreference,swimRhythm,bottomClearance,advanceBottomRest} from '../graphics/SpeciesBehavior.js';
import {constrainWater,waterLimit,createFishNeighborhood,avoidFish,resolveFishContacts} from '../graphics/FishInteractions.js';
import {createOrca,ORCA_CLEARANCE,ORCA_SCALE} from '../graphics/Orca.js';

test('desktop, mobile and reference populations preserve counts with variable families and groups of 2–3',()=>{
  for(const count of [40,90,220]){
    const groups=populationPlan(count);
    assert.equal(groups.reduce((n,g)=>n+g.count,0),count);
    assert.ok(groups.filter(g=>g.species===0).every(g=>g.count>=4&&g.count<=7));
    assert.ok(groups.filter(g=>g.species===6).every(g=>g.count>=2&&g.count<=3));
    assert.ok(groups.filter(g=>g.species===1).some(g=>g.count>=5));
    assert.ok(groups.filter(g=>g.species===1).every(g=>g.count<=12));
  }
});
test('clown pairs prefer coral; blue shoals prefer grass with rocks; rhythm alternates dart and glide',()=>{
  const cell=(types,rocks=[])=>({livingPoints:types.map(type=>({type})),rockPoints:rocks});
  assert.ok(habitatPreference('reef_0',cell(['coral']))>habitatPreference('reef_0',cell(['seagrass'])));
  assert.ok(habitatPreference('reef_1',cell(['seagrass'],[{}]))>habitatPreference('reef_1',cell(['coral'])));
  const speeds=Array.from({length:300},(_,i)=>swimRhythm('reef_0',i*.04,.4));
  assert.ok(Math.max(...speeds)>2);assert.ok(Math.min(...speeds)<.4);
  assert.equal(swimRhythm('reef_0',2,.4),swimRhythm('reef_0',2,.4));
});
test('enlarged orca measures about 11 meters and its conservative margin encloses its body',()=>{
  const orca=createOrca();orca.root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(orca.root),size=box.getSize(new THREE.Vector3());
  assert.equal(orca.root.scale.x,ORCA_SCALE);assert.ok(size.x>10.5&&size.x<11.5);
  for(const p of [box.min,box.max])assert.ok(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))<ORCA_CLEARANCE);
  orca.dispose();
});

test('actual fish update follows a sloping seabed without sinking, and pauses distant bottom fish',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const code=html.slice(html.indexOf('function updateFish(dt,t){'),html.indexOf('// --- Cinematische vis- en schoolvolgmodus ---'));
  const terrain=(x,z)=>-18+x*.12;
  const fish=new THREE.Group();fish.scale.setScalar(.5);fish.position.set(0,terrain(0,0)+bottomClearance(.5),0);
  fish.userData={velocity:new THREE.Vector3(.4,0,0),personality:1,phase:.2,wanderPhase:.2};
  new THREE.Scene().add(fish);
  const school={...SPECIES_POLICY.reef_6,speciesId:'reef_6',members:[fish],avgVelocity:new THREE.Vector3(),target:new THREE.Vector3(10,-16.3,0),behaviorPhase:.4};
  const ctx={THREE,SPECIES_POLICY,swimRhythm,bottomClearance,advanceBottomRest,constrainWater,waterLimit,createFishNeighborhood,avoidFish,resolveFishContacts,orca:null,whale:null,schools:new Map([['bottom',school]]),schoolThinkAccumulator:0,
    camera:new THREE.PerspectiveCamera(),CULL_RADIUS:60,FISH_ANIMATION_RADIUS:45,WORLD_HALF:144,FISH_RADIUS:.38,
    editMode:false,visibleFishText:{},updateSchoolBrains:()=>{},terrainHeightAt:terrain,cellHasRockAt:()=>false,
    segmentRockHit:()=>null,disturbanceLevel:()=>0,simulationTime:()=>0,orientFishForward:()=>{}};
  ctx.camera.position.copy(fish.position);
  for(const name of ['targetV','collisionTmp','collisionTmp2','sepV','aliV','cohV','tmpV','desiredV','wanderV'])ctx[name]=new THREE.Vector3();
  ctx.collisionBox=new THREE.Box3();vm.createContext(ctx);vm.runInContext(code,ctx);
  for(let i=0;i<600;i++){
    ctx.updateFish(.04,i*.04);
    const gap=fish.position.y-terrain(fish.position.x,fish.position.z);
    assert.ok(gap>=bottomClearance(.5)-.001);assert.ok(gap<1.1);
  }
  assert.ok(fish.position.x>1,'makes progress along the seabed');
  const before=fish.position.clone();ctx.camera.position.set(200,200,200);ctx.updateFish(.04,25);assert.deepEqual(fish.position,before);
});

test('adult and juvenile reunite after separation without changing pair membership',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const code=html.slice(html.indexOf('function updateFish(dt,t){'),html.indexOf('// --- Cinematische vis- en schoolvolgmodus ---'));
  const scene=new THREE.Scene();
  const adult=new THREE.Group(),young=new THREE.Group();scene.add(adult,young);adult.scale.setScalar(.58);young.scale.setScalar(.28);adult.position.set(0,-14,0);young.position.set(-6,-14,0);
  for(const [f,role] of [[adult,'mother'],[young,'juvenile']])f.userData={role,speciesId:'reef_0',velocity:new THREE.Vector3(.8,0,0),personality:1,phase:.4,wanderPhase:.3};
  const school={...SPECIES_POLICY.reef_0,speciesId:'reef_0',members:[adult,young],avgVelocity:new THREE.Vector3(),target:new THREE.Vector3(4,-14,0),behaviorPhase:.2};
  const ctx={THREE,SPECIES_POLICY,swimRhythm,bottomClearance,advanceBottomRest,constrainWater,waterLimit,createFishNeighborhood,avoidFish,resolveFishContacts,orca:null,whale:null,schools:new Map([['pair',school]]),schoolThinkAccumulator:0,
    camera:new THREE.PerspectiveCamera(),CULL_RADIUS:60,FISH_ANIMATION_RADIUS:45,WORLD_HALF:144,FISH_RADIUS:.38,
    editMode:false,visibleFishText:{},updateSchoolBrains:()=>{},terrainHeightAt:()=>-18,cellHasRockAt:()=>false,
    segmentRockHit:()=>null,disturbanceLevel:()=>0,simulationTime:()=>0,orientFishForward:()=>{}};
  for(const name of ['targetV','collisionTmp','collisionTmp2','sepV','aliV','cohV','tmpV','desiredV','wanderV'])ctx[name]=new THREE.Vector3();
  ctx.collisionBox=new THREE.Box3();vm.createContext(ctx);vm.runInContext(code,ctx);
  for(let i=0;i<600;i++)ctx.updateFish(.04,i*.04);
  assert.ok(adult.position.distanceTo(young.position)<3,'juvenile catches up');assert.equal(school.members.length,2);
});
