import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {advanceBottomRest,populationPlan} from '../graphics/SpeciesBehavior.js';
import {constrainWater,waterLimit,resolveFishContacts,createFishNeighborhood,avoidFish} from '../graphics/FishInteractions.js';
import {createGreenReefLibrary} from '../graphics/GreenReefFish.js';
import {createBlueReefLibrary} from '../graphics/BlueReefFish.js';

function fish(species='reef_0',scale=.4){const f=new THREE.Group();f.scale.setScalar(scale);f.userData={speciesId:species,phase:1,velocity:new THREE.Vector3()};new THREE.Scene().add(f);return f;}

test('platvis sleeps for minutes, closes eyes, stops fins and then wakes for a new trip',()=>{
  const f=fish('reef_6',.5);f.userData.restRemaining=0;
  assert.equal(advanceBottomRest(f,.1,true),'settling');
  assert.equal(advanceBottomRest(f,.1,true),'sleep');
  const duration=f.userData.restRemaining;assert.ok(duration>=120&&duration<=240);
  for(let i=0;i<60;i++)advanceBottomRest(f,1,true);
  assert.equal(f.userData.sleeping,true);assert.ok(f.userData.eyeClosure>.99);
  const lib=createGreenReefLibrary(),m=lib.attach(f),camera=new THREE.PerspectiveCamera();
  lib.update(camera,'high',true,60);assert.equal(m.motion.uniforms.characterAmplitude.value,0);
  assert.equal(m.detailed.getObjectByName('Pupil').visible,false);
  assert.equal(m.detailed.getObjectByName('Sleep lid').visible,true);
  assert.equal(m.detailed.getObjectByName('Sleep seam').visible,true);
  advanceBottomRest(f,duration,true);assert.equal(f.userData.sleeping,false);assert.equal(f.userData.wokeUp,true);
  lib.dispose();
});
test('clown family sizes vary and population totals remain fixed',()=>{
  for(const count of [40,90,220]){const groups=populationPlan(count),families=groups.filter(g=>g.species===0);
    assert.ok(new Set(families.map(g=>g.count-2)).size>=2);
    assert.ok(families.every(g=>g.count>=4&&g.count<=7));assert.equal(groups.reduce((n,g)=>n+g.count,0),count);}
});
test('water limit includes tilted body and applies even to fish starting above water',()=>{
  for(const species of ['reef_0','reef_1','reef_6','imported']){
    const f=fish(species);f.userData.imported=species==='imported';f.rotation.z=Math.PI/3;f.position.y=38;f.userData.velocity.y=4;
    constrainWater(f);assert.equal(f.position.y,waterLimit(f));assert.equal(f.userData.velocity.y,0);assert.ok(f.position.y<19);
  }
});
test('different species can touch but cannot pass through each other, including a fast crossing',()=>{
  const a=fish('reef_0'),b=fish('reef_1');a.position.set(-.2,0,0);b.position.set(.2,0,0);
  a.userData.velocity.x=2;b.userData.velocity.x=-2;
  const before=new Map([[a,a.position.clone()],[b,b.position.clone()]]);
  const space=createFishNeighborhood([a,b]);assert.ok(avoidFish(a,space.neighbors(a),new THREE.Vector3()).x<0);
  resolveFishContacts([a,b],before);assert.ok(a.position.distanceTo(b.position)>=1.92);
  a.position.set(3,0,0);b.position.set(-3,0,0);
  resolveFishContacts([a,b],new Map([[a,new THREE.Vector3(-3,0,0)],[b,new THREE.Vector3(3,0,0)]]));
  assert.ok(a.position.x<b.position.x,'crossing prevented');
});
test('sleeping fish stays still and contact corrections obey obstacle checks',()=>{
  const a=fish('reef_6'),b=fish('reef_0');a.userData.sleeping=true;b.position.x=.1;
  const old=a.position.clone();let checks=0;
  resolveFishContacts([a,b],new Map(),(_f,p)=>{checks++;return p.x<4;});
  assert.deepEqual(a.position,old);assert.ok(b.position.x>1);assert.ok(checks>0);
  const c=fish(),d=fish();d.position.x=.1;const before=c.position.clone();
  resolveFishContacts([c,d],new Map(),()=>false);assert.deepEqual(c.position,before);
});
test('clown body drive follows measured travel: blocked fish stops beating, fast travel increases effort',()=>{
  const f=fish(),lib=createBlueReefLibrary({clown:true}),m=lib.attach(f);
  f.userData.motionSpeed=0;f.userData.swimPhase=4;m.motion.update(2);assert.equal(m.motion.uniforms.characterAmplitude.value,0);
  f.userData.motionSpeed=2;f.userData.swimPhase=5.4;m.motion.update(2.1);assert.ok(m.motion.uniforms.characterAmplitude.value>.15);assert.equal(m.motion.uniforms.characterPhase.value,5.4);
  m.motion.update(2.1);assert.equal(m.motion.uniforms.characterPhase.value,5.4);lib.dispose();
});
