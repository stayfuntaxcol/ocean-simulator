import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOrca,createOrcaJaw} from '../graphics/Orca.js';
import {createWhale,createWhaleBody,WHALE_EXTENT,WHALE_MARGIN} from '../graphics/Whale.js';
import {createWhaleCruise,whaleRouteClear,validateWhaleRecord} from '../graphics/WhaleNavigation.js';
import {fishExtent,constrainWater} from '../graphics/FishInteractions.js';

function closed(g){
  const edges=new Map(),a=g.index.array;
  for(let i=0;i<a.length;i+=3)for(const [j,k] of [[0,1],[1,2],[2,0]]){
    const key=[a[i+j],a[i+k]].sort((x,y)=>x-y).join(',');edges.set(key,(edges.get(key)||0)+1);
  }
  assert.ok([...edges.values()].every(n=>n===2));assert.ok(g.attributes.position.array.every(Number.isFinite));assert.ok(g.attributes.normal.array.every(Number.isFinite));
}
test('orka mandible is a deep closed volume, matches the hinge and still opens with its teeth',()=>{
  const g=createOrcaJaw();closed(g);g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3());
  assert.ok(size.y>.60);assert.ok(size.z>1.1);g.dispose();
  const orca=createOrca(),jaw=orca.root.getObjectByName('Lower jaw'),lower=orca.root.getObjectByName('Rounded mandible');
  assert.equal(lower.parent,jaw);assert.deepEqual(lower.scale.toArray(),[1,1,1]);
  orca.openMouth();for(let i=0;i<60;i++)orca.animate(1/60,10);
  assert.ok(jaw.rotation.z<-.40);assert.equal(orca.root.getObjectByName('Lower teeth').parent,jaw);
  for(let i=0;i<400;i++)orca.animate(1/60,10);assert.ok(Math.abs(jaw.rotation.z)<.001);orca.dispose();
});
test('whale is more than twice as long as orca, with finite geometry and an enclosing movement margin',()=>{
  const whale=createWhale(),orca=createOrca();
  const wb=new THREE.Box3().setFromObject(whale.root),ob=new THREE.Box3().setFromObject(orca.root);
  const ws=wb.getSize(new THREE.Vector3()),os=ob.getSize(new THREE.Vector3());
  assert.ok(ws.x>26&&ws.x<29);assert.ok(ws.x>os.x*2.3);
  for(const p of [wb.min,wb.max]){assert.ok(Math.abs(p.x)<WHALE_EXTENT.x);assert.ok(Math.abs(p.y)<WHALE_EXTENT.y);assert.ok(Math.abs(p.z)<WHALE_EXTENT.z);assert.ok(Math.hypot(p.x,p.z)<WHALE_MARGIN);}
  let triangles=0;whale.root.traverse(o=>{if(o.geometry){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  assert.ok(triangles<18000,`geometry budget: ${triangles}`);
  for(const g of [createWhaleBody(),createWhaleBody(32,16)]){closed(g);g.dispose();}
  whale.dispose();orca.dispose();
});
test('whale animation pauses, moves horizontal flukes, uses LOD and composes its skin with lighting',()=>{
  const whale=createWhale(),body=whale.root.getObjectByName('Whale body'),tail=whale.root.getObjectByName('Whale flukes');
  whale.animate(.04,12,'high',10);const first=[tail.position.y,tail.rotation.z];
  whale.animate(.04,12,'high',10);assert.deepEqual([tail.position.y,tail.rotation.z],first);
  whale.animate(.04,12.04,'high',10);assert.notDeepEqual([tail.position.y,tail.rotation.z],first);
  tail.geometry.computeBoundingBox();const size=tail.geometry.boundingBox.getSize(new THREE.Vector3());assert.ok(size.z>size.y*10);
  const count=body.geometry.index.count;whale.animate(.04,12.08,'low',50);assert.ok(body.geometry.index.count<count);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};body.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/#include <lights_fragment_begin>/);assert.match(shader.fragmentShader,/grooves/);assert.match(shader.vertexShader,/objectNormal.x-=/);
  let disposed=0;body.material.addEventListener('dispose',()=>disposed++);whale.dispose();whale.dispose();assert.equal(disposed,1);
});
test('whale route protects the large footprint, seabed, surface and world boundary',()=>{
  const a=new THREE.Vector3(0,0,0),b=new THREE.Vector3(8,0,0);
  assert.equal(whaleRouteClear(a,b),true);
  const rock=new THREE.Box3(new THREE.Vector3(2,-1,10),new THREE.Vector3(3,2,11));assert.equal(whaleRouteClear(a,b,{rocks:[rock]}),false);
  assert.equal(whaleRouteClear(a,b,{terrain:(_x,z)=>z>8?-4:-18}),false);
  assert.equal(whaleRouteClear(a,new THREE.Vector3(0,15,0)),false);
  assert.equal(whaleRouteClear(a,new THREE.Vector3(130,0,0)),false);
  const whale=createWhale();assert.deepEqual(fishExtent(whale.root).toArray(),WHALE_EXTENT.toArray());whale.root.position.y=25;constrainWater(whale.root);assert.ok(whale.root.position.y<=14.05);whale.dispose();
});
test('whale cruise stops when blocked and optional save record round-trips safely',()=>{
  const whale=createWhale();let clear=true;const cruise=createWhaleCruise(whale.root,()=>clear);
  cruise.update(0,12);assert.equal(whale.root.position.length(),0);cruise.update(.04,12);assert.ok(whale.root.position.length()>0);
  clear=false;const p=whale.root.position.clone();cruise.update(.04,12.04);assert.deepEqual(whale.root.position,p);assert.equal(whale.root.userData.velocity.length(),0);
  const record={position:[10,3,-20],heading:1.2,health:94};assert.deepEqual(validateWhaleRecord(JSON.parse(JSON.stringify(record))),record);
  assert.equal(validateWhaleRecord(null),null);
  for(const position of [[0,99,0],[140,0,0],[NaN,0,0],[0,'2',0],[0,0]])assert.equal(validateWhaleRecord({position}),null);
  whale.dispose();
});
