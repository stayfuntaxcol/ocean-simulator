import test from 'node:test';
import assert from 'node:assert/strict';
import {SculptChunkManager} from '../worlds/SculptChunkManager.js';
import {buildSculptSurfaceNets,sculptRenderChunks,sculptChunkBoundarySides} from '../worlds/SculptSurfaceNets.js';
import {simplifySculptSurface} from '../worlds/SculptMeshLOD.js';

function field({tunnel=false,density=1}={}){
  const m=new SculptChunkManager();
  for(let x=-9;x<=10;x++)for(let y=-5;y<=5;y++)for(let z=-9;z<=10;z++){
    if(tunnel&&Math.abs(x)<=1&&Math.abs(y)<=1)continue;m.setCell(x,y,z,density);
  }return m;
}
function surfaces(m){return [...sculptRenderChunks(m).values()].map(c=>({c,s:buildSculptSurfaceNets(m,c,{shapeLevel:5})}));}
function topology(meshes){
  const edges=new Map();let triangles=0;
  for(const {s} of meshes)for(let i=0;i<s.indices.length;i+=3){
    triangles++;for(let n=0;n<3;n++){
      const a=s.positions.slice(s.indices[i+n]*3,s.indices[i+n]*3+3).join(','),b=s.positions.slice(s.indices[i+(n+1)%3]*3,s.indices[i+(n+1)%3]*3+3).join(',');
      const key=[a,b].sort().join('|');edges.set(key,(edges.get(key)||0)+1);
    }
  }return {triangles,edges};
}

test('Surface Nets assigns boundary faces once and produces watertight chunk seams with equal normals',()=>{
  const meshes=surfaces(field()),positions=new Map(),t=topology(meshes);
  assert.ok(t.triangles>0);assert.ok([...t.edges.values()].every(n=>n===2),'every joined edge has exactly two faces');
  for(const {s} of meshes)for(let i=0;i<s.positions.length;i+=3){
    const key=s.positions.slice(i,i+3).join(','),normal=s.normals.slice(i,i+3);
    if(positions.has(key))assert.deepEqual(normal,positions.get(key));else positions.set(key,normal);
    assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-8);
  }
});

test('real density changes the interpolated surface without subdivision or triangle growth',()=>{
  const a=surfaces(field()),b=surfaces(field({density:.45}));
  assert.equal(topology(a).triangles,topology(b).triangles);
  assert.notDeepEqual(a.map(x=>x.s.positions),b.map(x=>x.s.positions));
  assert.ok(a.every(x=>x.s.stats.triangles<=12000));
});

test('tunnel is retained across chunk boundaries and faces point outward into the opening',()=>{
  const meshes=surfaces(field({tunnel:true})),t=topology(meshes);
  assert.ok([...t.edges.values()].every(n=>n===2));
  let walls=0;
  for(const {s} of meshes)for(let i=0;i<s.positions.length;i+=3){
    const [x,y,z]=s.positions.slice(i,i+3);
    if(Math.abs(x)<5&&Math.abs(y)<5&&Math.abs(z)<20){walls++;assert.ok(x*s.normals[i]+y*s.normals[i+1]<0);}
  }
  assert.ok(walls>0);
});

test('cached LOD edge collapse reduces triangles and retains watertight mixed-resolution boundaries',()=>{
  const m=field({tunnel:true}),meshes=surfaces(m),chunks=sculptRenderChunks(m);let reduced=0;
  const lods=meshes.map(({c,s},i)=>{
    if(i%2===0)return {c,s};
    const min=c.min.map(v=>v*m.cellSize),max=min.map(v=>v+m.chunkCells*m.cellSize);
    const lod=simplifySculptSurface(s,{min,max,cellSize:m.cellSize,ratio:.3,boundarySides:sculptChunkBoundarySides(chunks,c)});
    reduced+=s.stats.triangles-lod.stats.triangles;return {c,s:lod};
  });
  assert.ok(reduced>0);assert.ok([...topology(lods).edges.values()].every(n=>n===2),'LOD boundary edges stay closed');
});


test('mixed LOD seams also stay closed with a nonzero formation center',()=>{
  const manager=field({tunnel:true}),chunks=sculptRenderChunks(manager),center={x:28.5,y:-12,z:7.5};
  const meshes=[...chunks.values()].map((c,index)=>{
    let s=buildSculptSurfaceNets(manager,c,{center,shapeLevel:5});
    if(index%2){
      const origin=[center.x,center.y,center.z],min=c.min.map((v,i)=>v*3-origin[i]),max=min.map(v=>v+24);
      s=simplifySculptSurface(s,{min,max,cellSize:3,ratio:.3,gridOrigin:origin,boundarySides:sculptChunkBoundarySides(chunks,c)});
    }return {c,s};
  });
  assert.ok([...topology(meshes).edges.values()].every(n=>n===2));
});
