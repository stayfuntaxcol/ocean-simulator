import { evaluateEcosystem } from './Ecosystem.js';

export const FOOD_SECTOR_SIZE=36;
export const FOOD_BUFFER_SECONDS=240;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const clean=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const habitatTypes=new Set(['rocks','coral','seagrass','sponge','mixed']);

export function foodSectorKey(x,z,size=FOOD_SECTOR_SIZE){
  return `${Math.floor(clean(x)/size)},${Math.floor(clean(z)/size)}`;
}

export function foodSectorCenter(key,size=FOOD_SECTOR_SIZE){
  const [sx,sz]=String(key).split(',').map(Number);
  return {x:(sx+.5)*size,z:(sz+.5)*size};
}

function emptyHabitats(){return {rocks:0,coral:0,seagrass:0,sponge:0,mixed:0};}

export function buildFoodSectors(layers=[],{lavaVents=[],previous=new Map(),sectorSize=FOOD_SECTOR_SIZE}={}){
  const grouped=new Map();
  for(const layer of layers){
    if(!habitatTypes.has(layer?.type))continue;
    const key=foodSectorKey(layer.x,layer.z,sectorSize);
    if(!grouped.has(key))grouped.set(key,emptyHabitats());
    grouped.get(key)[layer.type]++;
  }
  const lavaCounts=new Map();
  for(const vent of lavaVents){
    const key=foodSectorKey(vent?.x,vent?.z,sectorSize);
    lavaCounts.set(key,(lavaCounts.get(key)||0)+1);
    if(!grouped.has(key))grouped.set(key,emptyHabitats());
  }

  const sectors=new Map();
  for(const [key,habitats] of grouped){
    const assessment=evaluateEcosystem({habitats,lavaVents:lavaCounts.get(key)||0});
    const capacity=assessment.capacity;
    const maxFood=capacity*FOOD_BUFFER_SECONDS;
    const old=previous.get(key);
    const oldRatio=old?.maxFood>0?clamp(old.stock/old.maxFood,0,1):1;
    const center=foodSectorCenter(key,sectorSize);
    sectors.set(key,{
      key,...center,habitats,capacity,maxFood,
      stock:maxFood*oldRatio,demand:0,supply:capacity>0?1:0,
      pressure:0,assessment
    });
  }
  return sectors;
}

export function sectorInfluences(x,z,sectors,{sectorSize=FOOD_SECTOR_SIZE,radius=1.35}={}){
  if(!sectors?.size)return [];
  const sx=Math.floor(clean(x)/sectorSize),sz=Math.floor(clean(z)/sectorSize);
  const weighted=[];
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    const key=`${sx+dx},${sz+dz}`,sector=sectors.get(key);
    if(!sector)continue;
    const distance=Math.hypot(clean(x)-sector.x,clean(z)-sector.z);
    const normalized=distance/(sectorSize*radius);
    if(normalized>=1)continue;
    weighted.push({sector,weight:(1-normalized)*(1-normalized)});
  }
  let total=weighted.reduce((sum,item)=>sum+item.weight,0);
  if(!total){
    const sector=sectors.get(foodSectorKey(x,z,sectorSize));
    return sector?[{sector,weight:1}]:[];
  }
  return weighted.map(item=>({...item,weight:item.weight/total}));
}

export function updateFoodSectors(sectors,consumers=[],dt=0,{sectorSize=FOOD_SECTOR_SIZE}={}){
  const delta=clamp(clean(dt),0,5);
  for(const sector of sectors.values())sector.demand=0;
  for(const consumer of consumers){
    const biomass=Math.max(0,clean(consumer?.biomass));
    if(!biomass)continue;
    for(const {sector,weight} of sectorInfluences(consumer.x,consumer.z,sectors,{sectorSize}))sector.demand+=biomass*weight;
  }
  for(const sector of sectors.values()){
    sector.stock=clamp(sector.stock+(sector.capacity-sector.demand)*delta,0,sector.maxFood);
    const instant=sector.demand>0?clamp(sector.capacity/sector.demand,0,1):1;
    sector.supply=sector.capacity<=0?0:(sector.stock>0?1:instant);
    sector.pressure=sector.capacity>0?sector.demand/sector.capacity:(sector.demand>0?Infinity:0);
  }
  return sectors;
}

