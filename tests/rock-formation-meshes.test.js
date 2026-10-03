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

test('show-as-rock builds visible culled surface chunks in one logical formation',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  const root=system.build(formation,{skin:'grey_reef',locked:false});
  const record=system.get(formation.id);
  assert.ok(root);
  assert.equal(root.parent,scene);
  assert.ok(record);
  assert.equal(record.mesh.isMesh,true);
  assert.equal(record.mesh.isInstancedMesh,undefined);
  assert.equal(record.mesh.visible,true);
  assert.equal(record.mesh.frustumCulled,true);
  assert.ok(record.vertices>0);
  assert.ok(record.triangles>0);
  assert.ok(record.geometry.index.count>0);
  assert.equal(record.mesh.material.isMeshStandardMaterial,true);
  assert.equal(record.mesh.material.userData.rockSkin,'grey_reef');
  system.dispose();
});

test('changing skin keeps the same connected geometry object',()=>{
  const scene=new THREE.Group();
  const system=createRockFormationMeshSystem({parent:scene});
  system.build(formation,{skin:'grey_reef'});
  const before=system.get(formation.id);
  const geometry=before.geometry;
  const mesh=before.mesh;
  assert.equal(system.setSkin(formation.id,'dark_lava'),true);
  const after=system.get(formation.id);
  assert.equal(after.geometry,geometry);
  assert.equal(after.mesh,mesh);
  assert.equal(after.mesh.material.userData.rockSkin,'dark_lava');
  system.dispose();
});

test('large formations stream independently by chunk and keep transform/skin identity',()=>{
  const cells=[];for(let ix=0;ix<40;ix++)for(let iy=-5;iy<-2;iy++)for(let iz=0;iz<3;iz++)cells.push({ix,iy,iz,density:1});
  const large={id:'large',cellSize:3,center:{x:58.5,y:-12,z:3},cells};
  const camera={position:new THREE.Vector3(0,-12,0)};
  const system=createRockFormationMeshSystem({parent:new THREE.Group(),camera});
  const root=system.build(large,{skin:'grey_reef',transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}});
  const record=system.get('large');assert.ok(record.chunks.size>=5);
  assert.ok(system.stats.loadedChunks<record.chunks.size);const first=record.mesh;
  camera.position.x=120;system.update(camera);assert.equal(first.visible,false);assert.ok(system.stats.visibleChunks>0);
  root.position.z+=12;root.rotation.y=.5;root.scale.set(2,1,1);const saved=system.transformFor('large');
  assert.equal(saved.position[2],12);assert.equal(saved.rotation[1],.5);
  system.setSkin('large','algae_reef');assert.ok([...record.chunks.values()].filter(c=>c.mesh).every(c=>c.mesh.material.userData.rockSkin==='algae_reef'));
  assert.equal(system.rootFromObject(record.mesh),root);
  system.clear();assert.equal(system.stats.loadedChunks,0);assert.equal(root.parent,null);system.dispose();
});

test('LOD geometry is cached, render budgets are enforced, and hidden rocks keep collision',()=>{
  const cells=[];for(let ix=-10;ix<11;ix++)for(let iy=-5;iy<6;iy++)for(let iz=-10;iz<11;iz++)cells.push({ix,iy,iz,density:1});
  const camera={position:new THREE.Vector3(0,0,80)},system=createRockFormationMeshSystem({parent:new THREE.Group(),camera});
  system.build({id:'lod',cellSize:3,center:{x:0,y:0,z:0},cells},{shapeLevel:5});
  system.update(camera,{budget:500});assert.ok(system.stats.triangles<=500);
  const record=system.get('lod'),chunk=[...record.chunks.values()].find(c=>c.mesh?.visible);
  assert.ok(chunk);const geometry=chunk.mesh.geometry;
  system.update(camera,{budget:500});assert.equal(chunk.mesh.geometry,geometry);
  camera.position.set(0,0,200);system.update(camera);assert.equal(system.stats.visibleChunks,0);
  assert.ok(system.segmentHit(new THREE.Vector3(0,0,-50),new THREE.Vector3(0,0,50),.4));
  system.dispose();
});
