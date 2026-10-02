import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRockFormationMeshSystem} from '../graphics/RockFormationMeshes.js';

const formation={
  id:'sculpt-test',
  cellSize:3,
  center:{x:1.5,y:-12,z:1.5},
  cells:[
    {ix:0,iy:-4,iz:0,density:1},
    {ix:1,iy:-4,iz:0,density:1},
    {ix:0,iy:-4,iz:1,density:1},
    {ix:1,iy:-4,iz:1,density:1}
  ]
};

test('rounded sculpt rock separates high visual mesh from greedy collision proxy',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  const root=system.build(formation,{skin:'grey_reef',shapeLevel:5,locked:false});
  const record=system.get(formation.id);
  assert.ok(root&&record);
  assert.ok(record.highMesh);
  assert.ok(record.lowMesh);
  assert.ok(record.collisionProxy);
  assert.equal(record.highMesh.visible,true);
  assert.equal(record.lowMesh.visible,false);
  assert.equal(record.collisionProxy.visible,false);
  assert.ok(record.lowTriangles<record.triangles);
  assert.equal(record.highMesh.material.side,THREE.FrontSide);
  assert.equal(record.lowMesh.material.side,THREE.FrontSide);
  system.dispose();
});

test('visual meshes do not raycast but invisible collision proxy does',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  const root=system.build(formation,{skin:'grey_reef',shapeLevel:5});
  root.updateMatrixWorld(true);
  const record=system.get(formation.id);
  const raycaster=new THREE.Raycaster(new THREE.Vector3(1.5,-12,20),new THREE.Vector3(0,0,-1),0,50);
  assert.equal(raycaster.intersectObject(record.highMesh,false).length,0);
  assert.equal(raycaster.intersectObject(record.lowMesh,false).length,0);
  assert.ok(raycaster.intersectObject(record.collisionProxy,false).length>0);
  system.dispose();
});

test('LOD switches to low geometry at distance and returns high nearby',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  system.build(formation,{skin:'grey_reef',shapeLevel:5});
  const record=system.get(formation.id);
  const camera=new THREE.PerspectiveCamera();
  camera.position.set(0,0,200);
  system.update(camera,'medium');
  assert.equal(record.highMesh.visible,false);
  assert.equal(record.lowMesh.visible,true);
  camera.position.set(1.5,-12,5);
  system.update(camera,'medium');
  assert.equal(record.highMesh.visible,true);
  assert.equal(record.lowMesh.visible,false);
  system.dispose();
});

test('blocky shape level uses only the low greedy visual mesh',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  system.build(formation,{skin:'grey_reef',shapeLevel:1});
  const record=system.get(formation.id);
  assert.equal(record.highMesh,null);
  assert.equal(record.lowMesh.visible,true);
  assert.equal(record.triangles,record.lowTriangles);
  system.dispose();
});

test('changing skin keeps high and low geometry topology intact',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  system.build(formation,{skin:'grey_reef',shapeLevel:5});
  const before=system.get(formation.id);
  const highGeometry=before.highGeometry,lowGeometry=before.lowGeometry;
  assert.equal(system.setSkin(formation.id,'dark_lava'),true);
  const after=system.get(formation.id);
  assert.equal(after.highGeometry,highGeometry);
  assert.equal(after.lowGeometry,lowGeometry);
  assert.equal(after.highMesh.material.userData.rockSkin,'dark_lava');
  assert.equal(after.lowMesh.material.userData.rockSkin,'dark_lava');
  system.dispose();
});
