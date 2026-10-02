import { sculptKey,sculptWorldFromIndex,normalizeVolumeSculpt } from './VolumeSculpt.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(x,y,z,seed=1)=>{
  let n=(Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791)^Math.imul(seed,2654435761))>>>0;
  n^=n>>>13;n=Math.imul(n,1274126177)>>>0;n^=n>>>16;return n>>>0;
};
const rand=(x,y,z,seed=1)=>(hash(x,y,z,seed)%1000003)/1000003;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

const NEIGHBORS=[];
for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
  if(dx||dy||dz)NEIGHBORS.push([dx,dy,dz]);
}

function cellWorld(c,cellSize){
  return {x:sculptWorldFromIndex(c.ix,cellSize),y:sculptWorldFromIndex(c.iy,cellSize),z:sculptWorldFromIndex(c.iz,cellSize)};
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
    const min={ix:Infinity,iy:Infinity,iz:Infinity},max={ix:-Infinity,iy:-Infinity,iz:-Infinity};
    let sx=0,sy=0,sz=0,weight=0;
    for(const c of cells){
      min.ix=Math.min(min.ix,c.ix);min.iy=Math.min(min.iy,c.iy);min.iz=Math.min(min.iz,c.iz);
      max.ix=Math.max(max.ix,c.ix);max.iy=Math.max(max.iy,c.iy);max.iz=Math.max(max.iz,c.iz);
      const w=c.density;sx+=c.ix*w;sy+=c.iy*w;sz+=c.iz*w;weight+=w;
    }
    const anchor=cells[0],id=`sculpt-${anchor.ix}_${anchor.iy}_${anchor.iz}-${cells.length}`;
    formations.push({
      id,cells,cellSize:sculpt.cellSize,
      center:{x:sculptWorldFromIndex(sx/weight,sculpt.cellSize),y:sculptWorldFromIndex(sy/weight,sculpt.cellSize),z:sculptWorldFromIndex(sz/weight,sculpt.cellSize)},
      bounds:{min,max},
      volume:cells.reduce((sum,c)=>sum+c.density*Math.pow(sculpt.cellSize,3),0)
    });
  }
  formations.sort((a,b)=>b.volume-a.volume||a.id.localeCompare(b.id));
  return formations;
}

