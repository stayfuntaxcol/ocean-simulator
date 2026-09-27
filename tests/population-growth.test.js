import test from 'node:test';
import assert from 'node:assert/strict';
import {growthBudget,juvenileScale,MATURITY_SECONDS} from '../graphics/PopulationGrowth.js';
import {evaluateEcosystem} from '../graphics/Ecosystem.js';
import {buildFoodSectors,summarizeFoodSectors} from '../graphics/FishVitality.js';

function simulate(options,seconds=60){let credit=0,births=0;for(let t=0;t<seconds;t+=.25){const next=growthBudget({...options,credit,dt:.25});credit=next.credit;births+=next.births;}return {births,credit};}
test('growth depends on adults, multiplier and elapsed ecological time',()=>{
  const base={enabled:true,adults:20,factor:1,room:100,foodRatio:1};
  assert.equal(simulate(base).births,2);
  assert.equal(simulate({...base,factor:2}).births,4);
  assert.equal(simulate({...base,adults:40}).births,4);
  assert.equal(simulate(base,120).births,4);
  for(const changed of [{enabled:false},{adults:1},{room:0},{foodRatio:0},{factor:0}])assert.equal(simulate({...base,...changed}).births,0);
});
test('offspring mature continuously and burst sizes remain bounded',()=>{
  assert.equal(juvenileScale(0),.35);assert.ok(juvenileScale(300)>.35);assert.equal(juvenileScale(MATURITY_SECONDS),1);assert.equal(juvenileScale(99999),1);
  const result=growthBudget({enabled:true,adults:1000,factor:10,dt:999,room:1,foodRatio:1});
  assert.equal(result.births,1);assert.ok(result.credit<1);
  assert.equal(growthBudget({enabled:true,adults:50,credit:.99,dt:.25,room:0,foodRatio:1}).credit,0);
});
test('capacity is divided by ten once; sector sums and food stay bounded together',()=>{
  const habitats={coral:15,seagrass:15,sponge:10,rocks:10,mixed:10};
  assert.equal(evaluateEcosystem({habitats}).capacity,18.6);
  assert.equal(evaluateEcosystem({habitats,capacityOverride:777.5}).capacity,777.5);
  const layers=[];for(let sector=0;sector<25;sector++)for(let i=0;i<1000;i++)layers.push({x:sector*36+18,z:18,type:'mixed'});
  const sectors=buildFoodSectors(layers),summary=summarizeFoodSectors(sectors);
  assert.ok(Math.abs(summary.capacity-1000)<1e-8);
  for(const sector of sectors.values()){assert.equal(sector.stock,sector.maxFood);assert.ok(Math.abs(sector.maxFood-sector.capacity*240)<1e-8);}
  assert.equal(evaluateEcosystem().capacity,0);
});
