import { TERRAIN_OFFSET_MIN,TERRAIN_OFFSET_MAX } from './DepthLayers.js';
export const MAP_SNAPSHOT_VERSION=1;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function habitatMapWeight(layers=[]){
  let score=0;
  for(const layer of layers){
    if(layer?.type==='coral')score+=3;
    else if(layer?.type==='seagrass'||layer?.type==='sponge')score+=2;
    else if(layer?.type==='rocks')score+=1.25;
    else if(layer?.type==='mixed')score+=2.5;
    else if(layer?.type)score+=1;
  }
  return Math.round(clamp(score,0,25)*4)/4;
}

export function overloadLevel(pressure){
  const value=Number(pressure);
  if(!(value>1.02))return 0;
  if(value<1.25)return 1;
  if(value<1.75)return 2;
  return 3;
}
export function overloadColor(level,alpha=.68){
  const colors={1:[255,190,82],2:[244,111,52],3:[205,37,45]},c=colors[level];
  return c?`rgba(${c[0]},${c[1]},${c[2]},${alpha})`:null;
}

export function createWorldMapSnapshot(world={},pressures=[]){
  const terrain=[];
  for(const item of world.terrain||[]){
    const match=/^(-?\d+),(-?\d+)$/.exec(String(item?.key));if(!match||!Number.isFinite(item?.offset))continue;
    const offset=Math.round(clamp(Number(item.offset),TERRAIN_OFFSET_MIN,TERRAIN_OFFSET_MAX)*2)/2;
    if(offset)terrain.push([Number(match[1]),Number(match[2]),offset]);
  }
  const cells=[];
  for(const cell of world.cells||[]){
    const match=/^(-?\d+),(-?\d+)$/.exec(String(cell?.key));if(!match)continue;
    const weight=habitatMapWeight(cell.layers||[]);if(weight>0)cells.push([Number(match[1]),Number(match[2]),weight]);
  }
  const overload=[];
  for(const item of pressures||[]){
    const level=overloadLevel(item?.pressure);if(!level)continue;
    const match=/^(-?\d+),(-?\d+)$/.exec(String(item?.key));if(match)overload.push([Number(match[1]),Number(match[2]),level]);
  }
  return normalizeWorldMapSnapshot({version:MAP_SNAPSHOT_VERSION,terrain,cells,overload});
}

export function normalizeWorldMapSnapshot(value){
  if(!value||value.version!==MAP_SNAPSHOT_VERSION)return null;
  const clean=(items,max,thirdMin,thirdMax)=>{
    if(!Array.isArray(items)||items.length>max)return [];
    return items.filter(row=>Array.isArray(row)&&row.length===3&&row.every(Number.isFinite)
      &&Number.isSafeInteger(row[0])&&Number.isSafeInteger(row[1])&&row[0]>=-20&&row[0]<=20&&row[1]>=-20&&row[1]<=20
      &&row[2]>=thirdMin&&row[2]<=thirdMax).map(row=>[row[0],row[1],row[2]]);
  };
  return {version:MAP_SNAPSHOT_VERSION,terrain:clean(value.terrain||[],1000,TERRAIN_OFFSET_MIN,TERRAIN_OFFSET_MAX),cells:clean(value.cells,1000,0,25),overload:clean(value.overload,100,1,3)};
}
