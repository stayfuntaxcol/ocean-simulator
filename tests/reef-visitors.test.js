import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStingray,createSeaTurtle,rayWave} from '../graphics/ReefVisitors.js';
import {visitorPathClear,createVisitorCruise,validateVisitorRecords} from '../graphics/ReefVisitorNavigation.js';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);

test('both animals have finite closed-body geometry, pause, change style and release resources',()=>{
  for(const create of [createStingray,createSeaTurtle]){
    const a=create();let count=0;
    a.root.traverse(o=>{if(o.geometry){count++;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});
    assert.ok(count>10);assert.ok(new THREE.Box3().setFromObject(a.root).getSize(v(0,0,0)).x>(a.root.userData.visitorKind==='turtle'?.5:2.5));
    a.animate(.1,1);a.root.updateMatrixWorld(true);const before=a.root.children.map(o=>o.quaternion.toArray());
    a.animate(0,10);assert.deepEqual(a.root.children.map(o=>o.quaternion.toArray()),before);
    a.setStyle('realistic');let detail=0;a.root.traverse(o=>{if(o.material?.userData.detail?.value===1)detail++;});assert.ok(detail>5||a.root.getObjectByName('Rigid shell')?.material.roughness===.6);
    a.animate(.1,2,'low',80);a.dispose();a.dispose();
  }
  assert.ok(Math.abs(rayWave(0,1.4,1))>.01);assert.equal(rayWave(0,0,1),0);
});
test('flat ray passes beneath a low overhang while a turtle cannot; rock and tail stay solid',()=>{
  const ceiling=new THREE.Box3(v(-8,1.25,-4),v(8,3,4));
  const options={rocks:[ceiling],terrain:()=>0};
  assert.equal(visitorPathClear('stingray',v(-2,.65,0),v(2,.65,0),0,options),true);
  assert.equal(visitorPathClear('turtle',v(-2,.85,0),v(2,.85,0),0,options),false);
  const wall=new THREE.Box3(v(-.05,-5,-5),v(.05,8,5));
  assert.equal(visitorPathClear('stingray',v(-5,2,0),v(5,2,0),0,{rocks:[wall]}),false);
  const tailRock=new THREE.Box3(v(-3.1,1.9,-.1),v(-2.9,2.1,.1));
  assert.equal(visitorPathClear('stingray',v(0,2,0),v(.1,2,0),0,{rocks:[tailRock]}),false);
});
test('both animals travel continuously, obey terrain and surface, and pause',()=>{
  for(const [kind,create] of [['stingray',createStingray],['turtle',createSeaTurtle]]){
    const a=create();a.root.position.set(0,-14,0);
    const clear=(from,to,h)=>visitorPathClear(kind,from,to,h,{terrain:()=>-18,inside:p=>Math.abs(p.x)<100&&Math.abs(p.z)<100});
    const cruise=createVisitorCruise(a.root,kind,clear,()=>-18),start=a.root.position.clone();let travel=0,maxY=-100;
    for(let i=0;i<6000;i++){const old=a.root.position.clone();cruise.update(.04);travel+=old.distanceTo(a.root.position);maxY=Math.max(maxY,a.root.position.y);assert.ok(a.root.position.y<19);assert.ok(a.root.position.y>-18);}
    assert.ok(travel>30);assert.ok(start.distanceTo(a.root.position)>5);
    if(kind==='turtle')assert.ok(maxY>18.4,'reaches breathing height before descending');
    const p=a.root.position.clone();cruise.update(0);assert.deepEqual(a.root.position,p);a.dispose();
  }
});
test('optional visitor saves round-trip and reject malformed records without altering input',()=>{
  assert.deepEqual(validateVisitorRecords(undefined),{});
  const r={stingray:{position:[0,-12,3],heading:.5},turtle:{position:[12,-8,3],heading:1}};
  assert.deepEqual(validateVisitorRecords(r),r);
  assert.throws(()=>validateVisitorRecords({stingray:{position:[0,Infinity,0],heading:0}}));
  assert.throws(()=>validateVisitorRecords({turtle:{position:[0,0,0],heading:'0'}}));
});
