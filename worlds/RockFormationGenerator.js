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
    shapeLevel:clamp(Math.round(Number(value.shapeLevel)||3),1,5),
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

function greedyRectangles(cells){
  const remaining=new Set(cells.map(({u,v})=>u+','+v));
  const sorted=[...cells].sort((a,b)=>a.v-b.v||a.u-b.u);
  const rectangles=[];
  for(const start of sorted){
    const startKey=start.u+','+start.v;
    if(!remaining.has(startKey))continue;
    let width=1;
    while(remaining.has((start.u+width)+','+start.v))width++;
    let height=1,grow=true;
    while(grow){
      const v=start.v+height;
      for(let u=start.u;u<start.u+width;u++){
        if(!remaining.has(u+','+v)){grow=false;break;}
      }
      if(grow)height++;
    }
    for(let v=start.v;v<start.v+height;v++){
      for(let u=start.u;u<start.u+width;u++)remaining.delete(u+','+v);
    }
    rectangles.push({u:start.u,v:start.v,width,height});
  }
  return rectangles;
}

export function buildGreedyRockSurface(formation,{densityThreshold=.18}={}){
  const occupied=new Set(
    formation.cells.filter(c=>c.density>=densityThreshold).map(c=>sculptKey(c.ix,c.iy,c.iz))
  );
  const groups=new Map();
  const addFace=(faceIndex,plane2,u,v)=>{
    const key=faceIndex+':'+plane2;
    if(!groups.has(key))groups.set(key,{faceIndex,plane2,cells:[]});
    groups.get(key).cells.push({u,v});
  };

  for(const c of formation.cells){
    if(c.density<densityThreshold)continue;
    if(!occupied.has(sculptKey(c.ix+1,c.iy,c.iz)))addFace(0,c.ix*2+1,c.iy,c.iz);
    if(!occupied.has(sculptKey(c.ix-1,c.iy,c.iz)))addFace(1,c.ix*2-1,c.iy,c.iz);
    if(!occupied.has(sculptKey(c.ix,c.iy+1,c.iz)))addFace(2,c.iy*2+1,c.ix,c.iz);
    if(!occupied.has(sculptKey(c.ix,c.iy-1,c.iz)))addFace(3,c.iy*2-1,c.ix,c.iz);
    if(!occupied.has(sculptKey(c.ix,c.iy,c.iz+1)))addFace(4,c.iz*2+1,c.ix,c.iy);
    if(!occupied.has(sculptKey(c.ix,c.iy,c.iz-1)))addFace(5,c.iz*2-1,c.ix,c.iy);
  }

  const positions=[],indices=[];
  const pushQuad=verts=>{
    const base=positions.length/3;
    for(const p of verts){
      positions.push(p[0]-formation.center.x,p[1]-formation.center.y,p[2]-formation.center.z);
    }
    indices.push(base,base+1,base+2,base,base+2,base+3);
  };
  const cs=formation.cellSize;
  for(const group of groups.values()){
    for(const rect of greedyRectangles(group.cells)){
      const u0=(rect.u-.5)*cs,u1=(rect.u+rect.width-.5)*cs;
      const v0=(rect.v-.5)*cs,v1=(rect.v+rect.height-.5)*cs;
      const plane=group.plane2*cs*.5;
      if(group.faceIndex===0)pushQuad([[plane,u0,v0],[plane,u1,v0],[plane,u1,v1],[plane,u0,v1]]);
      else if(group.faceIndex===1)pushQuad([[plane,u0,v1],[plane,u1,v1],[plane,u1,v0],[plane,u0,v0]]);
      else if(group.faceIndex===2)pushQuad([[u0,plane,v0],[u0,plane,v1],[u1,plane,v1],[u1,plane,v0]]);
      else if(group.faceIndex===3)pushQuad([[u0,plane,v1],[u0,plane,v0],[u1,plane,v0],[u1,plane,v1]]);
      else if(group.faceIndex===4)pushQuad([[u1,v0,plane],[u1,v1,plane],[u0,v1,plane],[u0,v0,plane]]);
      else pushQuad([[u0,v0,plane],[u0,v1,plane],[u1,v1,plane],[u1,v0,plane]]);
    }
  }
  return {
    formationId:formation.id,
    center:{...formation.center},
    positions,indices,
    stats:{
      cells:formation.cells.length,
      quads:indices.length/6,
      vertices:positions.length/3,
      triangles:indices.length/3
    }
  };
}

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

function subdivideSurface(positions,indices,levels=1){
  let currentPositions=positions.slice(),currentIndices=indices.slice();
  for(let level=0;level<levels;level++){
    const edgeMidpoints=new Map(),nextIndices=[];
    const midpoint=(a,b)=>{
      const lo=Math.min(a,b),hi=Math.max(a,b),key=lo+','+hi;
      const existing=edgeMidpoints.get(key);
      if(existing!=null)return existing;
      const ai=a*3,bi=b*3,index=currentPositions.length/3;
      currentPositions.push(
        (currentPositions[ai]+currentPositions[bi])*.5,
        (currentPositions[ai+1]+currentPositions[bi+1])*.5,
        (currentPositions[ai+2]+currentPositions[bi+2])*.5
      );
      edgeMidpoints.set(key,index);
      return index;
    };
    for(let i=0;i<currentIndices.length;i+=3){
      const a=currentIndices[i],b=currentIndices[i+1],c=currentIndices[i+2];
      const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
      nextIndices.push(
        a,ab,ca,
        ab,b,bc,
        ca,bc,c,
        ab,bc,ca
      );
    }
    currentIndices=nextIndices;
  }
  return {positions:currentPositions,indices:currentIndices};
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

export function buildContinuousRockSurface(formation,{densityThreshold=.18,smooth=true,shapeLevel=3}={}){
  shapeLevel=clamp(Math.round(Number(shapeLevel)||3),1,5);
  if(shapeLevel===1)return buildGreedyRockSurface(formation,{densityThreshold});
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

  const useSubdivision=smooth&&shapeLevel>=4;
  const subdivided=useSubdivision?subdivideSurface(positions,indices,1):{positions,indices};
  const smoothing=shapeLevel===2
    ? {iterations:2,lambda:.24,mu:-.25,inflate:.006,maxMove:formation.cellSize*.08}
    : shapeLevel===3
      ? {iterations:5,lambda:.30,mu:-.31,inflate:.012,maxMove:formation.cellSize*.11}
      : shapeLevel===4
        ? {iterations:4,lambda:.31,mu:-.32,inflate:.014,maxMove:formation.cellSize*.11}
        : {iterations:7,lambda:.34,mu:-.35,inflate:.018,maxMove:formation.cellSize*.13};
  const finalPositions=smooth
    ? smoothPositions(subdivided.positions,subdivided.indices,formation.cellSize,smoothing)
    : subdivided.positions;

  return {
    formationId:formation.id,
    center:{...formation.center},
    positions:finalPositions,
    indices:subdivided.indices,
    stats:{
      cells:formation.cells.length,
      exposedFaces,
      vertices:finalPositions.length/3,
      triangles:subdivided.indices.length/3,
      subdivision:useSubdivision?1:0,
      shapeLevel
    }
  };
}
