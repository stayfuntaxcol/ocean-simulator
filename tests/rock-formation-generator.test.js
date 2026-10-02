import test from 'node:test';
import assert from 'node:assert/strict';
import {SCULPT_FORMAT,SCULPT_CELL_SIZE} from '../worlds/VolumeSculpt.js';
import {splitSculptFormations,surfaceCellsForFormation,buildContinuousRockSurface,normalizeRockFormationDescriptor} from '../worlds/RockFormationGenerator.js';

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


test('continuous surface shares vertices across neighboring sculpt cells',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-2,2,-2,2,-2,2)))[0];
  const surface=buildContinuousRockSurface(formation,{smooth:false});
  assert.ok(surface.positions.length>0);
  assert.ok(surface.indices.length>0);
  assert.ok(surface.stats.vertices<surface.stats.exposedFaces*4);
  assert.equal(surface.stats.triangles,surface.stats.exposedFaces*2);
});

test('carved tunnel creates inner rock walls without filling the opening',()=>{
  const cells=[];
  for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)for(let z=-4;z<=4;z++){
    if(Math.abs(x)<=1&&Math.abs(y)<=1)continue; // tunnel along Z
    cells.push([x,y,z,1]);
  }
  const formation=splitSculptFormations(sculptFromCells(cells))[0];
  const surface=buildContinuousRockSurface(formation,{smooth:false});
  assert.ok(surface.stats.exposedFaces>0);
  // A tunnel adds internal wall faces, so it must expose more than only the outside box.
  const outsideOnly=2*((7*7)+(7*9)+(7*9));
  assert.ok(surface.stats.exposedFaces>outsideOnly);
  assert.ok(surface.indices.every(Number.isSafeInteger));
});

test('rounded surface subdivides each face once before smoothing',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(-3,3,-3,3,-3,3)))[0];
  const raw=buildContinuousRockSurface(formation,{smooth:false});
  const rounded=buildContinuousRockSurface(formation,{smooth:true});
  assert.equal(rounded.stats.exposedFaces,raw.stats.exposedFaces);
  assert.equal(rounded.stats.triangles,raw.stats.triangles*4);
  assert.ok(rounded.stats.vertices>raw.stats.vertices);
  assert.equal(rounded.stats.subdivision,1);
  assert.notDeepEqual(rounded.positions.slice(0,Math.min(raw.positions.length,rounded.positions.length)),raw.positions);
});

test('rounding keeps a carved tunnel exposed instead of filling it',()=>{
  const cells=[];
  for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)for(let z=-4;z<=4;z++){
    if(Math.abs(x)<=1&&Math.abs(y)<=1)continue;
    cells.push([x,y,z,1]);
  }
  const formation=splitSculptFormations(sculptFromCells(cells))[0];
  const raw=buildContinuousRockSurface(formation,{smooth:false});
  const rounded=buildContinuousRockSurface(formation,{smooth:true});
  assert.equal(rounded.stats.exposedFaces,raw.stats.exposedFaces);
  assert.equal(rounded.stats.triangles,raw.stats.triangles*4);
  assert.ok(rounded.indices.every(Number.isSafeInteger));
});

test('large rounded rock stays within a bounded one-level subdivision budget',()=>{
  const formation=splitSculptFormations(sculptFromCells(solid(0,14,-14,0,0,14)))[0];
  const raw=buildContinuousRockSurface(formation,{smooth:false});
  const rounded=buildContinuousRockSurface(formation,{smooth:true});
  assert.equal(raw.stats.triangles,2700);
  assert.equal(rounded.stats.triangles,10800);
  assert.ok(rounded.stats.vertices<8000);
});
