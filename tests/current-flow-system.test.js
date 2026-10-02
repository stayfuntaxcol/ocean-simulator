import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRENT_CATEGORIES,classifyCurrent,createCurrentFlowSystem,normalizeCurrentFlow} from '../worlds/CurrentFlowSystem.js';

test('five current categories define scale and impact from drift to main current',()=>{
  assert.equal(Object.keys(CURRENT_CATEGORIES).length,5);
  assert.ok(CURRENT_CATEGORIES[1].strength<CURRENT_CATEGORIES[5].strength);
  assert.ok(CURRENT_CATEGORIES[1].width<CURRENT_CATEGORIES[5].width);
  assert.equal(classifyCurrent({width:60,strength:1.45}).id,5);
});

test('a current is converted to a lightweight sector field',()=>{
  const system=createCurrentFlowSystem({sectorSize:12,worldHalf:144,seaLevelY:20});
  system.add({category:3,centerX:0,centerZ:0,heading:0,length:120,bend:0,depth:34,width:28,strength:.62,height:16});
  const stats=system.stats();
  assert.equal(stats.flows,1);
  assert.ok(stats.sectors>10);
  const sample={};
  system.sampleInto(0,-14,0,0,sample);
  assert.ok(sample.strength>.2);
  assert.ok(sample.x>0);
  assert.ok(Math.abs(sample.z)<.2);
});

test('vertical falloff keeps objects outside the current tunnel unaffected',()=>{
  const system=createCurrentFlowSystem({sectorSize:12,worldHalf:144,seaLevelY:20});
  system.add({category:3,centerX:0,centerZ:0,heading:0,length:120,bend:0,depth:34,width:28,strength:.62,height:12});
  const inside={},outside={};
  system.sampleInto(0,-14,0,0,inside);
  system.sampleInto(0,12,0,0,outside);
  assert.ok(inside.strength>0);
  assert.equal(outside.strength,0);
});

test('rock-filled sectors accelerate flow without adding geometry',()=>{
  const system=createCurrentFlowSystem({sectorSize:12,worldHalf:144,seaLevelY:20});
  system.add({category:3,centerX:0,centerZ:0,heading:0,length:120,bend:0,depth:34,width:28,strength:.6,height:16,rockAcceleration:.8});
  const before={};system.sampleInto(0,-14,0,0,before);
  system.setRockFactors(new Map([['0,0',1]]));
  const after={};system.sampleInto(0,-14,0,0,after);
  assert.ok(after.strength>before.strength);
  assert.ok(after.rockBoost>1.5);
  assert.equal(system.stats().rockBoostedSectors,1);
});

test('multiple currents combine inside the same sector',()=>{
  const system=createCurrentFlowSystem({sectorSize:12,worldHalf:144,seaLevelY:20});
  system.add({id:'east',category:2,centerX:0,centerZ:0,heading:0,length:100,bend:0,depth:34,width:24,height:16,strength:.4});
  system.add({id:'north',category:2,centerX:0,centerZ:0,heading:90,length:100,bend:0,depth:34,width:24,height:16,strength:.4});
  const sample={};system.sampleInto(0,-14,0,0,sample);
  assert.ok(sample.x>.1);
  assert.ok(sample.z>.1);
  assert.equal(sample.flowIds.length,2);
});

test('serialization stores parameters, not generated route or sector data',()=>{
  const flow=normalizeCurrentFlow({id:'a',category:4,bend:30,depth:38});
  assert.ok(flow.points.length>=5);
  const system=createCurrentFlowSystem();
  system.add(flow);
  const saved=system.serialize()[0];
  assert.equal(saved.id,'a');
  assert.equal(saved.category,4);
  assert.equal('points' in saved,false);
});
