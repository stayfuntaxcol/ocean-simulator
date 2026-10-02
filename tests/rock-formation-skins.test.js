import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROCK_SKINS,ROCK_SKIN_IDS,createRockSkinMaterial,applyRockSkinToGeometry} from '../graphics/RockFormationSkins.js';

function geometry(){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,0, 2,0,0, 2,2,0, 0,2,0
  ],3));
  g.setIndex([0,1,2,0,2,3]);
  g.computeVertexNormals();
  return g;
}

test('six rock skins use reliable standard vertex-color materials',()=>{
  assert.equal(ROCK_SKIN_IDS.length,6);
  for(const id of ROCK_SKIN_IDS){
    const material=createRockSkinMaterial(id);
    assert.equal(material.isMeshStandardMaterial,true);
    assert.equal(material.vertexColors,true);
    assert.equal(material.transparent,false);
    assert.ok(material.roughness>=.9);
    material.dispose();
  }
});

test('skin changes produce different vertex colors without changing geometry topology',()=>{
  const g=geometry(),beforeIndex=Array.from(g.index.array),beforePos=Array.from(g.getAttribute('position').array);
  assert.equal(applyRockSkinToGeometry(g,'grey_reef',{x:0,y:-10,z:0}),true);
  const grey=Array.from(g.getAttribute('color').array);
  assert.equal(applyRockSkinToGeometry(g,'layered_sandstone',{x:0,y:-10,z:0}),true);
  const sandstone=Array.from(g.getAttribute('color').array);
  assert.notDeepEqual(grey,sandstone);
  assert.deepEqual(Array.from(g.index.array),beforeIndex);
  assert.deepEqual(Array.from(g.getAttribute('position').array),beforePos);
  g.dispose();
});


test('all six skins produce distinct geological color signatures on the same rock',()=>{
  const signatures=new Set();
  for(const id of ROCK_SKIN_IDS){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([
      0,0,0, 3,0,0, 3,2,1, 0,2,1,
      1,4,2, 4,5,3, -2,3,1, 2,-3,4
    ],3));
    g.setIndex([0,1,2,0,2,3, 3,2,4, 2,5,4, 0,3,6, 1,7,2]);
    g.computeVertexNormals();
    applyRockSkinToGeometry(g,id,{x:13,y:-24,z:-7});
    const colors=Array.from(g.getAttribute('color').array);
    const signature=colors.map(v=>v.toFixed(3)).join(',');
    signatures.add(signature);
    g.dispose();
  }
  assert.equal(signatures.size,ROCK_SKIN_IDS.length);
});
