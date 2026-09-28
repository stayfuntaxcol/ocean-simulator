import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {moveImportedFish,planSurfaceRockDetour} from '../graphics/ImportedNavigation.js';
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

test('a rock above the surface sends the school around both sides of the obstacle',()=>{
  const emerged=new THREE.Box3(v(-2,-8,-2),v(2,15,2));
  const start=v(-12,8,0),goal=v(12,8,0),radius=.6;
  const route=planSurfaceRockDetour(start,goal,[emerged],radius,{maxY:9,minY:-10,terrain:()=>-10});
  assert.ok(route,'a lateral route exists below the surface');
  assert.equal(route.waypoints.length,2);
  let previous=start;
  for(const waypoint of [...route.waypoints,goal]){
    assert.ok(waypoint.y<=9);
    const result=moveImportedFish(previous,waypoint,[emerged],radius,{maxY:9,minY:-10});
    assert.equal(result.blocked,false,'each leg avoids the emerged rock');
    previous=waypoint;
  }
  assert.ok(route.waypoints[0].z*route.waypoints[1].z>0,'both waypoints stay on one side');
});
test('a submerged rock can still be passed overhead with sufficient water depth',()=>{
  const submerged=new THREE.Box3(v(-2,-8,-2),v(2,3,2));
  assert.equal(planSurfaceRockDetour(v(-10,6,0),v(10,6,0),[submerged],.5,{maxY:9,terrain:()=>-10}),null);
});

test('a school can actually swim the selected waypoints and descend after the rock',()=>{
  const rock=new THREE.Box3(v(-2,-8,-2),v(2,14,2));
  const destination=v(12,4,0),radius=.6,maxY=9;
  let position=v(-12,8,0),peak=position.y,blocked=0;
  const route=planSurfaceRockDetour(position,destination,[rock],radius,{maxY,minY:-10,terrain:()=>-10});
  assert.ok(route);
  for(const target of [...route.waypoints,destination]){
    for(let i=0;i<300&&position.distanceTo(target)>.06;i++){
      const delta=target.clone().sub(position).clampLength(0,.06);
      const next=moveImportedFish(position,position.clone().add(delta),[rock],radius,{minY:-10,maxY});
      if(next.blocked)blocked++;
      position.copy(next.position);peak=Math.max(peak,position.y);
    }
    assert.ok(position.distanceTo(target)<.08,'the school reaches each waypoint');
  }
  assert.equal(blocked,0);assert.ok(peak<=maxY);assert.ok(position.y<6,'it descends toward food after the rock');
});
