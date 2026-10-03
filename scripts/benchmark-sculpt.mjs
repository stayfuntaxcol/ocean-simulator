import {performance} from 'node:perf_hooks';
import {SculptChunkManager} from '../worlds/SculptChunkManager.js';
import {buildSculptSurfaceNets,sculptRenderChunks,sculptChunkBoundarySides} from '../worlds/SculptSurfaceNets.js';
import {buildContinuousRockSurface} from '../worlds/RockFormationGenerator.js';
import {simplifySculptSurface} from '../worlds/SculptMeshLOD.js';
const cells=[];for(let ix=0;ix<30;ix++)for(let iy=-20;iy<0;iy++)for(let iz=0;iz<20;iz++)cells.push({ix,iy,iz,density:1});
const formation={id:'benchmark',cellSize:3,center:{x:43.5,y:-31.5,z:28.5},cells};
const manager=new SculptChunkManager();manager.load(cells);const chunks=sculptRenderChunks(manager);
const surfacePreview=[...manager.chunks.values()].reduce((sum,c)=>sum+manager.surfaceCells(c).length,0);
const samples=[];let newTriangles=0,oldTriangles=0,maxChunk=0,lod1=0,lod2=0;
for(let repeat=0;repeat<5;repeat++){
  let start=performance.now();const old=buildContinuousRockSurface(formation,{shapeLevel:5});const oldMs=performance.now()-start;oldTriangles=old.stats.triangles;
  start=performance.now();newTriangles=0;const surfaces=[...chunks.values()].map(c=>{const s=buildSculptSurfaceNets(manager,c,{shapeLevel:5});newTriangles+=s.stats.triangles;maxChunk=Math.max(maxChunk,s.stats.triangles);return {c,s};});
  const newMs=performance.now()-start;samples.push({oldMs,newMs});
  if(repeat===4)for(const {c,s} of surfaces){const min=c.min.map(v=>v*3),max=min.map(v=>v+24);lod1+=simplifySculptSurface(s,{min,max,cellSize:3,ratio:.75,boundarySides:sculptChunkBoundarySides(chunks,c)}).stats.triangles;lod2+=simplifySculptSurface(s,{min,max,cellSize:3,ratio:.3,boundarySides:sculptChunkBoundarySides(chunks,c)}).stats.triangles;}
}
const median=key=>samples.map(s=>s[key]).sort((a,b)=>a-b)[2];
console.log(JSON.stringify({cells:cells.length,oldPreviewTriangles:cells.length*80,newPreviewTriangles:surfacePreview*20,
  oldShape5Triangles:oldTriangles,newLOD0Triangles:newTriangles,newLOD1Triangles:lod1,newLOD2Triangles:lod2,maxChunkTriangles:maxChunk,
  renderChunks:chunks.size,oldMeshBuildMedianMs:+median('oldMs').toFixed(1),newMeshBuildMedianMs:+median('newMs').toFixed(1)},null,2));
