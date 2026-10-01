import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldMapSnapshot,normalizeWorldMapSnapshot,habitatMapWeight,overloadLevel,overloadColor} from '../worlds/MapSnapshot.js';

test('map snapshot compacts real landscape cells and three overload levels',()=>{
  const world={terrain:[{key:'-3,2',offset:6.24},{key:'2,1',offset:-4}],cells:[
    {key:'-2,3',layers:[{type:'rocks'},{type:'seagrass'},{type:'coral'}]},
    {key:'1,-1',layers:[{type:'mixed'},{type:'sponge'}]}
  ]};
  const map=createWorldMapSnapshot(world,[
    {key:'-1,0',pressure:1.1},{key:'0,0',pressure:1.4},{key:'1,-1',pressure:2.2},{key:'2,2',pressure:1.01}
  ]);
  assert.deepEqual(map.terrain,[[-3,2,6],[2,1,-4]]);
  assert.deepEqual(map.cells,[[-2,3,6.25],[1,-1,4.5]]);
  assert.deepEqual(map.overload,[[-1,0,1],[0,0,2],[1,-1,3]]);
  assert.equal(habitatMapWeight([{type:'coral'}]),3);
  assert.equal(overloadLevel(1.02),0);assert.equal(overloadLevel(1.03),1);assert.equal(overloadLevel(1.5),2);assert.equal(overloadLevel(Infinity),3);
  assert.match(overloadColor(3),/205,37,45/);
});

test('invalid or oversized atlas map data is safely bounded',()=>{
  assert.equal(normalizeWorldMapSnapshot(null),null);
  assert.equal(normalizeWorldMapSnapshot({version:9,cells:[],overload:[]}),null);
  const value=normalizeWorldMapSnapshot({version:1,terrain:[[0,0,-4],[0,21,2]],cells:[[0,0,3],[99,0,4],[1,1,Infinity],['1',1,2]],overload:[[0,0,1],[1,1,9]]});
  assert.deepEqual(value,{version:1,terrain:[[0,0,-4]],cells:[[0,0,3]],overload:[[0,0,1]]});
  assert.deepEqual(normalizeWorldMapSnapshot({version:1,cells:Array(1001).fill([0,0,1]),overload:[]}).cells,[]);
});
