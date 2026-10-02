import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWorldBlueprint} from '../worlds/WorldBlueprint.js';

test('AI blueprint keeps supported precise objects and clamps safe transforms',()=>{
  const plan=normalizeWorldBlueprint({format:'ocean-world-blueprint-v1',name:'Rif',objects:[
    {type:'coral',x:4,z:-7,scale:9,rotation:1.2},{type:'shell',x:0,z:0,scale:.01}
  ],terrain:[{ix:2,iz:-1,offset:20}]});
  assert.equal(plan.objects[0].scale,5);assert.equal(plan.objects[1].scale,.2);
  assert.deepEqual(plan.terrain,[{ix:2,iz:-1,offset:16}]);
});

test('AI blueprint rejects unsupported, oversized and out-of-world input',()=>{
  assert.throws(()=>normalizeWorldBlueprint({objects:[]}),/ocean-world-blueprint-v1/);
  assert.throws(()=>normalizeWorldBlueprint({format:'ocean-world-blueprint-v1',objects:[{type:'fish',x:0,z:0}]}),/onbekend type/);
  assert.throws(()=>normalizeWorldBlueprint({format:'ocean-world-blueprint-v1',objects:[{type:'coral',x:145,z:0}]}),/buiten de wereld/);
  assert.throws(()=>normalizeWorldBlueprint({format:'ocean-world-blueprint-v1',objects:Array(1201).fill({type:'coral',x:0,z:0})}),/meer dan/);
});


test('AI blueprint can provide the same editable volume sculpt used by the builder',()=>{
  const plan=normalizeWorldBlueprint({
    format:'ocean-world-blueprint-v1',name:'Sculpt rif',objects:[],terrain:[],
    sculpt:{format:'ocean-volume-sculpt-v1',cellSize:3,cells:[
      {ix:1,iy:-4,iz:2,density:.8},{ix:2,iy:-4,iz:2,density:.5}
    ]}
  });
  assert.equal(plan.sculpt.cells.length,2);
  assert.equal(plan.sculpt.cells[0].density,.8);
});




test('AI blueprint can assign rock skins to sculpt formations',()=>{
  const plan=normalizeWorldBlueprint({
    format:'ocean-world-blueprint-v1',objects:[],terrain:[],
    sculpt:{format:'ocean-volume-sculpt-v1',cellSize:3,cells:[{ix:0,iy:-4,iz:0,density:1},{ix:1,iy:-4,iz:0,density:1}]},
    rockFormations:[
      {formationIndex:0,skin:'tropical_limestone',locked:true},
      {formationIndex:1,skin:'dark_lava'}
    ]
  });
  assert.equal(plan.rockFormations.length,2);
  assert.equal(plan.rockFormations[0].skin,'tropical_limestone');
  assert.equal(plan.rockFormations[0].locked,true);
  assert.equal('style' in plan.rockFormations[0],false);
});

test('AI blueprint rejects an unknown rock skin',()=>{
  assert.throws(()=>normalizeWorldBlueprint({
    format:'ocean-world-blueprint-v1',objects:[],terrain:[],
    rockFormations:[{formationIndex:0,skin:'plastic'}]
  }),/skin/);
});
