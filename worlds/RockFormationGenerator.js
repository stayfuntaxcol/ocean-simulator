import { sculptKey,sculptWorldFromIndex,normalizeVolumeSculpt } from './VolumeSculpt.js';

export const ROCK_FORMATION_STYLES=Object.freeze({
  rounded_reef:{name:'Rounded Reef Rock',smooth:2,local:0.55,radial:0.45},
  flat_plates:{name:'Flat Stone Plates',smooth:1,local:0.45,radial:0.25},
  lava_rock:{name:'Lava Rock',smooth:0,local:0.95,radial:0.45},
  blocky_boulder:{name:'Blocky Boulder',smooth:0,local:0.62,radial:0.35},
  mixed_reef:{name:'Mixed Reef Formation',smooth:1,local:0.70,radial:0.38}
});
export const ROCK_FORMATION_STYLE_IDS=Object.freeze(Object.keys(ROCK_FORMATION_STYLES));

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Number.isFinite(Number(v))?Number(v):0;
const hash=(x,y,z,seed=1)=>{
  let n=(Math.imul(Math.round(x*1000),73856093)^Math.imul(Math.round(y*1000),19349663)^Math.imul(Math.round(z*1000),83492791)^Math.imul(seed|0,2654435761))>>>0;
  n^=n>>>13;n=Math.imul(n,1274126177)>>>0;n^=n>>>16;return n>>>0;
};
const rand=(x,y,z,seed=1)=>(hash(x,y,z,seed)%1000003)/1000003;
const noise=(x,y,z,seed=1)=>{
  const a=Math.sin(x*.173+y*.117+z*.139+seed*1.137);
  const b=Math.sin(x*.071-y*.193+z*.089+seed*.731);
  const c=Math.cos(x*.251+y*.053-z*.161+seed*.413);
  return (a*.48+b*.31+c*.21);
};

const NEIGHBORS=[];
for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
  if(dx||dy||dz)NEIGHBORS.push([dx,dy,dz]);
}

