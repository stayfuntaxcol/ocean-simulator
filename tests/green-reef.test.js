import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGreenBody,createGreenReefLibrary} from '../graphics/GreenReefFish.js';

test('green body has a broad flat silhouette and closed outward-facing geometry',()=>{
  const g=createGreenBody();g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3());
  assert.ok(size.z>size.y*2);const edges=new Map(),idx=g.index.array;
  for(let i=0;i<idx.length;i+=3)for(const [a,b] of [[0,1],[1,2],[2,0]]){
    const key=[idx[i+a],idx[i+b]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);
  }
  assert.ok([...edges.values()].every(n=>n===2));
  for(let i=24;i<40*24;i++){
    const p=g.attributes.position,n=g.attributes.normal;
    assert.ok(Number.isFinite(n.getX(i)+n.getY(i)+n.getZ(i)));
    assert.ok(p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)>0);
  }g.dispose();
});

test('green fish keeps its school, top-mounted eyes and shared resources across appearance changes',()=>{
  const lib=createGreenReefLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const fish=new THREE.Group(),tail=new THREE.Object3D();fish.add(tail);scene.add(fish);
  fish.userData={schoolId:'reef_6',tail};const a=lib.attach(fish);
  const other=new THREE.Group();scene.add(other);const b=lib.attach(other);
  assert.equal(a.body.geometry,b.body.geometry);assert.equal(a.body.material,b.body.material);
  for(const m of a.detailed.children){
    for(const p of m.geometry.attributes.position.array)assert.ok(Number.isFinite(p));
    if(m.name==='Eye white')assert.ok(m.position.y>.36);
  }
  lib.update(camera,'high',false);assert.equal(a.basic.visible,true);assert.equal(a.detailed.visible,false);
  assert.equal(fish.userData.tail,tail);assert.equal(fish.userData.schoolId,'reef_6');
  lib.update(camera,'high');const count=a.body.geometry.index.count;
  camera.position.z=100;lib.update(camera,'low');assert.ok(a.body.geometry.index.count<count);
  const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  a.body.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/#include <lights_fragment_begin>/);
  assert.match(shader.fragmentShader,/fwidth/);
  scene.remove(other);lib.update(camera,'low');assert.equal(lib.size,1);
  let disposed=0;a.body.material.addEventListener('dispose',()=>disposed++);lib.dispose();lib.dispose();
  assert.equal(disposed,1);assert.equal(tail.parent,fish);
});
