import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBlueBody,createBlueReefLibrary} from '../graphics/BlueReefFish.js';

test('blue body is closed with finite outward normals at both detail levels',()=>{
  for(const [rings,sides] of [[40,24],[20,12]]) {
    const g=createBlueBody(rings,sides),edges=new Map(),idx=g.index.array;
    for(let i=0;i<idx.length;i+=3) for(const [a,b] of [[0,1],[1,2],[2,0]]) {
      const key=[idx[i+a],idx[i+b]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);
    }
    assert.ok([...edges.values()].every(n=>n===2));
    const p=g.attributes.position,n=g.attributes.normal;
    for(let i=sides;i<rings*sides;i++) {
      assert.ok(Number.isFinite(n.getX(i)+n.getY(i)+n.getZ(i)));
      assert.ok(p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)>0);
    }
    g.dispose();
  }
});

test('blue appearance preserves school state and shares assets across fish with safe cleanup',()=>{
  const library=createBlueReefLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const make=()=>{const fish=new THREE.Group(),tail=new THREE.Object3D();fish.add(tail);
    fish.userData={tail,schoolId:'reef_1'};fish.scale.setScalar(.7);scene.add(fish);
    return {fish,tail,parts:library.attach(fish)};};
  const a=make(),b=make();
  assert.equal(a.parts.body.geometry,b.parts.body.geometry);
  assert.equal(a.parts.body.material,b.parts.body.material);
  library.update(camera,'high',false);
  assert.equal(a.parts.basic.visible,true);assert.equal(a.parts.detailed.visible,false);
  assert.equal(a.fish.userData.tail,a.tail);assert.equal(a.fish.userData.schoolId,'reef_1');
  assert.deepEqual(a.fish.scale.toArray(),[.7,.7,.7]);
  library.update(camera,'high');const near=a.parts.body.geometry.index.count;
  camera.position.z=100;library.update(camera,'low');
  assert.ok(a.parts.body.geometry.index.count<near);
  assert.ok(a.parts.details.filter(d=>d.name==='Eye white').every(d=>d.visible));
  scene.remove(a.fish);library.update(camera,'low');assert.equal(library.size,1);
  let disposed=0;b.parts.body.material.addEventListener('dispose',()=>disposed++);
  library.dispose();library.dispose();assert.equal(disposed,1);assert.equal(b.tail.parent,b.fish);
});

test('blue model geometry stays finite and its skin retains standard lighting hooks',()=>{
  const library=createBlueReefLibrary(),fish=new THREE.Group();
  const {detailed,body}=library.attach(fish);let triangles=0;
  detailed.traverse(m=>{if(!m.isMesh)return;
    for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
    triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;
  });
  assert.ok(triangles<15000,`model triangles: ${triangles}`);
  const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  body.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/#include <lights_fragment_begin>/);
  assert.match(shader.vertexShader,/vBluePosition=position/);
  library.dispose();
});