export function splitSculptFormations(data,{densityThreshold=.18,minCells=2}={}){
  const sculpt=normalizeVolumeSculpt(data);
  const occupied=new Map(sculpt.cells.filter(c=>c.density>=densityThreshold).map(c=>[sculptKey(c.ix,c.iy,c.iz),c]));
  const remaining=new Set(occupied.keys()),formations=[];
  while(remaining.size){
    const first=remaining.values().next().value,queue=[first],cells=[];remaining.delete(first);
    while(queue.length){
      const key=queue.pop(),cell=occupied.get(key);if(!cell)continue;cells.push(cell);
      for(const [dx,dy,dz] of NEIGHBORS){
        const next=sculptKey(cell.ix+dx,cell.iy+dy,cell.iz+dz);
        if(remaining.delete(next))queue.push(next);
      }
    }
    if(cells.length<minCells)continue;
    cells.sort((a,b)=>a.ix-b.ix||a.iy-b.iy||a.iz-b.iz);
    let sx=0,sy=0,sz=0,weight=0;
    const min={ix:Infinity,iy:Infinity,iz:Infinity},max={ix:-Infinity,iy:-Infinity,iz:-Infinity};
    for(const c of cells){
      const w=Math.max(.05,c.density);
      sx+=c.ix*w;sy+=c.iy*w;sz+=c.iz*w;weight+=w;
      min.ix=Math.min(min.ix,c.ix);min.iy=Math.min(min.iy,c.iy);min.iz=Math.min(min.iz,c.iz);
      max.ix=Math.max(max.ix,c.ix);max.iy=Math.max(max.iy,c.iy);max.iz=Math.max(max.iz,c.iz);
    }
    const anchor=cells[0];
    formations.push({
      id:`sculpt-${anchor.ix}_${anchor.iy}_${anchor.iz}`,
      cells,cellSize:sculpt.cellSize,bounds:{min,max},
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

const CUBE=[
  [0,0,0],[1,0,0],[1,1,0],[0,1,0],
  [0,0,1],[1,0,1],[1,1,1],[0,1,1]
];
const TETS=[
  [0,5,1,6],[0,1,2,6],[0,2,3,6],
  [0,3,7,6],[0,7,4,6],[0,4,5,6]
];

function fieldMap(formation){
  return new Map(formation.cells.map(c=>[sculptKey(c.ix,c.iy,c.iz),c.density]));
}
function fieldValue(map,x,y,z){return map.get(sculptKey(x,y,z))||0;}
function edgePoint(a,b,va,vb,iso,cellSize,center){
  const denom=vb-va,t=Math.abs(denom)<1e-8?.5:clamp((iso-va)/denom,0,1);
  return [
    (a[0]+(b[0]-a[0])*t)*cellSize-center.x,
    (a[1]+(b[1]-a[1])*t)*cellSize-center.y,
    (a[2]+(b[2]-a[2])*t)*cellSize-center.z
  ];
}
function polygonizeTet(points,values,iso,cellSize,center){
  const inside=[],outside=[];
  for(let i=0;i<4;i++)(values[i]>=iso?inside:outside).push(i);
  if(!inside.length||inside.length===4)return [];
  const lerp=(i,j)=>edgePoint(points[i],points[j],values[i],values[j],iso,cellSize,center);
  if(inside.length===1){
    const a=inside[0];return [[lerp(a,outside[0]),lerp(a,outside[1]),lerp(a,outside[2])]];
  }
  if(inside.length===3){
    const o=outside[0];return [[lerp(o,inside[0]),lerp(o,inside[2]),lerp(o,inside[1])]];
  }
  const a=inside[0],b=inside[1],c=outside[0],d=outside[1];
  const ac=lerp(a,c),ad=lerp(a,d),bc=lerp(b,c),bd=lerp(b,d);
  return [[ac,bc,ad],[ad,bc,bd]];
}
function vertexKey(p){return `${Math.round(p[0]*10000)},${Math.round(p[1]*10000)},${Math.round(p[2]*10000)}`;}

export function buildFormationBaseMesh(formation,{iso=.20}={}){
  const map=fieldMap(formation),candidateCubes=new Set(),cellSize=formation.cellSize;
  for(const c of formation.cells){
    for(const ox of [-1,0])for(const oy of [-1,0])for(const oz of [-1,0]){
      candidateCubes.add(`${c.ix+ox},${c.iy+oy},${c.iz+oz}`);
    }
  }
  const positions=[],indices=[],vertexMap=new Map();
  const addVertex=p=>{
    const key=vertexKey(p);let index=vertexMap.get(key);
    if(index!=null)return index;
    index=positions.length/3;positions.push(p[0],p[1],p[2]);vertexMap.set(key,index);return index;
  };
  for(const key of candidateCubes){
    const [x,y,z]=key.split(',').map(Number);
    const pts=CUBE.map(([dx,dy,dz])=>[x+dx,y+dy,z+dz]);
    const vals=pts.map(p=>fieldValue(map,p[0],p[1],p[2]));
    const min=Math.min(...vals),max=Math.max(...vals);
    if(min>=iso||max<iso)continue;
    for(const tet of TETS){
      const tp=tet.map(i=>pts[i]),tv=tet.map(i=>vals[i]);
      for(const tri of polygonizeTet(tp,tv,iso,cellSize,formation.center)){
        const ids=tri.map(addVertex);
        if(new Set(ids).size===3)indices.push(...ids);
      }
    }
  }
  return {
    formationId:formation.id,
    center:{...formation.center},
    cellSize,
    positions,
    indices,
    stats:{cells:formation.cells.length,vertices:positions.length/3,triangles:indices.length/3}
  };
}

function adjacency(vertexCount,indices){
  const sets=Array.from({length:vertexCount},()=>new Set());
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i],b=indices[i+1],c=indices[i+2];
    sets[a].add(b);sets[a].add(c);sets[b].add(a);sets[b].add(c);sets[c].add(a);sets[c].add(b);
  }
  return sets;
}
function smoothMesh(positions,indices,iterations=1,lambda=.22){
  let current=positions.slice();const adj=adjacency(current.length/3,indices);
  for(let pass=0;pass<iterations;pass++){
    const next=current.slice();
    for(let i=0;i<adj.length;i++){
      if(!adj[i].size)continue;
      let x=0,y=0,z=0;
      for(const j of adj[i]){x+=current[j*3];y+=current[j*3+1];z+=current[j*3+2];}
      const n=adj[i].size;x/=n;y/=n;z/=n;
      next[i*3]+= (x-current[i*3])*lambda;
      next[i*3+1]+= (y-current[i*3+1])*lambda;
      next[i*3+2]+= (z-current[i*3+2])*lambda;
    }
    current=next;
  }
  return current;
}
function normalsFor(positions,indices){
  const normals=new Array(positions.length).fill(0);
  for(let i=0;i<indices.length;i+=3){
    const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3;
    const ax=positions[ia],ay=positions[ia+1],az=positions[ia+2];
    const bx=positions[ib],by=positions[ib+1],bz=positions[ib+2];
    const cx=positions[ic],cy=positions[ic+1],cz=positions[ic+2];
    const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az;
    const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
    for(const j of [ia,ib,ic]){normals[j]+=nx;normals[j+1]+=ny;normals[j+2]+=nz;}
  }
  for(let i=0;i<normals.length;i+=3){
    const len=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
    normals[i]/=len;normals[i+1]/=len;normals[i+2]/=len;
  }
  return normals;
}
function meshExtent(positions){
  let max=0;for(let i=0;i<positions.length;i+=3)max=Math.max(max,Math.hypot(positions[i],positions[i+1],positions[i+2]));return max||1;
}

export function generateRockMeshVariant(formation,{
  style='rounded_reef',seed=1,deviation=.07
}={}){
  if(!ROCK_FORMATION_STYLES[style])style='rounded_reef';
  deviation=clamp(Number(deviation)||.07,.05,.10);
  seed=(Number(seed)||1)|0;
  const preset=ROCK_FORMATION_STYLES[style],base=buildFormationBaseMesh(formation);
  let positions=smoothMesh(base.positions,base.indices,preset.smooth,.20);
  let normals=normalsFor(positions,base.indices),extent=meshExtent(positions);
  const localLimit=Math.min(extent*deviation,formation.cellSize*12*deviation);
  const plateStep=Math.max(formation.cellSize*.72,1.2);
  for(let i=0;i<positions.length;i+=3){
    let x=positions[i],y=positions[i+1],z=positions[i+2];
    const nx=normals[i],ny=normals[i+1],nz=normals[i+2];
    const low=noise(x*.22,y*.22,z*.22,seed);
    const fine=noise(x*.73,y*.67,z*.71,seed+37);
    let radial=low*preset.radial*deviation;
    x*=1+radial;y*=1+radial;z*=1+radial;
    let disp=(low*.62+fine*.38)*localLimit*preset.local;
    if(style==='flat_plates'){
      const worldY=y+formation.center.y;
      const snapped=Math.round(worldY/plateStep)*plateStep-formation.center.y;
      const plateDelta=(snapped-y)*.18*(deviation/.10);
      y+=clamp(plateDelta,-localLimit*.55,localLimit*.55);
      disp+=Math.sin(worldY/plateStep*Math.PI*2+seed*.17)*localLimit*.18;
    }else if(style==='lava_rock'){
      const jag=Math.sign(fine)*Math.pow(Math.abs(fine),.55);
      disp=(low*.30+jag*.70)*localLimit*preset.local;
    }else if(style==='blocky_boulder'){
      const snap=formation.cellSize*.42;
      const qx=Math.round(x/snap)*snap,qy=Math.round(y/snap)*snap,qz=Math.round(z/snap)*snap;
      const mix=.10*(deviation/.10);
      x+=(qx-x)*mix;y+=(qy-y)*mix;z+=(qz-z)*mix;
    }else if(style==='mixed_reef'){
      const band=Math.sin((y+formation.center.y)*1.15+seed*.11);
      disp+=band*localLimit*.16;
    }
    disp=clamp(disp,-localLimit,localLimit);
    positions[i]=x+nx*disp;positions[i+1]=y+ny*disp;positions[i+2]=z+nz*disp;
  }
  if(style==='rounded_reef')positions=smoothMesh(positions,base.indices,1,.10);
  normals=normalsFor(positions,base.indices);
  return {
    formationId:formation.id,
    center:{...formation.center},
    style,seed,deviation,
    positions,indices:base.indices.slice(),normals,
    stats:{...base.stats,maxDeviation:Number(localLimit.toFixed(3))}
  };
}

export function normalizeRockFormationDescriptor(value={}){
  const style=ROCK_FORMATION_STYLES[value.style]?value.style:'rounded_reef';
  return {
    formationId:String(value.formationId||'').slice(0,100),
    style,
    skin:String(value.skin||'grey_reef').slice(0,60),
    seed:Number.isFinite(Number(value.seed))?Math.trunc(Number(value.seed)):1,
    deviation:clamp(Number(value.deviation)||.07,.05,.10),
    accepted:value.accepted===true,
    locked:value.locked===true,
    transform:{
      position:Array.isArray(value.transform?.position)&&value.transform.position.length===3?value.transform.position.map(finite):[0,0,0],
      rotation:Array.isArray(value.transform?.rotation)&&value.transform.rotation.length===3?value.transform.rotation.map(finite):[0,0,0],
      scale:Array.isArray(value.transform?.scale)&&value.transform.scale.length===3?value.transform.scale.map(v=>clamp(finite(v)||1,.25,4)):[1,1,1]
    }
  };
}