function componentMap(formation){
  return new Map(formation.cells.map(c=>[sculptKey(c.ix,c.iy,c.iz),c.density]));
}
function densityAtWorld(map,p,cellSize){
  const ix=Math.round(p.x/cellSize),iy=Math.round(p.y/cellSize),iz=Math.round(p.z/cellSize);
  return map.get(sculptKey(ix,iy,iz))||0;
}
function insideRatio(map,center,radius,cellSize,seed){
  // Cheap deterministic approximation of how much of a rock cluster stays inside the sculpt.
  const samples=[center];
  const dirs=[
    [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[0,1,1],[0,-1,1]
  ];
  for(let i=0;i<dirs.length;i++){
    const d=dirs[i],len=Math.hypot(...d),r=radius*(.42+.42*rand(i,seed,17,31));
    samples.push({x:center.x+d[0]/len*r,y:center.y+d[1]/len*r,z:center.z+d[2]/len*r});
  }
  let score=0;
  for(const p of samples)score+=clamp(densityAtWorld(map,p,cellSize),0,1);
  return score/samples.length;
}
function overlapOk(center,radius,placed){
  // Deliberate overlap: centers may be only 65–85% of combined nominal radii apart.
  return placed.every(p=>dist(center,p) >= (radius+p.radius)*.34);
}
function reservedOk(center,radius,reserved){
  return reserved.every(r=>dist(center,r) >= radius*.55+(Number(r.radius)||2)*.7);
}

export function generateVolumeRockFill(formation,{
  seed=17,maxClusters=70,targetCoverage=.86,minInside=.72,reserved=[]
}={}){
  const map=componentMap(formation),cellSize=formation.cellSize;
  const candidates=[...formation.cells]
    .filter(c=>c.density>=.25)
    .sort((a,b)=>hash(a.ix,a.iy,a.iz,seed)-hash(b.ix,b.iy,b.iz,seed));
  const placed=[];
  const targetVolume=formation.volume*clamp(targetCoverage,.5,.95);
  let estimatedFilled=0;

  const passes=[
    {kind:'large',radius:cellSize*2.35,clusterScale:1.55,minInside:Math.max(.68,minInside-.05)},
    {kind:'medium',radius:cellSize*1.55,clusterScale:1.05,minInside},
    {kind:'small',radius:cellSize*.95,clusterScale:.68,minInside:Math.min(.82,minInside+.06)}
  ];

  for(const [passIndex,pass] of passes.entries()){
    for(const c of candidates){
      if(placed.length>=maxClusters||estimatedFilled>=targetVolume)break;
      const base=cellWorld(c,cellSize);
      const jitter=cellSize*.34;
      const center={
        x:base.x+(rand(c.ix,c.iy,c.iz,seed+passIndex*101)-.5)*jitter,
        y:base.y+(rand(c.ix,c.iy,c.iz,seed+passIndex*131)-.5)*jitter,
        z:base.z+(rand(c.ix,c.iy,c.iz,seed+passIndex*151)-.5)*jitter
      };
      const radius=pass.radius*(.84+rand(c.ix,c.iy,c.iz,seed+passIndex*181)*.28);
      const ratio=insideRatio(map,center,radius,cellSize,seed+passIndex*211);
      if(ratio<pass.minInside||!overlapOk(center,radius,placed)||!reservedOk(center,radius,reserved))continue;
      const rockSeed=hash(c.ix,c.iy,c.iz,seed+passIndex*701);
      const volume=4/3*Math.PI*Math.pow(radius,3)*.62*ratio;
      placed.push({
        x:Number(center.x.toFixed(3)),y:Number(center.y.toFixed(3)),z:Number(center.z.toFixed(3)),
        radius:Number(radius.toFixed(3)),clusterScale:Number((pass.clusterScale*(.86+rand(c.ix,c.iy,c.iz,seed+903)*.28)).toFixed(3)),
        kind:pass.kind,insideRatio:Number(ratio.toFixed(3)),rockSeed,
        rotation:Number((rand(c.ix,c.iy,c.iz,seed+1009)*Math.PI*2).toFixed(5)),
        source:{ix:c.ix,iy:c.iy,iz:c.iz}
      });
      estimatedFilled+=volume;
    }
  }
  return {
    formationId:formation.id,
    placements:placed,
    stats:{
      cells:formation.cells.length,
      sculptVolume:Number(formation.volume.toFixed(1)),
      estimatedCoverage:Number(clamp(estimatedFilled/Math.max(1,formation.volume),0,1).toFixed(3)),
      large:placed.filter(p=>p.kind==='large').length,
      medium:placed.filter(p=>p.kind==='medium').length,
      small:placed.filter(p=>p.kind==='small').length
    }
  };
}

export function generateAllVolumeRockFills(data,options={}){
  const formations=splitSculptFormations(data,options);
  return {
    formations,
    results:formations.map((formation,index)=>generateVolumeRockFill(formation,{...options,seed:(options.seed||17)+index*997}))
  };
}

// Backward-compatible entry point used by older tests/integrations.
export function generateRockFormation(data,options={}){
  const all=generateAllVolumeRockFills(data,options);
  const placements=all.results.flatMap(r=>r.placements.map(p=>({...p,formationId:r.formationId})));
  return {
    placements,
    formations:all.formations,
    results:all.results,
    stats:{
      formations:all.formations.length,
      large:placements.filter(p=>p.kind==='large').length,
      medium:placements.filter(p=>p.kind==='medium').length,
      small:placements.filter(p=>p.kind==='small').length
    }
  };
}
