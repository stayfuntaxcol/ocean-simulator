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

test('remembered individual route passes a wall without changing side or crossing stone',async()=>{
  const {steerImportedFish}=await import('../graphics/ImportedNavigation.js');
  const wall=new THREE.Box3(v(-2,-10,-3),v(2,25,3)),radius=.5;
  const p=v(-9,5,0),goal=v(10,5,0),velocity=v(1,0,0),state={};
  const bounds={minY:-12,maxY:9,terrain:()=>-12};let side=0,turns=0,contacts=0;
  for(let i=0;i<3000&&p.distanceTo(goal)>.5;i++){
    const desired=goal.clone().sub(p).normalize();
    const steer=steerImportedFish(p,desired,goal,[wall],radius,state,.04,bounds);
    if(state.side&&side&&state.side!==side)turns++;if(state.side)side=state.side;
    velocity.lerp(steer.direction.normalize().multiplyScalar(1.5*steer.pace),.04*1.45);
    const step=moveImportedFish(p,p.clone().addScaledVector(velocity,.04),[wall],radius,bounds);
    if(step.normal&&velocity.dot(step.normal)<0)velocity.addScaledVector(step.normal,-velocity.dot(step.normal));
    if(step.blocked)contacts++;p.copy(step.position);
    assert.equal(wall.clone().expandByScalar(radius).containsPoint(p),false);
    assert.ok(p.y<=9);
  }
  assert.ok(p.distanceTo(goal)<.6,'arrives beyond the rock');
  assert.equal(turns,0,'no left-right indecision');
  assert.ok(contacts<50,'does not keep pushing into the surface');
});

test('rock index preserves nearby thin rocks, passage and overhang clearance',async()=>{
  const {createRockIndex}=await import('../graphics/ImportedNavigation.js');
  const rocks=[new THREE.Box3(v(-.05,-5,-2),v(.05,5,2)),new THREE.Box3(v(-2,4,4),v(2,6,8)),
    new THREE.Box3(v(-3,-5,10),v(-1,5,14)),new THREE.Box3(v(1,-5,10),v(3,5,14)),new THREE.Box3(v(500,0,0),v(501,1,1))];
  const query=createRockIndex(rocks);
  const hit=moveImportedFish(v(-4,0,0),v(4,0,0),query(v(-4,0,0),9),.3);
  assert.equal(hit.blocked,true);assert.ok(hit.position.x<-.35,'sweep stops fast travel through a thin face');
  assert.ok(hit.normal.x<0);
  assert.equal(moveImportedFish(v(0,1,3),v(0,1,9),query(v(0,1,3),7),.3).blocked,false,'water under an overhang stays open');
  assert.equal(moveImportedFish(v(0,0,9),v(0,0,15),query(v(0,0,9),7),.3).blocked,false,'gap between stones stays open');
  assert.equal(query(v(0,0,0),20).includes(rocks[4]),false,'far geometry is not checked');
});
