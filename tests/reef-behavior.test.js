import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as behavior from '../graphics/SpeciesBehavior.js';
import * as interactions from '../graphics/FishInteractions.js';

test('reef depth selection stays near actual habitat instead of floating above deep reefs',()=>{
  for(const species of ['reef_2','reef_4'])for(const floor of [-40,-17,8]){
    const habitat=floor+2;
    const y=behavior.reefTargetHeight(species,floor,habitat,.2);
    assert.ok(y>=floor+1.1);assert.ok(y>=habitat+.35&&y<=habitat+2.2);
    assert.ok(y<18);
  }
  assert.ok(behavior.reefTargetHeight('reef_4',-17,-15)<behavior.reefTargetHeight('reef_2',-17,-15));
  assert.ok(behavior.reefTargetHeight('reef_2',16,19)<=18,'surface wins in too-shallow habitat');
});

test('arrival slows both species and inflation further reduces puffer propulsion',()=>{
  for(const species of ['reef_2','reef_4']){
    assert.ok(behavior.reefMotionPace(species,.2)<behavior.reefMotionPace(species,4));
    assert.equal(behavior.reefMotionPace(species,.2,1),1);
  }
  assert.ok(behavior.reefMotionPace('reef_4',4,0,1)<.4);
});

test('hover fin clock runs at rest but freezes with pause, sleep, culling and death',()=>{
  const f=new THREE.Group();f.userData={speciesId:'reef_4',phase:.2,motionSpeed:0};
  behavior.advanceFinPhase(f,.5);assert.ok(f.userData.finPhase>.2);
  const phase=f.userData.finPhase;behavior.advanceFinPhase(f,0);assert.equal(f.userData.finPhase,phase);
  for(const flag of ['sleeping','dead']){f.userData[flag]=true;behavior.advanceFinPhase(f,.5);assert.equal(f.userData.finPhase,phase);f.userData[flag]=false;}
  f.visible=false;behavior.advanceFinPhase(f,.5);assert.equal(f.userData.finPhase,phase);
});

test('actual reef swimming is slower for puffer, retains depth and clocks follow real travel',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const code=html.slice(html.indexOf('function updateFish(dt,t){'),html.indexOf('// --- Cinematische vis- en schoolvolgmodus ---'));
  function simulate(species){
    const fish=new THREE.Group();new THREE.Scene().add(fish);fish.position.set(0,-14,0);fish.scale.setScalar(.5);
    fish.userData={speciesId:species,velocity:new THREE.Vector3(),personality:1,phase:.3,wanderPhase:.2,isPuffer:species==='reef_4'};
    const school={...behavior.SPECIES_POLICY[species],speciesId:species,members:[fish],center:fish.position.clone(),avgVelocity:new THREE.Vector3(),target:new THREE.Vector3(15,-14,0),behaviorPhase:.2};
    const ctx={THREE,...behavior,...interactions,orca:null,whale:null,schools:new Map([['reef',school]]),schoolThinkAccumulator:0,camera:new THREE.PerspectiveCamera(),CULL_RADIUS:80,FISH_ANIMATION_RADIUS:80,WORLD_HALF:144,FISH_RADIUS:.38,editMode:false,visibleFishText:{},updateSchoolBrains:()=>{},terrainHeightAt:()=>-17,cellHasRockAt:()=>false,segmentRockHit:()=>null,disturbanceLevel:()=>0,simulationTime:()=>0,orientFishForward:()=>{}};
    for(const name of ['targetV','collisionTmp','collisionTmp2','sepV','aliV','cohV','tmpV','desiredV','wanderV'])ctx[name]=new THREE.Vector3();ctx.collisionBox=new THREE.Box3();
    vm.createContext(ctx);vm.runInContext(code,ctx);
    for(let i=0;i<300;i++){ctx.updateFish(.04,i*.04);assert.ok(Math.abs(fish.userData.velocity.y)<=school.verticalSpeed+.001);}
    assert.ok(Math.abs(fish.position.y+14)<.3);assert.ok(fish.userData.finPhase>0);
    const p=fish.position.clone(),phase=fish.userData.finPhase;ctx.updateFish(0,15);assert.deepEqual(fish.position,p);assert.equal(fish.userData.finPhase,phase);
    return fish.position.x;
  }
  const puffer=simulate('reef_4'),coral=simulate('reef_2');assert.ok(puffer>.5);assert.ok(coral>puffer*1.7);
});
