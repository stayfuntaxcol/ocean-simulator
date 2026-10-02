import { SCULPT_CELL_SIZE,sculptKey,sculptWorldFromIndex,normalizeVolumeSculpt } from './VolumeSculpt.js';

const DIRS=[
  [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(x,y,z,seed=1)=>{
  let n=(Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791)^Math.imul(seed,2654435761))>>>0;
  n^=n>>>13;n=Math.imul(n,1274126177)>>>0;n^=n>>>16;return n>>>0;
};
const rand=(x,y,z,seed=1)=>(hash(x,y,z,seed)%1000003)/1000003;

function cellPos(c,cellSize){
  return {
    x:sculptWorldFromIndex(c.ix,cellSize),
    y:sculptWorldFromIndex(c.iy,cellSize),
    z:sculptWorldFromIndex(c.iz,cellSize)
  };
}
function dist3(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
function occupied(map,ix,iy,iz,threshold=.18){return (map.get(sculptKey(ix,iy,iz))||0)>=threshold;}

export function analyzeSculptSurface(data,{densityThreshold=.18}={}){
  const sculpt=normalizeVolumeSculpt(data);
  const map=new Map(sculpt.cells.map(c=>[sculptKey(c.ix,c.iy,c.iz),c.density]));
  const surface=[];
  for(const c of sculpt.cells){
    if(c.density<densityThreshold)continue;
    let nx=0,ny=0,nz=0,empty=0;
    for(const [dx,dy,dz] of DIRS){
      if(!occupied(map,c.ix+dx,c.iy+dy,c.iz+dz,densityThreshold)){
        nx+=dx;ny+=dy;nz+=dz;empty++;
      }
    }
    if(!empty)continue;
    const len=Math.hypot(nx,ny,nz)||1;
    surface.push({...c,...cellPos(c,sculpt.cellSize),normal:{x:nx/len,y:ny/len,z:nz/len},exposure:empty/6});
  }
  return {cellSize:sculpt.cellSize,map,surface};
}

export function protectedNegativeSpace(data,{densityThreshold=.18}={}){
  const {cellSize,map,surface}=analyzeSculptSurface(data,{densityThreshold});
  if(!surface.length)return {cellSize,map,voids:[]};
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(const c of surface){minX=Math.min(minX,c.ix);minY=Math.min(minY,c.iy);minZ=Math.min(minZ,c.iz);maxX=Math.max(maxX,c.ix);maxY=Math.max(maxY,c.iy);maxZ=Math.max(maxZ,c.iz);}
  const voids=[];
  for(let ix=minX-1;ix<=maxX+1;ix++)for(let iy=minY-1;iy<=maxY+1;iy++)for(let iz=minZ-1;iz<=maxZ+1;iz++){
    if(occupied(map,ix,iy,iz,densityThreshold))continue;
    let neighbors=0;
    for(const [dx,dy,dz] of DIRS)if(occupied(map,ix+dx,iy+dy,iz+dz,densityThreshold))neighbors++;
    const opposite=
      (occupied(map,ix-1,iy,iz,densityThreshold)&&occupied(map,ix+1,iy,iz,densityThreshold))||
      (occupied(map,ix,iy-1,iz,densityThreshold)&&occupied(map,ix,iy+1,iz,densityThreshold))||
      (occupied(map,ix,iy,iz-1,densityThreshold)&&occupied(map,ix,iy,iz+1,densityThreshold));
    if(neighbors>=3||opposite){
      voids.push({ix,iy,iz,x:sculptWorldFromIndex(ix,cellSize),y:sculptWorldFromIndex(iy,cellSize),z:sculptWorldFromIndex(iz,cellSize)});
    }
  }
  return {cellSize,map,voids};
}

function sphereHitsVoid(center,radius,voids,cellSize){
  const clearance=cellSize*.58;
  return voids.some(v=>dist3(center,v)<radius+clearance);
}
function sphereHitsReserved(center,radius,reserved=[]){
  return reserved.some(r=>dist3(center,r)<radius+(Number(r.radius)||2)*.82);
}
function candidateSpacing(center,radius,placed,factor){
  return placed.every(p=>dist3(center,p)>Math.max(radius,p.radius)*factor);
}
function inwardCenter(c,radius){
  const inset=Math.min(radius*.48,2.6);
  return {x:c.x-c.normal.x*inset,y:c.y-c.normal.y*inset,z:c.z-c.normal.z*inset};
}
function orientation(c,seed){
  const yaw=rand(c.ix,c.iy,c.iz,seed)*Math.PI*2;
  const tiltX=(rand(c.ix,c.iy,c.iz,seed+11)-.5)*.34;
  const tiltZ=(rand(c.ix,c.iy,c.iz,seed+23)-.5)*.34;
  const vertical=Math.abs(c.normal.y);
  return {
    rotation:[tiltX,yaw,tiltZ],
    scale:[
      .82+rand(c.ix,c.iy,c.iz,seed+31)*.50,
      .72+vertical*.28+rand(c.ix,c.iy,c.iz,seed+41)*.30,
      .82+rand(c.ix,c.iy,c.iz,seed+53)*.50
    ]
  };
}

export function generateRockFormation(data,{
  maxRocks=220,seed=17,densityThreshold=.18,reserved=[]
}={}){
  const {cellSize,surface}=analyzeSculptSurface(data,{densityThreshold});
  const {voids}=protectedNegativeSpace(data,{densityThreshold});
  if(!surface.length)return {placements:[],stats:{surfaceCells:0,protectedVoids:voids.length,large:0,medium:0,small:0}};

  const shuffled=[...surface].sort((a,b)=>hash(a.ix,a.iy,a.iz,seed)-hash(b.ix,b.iy,b.iz,seed));
  const placed=[];
  const stats={surfaceCells:surface.length,protectedVoids:voids.length,large:0,medium:0,small:0};

  const passes=[
    {kind:'large',radius:cellSize*1.55,spacing:1.62,exposureMax:.84},
    {kind:'medium',radius:cellSize*1.10,spacing:1.34,exposureMax:1},
    {kind:'small',radius:cellSize*.72,spacing:1.10,exposureMax:1}
  ];

  for(const [passIndex,pass] of passes.entries()){
    for(const c of shuffled){
      if(placed.length>=maxRocks)break;
      if(c.exposure>pass.exposureMax&&pass.kind==='large')continue;
      const jitter=.88+rand(c.ix,c.iy,c.iz,seed+passIndex*101)*.24;
      const radius=pass.radius*jitter;
      const center=inwardCenter(c,radius);
      if(sphereHitsVoid(center,radius*.72,voids,cellSize))continue;
      if(sphereHitsReserved(center,radius,reserved))continue;
      if(!candidateSpacing(center,radius,placed,pass.spacing))continue;
      const look=orientation(c,seed+passIndex*101);
      const rockSeed=hash(c.ix,c.iy,c.iz,seed+passIndex*701);
      placed.push({
        x:Number(center.x.toFixed(3)),y:Number(center.y.toFixed(3)),z:Number(center.z.toFixed(3)),
        radius:Number(radius.toFixed(3)),kind:pass.kind,rockSeed,
        rotation:look.rotation.map(v=>Number(v.toFixed(5))),
        scale:look.scale.map(v=>Number(v.toFixed(4))),
        source:{ix:c.ix,iy:c.iy,iz:c.iz}
      });
      stats[pass.kind]++;
    }
    if(placed.length>=maxRocks)break;
  }
  return {placements:placed,stats};
}
