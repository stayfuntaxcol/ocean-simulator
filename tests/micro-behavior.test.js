import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMicroBehavior} from '../graphics/MicroLifeBehavior.js';
import {createMicroLife} from '../graphics/MicroLife.js';

const terrain=()=>0;
const habitats=Array.from({length:9},(_,i)=>({x:(i%3-1)*12,z:(Math.floor(i/3)-1)*12}));
const rocks=habitats.map(h=>new THREE.Box3(new THREE.Vector3(h.x-2,0,h.z-2),new THREE.Vector3(h.x+2,2.5,h.z+2)));
function fixture({cover=rocks,threats=[],water=()=>true}={}) {
  const groundPose=(x,z,r)=>cover.some(b=>x>=b.min.x-r&&x<=b.max.x+r&&z>=b.min.z-r&&z<=b.max.z+r)?null:{position:new THREE.Vector3(x,.016,z),normal:new THREE.Vector3(0,1,0)};
  const swimSafe=(p,r)=>p.y>r&&p.y<19.55-r&&Math.abs(p.x)<40-r&&Math.abs(p.z)<40-r&&!cover.some(b=>b.clone().expandByScalar(r).containsPoint(p))&&water(p);
  const life=createMicroBehavior({terrain,groundPose,swimSafe,getThreats:()=>threats});life.sync(habitats,cover,cover);
  return {life,groundPose,swimSafe,threats};
}

test('solitary crab population is capped globally at 20, uses rocks and retains separated territories',()=>{
  const {life}=fixture(),crabs=life.animals.filter(a=>a.type==='crab');
  assert.equal(crabs.length,20);
  for(let i=0;i<crabs.length;i++){
    assert.ok(rocks.some(b=>b.distanceToPoint(crabs[i].home)<.9));
    for(let j=i+1;j<crabs.length;j++)assert.ok(crabs[i].home.distanceTo(crabs[j].home)>=3.3);
  }
  const bare=fixture({cover:[]});assert.equal(bare.life.animals.filter(a=>a.type==='crab').length,0);
});

test('crabs mostly shelter, forage independently and move sideways with gait only during travel',()=>{
  const {life,groundPose}=fixture();let hidden=0,total=0,moving=0;const states=new Set();
  for(let frame=0;frame<1500;frame++){
    life.update(.08);
    for(const a of life.animals.filter(a=>a.type==='crab')){
      total++;if(a.state==='HIDE')hidden++;states.add(a.state);
      assert.ok(groundPose(a.position.x,a.position.z,.58));assert.ok(a.position.distanceTo(a.home)<.92);
      if(a.velocity.length()>.01){moving++;const forward=new THREE.Vector3(Math.cos(a.yaw),0,-Math.sin(a.yaw));assert.ok(Math.abs(forward.dot(a.velocity.clone().normalize()))<.031);assert.ok(a.gait>0);}
      else assert.equal(a.gait,0);
    }
  }
  assert.ok(moving>100);assert.ok(hidden/total>.6);assert.ok(states.has('FORAGE')&&states.has('RETURN'));
  assert.ok(new Set(life.animals.filter(a=>a.type==='crab').map(a=>a.timer.toFixed(2))).size>10);
});

test('shrimp swarm keeps separation, loose headings and bounded water positions over two minutes',()=>{
  const {life,swimSafe}=fixture({cover:[]});
  for(let frame=0;frame<1500;frame++){
    life.update(.08);
    if(frame%20)continue;
    const shrimp=life.animals.filter(a=>a.type==='shrimp');assert.equal(shrimp.length,48);
    for(let i=0;i<shrimp.length;i++){
      assert.ok(swimSafe(shrimp[i].position,.43));assert.ok(shrimp[i].position.distanceTo(shrimp[i].home)<7);
      for(let j=i+1;j<shrimp.length;j++)assert.ok(shrimp[i].position.distanceTo(shrimp[j].position)>.60);
    }
  }
  const angles=life.animals.filter(a=>a.type==='shrimp').map(a=>a.yaw);
  const concentration=Math.hypot(angles.reduce((s,a)=>s+Math.cos(a),0),angles.reduce((s,a)=>s+Math.sin(a),0))/angles.length;
  assert.ok(concentration<.8,'Shrimp do not lock into one school heading');
});

test('predator triggers straight backward burst, folding tail, no swimming legs, recovery and pause',()=>{
  const {life,threats}=fixture({cover:[]});const a=life.animals.find(a=>a.type==='shrimp');
  // Isolate one animal to measure the escape without neighbour collision.
  life.animals.splice(0,life.animals.length,a);a.position.set(0,3,0);a.home.copy(a.position);
  threats.push({position:new THREE.Vector3(1.5,3,0),radius:.5});
  life.update(.04);assert.equal(a.state,'EVADE');assert.ok(a.position.x<0);assert.ok(a.velocity.length()>2);assert.ok(a.fold>.4);assert.equal(a.gait,0);
  const forward=new THREE.Vector3(Math.cos(a.yaw)*Math.cos(a.pitch),Math.sin(a.pitch),-Math.sin(a.yaw)*Math.cos(a.pitch));
  assert.ok(forward.dot(a.velocity)<-2);
  const paused=life.snapshot();life.update(0);assert.deepEqual(life.snapshot(),paused);
  const positions=[];for(let i=0;i<24;i++){life.update(.04);positions.push(a.position.clone());}
  assert.ok(positions.every(p=>p.y===3&&p.z===0));assert.equal(a.state,'RECOVER');
  threats.length=0;for(let i=0;i<20;i++)life.update(.04);assert.equal(a.state,'SWIM');assert.equal(a.fold,0);assert.ok(a.velocity.length()<.49);
});

test('swept escape stops before rock, floor and surface without walking or swimming in place',()=>{
  for(const direction of [new THREE.Vector3(1,0,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,1,0)]){
    const {life,threats,swimSafe}=fixture({cover:[],water:p=>p.x<.15});const a=life.animals[0];life.animals.splice(0,life.animals.length,a);
    a.position.set(0,direction.y<0?.50:direction.y>0?19.03:3,0);a.home.copy(a.position);
    threats.push({position:a.position.clone().addScaledVector(direction,-1),radius:.5});
    for(let i=0;i<6;i++){life.update(.08);assert.ok(swimSafe(a.position,.43));}
    assert.equal(a.state,'RECOVER');assert.equal(a.gait,0);assert.equal(a.velocity.length(),0);
  }
});

test('camera, detail, refresh and pause preserve individual identity, velocity and escape state',()=>{
  let threats=[];const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,4,4);
  const life=createMicroLife({scene,terrain,getHabitats:()=>habitats,getObstacles:()=>rocks,getShelters:()=>rocks,getThreats:()=>threats});
  life.update(.04,camera,{quality:'high'});
  const first=life.snapshot().find(a=>a.type==='shrimp');threats=[{position:new THREE.Vector3().fromArray(first.position).add(new THREE.Vector3(1,0,0)),radius:.5}];
  life.update(.04,camera,{quality:'high'});const before=life.snapshot();
  camera.position.x+=24;life.update(5,camera,{paused:true,quality:'low'});assert.deepEqual(life.snapshot(),before);
  life.update(0,camera,{revision:1});assert.deepEqual(life.snapshot(),before);
  life.update(3,camera,{enabled:false});life.update(0,camera);assert.deepEqual(life.snapshot(),before);
  life.dispose();
});
