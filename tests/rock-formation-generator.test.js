import test from 'node:test';
import assert from 'node:assert/strict';
import {SCULPT_FORMAT,SCULPT_CELL_SIZE} from '../worlds/VolumeSculpt.js';
import {splitSculptFormations,surfaceCellsForFormation,normalizeRockFormationDescriptor} from '../worlds/RockFormationGenerator.js';

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
  assert.ok(new Set(formations.map(f=>f.id)).size===3);
});

test('diagonal contact joins a sculpture but a real water gap separates it',()=>{
  assert.equal(splitSculptFormations(sculptFromCells([[0,0,0],[1,1,0],[2,2,1]])).length,1);
  assert.equal(splitSculptFormations(sculptFromCells([...solid(-3,-1,0,2,0,2),...solid(2,4,0,2,0,2)])).length,2);
});

test('only exposed sculpt cells are rendered as the rock skin surface',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-2,2,-2,2,-2,2)))[0];
  const surface=surfaceCellsForFormation(formation);
  assert.equal(formation.cells.length,125);
  assert.equal(surface.length,98);
  assert.ok(surface.length<formation.cells.length);
  assert.ok(surface.every(c=>[c.x,c.y,c.z].every(Number.isFinite)));
});

test('large solid sculpt remains surface-bounded instead of rendering its full volume',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(0,14,-14,0,0,14)))[0];
  const surface=surfaceCellsForFormation(formation);
  assert.equal(formation.cells.length,3375);
  assert.equal(surface.length,1178);
  assert.ok(surface.length<formation.cells.length/2);
});

test('formation descriptor only preserves skin lock and transform',()=>{
  const value=normalizeRockFormationDescriptor({
    formationId:'reef-1',skin:'grey_reef',locked:true,
    style:'lava_rock',seed:99,deviation:.10,
    transform:{position:[1,2,3],rotation:[.1,.2,.3],scale:[10,.1,2]}
  });
  assert.equal(value.formationId,'reef-1');
  assert.equal(value.skin,'grey_reef');
  assert.equal(value.locked,true);
  assert.equal('style' in value,false);
  assert.equal('seed' in value,false);
  assert.equal('deviation' in value,false);
  assert.deepEqual(value.transform.scale,[4,.25,2]);
});
