import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCULPT_FORMAT,SCULPT_CELL_SIZE,applyVolumeBrush,normalizeVolumeSculpt,
  sculptDataFromMap,sculptKey
} from '../worlds/VolumeSculpt.js';

test('volume sculpt stores sparse bounded density cells',()=>{
  const cells=new Map();
  const changed=applyVolumeBrush(cells,{x:0,y:-12,z:0},{mode:'add',radius:6,strength:.7,accept:()=>true});
  assert.ok(changed>0);
  assert.ok(cells.size>1);
  assert.ok([...cells.values()].every(v=>v>0&&v<=1));
  const data=sculptDataFromMap(cells,SCULPT_CELL_SIZE);
  assert.equal(data.format,SCULPT_FORMAT);
  assert.equal(data.cells.length,cells.size);
});

test('remove and smooth edit the same density field instead of creating objects',()=>{
  const cells=new Map([[sculptKey(0,-4,0),1],[sculptKey(1,-4,0),.2]]);
  applyVolumeBrush(cells,{x:0,y:-12,z:0},{mode:'smooth',radius:4,strength:.8,accept:()=>true});
  assert.ok((cells.get(sculptKey(0,-4,0))??0)<1);
  const before=[...cells.values()].reduce((a,b)=>a+b,0);
  applyVolumeBrush(cells,{x:0,y:-12,z:0},{mode:'remove',radius:5,strength:1,accept:()=>true});
  const after=[...cells.values()].reduce((a,b)=>a+b,0);
  assert.ok(after<before);
});

test('volume sculpt validation clamps density and rejects oversized or outside data',()=>{
  const ok=normalizeVolumeSculpt({format:SCULPT_FORMAT,cellSize:3,cells:[
    {ix:0,iy:-4,iz:0,density:2},{ix:1,iy:-4,iz:0,density:.5}
  ]});
  assert.equal(ok.cells[0].density,1);
  assert.throws(()=>normalizeVolumeSculpt({format:'wrong',cells:[]}),/formaat/);
  assert.throws(()=>normalizeVolumeSculpt({format:SCULPT_FORMAT,cellSize:3,cells:[{ix:999,iy:0,iz:0,density:1}]}),/buiten de wereld/);
  assert.throws(()=>normalizeVolumeSculpt({format:SCULPT_FORMAT,cellSize:3,cells:Array(12001).fill({ix:0,iy:0,iz:0,density:1})}),/meer dan/);
});


test('a small carve brush can refine volume created by a much larger build brush',()=>{
  const cells=new Map();
  applyVolumeBrush(cells,{x:0,y:-6,z:0},{mode:'add',radius:15,strength:1,accept:()=>true});
  const beforeCount=cells.size;
  const beforeDensity=[...cells.values()].reduce((sum,value)=>sum+value,0);
  assert.ok(beforeCount>20);
  applyVolumeBrush(cells,{x:0,y:-6,z:0},{mode:'remove',radius:3,strength:1,accept:()=>true});
  const afterDensity=[...cells.values()].reduce((sum,value)=>sum+value,0);
  assert.ok(afterDensity<beforeDensity);
  assert.ok(cells.size<=beforeCount);
  assert.ok((cells.get(sculptKey(0,-2,0))??0)<1);
});
