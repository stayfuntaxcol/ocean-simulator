import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceImportedVitality,buildFoodSectors,createImportedVitality,foodAtPosition,
  healthMotionFactor,residenceDuration,sectorInfluences,summarizeFoodSectors,updateFoodSectors
} from '../graphics/FishVitality.js';

const richLayers=[];
for(const type of ['coral','seagrass','sponge','rocks','mixed'])for(let i=0;i<8;i++)richLayers.push({x:2+(i%3),z:2+Math.floor(i/3),type});

test('unoccupied food recovers faster without increasing sustainable capacity',()=>{
  const sectors=buildFoodSectors(richLayers),sector=[...sectors.values()][0];sector.stock=0;
  for(let i=0;i<32;i++)updateFoodSectors(sectors,[],5);
  assert.ok(Math.abs(sector.stock-sector.maxFood)<1e-6);
  sector.stock=sector.maxFood;updateFoodSectors(sectors,[{x:4,z:4,biomass:sector.capacity*2}],5);
  assert.ok(Math.abs(sector.stock-(sector.maxFood-sector.capacity*5))<1e-6);
  let vitality={...createImportedVitality(),foodReserve:0};
  for(let i=0;i<240;i++)vitality=advanceImportedVitality(vitality,.25,{foodSupply:1});
  assert.ok(Math.abs(vitality.foodReserve-51)<1e-6);
});

test('food sectors derive local capacity only from existing world layers',()=>{
  const sectors=buildFoodSectors(richLayers);
  const summary=summarizeFoodSectors(sectors);
  assert.equal(summary.active,1);assert.ok(summary.capacity>5&&summary.capacity<20);assert.equal(summary.stockRatio,1);
  assert.equal(buildFoodSectors([]).size,0);
});

test('soft sector borders distribute demand across neighboring habitat',()=>{
  const layers=[...richLayers,...richLayers.map(layer=>({...layer,x:38}))];
  const sectors=buildFoodSectors(layers);
  const influences=sectorInfluences(35.8,4,sectors);
  assert.equal(influences.length,2);
  assert.ok(influences.every(item=>item.weight>0));
  assert.ok(Math.abs(influences.reduce((sum,item)=>sum+item.weight,0)-1)<1e-9);
});

test('temporary crowding consumes sector stock before food supply falls',()=>{
  const sectors=buildFoodSectors(richLayers),summary=summarizeFoodSectors(sectors);
  const consumers=[{x:4,z:4,biomass:summary.capacity*2}];
  updateFoodSectors(sectors,consumers,5);
  assert.equal(foodAtPosition(4,4,sectors).supply,1);
  for(let i=0;i<60;i++)updateFoodSectors(sectors,consumers,5);
  const food=foodAtPosition(4,4,sectors);
  assert.ok(food.stockRatio<.01);assert.ok(food.supply<.55);
});

test('an imported fish uses a multi-minute reserve before starvation affects health',()=>{
  let vitality=createImportedVitality({reserveSeconds:180});
  for(let seconds=0;seconds<120;seconds+=.25)vitality=advanceImportedVitality(vitality,.25,{foodSupply:0});
  assert.equal(vitality.health,100);assert.equal(vitality.state,'strained');
  for(let seconds=120;seconds<260;seconds+=.25)vitality=advanceImportedVitality(vitality,.25,{foodSupply:0});
  assert.ok(vitality.health<100);assert.equal(vitality.foodReserve,0);
});

test('critical fish slow at twenty percent and stop at five percent',()=>{
  assert.equal(healthMotionFactor(100),1);
  assert.ok(healthMotionFactor(20)<.65);
  assert.ok(healthMotionFactor(10)<healthMotionFactor(20));
  assert.equal(healthMotionFactor(5),0);
  const sinking=advanceImportedVitality({...createImportedVitality(),health:5},.25,{foodSupply:1});
  assert.equal(sinking.state,'sinking');
});

test('partial feeding supports maintenance and gradual reserve recovery',()=>{
  const simulate=supply=>{
    let fish={...createImportedVitality(),foodReserve:120};
    for(let t=0;t<60;t+=.25)fish=advanceImportedVitality(fish,.25,{foodSupply:supply});
    return fish;
  };
  assert.ok(Math.abs(simulate(.9).foodReserve-145.5)<1e-6);
  assert.equal(simulate(.8).foodReserve,120);
  assert.ok(Math.abs(simulate(.6).foodReserve-112.5)<1e-6);
  assert.equal(simulate(0).foodReserve,60);
  const recovering=advanceImportedVitality({...createImportedVitality(),health:60,foodReserve:0,starvationSeconds:60},.25,{foodSupply:.8});
  assert.equal(recovering.health,60,'maintenance stops starvation damage');
});

test('a careful temperament conserves reserve without bypassing starvation',()=>{
  const simulate=metabolism=>{
    let fish=createImportedVitality({reserveSeconds:180});
    for(let t=0;t<90;t+=.25)fish=advanceImportedVitality(fish,.25,{foodSupply:0,metabolism});
    return fish;
  };
  const careful=simulate(.82),restless=simulate(1.18);
  assert.ok(careful.foodReserve>restless.foodReserve);
  assert.equal(careful.health,100);assert.equal(restless.health,100);
});

test('every fish profile receives a finite migration interval of a few minutes',()=>{
  for(const species of ['reef_0','reef_1','reef_2','reef_3','reef_4','reef_5','reef_6','reef_7','custom-import']){
    const early=residenceDuration(species,0),late=residenceDuration(species,1);
    assert.ok(early>=90);assert.ok(late<=330);assert.ok(late>early);
  }
});


test('sleeping imported fish neither eat nor consume reserve',()=>{
  const start={...createImportedVitality({reserveSeconds:180}),foodReserve:73,starvationSeconds:12};
  const next=advanceImportedVitality(start,30,{foodSupply:0,metabolism:1.18,resting:true});
  assert.equal(next.foodReserve,73);
  assert.ok(next.starvationSeconds<12);
  assert.equal(next.health,100);
});
