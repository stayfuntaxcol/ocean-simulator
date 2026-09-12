import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOrca,createOrcaBody,orcaBend,ORCA_CLEARANCE} from '../graphics/Orca.js';
import {createOrcaCruise,orcaRouteClear,validateOrcaRecord} from '../graphics/OrcaNavigation.js';

test('orca body has a closed topology and finite normals',()=>{
  const g=createOrcaBody(),edges=new Map(),a=g.index.array;
  for(let i=0;i<a.length;i+=3)for(const [j,k] of [[0,1],[1,2],[2,0]]){
    const key=[a[i+j],a[i+k]].sort((x,y)=>x-y).join(',');edges.set(key,(edges.get(key)||0)+1);
  }
  assert.ok([...edges.values()].every(n=>n===2));
  assert.ok(g.attributes.normal.array.every(Number.isFinite));
  assert.ok(g.index.count/3<3000);g.dispose();
});

test('orca has horizontal flukes, a moving jaw and teeth that show during opening',()=>{
  const orca=createOrca(),root=orca.root;
  orca.animate(.016,12);
  const jaw=root.getObjectByName('Lower jaw'),teeth=root.getObjectByName('Upper teeth');
  assert.equal(teeth.visible,false);
  orca.openMouth();for(let i=0;i<60;i++)orca.animate(1/60,12);
  assert.ok(jaw.rotation.z<-.40);assert.equal(teeth.visible,true);
  for(let i=0;i<360;i++)orca.animate(1/60,12);
  assert.ok(Math.abs(jaw.rotation.z)<.001);assert.equal(teeth.visible,false);
  const tail=root.getObjectByName('Horizontal flukes');tail.geometry.computeBoundingBox();
  const size=tail.geometry.boundingBox.getSize(new THREE.Vector3());
  assert.ok(size.z>size.y*10);
  assert.ok(Math.abs(tail.position.y-orcaBend(-3,12*2.35+.6,.13+1.7*.035))<1e-9);
  orca.dispose();orca.dispose();
});

test('orca simplifies body at distance and composes a lit skin shader',()=>{
  const orca=createOrca(),body=orca.root.getObjectByName('Body');
  orca.animate(.02,12,'high',5);const near=body.geometry.index.count;
  orca.animate(.02,12,'low',50);assert.ok(body.geometry.index.count<near);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  body.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/eyePatch/);
  assert.match(shader.fragmentShader,/#include <lights_fragment_begin>/);
  assert.match(shader.vertexShader,/objectNormal.x-=/);
  assert.equal(shader.uniforms.orcaPhase.value,12*2.35+.6);orca.dispose();
});

test('orca clearance rejects rocks, narrow passes, terrain and world edges',()=>{
  const a=new THREE.Vector3(-10,0,0),b=new THREE.Vector3(10,0,0);
  assert.equal(orcaRouteClear(a,b),true);
  const rock=new THREE.Box3(new THREE.Vector3(-1,-2,-1),new THREE.Vector3(1,2,1));
  assert.equal(orcaRouteClear(a,b,{rocks:[rock]}),false);
  const sideRock=rock.clone().translate(new THREE.Vector3(0,0,3));
  assert.equal(orcaRouteClear(a,b,{rocks:[sideRock]}),false,'body clearance, not only center ray');
  assert.equal(orcaRouteClear(a,b,{terrain:()=>-2}),false);
  assert.equal(orcaRouteClear(a,b,{terrain:(_x,z)=>z>=ORCA_CLEARANCE?0:-18}),false,'nearby steep ground');
  assert.equal(orcaRouteClear(a,new THREE.Vector3(143,0,0)),false);
  assert.equal(orcaRouteClear(a,new THREE.Vector3(0,19,0)),false);
});

test('orca stops when blocked and does not move while paused',()=>{
  const orca=createOrca(),root=orca.root;let open=true;
  const cruise=createOrcaCruise(root,()=>open);
  cruise.update(0,12);assert.deepEqual(root.position.toArray(),[0,0,0]);
  cruise.update(.04,12);assert.ok(root.position.length()>0);
  const before=root.position.clone();open=false;
  for(let i=0;i<100;i++)cruise.update(.04,12+i*.04);
  assert.deepEqual(root.position,before);orca.dispose();
});

test('orca placement records round trip and reject invalid coordinates',()=>{
  const record={position:[12,4,-8],heading:1.2,health:93};
  assert.deepEqual(validateOrcaRecord(JSON.parse(JSON.stringify(record))),record);
  assert.equal(validateOrcaRecord(null),null);
  for(const position of [[NaN,0,0],[150,0,0],[0,99,0],[0,0],[0,'4',0]])
    assert.equal(validateOrcaRecord({position}),null);
});
