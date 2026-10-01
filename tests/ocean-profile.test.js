import test from 'node:test';
import assert from 'node:assert/strict';
import {OCEAN_PRESETS,normalizeOceanProfile,individualOceanTraits,oceanBehavior,formatOceanTraits,ecologicalAge} from '../graphics/OceanProfile.js';

test('standard OCEAN profiles are named, described and bounded',()=>{
  assert.equal(OCEAN_PRESETS.length,5);
  for(const preset of OCEAN_PRESETS){
    const profile=normalizeOceanProfile(preset);
    assert.ok(profile.name&&profile.description);
    assert.deepEqual(Object.keys(profile.traits),['O','C','E','A','N']);
    assert.ok(Object.values(profile.traits).every(value=>value>=0&&value<=100));
  }
});

test('custom profile is sanitized and individual fish stay close to the batch',()=>{
  const profile=normalizeOceanProfile({name:'  Mijn temperament  ',traits:{O:120,C:-5,E:70,A:55,N:40}});
  assert.equal(profile.name,'Mijn temperament');assert.deepEqual(profile.traits,{O:100,C:0,E:70,A:55,N:40});
  const values=[0,.25,.5,.75,1];let index=0;
  const individual=individualOceanTraits(profile,()=>values[index++],6);
  for(const key of Object.keys(individual))assert.ok(Math.abs(individual[key]-profile.traits[key])<=6);
  assert.match(formatOceanTraits(individual),/^O \d+ · C \d+ · E \d+ · A \d+ · N \d+$/);
});

test('careful fish seek food earlier and use reserve more efficiently than explorers',()=>{
  const careful=oceanBehavior({presetId:'forager'}),explorer=oceanBehavior({presetId:'explorer'});
  assert.ok(careful.foodSeekThreshold>explorer.foodSeekThreshold);
  assert.ok(careful.metabolism<explorer.metabolism);
  assert.ok(explorer.exploration>careful.exploration);
  assert.equal(ecologicalAge(620).cycles,2);assert.match(ecologicalAge(620).label,/2 cycli/);
  assert.equal(ecologicalAge(24*300).days,1);assert.match(ecologicalAge(24*300).label,/1 ecologische dag/);
});
