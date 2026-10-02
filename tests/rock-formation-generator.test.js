import test from 'node:test';
import assert from 'node:assert/strict';
import {SCULPT_FORMAT,SCULPT_CELL_SIZE} from '../worlds/VolumeSculpt.js';
import {analyzeSculptSurface,protectedNegativeSpace,generateRockFormation} from '../worlds/RockFormationGenerator.js';

function block({minX=-2,maxX=2,minY=-2,maxY=2,minZ=-2,maxZ=2,remove=()=>false}={}){
  const cells=[];
  for(let ix=minX;ix<=maxX;ix++)for(let iy=minY;iy<=maxY;iy++)for(let iz=minZ;iz<=maxZ;iz++){
    if(remove(ix,iy,iz))continue;
    cells.push({ix,iy,iz,density:1});
  }
  return {format:SCULPT_FORMAT,cellSize:SCULPT_CELL_SIZE,cells};
}

test('rock generator samples sculpt surface instead of filling the solid interior',()=>{
  const sculpt=block();
  const analysis=analyzeSculptSurface(sculpt);
  assert.ok(analysis.surface.length>0);
  assert.ok(analysis.surface.length<sculpt.cells.length);
  const result=generateRockFormation(sculpt,{maxRocks:120,seed:5});
  assert.ok(result.placements.length>0);
  assert.ok(result.placements.length<sculpt.cells.length);
  assert.equal(result.stats.surfaceCells,analysis.surface.length);
  for(const p of result.placements){
    const c=p.source;
    const exposed=[
      [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]
    ].some(([dx,dy,dz])=>!analysis.map.has(`${c.ix+dx},${c.iy+dy},${c.iz+dz}`));
    assert.equal(exposed,true);
  }
});

test('through-tunnel cells are detected as protected negative space and rocks stay clear',()=>{
  const sculpt=block({
    minX:-3,maxX:3,minY:-3,maxY:3,minZ:-5,maxZ:5,
    remove:(ix,iy,iz)=>Math.abs(ix)<=1&&Math.abs(iy)<=1
  });
  const negative=protectedNegativeSpace(sculpt);
  assert.ok(negative.voids.length>0);
  assert.ok(negative.voids.some(v=>v.ix===0&&v.iy===0&&v.iz===0));
  const result=generateRockFormation(sculpt,{maxRocks:220,seed:17});
  assert.ok(result.placements.length>0);
  for(const rock of result.placements){
    for(const v of negative.voids){
      const distance=Math.hypot(rock.x-v.x,rock.y-v.y,rock.z-v.z);
      assert.ok(distance>=rock.radius*1.25+SCULPT_CELL_SIZE*.58-1e-6,
        `rock ${rock.kind} intrudes into protected tunnel at ${v.ix},${v.iy},${v.iz}`);
    }
  }
});

test('large rocks are generated before medium and small fill rocks',()=>{
  const result=generateRockFormation(block({minX:-4,maxX:4,minY:-3,maxY:3,minZ:-4,maxZ:4}),{maxRocks:160,seed:23});
  assert.ok(result.stats.large>0);
  const order={large:0,medium:1,small:2};
  let last=-1;
  for(const rock of result.placements){
    assert.ok(order[rock.kind]>=last);
    last=order[rock.kind];
  }
});

test('reserved locked rocks create no-overlap zones during regeneration',()=>{
  const sculpt=block({minX:-4,maxX:4,minY:-3,maxY:3,minZ:-4,maxZ:4});
  const reserved=[{x:0,y:0,z:0,radius:9}];
  const result=generateRockFormation(sculpt,{maxRocks:180,seed:31,reserved});
  for(const rock of result.placements){
    const d=Math.hypot(rock.x,rock.y,rock.z);
    assert.ok(d>=rock.radius+reserved[0].radius*.82-1e-6);
  }
});

test('rock generation is deterministic for the same sculpt and seed',()=>{
  const sculpt=block({minX:-3,maxX:3,minY:-2,maxY:2,minZ:-3,maxZ:3});
  const a=generateRockFormation(sculpt,{maxRocks:80,seed:99});
  const b=generateRockFormation(sculpt,{maxRocks:80,seed:99});
  assert.deepEqual(a,b);
});
