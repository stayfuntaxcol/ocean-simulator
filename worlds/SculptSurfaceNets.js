import {sculptKey} from './VolumeSculpt.js';
import {SCULPT_DENSITY_THRESHOLD} from './SculptChunkManager.js';

const CORNERS=Array.from({length:8},(_,n)=>[n&1,(n>>1)&1,(n>>2)&1]);
const EDGES=[];for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++)if(!(i&(1<<axis)))EDGES.push([i,i|(1<<axis)]);
const QUADS=[[[0,-1,-1],[0,0,-1],[0,0,0],[0,-1,0]],
  [[-1,0,-1],[-1,0,0],[0,0,0],[0,0,-1]],
  [[-1,-1,0],[0,-1,0],[0,0,0],[-1,0,0]]];

export function sculptRenderChunks(manager,threshold=SCULPT_DENSITY_THRESHOLD){
  const chunks=new Map();
  // Negative-side edges can belong to an otherwise empty neighbor chunk.
  // Ownership is by edge base, exactly once, independent of load order.
  for(const [key,density] of manager.cells){
    if(density<threshold)continue;
    const xyz=key.split(',').map(Number);
    for(let axis=0;axis<3;axis++)for(const direction of [-1,1]){
      const neighbor=xyz.slice();neighbor[axis]+=direction;
      if((manager.cells.get(sculptKey(...neighbor))||0)>=threshold)continue;
      const p=direction<0?neighbor:xyz;
      const owner=manager.keyFor(...p);if(chunks.has(owner))continue;
      const index=owner.split(',').map(Number);chunks.set(owner,manager.chunks.get(owner)||{key:owner,index,min:index.map(n=>n*manager.chunkCells),cells:new Set()});
    }
  }return chunks;
}

export function buildSculptSurfaceNets(manager,chunk,{center={x:0,y:0,z:0},shapeLevel=3,threshold=SCULPT_DENSITY_THRESHOLD}={}){
  const positions=[],normals=[],indices=[],vertexKeys=[],vertices=new Map(),s=manager.cellSize;
  const span=manager.chunkCells+4,low=chunk.min.map(v=>v-2),samples=new Float64Array(span**3);
  for(let x=0;x<span;x++)for(let y=0;y<span;y++)for(let z=0;z<span;z++)
    samples[(x*span+y)*span+z]=manager.cells.get(sculptKey(low[0]+x,low[1]+y,low[2]+z))||0;
  const density=(x,y,z)=>samples[((x-low[0])*span+y-low[1])*span+z-low[2]]||0;
  const sample=(x,y,z)=>{
    const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),tx=x-ix,ty=y-iy,tz=z-iz;
    let result=0;
    for(const [dx,dy,dz] of CORNERS)result+=density(ix+dx,iy+dy,iz+dz)*(dx?tx:1-tx)*(dy?ty:1-ty)*(dz?tz:1-tz);
    return result;
  };
  const vertex=(x,y,z)=>{
    const key=sculptKey(x,y,z);if(vertices.has(key))return vertices.get(key);
    const values=CORNERS.map(([dx,dy,dz])=>density(x+dx,y+dy,z+dz));
    let px=0,py=0,pz=0,count=0;
    for(const [a,b] of EDGES){
      if((values[a]>=threshold)===(values[b]>=threshold))continue;
      const t=Math.max(.0001,Math.min(.9999,(threshold-values[a])/(values[b]-values[a]))),ca=CORNERS[a],cb=CORNERS[b];
      px+=ca[0]+(cb[0]-ca[0])*t;py+=ca[1]+(cb[1]-ca[1])*t;pz+=ca[2]+(cb[2]-ca[2])*t;count++;
    }
    if(!count)return null;
    px/=count;py/=count;pz/=count;
    const roundness=.4+.15*Math.max(0,Math.min(4,shapeLevel-1));
    px=x+.5+(px-.5)*roundness;py=y+.5+(py-.5)*roundness;pz=z+.5+(pz-.5)*roundness;
    const h=.5,nx=sample(px-h,py,pz)-sample(px+h,py,pz),ny=sample(px,py-h,pz)-sample(px,py+h,pz),nz=sample(px,py,pz-h)-sample(px,py,pz+h);
    const length=Math.hypot(nx,ny,nz)||1,index=positions.length/3;
    positions.push(px*s-center.x,py*s-center.y,pz*s-center.z);normals.push(nx/length,ny/length,nz/length);
    vertexKeys.push(key);vertices.set(key,index);return index;
  };
  const n=manager.chunkCells,[mx,my,mz]=chunk.min;
  for(let x=mx;x<mx+n;x++)for(let y=my;y<my+n;y++)for(let z=mz;z<mz+n;z++)for(let axis=0;axis<3;axis++){
    const p=[x,y,z],q=p.slice();q[axis]++;
    const inside=density(...p)>=threshold;if(inside===(density(...q)>=threshold))continue;
    const quad=QUADS[axis].map(([dx,dy,dz])=>vertex(x+dx,y+dy,z+dz));
    if(quad.some(v=>v==null))throw Error('Sculpt halo mist een oppervlaktevertex.');
    if(!inside)quad.reverse();
    indices.push(quad[0],quad[1],quad[2],quad[0],quad[2],quad[3]);
  }
  return {positions,normals,indices,vertexKeys,stats:{vertices:positions.length/3,triangles:indices.length/3}};
}

// Only shared borders need protection. An exterior surface coinciding with a
// chunk plane can still be simplified if no neighboring render chunk uses it.
export function sculptChunkBoundarySides(chunks,chunk){
  const sides=[[false,false],[false,false],[false,false]];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
    if(!dx&&!dy&&!dz)continue;
    const delta=[dx,dy,dz];if(!chunks.has(sculptKey(...chunk.index.map((v,i)=>v+delta[i]))))continue;
    for(let axis=0;axis<3;axis++)if(delta[axis])sides[axis][delta[axis]>0?1:0]=true;
  }return sides;
}
