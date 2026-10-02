import test from 'node:test';
import assert from 'node:assert/strict';
import {SCULPT_FORMAT,SCULPT_CELL_SIZE} from '../worlds/VolumeSculpt.js';
import {
  splitSculptFormations,buildFormationBaseMesh,generateRockMeshVariant,
  ROCK_FORMATION_STYLE_IDS,normalizeRockFormationDescriptor
} from '../worlds/RockFormationGenerator.js';

function sculptFromCells(cells){
  return {format:SCULPT_FORMAT,cellSize:SCULPT_CELL_SIZE,cells:cells.map(([ix,iy,iz,density=1])=>({ix,iy,iz,density}))};
}
function solid(minX,maxX,minY,maxY,minZ,maxZ){
  const cells=[];
  for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(let z=minZ;z<=maxZ;z++)cells.push([x,y,z,1]);
  return cells;
}

test('disconnected sculpt masses become independent stable formations',()=>{
  const data=sculptFromCells([
    ...solid(-6,-3,-2,1,-2,2),
    ...solid(3,6,-1,2,-1,2),
    ...solid(10,11,0,1,8,9)
  ]);
  const formations=splitSculptFormations(data);
  assert.equal(formations.length,3);
  assert.ok(formations.every(f=>f.cells.length>1));
  assert.ok(new Set(formations.map(f=>f.id)).size===3);
  assert.ok(formations.every(f=>/^sculpt--?\d+_-?\d+_-?\d+$/.test(f.id)));
});

test('diagonally touching sculpt cells stay together while real gaps stay separate',()=>{
  assert.equal(splitSculptFormations(sculptFromCells([[0,0,0],[1,1,0],[2,2,1],[3,2,2]])).length,1);
  assert.equal(splitSculptFormations(sculptFromCells([...solid(-3,-1,0,2,0,2),...solid(2,4,0,2,0,2)])).length,2);
});

test('a formation becomes one indexed mesh rather than many rock objects',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-3,3,-2,2,-3,3)))[0];
  const mesh=buildFormationBaseMesh(formation);
  assert.equal(mesh.formationId,formation.id);
  assert.ok(mesh.positions.length>0);
  assert.ok(mesh.indices.length>0);
  assert.equal(mesh.positions.length%3,0);
  assert.equal(mesh.indices.length%3,0);
  assert.ok(mesh.positions.every(Number.isFinite));
  assert.ok(mesh.indices.every(Number.isSafeInteger));
  assert.ok(Math.max(...mesh.indices)<mesh.positions.length/3);
  assert.ok(mesh.stats.triangles>50);
});

test('same seed is deterministic and another seed produces a genuinely different rock variant',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-4,4,-3,3,-4,4)))[0];
  const a=generateRockMeshVariant(formation,{style:'rounded_reef',seed:123,deviation:.07});
  const b=generateRockMeshVariant(formation,{style:'rounded_reef',seed:123,deviation:.07});
  const c=generateRockMeshVariant(formation,{style:'rounded_reef',seed:456,deviation:.07});
  assert.deepEqual(a.positions,b.positions);
  assert.deepEqual(a.indices,b.indices);
  assert.notDeepEqual(a.positions,c.positions);
});

test('all rock styles preserve topology while visibly changing the sculpt surface',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-4,4,-3,3,-4,4)))[0];
  const variants=ROCK_FORMATION_STYLE_IDS.map(style=>generateRockMeshVariant(formation,{style,seed:77,deviation:.08}));
  const triangleCount=variants[0].indices.length;
  assert.ok(variants.every(v=>v.indices.length===triangleCount));
  assert.ok(new Set(variants.map(v=>v.positions.slice(0,90).map(n=>n.toFixed(3)).join(','))).size>=4);
});

test('artistic deformation is bounded by the requested 5-10 percent range',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-5,5,-4,4,-5,5)))[0];
  for(const deviation of [.05,.07,.10]){
    const variant=generateRockMeshVariant(formation,{style:'lava_rock',seed:91,deviation});
    assert.equal(variant.deviation,deviation);
    assert.ok(variant.stats.maxDeviation<=formation.cellSize*12*deviation+1e-9);
    assert.ok(variant.stats.maxDeviation>0);
  }
});

test('rock formation descriptors clamp unsafe AI or saved values',()=>{
  const value=normalizeRockFormationDescriptor({
    formationId:'reef-1',style:'does-not-exist',skin:'grey_reef',seed:12.8,deviation:.8,
    transform:{position:[1,2,3],rotation:[.1,.2,.3],scale:[10,.1,2]}
  });
  assert.equal(value.style,'rounded_reef');
  assert.equal(value.seed,12);
  assert.equal(value.deviation,.10);
  assert.deepEqual(value.transform.scale,[4,.25,2]);
});
