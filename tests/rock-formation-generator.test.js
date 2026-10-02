import test from 'node:test';
import assert from 'node:assert/strict';
import {SCULPT_FORMAT,SCULPT_CELL_SIZE} from '../worlds/VolumeSculpt.js';
import {splitSculptFormations,generateVolumeRockFill,generateAllVolumeRockFills} from '../worlds/RockFormationGenerator.js';

function sculptFromCells(cells){
  return {format:SCULPT_FORMAT,cellSize:SCULPT_CELL_SIZE,cells:cells.map(([ix,iy,iz,density=1])=>({ix,iy,iz,density}))};
}
function solid(minX,maxX,minY,maxY,minZ,maxZ){
  const cells=[];
  for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(let z=minZ;z<=maxZ;z++)cells.push([x,y,z,1]);
  return cells;
}

test('disconnected sculpt masses become independent formations',()=>{
  const data=sculptFromCells([
    ...solid(-6,-3,-2,1,-2,2),
    ...solid(3,6,-1,2,-1,2),
    ...solid(10,11,0,1,8,9)
  ]);
  const formations=splitSculptFormations(data);
  assert.equal(formations.length,3);
  assert.ok(formations.every(f=>f.cells.length>1));
  assert.ok(new Set(formations.map(f=>f.id)).size===3);
});

test('diagonally touching sculpt cells stay one hand-sculpted formation',()=>{
  const data=sculptFromCells([[0,0,0],[1,1,0],[2,2,1],[3,2,2]]);
  assert.equal(splitSculptFormations(data).length,1);
});

test('a real water gap keeps two formations separate',()=>{
  const data=sculptFromCells([...solid(-3,-1,0,2,0,2),...solid(2,4,0,2,0,2)]);
  assert.equal(splitSculptFormations(data).length,2);
});

test('volume fill uses overlapping clusters that mostly remain inside the sculpt',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-5,5,-3,3,-4,4)))[0];
  const result=generateVolumeRockFill(formation,{seed:7,maxClusters:70,targetCoverage:.86,minInside:.72});
  assert.ok(result.placements.length>0);
  assert.ok(result.placements.length<formation.cells.length/2);
  assert.ok(result.placements.every(p=>p.insideRatio>=.67));
  assert.ok(result.stats.estimatedCoverage>=.70);
  assert.ok(result.stats.estimatedCoverage<=1);
  let overlaps=0;
  for(let i=0;i<result.placements.length;i++)for(let j=i+1;j<result.placements.length;j++){
    const a=result.placements[i],b=result.placements[j];
    const d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
    if(d<a.radius+b.radius)overlaps++;
  }
  assert.ok(overlaps>0);
});

test('large clusters are attempted before medium and small fill clusters',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-6,6,-4,4,-5,5)))[0];
  const result=generateVolumeRockFill(formation,{seed:19,maxClusters:70});
  const order={large:0,medium:1,small:2};
  let last=-1;
  for(const p of result.placements){assert.ok(order[p.kind]>=last);last=order[p.kind];}
  assert.ok(result.stats.large>0);
});

test('all-volume generation preserves formation identity',()=>{
  const data=sculptFromCells([...solid(-7,-3,-2,2,-2,2),...solid(3,7,-2,2,-2,2)]);
  const all=generateAllVolumeRockFills(data,{seed:29,maxClusters:40});
  assert.equal(all.formations.length,2);
  assert.equal(all.results.length,2);
  assert.deepEqual(all.results.map(r=>r.formationId),all.formations.map(f=>f.id));
  assert.ok(all.results.every(r=>r.placements.length>0));
});

test('reserved locked clusters remain clear during regeneration',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-6,6,-4,4,-5,5)))[0];
  const reserved=[{x:0,y:0,z:0,radius:10}];
  const result=generateVolumeRockFill(formation,{seed:41,maxClusters:70,reserved});
  for(const p of result.placements){
    const d=Math.hypot(p.x,p.y,p.z);
    assert.ok(d>=p.radius*.55+7-1e-6);
  }
});

test('volume generation is deterministic',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-4,4,-3,3,-4,4)))[0];
  assert.deepEqual(
    generateVolumeRockFill(formation,{seed:99,maxClusters:50}),
    generateVolumeRockFill(formation,{seed:99,maxClusters:50})
  );
});
