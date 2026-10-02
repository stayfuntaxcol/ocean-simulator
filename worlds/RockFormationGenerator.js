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
