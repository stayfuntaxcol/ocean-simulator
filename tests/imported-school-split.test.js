import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function splitImportedSchools(t){');
const end=html.indexOf('\nfunction updateSchoolBrains(t){',start);
assert.ok(start>0&&end>start,'test the actual school split routine');
const source=html.slice(start,end)+'\nsplitImportedSchools';

function environment(size){
  const schools=new Map();let next=0;
  function makeSchool(speciesId,options={}){
    const school={id:`school_${++next}`,speciesId,members:[],center:new THREE.Vector3(),birthCredit:0,
      currentFoodSector:'sector-1',recentFoodSectors:[],feedingSector:'sector-1',...options};
    schools.set(school.id,school);return school;
  }
  const original=makeSchool('reef-import',{cohesion:.67,alignment:.58,separation:.82,habitatPull:.57,exploration:.2,cruiseSpeed:1.35});
  original.importTemplate={name:'Shared template'};original.sourceName='Eigen vis';original.libraryId='library-1';original.birthCredit=.6;
  for(let i=0;i<size;i++){
    const fish={parent:{},position:new THREE.Vector3(i%4,0,Math.floor(i/4)),userData:{schoolId:original.id,health:100}};
    original.members.push(fish);
  }
  const targets=[];
  const chooseSchoolTarget=(school,t)=>{
    school.feedingSector=school.avoidSector==='sector-2'?'sector-3':'sector-2';
    school.retargetAt=t+30;school.forceMigration=false;targets.push([school.id,school.feedingSector]);
  };
  const split=vm.runInNewContext(source,{schools,makeSchool,THREE,localFoodAt:()=>({capacity:8,demand:16,stockRatio:.2}),
    chooseSchoolTarget,residenceDuration:()=>150,oceanRandom:()=>.5});
  return {split,schools,original,targets};
}

test('a school reaching 16 fish becomes two independent groups of eight',()=>{
  const {split,schools,original,targets}=environment(16);
  split(300);
  assert.equal(schools.size,2);
  const sibling=[...schools.values()].find(s=>s!==original);
  assert.deepEqual([original.members.length,sibling.members.length],[8,8]);
  assert.notEqual(original.feedingSector,sibling.feedingSector,'each half seeks its own feeding sector');
  assert.equal(sibling.importTemplate,original.importTemplate);assert.equal(sibling.libraryId,'library-1');
  assert.equal(sibling.sourceName,'Eigen vis');
  assert.ok(Math.abs(original.birthCredit+sibling.birthCredit-.6)<1e-12);
  for(const school of schools.values())for(const fish of school.members)assert.equal(fish.userData.schoolId,school.id);
  assert.equal(new Set([...schools.values()].flatMap(s=>s.members)).size,16);
  assert.equal(targets.length,2);
  split(301);assert.equal(schools.size,2,'eight fish cannot split again');
});

test('previously imported oversized schools divide progressively without losing fish',()=>{
  const {split,schools}=environment(32);
  split(300);split(301);
  assert.deepEqual([...schools.values()].map(s=>s.members.length).sort((a,b)=>a-b),[8,8,8,8]);
  assert.equal(new Set([...schools.values()].flatMap(s=>s.members)).size,32);
});
