import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEA_LEVEL_Y,DEPTH_LAYER_HEIGHT,MIN_DEPTH_LAYER,WORLD_MIN_Y,
  depthFromWorldY,worldYFromDepth,depthLayerForY,depthLayerRange
} from '../worlds/DepthLayers.js';
import {terrainFeatureCells,canyonWorldY,dropoffWorldY} from '../worlds/TerrainFeatures.js';

test('depth layers stack identical vertical modules below logical sea level',()=>{
  assert.equal(SEA_LEVEL_Y,20);
  assert.equal(DEPTH_LAYER_HEIGHT,288);
  assert.equal(depthFromWorldY(SEA_LEVEL_Y),0);
  assert.equal(worldYFromDepth(80),-60);
  assert.equal(depthLayerForY(19),0);
  assert.equal(depthLayerForY(SEA_LEVEL_Y-DEPTH_LAYER_HEIGHT),-1);
  const lower=depthLayerRange(-1);
  assert.equal(lower.topDepth,288);
  assert.equal(lower.bottomDepth,576);
  assert.equal(WORLD_MIN_Y,SEA_LEVEL_Y-DEPTH_LAYER_HEIGHT*2);
  assert.equal(MIN_DEPTH_LAYER,-1);
});

test('canyon brush is deepest on its axis and blends to unchanged terrain at the edge',()=>{
  const center=canyonWorldY(-18,{targetY:-80,lateral:1});
  const edge=canyonWorldY(-18,{targetY:-80,lateral:0});
  const half=canyonWorldY(-18,{targetY:-80,lateral:.5});
  assert.equal(center,-80);
  assert.equal(edge,-18);
  assert.ok(half<-18&&half>-80);
});

test('drop-off drag keeps the start shelf and lowers the far side',()=>{
  assert.equal(dropoffWorldY(-18,{targetY:-100,t:0,lateral:1}),-18);
  assert.ok(dropoffWorldY(-18,{targetY:-100,t:.55,lateral:1})<-18);
  assert.equal(dropoffWorldY(-18,{targetY:-100,t:1,lateral:1}),-100);
});

test('terrain feature cells form a bounded corridor around the drag direction',()=>{
  const cells=terrainFeatureCells({x:0,z:0},{x:60,z:0},{cellSize:12,width:36,contains:()=>true});
  assert.ok(cells.length>5);
  assert.ok(cells.every(c=>c.distance<=18));
  assert.ok(cells.some(c=>c.t>.8));
});
