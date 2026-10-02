import { sculptKey,sculptWorldFromIndex,normalizeVolumeSculpt } from './VolumeSculpt.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Number.isFinite(Number(v))?Number(v):0;
const NEIGHBORS=[];
for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
  if(dx||dy||dz)NEIGHBORS.push([dx,dy,dz]);
}
const FACE_DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

export function splitSculptFormations(data,{densityThreshold=.18,minCells=2}={}){
  const sculpt=normalizeVolumeSculpt(data);
  const occupied=new Map(sculpt.cells.filter(c=>c.density>=densityThreshold).map(c=>[sculptKey(c.ix,c.iy,c.iz),c]));
  const remaining=new Set(occupied.keys()),formations=[];
  while(remaining.size){
    const first=remaining.values().next().value,queue=[first],cells=[];remaining.delete(first);
    while(queue.length){
      const key=queue.pop(),cell=occupied.get(key);if(!cell)continue;
      cells.push(cell);
      for(const [dx,dy,dz] of NEIGHBORS){
        const next=sculptKey(cell.ix+dx,cell.iy+dy,cell.iz+dz);
        if(remaining.delete(next))queue.push(next);
      }
    }
    if(cells.length<minCells)continue;
    cells.sort((a,b)=>a.ix-b.ix||a.iy-b.iy||a.iz-b.iz);
    let sx=0,sy=0,sz=0,weight=0;
    for(const c of cells){
      const w=Math.max(.05,c.density);sx+=c.ix*w;sy+=c.iy*w;sz+=c.iz*w;weight+=w;
    }
    const anchor=cells[0];
    formations.push({
      id:`sculpt-${anchor.ix}_${anchor.iy}_${anchor.iz}`,
      cells,cellSize:sculpt.cellSize,
      center:{
        x:sculptWorldFromIndex(sx/weight,sculpt.cellSize),
        y:sculptWorldFromIndex(sy/weight,sculpt.cellSize),
        z:sculptWorldFromIndex(sz/weight,sculpt.cellSize)
      },
      volume:cells.reduce((sum,c)=>sum+c.density*Math.pow(sculpt.cellSize,3),0)
    });
  }
  formations.sort((a,b)=>b.volume-a.volume||a.id.localeCompare(b.id));
  return formations;
}

export function surfaceCellsForFormation(formation,{densityThreshold=.18}={}){
  const occupied=new Set(
    formation.cells.filter(c=>c.density>=densityThreshold).map(c=>sculptKey(c.ix,c.iy,c.iz))
  );
  return formation.cells.filter(c=>{
    if(c.density<densityThreshold)return false;
    return FACE_DIRS.some(([dx,dy,dz])=>!occupied.has(sculptKey(c.ix+dx,c.iy+dy,c.iz+dz)));
  }).map(c=>({
    ...c,
    x:sculptWorldFromIndex(c.ix,formation.cellSize),
    y:sculptWorldFromIndex(c.iy,formation.cellSize),
    z:sculptWorldFromIndex(c.iz,formation.cellSize)
  }));
}

// Keep the descriptor intentionally tiny: the sculpt is the shape, the skin is the look.
export function normalizeRockFormationDescriptor(value={}){
  return {
    formationId:String(value.formationId||'').slice(0,100),
    skin:String(value.skin||'grey_reef').slice(0,60),
    locked:value.locked===true,
    transform:{
      position:Array.isArray(value.transform?.position)&&value.transform.position.length===3?value.transform.position.map(finite):[0,0,0],
      rotation:Array.isArray(value.transform?.rotation)&&value.transform.rotation.length===3?value.transform.rotation.map(finite):[0,0,0],
      scale:Array.isArray(value.transform?.scale)&&value.transform.scale.length===3?value.transform.scale.map(v=>clamp(finite(v)||1,.25,4)):[1,1,1]
    }
  };
}

// Backward-compatible stubs so older imported plans do not crash. Geometry variation is intentionally gone.
export const ROCK_FORMATION_STYLES=Object.freeze({
  sculpt:{name:'Sculpt Shape'}
});
export const ROCK_FORMATION_STYLE_IDS=Object.freeze(['sculpt']);


