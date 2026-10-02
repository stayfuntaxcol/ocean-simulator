import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRockFormationMeshSystem} from '../graphics/RockFormationMeshes.js';

const formation={
  id:'sculpt-test',
  cellSize:3,
  center:{x:0,y:-12,z:0},
  cells:[
    {ix:0,iy:-4,iz:0,density:1},
    {ix:1,iy:-4,iz:0,density:1},
    {ix:0,iy:-4,iz:1,density:1},
    {ix:1,iy:-4,iz:1,density:1}
  ]
};

test('show-as-rock builds a visible instanced surface with a standard material',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  const root=system.build(formation,{skin:'grey_reef',locked:false});
  const record=system.get(formation.id);
  assert.ok(root);
  assert.equal(root.parent,scene);
  assert.ok(record);
  assert.equal(record.mesh.isInstancedMesh,true);
  assert.equal(record.mesh.visible,true);
  assert.equal(record.mesh.frustumCulled,false);
  assert.ok(record.mesh.count>0);
  assert.equal(record.mesh.material.isMeshStandardMaterial,true);
  assert.equal(record.mesh.material.userData.rockSkin,'grey_reef');
  system.dispose();
});

test('changing a skin does not rebuild or hide the rock surface',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  system.build(formation,{skin:'grey_reef'});
  const before=system.get(formation.id).mesh;
  assert.equal(system.setSkin(formation.id,'dark_lava'),true);
  const after=system.get(formation.id).mesh;
  assert.equal(after,before);
  assert.equal(after.visible,true);
  assert.equal(after.material.userData.rockSkin,'dark_lava');
  system.dispose();
});
