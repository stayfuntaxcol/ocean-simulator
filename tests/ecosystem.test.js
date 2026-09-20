import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HABITAT_VALUES,evaluateEcosystem,naturalPopulationPlan,importedHealthStep,ecosystemAdvice} from '../graphics/Ecosystem.js';

test('an empty ocean has zero capacity and no automatic fish',()=>{
  const state=evaluateEcosystem();
  assert.equal(state.capacity,0);assert.equal(state.score,0);assert.equal(state.stageId,0);
  assert.equal(state.naturalTarget,0);assert.deepEqual(naturalPopulationPlan(state),[]);
  assert.match(ecosystemAdvice(state),/lege oceaan/i);
});

test('every building type contributes distinct resources while rocks alone provide no food web',()=>{
  for(const [type,value] of Object.entries(HABITAT_VALUES)){
    assert.ok(value.shelter>0,`${type} needs shelter value`);
    assert.ok(value.biodiversity>0,`${type} needs biodiversity value`);
  }
  const rocks=evaluateEcosystem({habitats:{rocks:40}});
  assert.equal(rocks.capacity,0);assert.equal(rocks.stageId,0);
  const grass=evaluateEcosystem({habitats:{seagrass:10}});
  const mixed=evaluateEcosystem({habitats:{coral:10,seagrass:10,sponge:10,rocks:10,mixed:10}});
  assert.ok(grass.capacity>0);assert.ok(mixed.capacity>grass.capacity);assert.ok(mixed.quality>0);
});

test('species are introduced in five habitat phases',()=>{
  const phases=[
    [{coral:10},2,[7,5]],
    [{coral:10,seagrass:8,rocks:4},3,[7,5,1,6]],
    [{coral:15,seagrass:10,sponge:5,rocks:8},4,[7,5,1,6,0,2]],
    [{coral:15,seagrass:15,sponge:10,rocks:10,mixed:10},5,[7,5,1,6,0,2,3,4]]
  ];
  for(const [habitats,stage,species] of phases){
    const state=evaluateEcosystem({habitats}),plan=naturalPopulationPlan(state);
    assert.equal(state.stageId,stage);
    assert.deepEqual([...new Set(plan.map(group=>group.species))],species);
    assert.equal(plan.reduce((sum,group)=>sum+group.count,0),state.naturalTarget);
  }
});

test('imported fish do not reduce the habitat-driven natural population target',()=>{
  const habitats={coral:15,seagrass:15,sponge:10,rocks:10,mixed:10};
  const baseline=evaluateEcosystem({habitats});
  const healthy=evaluateEcosystem({habitats,importedFish:150});
  assert.equal(healthy.capacity,186);assert.equal(healthy.naturalTarget,baseline.naturalTarget);
  const overloaded=evaluateEcosystem({habitats:{coral:10},importedFish:150});
  assert.ok(overloaded.shortage>.9);assert.ok(overloaded.naturalTarget>0);
});

test('lava reduces capacity and only shortage or hazards lower imported health',()=>{
  const habitats={coral:15,seagrass:15,sponge:10,rocks:10,mixed:10};
  assert.ok(evaluateEcosystem({habitats,lavaVents:6}).capacity<evaluateEcosystem({habitats}).capacity);
  assert.equal(importedHealthStep(100,1,{shortage:0,hazard:0}),100);
  assert.ok(importedHealthStep(80,1,{shortage:1,hazard:0})<80);
  assert.ok(importedHealthStep(80,1,{shortage:0,hazard:1})<importedHealthStep(80,1,{shortage:1,hazard:0}));
});

test('the app starts normal worlds empty, computes locally and limits health to imported fish',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/const FISH_COUNT = referenceMode \? REFERENCE\.fishCount : 0/);
  assert.match(html,/if\(!fish\.userData\.imported\)continue/);
  assert.match(html,/evaluateEcosystem\(\{[\s\S]*habitats:ecosystemHabitatCounts\(\)/);
  assert.match(html,/advanceImportedVitality/);
  assert.match(html,/updateFoodSectors/);
  const worldData=html.slice(html.indexOf('function worldData()'),html.indexOf('function restoreWorld'));
  assert.doesNotMatch(worldData,/ecosystem|capacity|naturalTarget/);
});
