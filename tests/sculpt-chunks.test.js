import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SculptChunkManager} from '../worlds/SculptChunkManager.js';
import {SculptCollision} from '../worlds/SculptCollision.js';
import {moveImportedFish} from '../graphics/ImportedNavigation.js';

test('negative coordinates use floor ownership and border changes dirty every halo neighbor',()=>{
  const manager=new SculptChunkManager();manager.setCell(-1,-1,-1,1);
  assert.ok(manager.chunks.has('-1,-1,-1'));assert.ok(manager.sectors.has('-1,-1,-1'));
  assert.ok(manager.dirty.has('0,0,0'));manager.dirty.clear();manager.setCell(-1,-1,-1,0);
  assert.equal(manager.chunks.size,0);assert.ok(manager.dirty.has('-1,-1,-1'));
});

function tunnel(){
  const manager=new SculptChunkManager();
  for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)for(let z=-12;z<=12;z++){
    if(Math.abs(x)<=1&&Math.abs(y)<=1)continue;manager.setCell(x,y,z,1);
  }
  return manager;
}
const v=(x,y,z)=>new THREE.Vector3(x,y,z);

test('DDA blocks a wall and diagonal crossings but retains a tunnel across chunk borders',()=>{
  const collider=new SculptCollision(tunnel()),root=new THREE.Group();
  assert.equal(collider.segment(root,v(0,0,-45),v(0,0,45),.5),null);
  const wall=collider.segment(root,v(0,0,0),v(12,0,0),.5);
  assert.ok(wall);assert.ok(wall.distance>2&&wall.distance<5);
  assert.ok(collider.segment(root,v(0,0,-45),v(12,12,45),.5));
  assert.ok(collider.segment(root,v(6,0,0),v(6,0,0),.5));
  assert.equal(collider.segment(root,v(0,-15,0),v(0,-15,20),.5),null);
  assert.ok(collider.segment(root,v(0,0,-45),v(0,0,45),5),'a large fish must fit its full swept body');
});

test('density collision survives rotation, translation and nonuniform scaling',()=>{
  const manager=new SculptChunkManager();manager.setCell(0,0,0,1);
  const collider=new SculptCollision(manager),root=new THREE.Group();
  root.position.set(15,-10,7);root.rotation.y=Math.PI/3;root.scale.set(2,.5,1);
  assert.ok(collider.segment(root,v(5,-10,7),v(25,-10,7),.25));
  assert.equal(collider.segment(root,v(5,-3,7),v(25,-3,7),.25),null);
});

test('100 imported fish traverse the tunnel while wall motion is stopped without mesh raycasts',()=>{
  const collider=new SculptCollision(tunnel()),root=new THREE.Group();
  const bounds={minY:-50,maxY:50,sculptCollision:(a,b,r)=>collider.segment(root,a,b,r)};
  for(let i=0;i<100;i++){
    const x=(i%10-4.5)*.1,y=(Math.floor(i/10)-4.5)*.1;
    const result=moveImportedFish(v(x,y,-40),v(x,y,40),[],.3,bounds);
    assert.equal(result.blocked,false);assert.equal(result.position.z,40);
  }
  const wall=moveImportedFish(v(0,0,0),v(10,0,0),[],.3,bounds);
  assert.equal(wall.blocked,true);assert.ok(wall.position.x<4);
});