export function foodAtPosition(x,z,sectors,options={}){
  const influences=sectorInfluences(x,z,sectors,options);
  if(!influences.length)return {supply:0,capacity:0,demand:0,stockRatio:0,key:foodSectorKey(x,z,options.sectorSize)};
  let supply=0,capacity=0,demand=0,stockRatio=0,best=influences[0];
  for(const item of influences){
    const sector=item.sector,weight=item.weight;
    supply+=sector.supply*weight;capacity+=sector.capacity*weight;demand+=sector.demand*weight;
    stockRatio+=(sector.maxFood>0?sector.stock/sector.maxFood:0)*weight;
    if(item.weight>best.weight)best=item;
  }
  return {supply:clamp(supply,0,1),capacity,demand,stockRatio:clamp(stockRatio,0,1),key:best.sector.key};
}

export function summarizeFoodSectors(sectors){
  const active=[...sectors.values()].filter(sector=>sector.capacity>0);
  const maxFood=active.reduce((sum,sector)=>sum+sector.maxFood,0);
  const stock=active.reduce((sum,sector)=>sum+sector.stock,0);
  return {
    active:active.length,
    overloaded:active.filter(sector=>sector.demand>sector.capacity*1.02).length,
    depleted:active.filter(sector=>sector.stock<=.001&&sector.demand>sector.capacity).length,
    capacity:active.reduce((sum,sector)=>sum+sector.capacity,0),
    demand:active.reduce((sum,sector)=>sum+sector.demand,0),
    stockRatio:maxFood>0?clamp(stock/maxFood,0,1):0
  };
}

export function fishBiomass({imported=false,contactRadius=1,scale=1}={}){
  if(!imported)return 1;
  const size=Math.max(clean(contactRadius,1),clean(scale,1));
  return clamp(Math.pow(size/1.45,1.18),.5,4);
}

export function createImportedVitality({reserveSeconds=240}={}){
  const maxFoodReserve=clamp(clean(reserveSeconds,240),180,360);
  return {health:100,foodReserve:maxFoodReserve,maxFoodReserve,starvationSeconds:0,state:'healthy'};
}

export function healthMotionFactor(health){
  const value=clamp(clean(health),0,100);
  if(value<=5)return 0;
  if(value<=20)return .08+(value-5)/15*.54;
  if(value<30)return .62+(value-20)/10*.38;
  return 1;
}

export function advanceImportedVitality(vitality,dt,{foodSupply=1,hazard=0}={}){
  const next={...createImportedVitality(),...vitality};
  const delta=clamp(clean(dt),0,.25),supply=clamp(clean(foodSupply),0,1),heat=clamp(clean(hazard),0,1);
  next.health=clamp(clean(next.health,100),0,100);
  next.maxFoodReserve=clamp(clean(next.maxFoodReserve,240),180,360);
  next.foodReserve=clamp(clean(next.foodReserve,next.maxFoodReserve),0,next.maxFoodReserve);
  next.starvationSeconds=Math.max(0,clean(next.starvationSeconds));
  if(next.health<=5&&!['burial','dead'].includes(next.state))next.state='sinking';

  const deficit=1-supply;
  if(next.state!=='sinking'&&next.state!=='burial'&&next.state!=='dead'){
    if(deficit>.01){
      next.foodReserve=Math.max(0,next.foodReserve-delta*deficit);
      if(next.foodReserve<=0)next.starvationSeconds+=delta*deficit;
    }else{
      next.foodReserve=Math.min(next.maxFoodReserve,next.foodReserve+delta*.55);
      next.starvationSeconds=Math.max(0,next.starvationSeconds-delta*2);
      next.health=Math.min(100,next.health+delta*.05);
    }
    if(next.foodReserve<=0&&next.starvationSeconds>30){
      const starvationDamage=.09+.18*deficit;
      next.health=Math.max(0,next.health-delta*starvationDamage);
    }
    if(heat>0)next.health=Math.max(0,next.health-delta*(1.2+heat*7.5));
    if(next.health<=5)next.state='sinking';
    else if(next.health<=20)next.state='critical';
    else if(next.health<100||deficit>.01)next.state='strained';
    else next.state='healthy';
  }else if(next.state==='sinking'){
    next.health=Math.max(0,next.health-delta*.5);
  }
  return next;
}

export function residenceDuration(speciesId,random=.5){
  const value=clamp(clean(random,.5),0,1),id=String(speciesId||'');
  let range=[90,210];
  if(id==='reef_0')range=[150,270];
  else if(id==='reef_6')range=[180,330];
  else if(id==='reef_2')range=[180,300];
  else if(id==='reef_5'||id==='reef_7')range=[100,210];
  else if(id==='reef_3'||id==='reef_1')range=[120,240];
  else if(id==='reef_4')range=[170,320];
  return range[0]+(range[1]-range[0])*value;
}
