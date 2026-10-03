import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import vm from 'node:vm';
import {advanceRockRecovery,recoverySleeping,reachableFishGroups} from '../graphics/ImportedRecovery.js';
import {importedDayPhase} from '../graphics/ImportedBehavior.js';

const position={x:0,y:-10,z:0};
function step(state,now,options={}){return advanceRockRecovery(state,{now,position,blocked:true,...options});}
test('two kicks ten seconds apart, then release only after the second escape window',()=>{
  const state={};assert.equal(step(state,0),null);
  assert.equal(step(state,3),'startle');assert.equal(step(state,12.99),null);
  assert.equal(step(state,13),'startle');assert.equal(step(state,22.99),null);
  assert.equal(step(state,23),'detach');assert.equal(step(state,40),null);
});
test('night, sleep-seeking and settling cancel a pending second kick',()=>{
  for(const hour of [21,23.9,0,5.5])assert.equal(recoverySleeping(hour),true);
  assert.equal(recoverySleeping(5.75),false);assert.equal(recoverySleeping(20.99),false);
  assert.equal(recoverySleeping(12,{restState:'settling'}),true);
  assert.equal(recoverySleeping(12,{}, {sleeping:true}),true);
  const state={};step(state,0);step(state,3);
  for(let now=4;now<50;now++)assert.equal(step(state,now,{sleeping:true}),null);
  assert.equal(state.attempts,0);assert.equal(step(state,50),null);
});
test('ordinary rest, low vitality, and useful motion never trigger recovery',()=>{
  const rest={},motion={};
  for(let now=0;now<40;now++){
    assert.equal(step(rest,now,{blocked:false}),null);
    assert.equal(step({},now,{trying:false}),null);
    assert.equal(step(motion,now,{position:{x:now,y:-10,z:0}}),null);
  }
});
test('successful escape clears the sequence instead of causing a delayed second kick',()=>{
  const state={};step(state,0);step(state,3);
  step(state,4,{blocked:false,position:{x:2,y:-10,z:0}});
  step(state,6,{blocked:false,position:{x:3,y:-10,z:0}});
  assert.equal(state.attempts,0);assert.equal(step(state,13,{blocked:false}),null);
});

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const begin=html.indexOf('function livingSchoolMembers(school){'),end=html.indexOf('\nfunction updateSchoolBrains(t){',begin);
const source=html.slice(begin,end)+'\n({releaseBlockedSchool,updateRecoverySchools,splitImportedSchools})';
function environment(count=12){
  const schools=new Map();let next=0,hour=12;
  const makeSchool=(speciesId,options={})=>{
    const s={id:`school_${++next}`,speciesId,members:[],center:new THREE.Vector3(),target:new THREE.Vector3(),recentFoodSectors:[],birthCredit:0,...options};
    schools.set(s.id,s);return s;
  };
  const original=makeSchool('import',{cohesion:.6,alignment:.5});
  Object.assign(original,{importTemplate:{},sourceName:'Fish',libraryId:'library',oceanProfile:{},birthCredit:1});
  for(let i=0;i<count;i++)original.members.push({parent:{},position:new THREE.Vector3(i<count/2?-2:2,-10,i%6*.25),userData:{schoolId:original.id}});
  const target=s=>{s.target.copy(s.center).add(new THREE.Vector3(0,0,10));};
  const api=vm.runInNewContext(source,{schools,makeSchool,THREE,reachableFishGroups,importedDayPhase,
    currentWeatherState:{get hour(){return hour;}},FISH_RADIUS:.3,
    segmentRockHit:(a,b)=>a.x*b.x<0?{}:null,importedExploreTarget:target,chooseSchoolTarget:target,
    localFoodAt:()=>({capacity:100,demand:0,stockRatio:1}),residenceDuration:()=>150,oceanRandom:()=>.5});
  return {...api,original,schools,setHour:value=>hour=value};
}
test('wall-separated halves receive independent targets and preserve every fish and birth credit',()=>{
  const e=environment();e.releaseBlockedSchool(e.original,23);
  assert.deepEqual([...e.schools.values()].map(s=>s.members.length),[6,6]);
  assert.equal(new Set([...e.schools.values()].flatMap(s=>s.members)).size,12);
  assert.ok(Math.abs([...e.schools.values()].reduce((n,s)=>n+s.birthCredit,0)-1)<1e-12);
  for(const s of e.schools.values()){
    assert.equal(s.target.x,s.center.x);assert.equal(s.independentUntil,43);
    for(const fish of s.members)assert.equal(fish.userData.schoolId,s.id);
  }
  e.updateRecoverySchools(60);assert.equal(e.schools.size,2,'no reunion through a wall');
  const child=[...e.schools.values()].find(s=>s!==e.original);
  for(const fish of child.members)fish.position.x=-2;
  e.updateRecoverySchools(64);assert.equal(e.schools.size,1);assert.equal(e.original.members.length,12);
});
test('night never releases a school; grown recovery groups retain the 16 to 8+8 split',()=>{
  const e=environment(16);e.original.detachRequested=true;e.setHour(21);
  e.updateRecoverySchools(30);assert.equal(e.schools.size,1);
  e.setHour(12);e.updateRecoverySchools(31);assert.equal(e.schools.size,2);
  for(const s of e.schools.values())assert.equal(s.members.length,8);
  const child=[...e.schools.values()].find(s=>s!==e.original);
  for(let i=0;i<8;i++)child.members.push({parent:{},position:new THREE.Vector3(2,-10,0),userData:{schoolId:child.id}});
  e.splitImportedSchools(40);
  assert.deepEqual([...e.schools.values()].map(s=>s.members.length),[8,8,8]);
  assert.equal(new Set([...e.schools.values()].flatMap(s=>s.members)).size,24);
});
