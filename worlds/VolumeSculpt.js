export const SCULPT_FORMAT='ocean-volume-sculpt-v1';
export const SCULPT_CELL_SIZE=3;
export const SCULPT_MAX_CELLS=12000;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>Number.isFinite(Number(value))?Number(value):null;

export function sculptKey(ix,iy,iz){return `${ix},${iy},${iz}`;}
export function sculptIndexFromWorld(value,cellSize=SCULPT_CELL_SIZE){return Math.round(Number(value)/cellSize);}
export function sculptWorldFromIndex(index,cellSize=SCULPT_CELL_SIZE){return Number(index)*cellSize;}

export function normalizeVolumeSculpt(value,{worldHalf=144,minY=-24,maxY=18,maxCells=SCULPT_MAX_CELLS}={}){
  if(value==null)return {format:SCULPT_FORMAT,cellSize:SCULPT_CELL_SIZE,cells:[]};
  if(!value||typeof value!=='object')throw Error('De volumesculptuur is ongeldig.');
  if(value.format!==SCULPT_FORMAT)throw Error('Onbekend volumesculptuur-formaat.');
  const cellSize=clamp(finite(value.cellSize)??SCULPT_CELL_SIZE,1.5,6);
  if(!Array.isArray(value.cells))throw Error('De volumesculptuur bevat geen cellenlijst.');
  if(value.cells.length>maxCells)throw Error(`De volumesculptuur bevat meer dan ${maxCells} cellen.`);
  const cells=[];
  const seen=new Set();
  const maxIndex=Math.ceil(worldHalf/cellSize)+2;
  const minYIndex=Math.floor(minY/cellSize)-2,maxYIndex=Math.ceil(maxY/cellSize)+2;
  for(const [index,item] of value.cells.entries()){
    const ix=finite(item?.ix),iy=finite(item?.iy),iz=finite(item?.iz),density=finite(item?.density);
    if(!Number.isInteger(ix)||!Number.isInteger(iy)||!Number.isInteger(iz)||density==null)
      throw Error(`Sculptuurcel ${index+1} is ongeldig.`);
    if(Math.abs(ix)>maxIndex||Math.abs(iz)>maxIndex||iy<minYIndex||iy>maxYIndex)
      throw Error(`Sculptuurcel ${index+1} staat buiten de wereld.`);
    const d=clamp(density,0,1);
    if(d<.02)continue;
    const key=sculptKey(ix,iy,iz);
    if(seen.has(key))continue;
    seen.add(key);cells.push({ix,iy,iz,density:d});
  }
  return {format:SCULPT_FORMAT,cellSize,cells};
}

export function sculptMapFromData(data,options={}){
  const normalized=normalizeVolumeSculpt(data,options);
  return {cellSize:normalized.cellSize,cells:new Map(normalized.cells.map(c=>[sculptKey(c.ix,c.iy,c.iz),c.density]))};
}

export function sculptDataFromMap(cells,cellSize=SCULPT_CELL_SIZE){
  const out=[];
  for(const [key,density] of cells){
    const [ix,iy,iz]=String(key).split(',').map(Number);
    if(![ix,iy,iz,density].every(Number.isFinite)||density<.02)continue;
    out.push({ix,iy,iz,density:clamp(density,0,1)});
  }
  out.sort((a,b)=>a.iy-b.iy||a.ix-b.ix||a.iz-b.iz);
  return {format:SCULPT_FORMAT,cellSize,cells:out};
}

export function sculptBrushIndices(point,{cellSize=SCULPT_CELL_SIZE,radius=6}={}){
  const cx=sculptIndexFromWorld(point.x,cellSize),cy=sculptIndexFromWorld(point.y,cellSize),cz=sculptIndexFromWorld(point.z,cellSize);
  const reach=Math.max(1,Math.ceil(radius/cellSize)),out=[];
  for(let ix=cx-reach;ix<=cx+reach;ix++)for(let iy=cy-reach;iy<=cy+reach;iy++)for(let iz=cz-reach;iz<=cz+reach;iz++){
    const x=sculptWorldFromIndex(ix,cellSize),y=sculptWorldFromIndex(iy,cellSize),z=sculptWorldFromIndex(iz,cellSize);
    const distance=Math.hypot(x-point.x,y-point.y,z-point.z);
    if(distance>radius+cellSize*.55)continue;
    const weight=Math.max(0,1-distance/Math.max(radius,cellSize*.5));
    out.push({ix,iy,iz,key:sculptKey(ix,iy,iz),x,y,z,weight});
  }
  return out;
}

export function applyVolumeBrush(cells,point,{mode='add',cellSize=SCULPT_CELL_SIZE,radius=6,strength=.45,accept=()=>true}={}){
  const affected=sculptBrushIndices(point,{cellSize,radius}).filter(c=>accept(c));
  if(mode==='smooth'){
    const snapshot=new Map(cells);
    for(const c of affected){
      let total=0,count=0;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
        total+=snapshot.get(sculptKey(c.ix+dx,c.iy+dy,c.iz+dz))||0;count++;
      }
      const current=snapshot.get(c.key)||0,average=total/count;
      const next=current+(average-current)*clamp(strength*c.weight,0,1);
      if(next<.02)cells.delete(c.key);else cells.set(c.key,clamp(next,0,1));
    }
  }else{
    const sign=mode==='remove'?-1:1;
    for(const c of affected){
      const current=cells.get(c.key)||0;
      const delta=sign*clamp(strength,0,1)*(.35+.65*c.weight);
      const next=clamp(current+delta,0,1);
      if(next<.02)cells.delete(c.key);else cells.set(c.key,next);
    }
  }
  return affected.length;
}
