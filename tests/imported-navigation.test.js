import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {moveImportedFish} from '../graphics/ImportedNavigation.js';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const rock=new THREE.Box3(v(-2,-2,-2),v(2,2,2));
test('imported body cannot tunnel through stone and can swim above it',()=>{
  const result=moveImportedFish(v(-5,0,0),v(5,0,0),[rock],.7);
  assert.ok(result.blocked);assert.ok(result.position.x< -2.7);
  const above=moveImportedFish(v(-5,4,0),v(5,4,0),[rock],.7);
  assert.equal(above.blocked,false);assert.equal(above.position.x,5);
});
test('fish embedded in a rock gets a free exit, while open overhang gaps remain usable',()=>{
  const escaped=moveImportedFish(v(0,0,0),v(.1,0,0),[rock],.5);
  assert.equal(rock.clone().expandByScalar(.5).containsPoint(escaped.position),false);
  const upper=new THREE.Box3(v(-3,4,-3),v(3,6,3));
  const gap=moveImportedFish(v(-5,1,0),v(5,1,0),[upper],.5);
  assert.equal(gap.blocked,false);
});
test('collision slides past a face without moving through it',()=>{
  let p=v(-3,0,0);
  for(let i=0;i<80;i++){p=moveImportedFish(p,p.clone().add(v(.08,0,.08)),[rock],.5).position;assert.equal(rock.clone().expandByScalar(.5).containsPoint(p),false);}
  assert.ok(p.z>3);
});