const SURFACE_FACES=[
  {d:[1,0,0], corners:[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]},
  {d:[-1,0,0], corners:[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]},
  {d:[0,1,0], corners:[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]},
  {d:[0,-1,0], corners:[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]},
  {d:[0,0,1], corners:[[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,1]]},
  {d:[0,0,-1], corners:[[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]}
];

function buildAdjacency(vertexCount,indices){
  const adjacency=Array.from({length:vertexCount},()=>new Set());
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i],b=indices[i+1],c=indices[i+2];
    adjacency[a].add(b);adjacency[a].add(c);
    adjacency[b].add(a);adjacency[b].add(c);
    adjacency[c].add(a);adjacency[c].add(b);
  }
  return adjacency;
}

function smoothPositions(positions,indices,cellSize,{
  iterations=5,lambda=.33,mu=-.34,inflate=.018,maxMove=cellSize*.20
}={}){
  if(!iterations||!positions.length)return positions;
  const adjacency=buildAdjacency(positions.length/3,indices);

  const laplacianStep=(source,factor)=>{
    const next=source.slice();
    for(let i=0;i<adjacency.length;i++){
      const neighbors=adjacency[i];
      if(neighbors.size<3)continue;
      const p=i*3,ox=source[p],oy=source[p+1],oz=source[p+2];
      let ax=0,ay=0,az=0;
      for(const n of neighbors){
        const q=n*3;
        ax+=source[q];ay+=source[q+1];az+=source[q+2];
      }
      const inv=1/neighbors.size;
      ax*=inv;ay*=inv;az*=inv;
      let dx=(ax-ox)*factor,dy=(ay-oy)*factor,dz=(az-oz)*factor;
      const len=Math.hypot(dx,dy,dz);
      if(len>maxMove){
        const k=maxMove/len;dx*=k;dy*=k;dz*=k;
      }
      next[p]=ox+dx;next[p+1]=oy+dy;next[p+2]=oz+dz;
    }
    return next;
  };

  let current=positions.slice();
  for(let pass=0;pass<iterations;pass++){
    current=laplacianStep(current,lambda);
    current=laplacianStep(current,mu);
  }

  if(inflate){
    let cx=0,cy=0,cz=0;
    const count=current.length/3;
    for(let i=0;i<current.length;i+=3){
      cx+=current[i];cy+=current[i+1];cz+=current[i+2];
    }
    cx/=count;cy/=count;cz/=count;
    const factor=1+inflate;
    for(let i=0;i<current.length;i+=3){
      current[i]=cx+(current[i]-cx)*factor;
      current[i+1]=cy+(current[i+1]-cy)*factor;
      current[i+2]=cz+(current[i+2]-cz)*factor;
    }
  }
  return current;
}

export function buildContinuousRockSurface(formation,{densityThreshold=.18,smooth=true}={}){
  const occupied=new Set(
    formation.cells.filter(c=>c.density>=densityThreshold).map(c=>sculptKey(c.ix,c.iy,c.iz))
  );
  const positions=[],indices=[],vertexMap=new Map();
  const half=formation.cellSize*.5;
  const getVertex=(gx,gy,gz)=>{
    const key=`${gx},${gy},${gz}`;
    let index=vertexMap.get(key);
    if(index!=null)return index;
    index=positions.length/3;
    positions.push(
      gx*half-formation.center.x,
      gy*half-formation.center.y,
      gz*half-formation.center.z
    );
    vertexMap.set(key,index);
    return index;
  };

  let exposedFaces=0;
  for(const c of formation.cells){
    if(c.density<densityThreshold)continue;
    for(const face of SURFACE_FACES){
      const [dx,dy,dz]=face.d;
      if(occupied.has(sculptKey(c.ix+dx,c.iy+dy,c.iz+dz)))continue;
      const ids=face.corners.map(([sx,sy,sz])=>getVertex(c.ix*2+sx,c.iy*2+sy,c.iz*2+sz));
      indices.push(ids[0],ids[1],ids[2], ids[0],ids[2],ids[3]);
      exposedFaces++;
    }
  }

  const finalPositions=smooth
    ? smoothPositions(positions,indices,formation.cellSize,{
        iterations:5,
        lambda:.33,
        mu:-.34,
        inflate:.018,
        maxMove:formation.cellSize*.20
      })
    : positions;

  return {
    formationId:formation.id,
    center:{...formation.center},
    positions:finalPositions,
    indices,
    stats:{
      cells:formation.cells.length,
      exposedFaces,
      vertices:finalPositions.length/3,
      triangles:indices.length/3
    }
  };
}
