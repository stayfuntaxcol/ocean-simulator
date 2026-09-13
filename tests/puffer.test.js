import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPufferState,createPufferLibrary} from '../graphics/PufferFish.js';
import {fishExtent,constrainWater} from '../graphics/FishInteractions.js';

test('puffer inflates, holds for 120 seconds, deflates over 30 and can be retriggered',()=>{
  const s=createPufferState();assert.equal(s.step(5),0);s.trigger();
  assert.equal(s.step(.6),.5);assert.equal(s.step(.6),1);s.step(118.8);
  assert.ok(s.amount>.999);s.step(15);assert.ok(Math.abs(s.amount-.5)<1e-9);
  s.trigger();s.step(1.2);assert.equal(s.amount,1);s.step(200);assert.equal(s.amount,0);
});
test('orca threat holds inflation, uses a hysteresis margin and pause freezes the timer',()=>{
  const s=createPufferState();s.step(2,7);assert.equal(s.amount,1);
  for(let i=0;i<300;i++)s.step(1,9);assert.equal(s.amount,1);assert.equal(s.threatened,true);
  const remaining=s.remaining;s.step(0,50);assert.equal(s.remaining,remaining);
  s.step(1,11);assert.equal(s.threatened,false);s.step(151,Infinity);assert.equal(s.amount,0);
});
test('puffer body becomes spherical while eye pupils remain attached; collision and water bounds grow',()=>{
  const lib=createPufferLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const fish=new THREE.Group();scene.add(fish);fish.scale.setScalar(.5);
  fish.userData={velocity:new THREE.Vector3(1,0,0),phase:1};const m=lib.attach(fish);
  lib.update(0,camera,'high');const old=fishExtent(fish).y;
  lib.trigger(fish);lib.step(1.2);lib.update(1.2,camera,'high');
  assert.ok(Math.abs(m.body.scale.y-m.body.scale.z)<.001);assert.ok(m.body.scale.y>1.4);
  assert.ok(fishExtent(fish).y>old*1.5);
  const eye=m.face.find(o=>o.name==='Puffer eye'),pupil=m.face.find(o=>o.name==='Puffer pupil');
  assert.ok(eye.position.distanceTo(pupil.position)<.17);
  fish.position.y=20;constrainWater(fish);assert.ok(fish.position.y+fishExtent(fish).y<19.56);
  for(let i=0;i<72;i++){const matrix=new THREE.Matrix4();m.spikes.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));}
  const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  m.body.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/#include <lights_fragment_begin>/);
  const count=m.body.geometry.index.count;camera.position.z=100;lib.update(2,camera,'low');assert.ok(m.body.geometry.index.count<count);assert.equal(m.spikes.visible,false);
  lib.dispose();lib.dispose();
});
test('library detects distance to the orca body, ignores dead orca, and releases instance resources',()=>{
  const lib=createPufferLibrary(),scene=new THREE.Scene(),fish=new THREE.Group();scene.add(fish);
  const m=lib.attach(fish),orca=new THREE.Mesh(new THREE.BoxGeometry(10,3,3),new THREE.MeshBasicMaterial());
  scene.add(orca);orca.position.x=11;lib.step(2,orca);assert.equal(m.state.amount,1);
  orca.userData.dead=true;lib.step(200,orca);assert.equal(m.state.amount,0);
  let released=0;m.spikes.addEventListener('dispose',()=>released++);scene.remove(fish);lib.step(.04,orca);assert.equal(released,1);assert.equal(lib.size,0);
  lib.dispose();orca.geometry.dispose();orca.material.dispose();
});
