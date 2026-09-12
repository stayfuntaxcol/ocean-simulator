import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeReefGeometry, createReefLife, REEF_TYPES } from '../graphics/ReefLife.js';

const light={oceanTime:{value:12},oceanStrength:{value:.3}};
function colony(library,type='plate') {
  const root=new THREE.Group(),original=new THREE.Mesh(new THREE.BoxGeometry(3,2,3),new THREE.MeshStandardMaterial());
  original.position.y=1; root.add(original);
  root.position.set(2,-10,4); root.rotation.y=.4;
  const scene=new THREE.Scene(); scene.add(root);
  library.attach(root,type,0xe5a56d,1); root.updateMatrixWorld(true);
  return {root,original,basic:root.children[0],detailed:root.children[1]};
}

test('all five colonies have finite geometry, reproducible variants and bounded detail levels',()=>{
  for(const type of REEF_TYPES) {
    const a=makeReefGeometry(type,1),b=makeReefGeometry(type,1),low=makeReefGeometry(type,1,true);
    assert.deepEqual(a.attributes.position.array,b.attributes.position.array);
    assert.ok(a.attributes.position.array.every(Number.isFinite));
    assert.ok(a.attributes.normal.array.every(Number.isFinite));
    assert.ok(a.attributes.position.count/3<=5000);
    assert.ok(low.attributes.position.count<a.attributes.position.count);
    for(const v of a.boundingBox.min.toArray()) assert.ok(Math.abs(v)<1e-5);
    for(const v of a.boundingBox.max.toArray()) assert.ok(Math.abs(v-1)<1e-5);
    a.dispose(); b.dispose(); low.dispose();
  }
});

test('plate has upward-facing tops that support objects placed above it',()=>{
  const mesh=new THREE.Mesh(makeReefGeometry('plate'),new THREE.MeshStandardMaterial());
  mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(.68,2,.55),new THREE.Vector3(0,-1,0));
  const hits=ray.intersectObject(mesh);
  assert.ok(hits.length>0);
  assert.ok(hits[0].point.y>.6);
  assert.ok(hits[0].face.normal.y>0);
});

test('comparison retains root position and scale and avoids raycasting hidden originals',()=>{
  const library=createReefLife(light),{root,basic,detailed}=colony(library);
  const before=new THREE.Box3().setFromObject(root);
  const camera=new THREE.PerspectiveCamera(); camera.position.copy(root.position);
  library.update(camera,'high',true);
  assert.equal(basic.visible,false); assert.equal(detailed.visible,true);
  const ray=new THREE.Raycaster(new THREE.Vector3(2,5,4),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(basic,true).length,0);
  library.update(camera,'high',false);
  assert.equal(basic.visible,true); assert.equal(detailed.visible,false);
  assert.equal(ray.intersectObject(detailed).length,0);
  assert.ok(ray.intersectObject(basic,true).length>0);
  assert.deepEqual(new THREE.Box3().setFromObject(root),before);
  assert.deepEqual(root.position.toArray(),[2,-10,4]);
});

test('streaming disposes owned primitives and preserves cached colony geometry',()=>{
  const library=createReefLife(light),a=colony(library),b=colony(library);
  assert.equal(a.detailed.geometry,b.detailed.geometry);
  let sharedDisposed=0,ownedDisposed=0;
  a.detailed.geometry.addEventListener('dispose',()=>sharedDisposed++);
  a.original.geometry.addEventListener('dispose',()=>ownedDisposed++);
  library.release(a.root); library.release(a.root);
  assert.equal(library.size,1); assert.equal(ownedDisposed,1); assert.equal(sharedDisposed,0);
  const camera=new THREE.PerspectiveCamera(); camera.position.z=100;
  library.update(camera,'low');
  assert.ok(b.detailed.geometry.attributes.position.count<a.detailed.geometry.attributes.position.count);
});

test('plant and fan shaders share a pausable current and retain caustics',()=>{
  const library=createReefLife(light);
  const shaders=[];
  for(const type of ['grass','fan']) {
    const {detailed}=colony(library,type);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    detailed.material.onBeforeCompile(shader);
    assert.match(shader.vertexShader,/y\*y\*sin/);
    assert.match(shader.vertexShader,/transformed.x\+=reefSway/);
    assert.match(shader.fragmentShader,/outgoingLight \+= diffuseColor.rgb/);
    assert.equal(shader.uniforms.oceanTime,light.oceanTime);
    shaders.push(shader);
  }
  library.setTime(12);
  assert.equal(shaders[0].uniforms.reefTime,shaders[1].uniforms.reefTime);
  assert.equal(shaders[0].uniforms.reefTime.value,12);
  library.setTime(12,true);
  assert.equal(shaders[0].uniforms.reefMotion.value,0);
  library.setTime(12,false);
  assert.equal(shaders[0].uniforms.reefMotion.value,1);
});
