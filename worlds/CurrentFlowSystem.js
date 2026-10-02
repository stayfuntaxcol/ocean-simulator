const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;

export const CURRENT_CATEGORIES=Object.freeze({
  1:Object.freeze({id:1,key:'drift',name:'Zachte drift',size:'klein',impact:'licht',width:10,height:8,strength:.18,nutrient:.04}),
  2:Object.freeze({id:2,key:'local',name:'Lokale stroming',size:'klein-middel',impact:'merkbaar',width:18,height:12,strength:.36,nutrient:.07}),
  3:Object.freeze({id:3,key:'reef',name:'Rifstroom',size:'middel',impact:'duidelijk',width:28,height:16,strength:.62,nutrient:.11}),
  4:Object.freeze({id:4,key:'undercurrent',name:'Sterke onderstroom',size:'groot',impact:'sterk',width:42,height:20,strength:1.0,nutrient:.16}),
  5:Object.freeze({id:5,key:'main',name:'Hoofdstroom',size:'zeer groot',impact:'zeer sterk',width:60,height:26,strength:1.45,nutrient:.22})
});

export const CURRENT_CATEGORY_IDS=Object.freeze(Object.keys(CURRENT_CATEGORIES).map(Number));

function categoryId(value){
  const n=Math.round(finite(value,3));
  return CURRENT_CATEGORIES[n]?n:3;
}

export function currentCategory(value){
  return CURRENT_CATEGORIES[categoryId(value)];
}

export function classifyCurrent({width=28,strength=.62}={}){
  const w=clamp(finite(width,28),4,90),s=clamp(finite(strength,.62),0,3);
  // Pick the nearest scale/impact profile. This guarantees that every preset
  // classifies as itself, while manually tuned currents still get a useful label.
  let best=CURRENT_CATEGORIES[3],bestDistance=Infinity;
  for(const preset of Object.values(CURRENT_CATEGORIES)){
    const dw=(w-preset.width)/60,ds=(s-preset.strength)/1.45;
    const distance=dw*dw+ds*ds;
    if(distance<bestDistance){best=preset;bestDistance=distance;}
  }
  return best;
}

function routePoints(flow,{seaLevelY=20}={}){
  const heading=finite(flow.heading,0)*Math.PI/180;
  const forward={x:Math.cos(heading),z:Math.sin(heading)};
  const side={x:-forward.z,z:forward.x};
  const length=clamp(finite(flow.length,190),24,360);
  const bend=clamp(finite(flow.bend,20),0,90);
  const count=clamp(Math.ceil(length/28)+1,5,15);
  const centerX=clamp(finite(flow.centerX,0),-500,500);
  const centerZ=clamp(finite(flow.centerZ,0),-500,500);
  const baseY=seaLevelY-clamp(finite(flow.depth,34),2,500);
  const vertical=clamp(finite(flow.verticalBend,1.4),0,12);
  const points=[];
  for(let i=0;i<count;i++){
    const u=count===1 ? .5 : i/(count-1);
    const along=(u-.5)*length;
    // One broad snake wave plus a smaller second harmonic prevents a rigid arc.
    const lateral=Math.sin((u-.08)*Math.PI*2)*bend+Math.sin((u+.17)*Math.PI*4)*bend*.18;
    const lift=Math.sin((u+.12)*Math.PI*2)*vertical;
    points.push({
      x:centerX+forward.x*along+side.x*lateral,
      y:baseY+lift,
      z:centerZ+forward.z*along+side.z*lateral
    });
  }
  return points;
}

export function normalizeCurrentFlow(value={},options={}){
  const preset=currentCategory(value.category);
  const category=categoryId(value.category);
  const flow={
    id:String(value.id||'current-1').slice(0,80),
    name:String(value.name||preset.name).slice(0,80),
    enabled:value.enabled!==false,
    category,
    strength:clamp(finite(value.strength,preset.strength),0,3),
    width:clamp(finite(value.width,preset.width),4,90),
    height:clamp(finite(value.height,preset.height),4,50),
    depth:clamp(finite(value.depth,34),2,500),
    heading:((finite(value.heading,8)%360)+360)%360,
    length:clamp(finite(value.length,190),24,360),
    bend:clamp(finite(value.bend,20),0,90),
    turbulence:clamp(finite(value.turbulence,.16),0,1),
    rockAcceleration:clamp(finite(value.rockAcceleration,.65),0,1.5),
    centerX:clamp(finite(value.centerX,0),-500,500),
    centerZ:clamp(finite(value.centerZ,0),-500,500),
    verticalBend:clamp(finite(value.verticalBend,1.4),0,12)
  };
  flow.points=routePoints(flow,options);
  return flow;
}

export function normalizeCurrentFlows(value,options={}){
  if(value==null)return [];
  if(typeof value!=='object')throw Error('Ongeldige stromingsgegevens.');
  const source=Array.isArray(value)?value:Object.values(value);
  if(source.length>24)throw Error('Deze wereld bevat te veel stromingen.');
  return source.map((item,index)=>normalizeCurrentFlow({...item,id:item?.id||`current-${index+1}`},options));
}

function sectorKey(ix,iz){return `${ix},${iz}`;}

function closestOnSegmentXZ(px,pz,a,b){
  const vx=b.x-a.x,vz=b.z-a.z;
  const len2=vx*vx+vz*vz;
  const t=len2>1e-8?clamp(((px-a.x)*vx+(pz-a.z)*vz)/len2,0,1):0;
  return {t,x:a.x+vx*t,z:a.z+vz*t};
}

function buildSectorField(flows,{sectorSize=12,worldHalf=144,rockFactors=new Map()}={}){
  const accum=new Map();
  const add=(ix,iz,segment,flow)=>{
    const key=sectorKey(ix,iz);
    const cx=(ix+.5)*sectorSize,cz=(iz+.5)*sectorSize;
    if(Math.abs(cx)>worldHalf+sectorSize||Math.abs(cz)>worldHalf+sectorSize)return;
    const close=closestOnSegmentXZ(cx,cz,segment.a,segment.b);
    const dx=cx-close.x,dz=cz-close.z;
    const radius=Math.max(2,flow.width*.5);
    const d=Math.hypot(dx,dz);
    if(d>=radius+sectorSize*.72)return;
    const edge=clamp(1-d/(radius+sectorSize*.72),0,1);
    const influence=edge*edge;
    if(influence<=.0001)return;
    const y=segment.a.y+(segment.b.y-segment.a.y)*close.t;
    const len=Math.hypot(segment.b.x-segment.a.x,segment.b.y-segment.a.y,segment.b.z-segment.a.z)||1;
    const dirX=(segment.b.x-segment.a.x)/len,dirY=(segment.b.y-segment.a.y)/len,dirZ=(segment.b.z-segment.a.z)/len;
    const record=accum.get(key)||{
      key,ix,iz,x:cx,z:cz,vx:0,vy:0,vz:0,weight:0,y:0,height:0,nutrient:0,
      turbulence:0,rockAcceleration:0,flows:new Set()
    };
    const weighted=flow.strength*influence;
    record.vx+=dirX*weighted;record.vy+=dirY*weighted;record.vz+=dirZ*weighted;
    record.y+=y*influence;record.height+=flow.height*influence;
    record.nutrient+=currentCategory(flow.category).nutrient*influence;
    record.turbulence+=flow.turbulence*influence;
    record.rockAcceleration+=flow.rockAcceleration*influence;
    record.weight+=influence;record.flows.add(flow.id);
    accum.set(key,record);
  };

  for(const flow of flows){
    if(!flow.enabled||flow.strength<=0||flow.points.length<2)continue;
    for(let i=0;i<flow.points.length-1;i++){
      const a=flow.points[i],b=flow.points[i+1],segment={a,b};
      const margin=flow.width*.5+sectorSize;
      const minX=Math.floor((Math.min(a.x,b.x)-margin)/sectorSize);
      const maxX=Math.floor((Math.max(a.x,b.x)+margin)/sectorSize);
      const minZ=Math.floor((Math.min(a.z,b.z)-margin)/sectorSize);
      const maxZ=Math.floor((Math.max(a.z,b.z)+margin)/sectorSize);
      for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++)add(ix,iz,segment,flow);
    }
  }

  const sectors=new Map();
  for(const [key,r] of accum){
    const inv=1/Math.max(.0001,r.weight);
    const rock=clamp(finite(rockFactors.get(key),0),0,1);
    const rockAcceleration=clamp(r.rockAcceleration*inv,0,1.5);
    const boost=1+rock*rockAcceleration;
    sectors.set(key,{
      key:r.key,ix:r.ix,iz:r.iz,x:r.x,z:r.z,
      vx:r.vx*boost,vy:r.vy*boost,vz:r.vz*boost,
      y:r.y*inv,height:Math.max(4,r.height*inv),
      turbulence:clamp(r.turbulence*inv,0,1),
      nutrient:clamp(r.nutrient*inv*boost,0,.35),
      rockFactor:rock,rockBoost:boost,
      flowIds:[...r.flows]
    });
  }
  return sectors;
}

export function createCurrentFlowSystem({sectorSize=12,worldHalf=144,seaLevelY=20}={}){
  let flows=[],rockFactors=new Map(),sectors=new Map(),nextId=1,revision=0;

  const rebuild=()=>{sectors=buildSectorField(flows,{sectorSize,worldHalf,rockFactors});revision++;return sectors;};
  const uniqueId=()=>{
    while(flows.some(flow=>flow.id===`current-${nextId}`))nextId++;
    return `current-${nextId++}`;
  };

  function add(value={}){
    const id=value.id?String(value.id):uniqueId();
    const flow=normalizeCurrentFlow({...value,id},{seaLevelY});
    flows.push(flow);rebuild();return structuredClone(flow);
  }
  function update(id,patch={}){
    const index=flows.findIndex(flow=>flow.id===id);if(index<0)return null;
    flows[index]=normalizeCurrentFlow({...flows[index],...patch,id},{seaLevelY});
    rebuild();return structuredClone(flows[index]);
  }
  function remove(id){
    const before=flows.length;flows=flows.filter(flow=>flow.id!==id);
    if(flows.length!==before)rebuild();
    return flows.length!==before;
  }
  function load(value,{defaultIfEmpty=false}={}){
    flows=normalizeCurrentFlows(value,{seaLevelY});
    nextId=1;
    for(const flow of flows){
      const m=/^current-(\d+)$/.exec(flow.id);if(m)nextId=Math.max(nextId,Number(m[1])+1);
    }
    if(!flows.length&&defaultIfEmpty)addDefault(); else rebuild();
    return list();
  }
  function addDefault(){
    return add({
      name:'Rif-onderstroom',
      category:3,
      centerX:0,centerZ:0,heading:8,length:220,bend:28,depth:34,
      strength:CURRENT_CATEGORIES[3].strength,width:CURRENT_CATEGORIES[3].width,
      height:CURRENT_CATEGORIES[3].height,turbulence:.18,rockAcceleration:.7
    });
  }
  function setRockFactors(value){
    rockFactors=value instanceof Map?new Map(value):new Map(Object.entries(value||{}));
    rebuild();
  }
  function sampleInto(x,y,z,time=0,out={}){
    const ix=Math.floor(finite(x)/sectorSize),iz=Math.floor(finite(z)/sectorSize);
    const sector=sectors.get(sectorKey(ix,iz));
    out.x=0;out.y=0;out.z=0;out.strength=0;out.rockBoost=1;out.nutrient=0;out.flowIds=null;
    if(!sector)return out;
    const verticalRadius=Math.max(2,sector.height*.5);
    const vertical=Math.abs(finite(y)-sector.y)/verticalRadius;
    if(vertical>=1.12)return out;
    const verticalFalloff=clamp(1-vertical*vertical,0,1);
    let vx=sector.vx*verticalFalloff,vy=sector.vy*verticalFalloff,vz=sector.vz*verticalFalloff;
    const base=Math.hypot(vx,vy,vz);
    if(base<=1e-6)return out;
    if(sector.turbulence>0){
      const inv=1/base,dx=vx*inv,dz=vz*inv;
      const wave=Math.sin(finite(time)*1.17+finite(x)*.071+finite(z)*.053+ix*.31-iz*.27);
      const lateral=base*sector.turbulence*.18*wave;
      vx+=-dz*lateral;vz+=dx*lateral;
    }
    out.x=vx;out.y=vy;out.z=vz;out.strength=Math.hypot(vx,vy,vz);
    out.rockBoost=sector.rockBoost;out.nutrient=sector.nutrient*verticalFalloff;out.flowIds=sector.flowIds;
    return out;
  }
  function sectorAt(x,z){return sectors.get(sectorKey(Math.floor(finite(x)/sectorSize),Math.floor(finite(z)/sectorSize)))||null;}
  function list(){return flows.map(flow=>structuredClone(flow));}
  function get(id){const flow=flows.find(item=>item.id===id);return flow?structuredClone(flow):null;}
  function serialize(){return flows.map(({points,...flow})=>({...flow}));}
  function stats(){
    let boosted=0,maxRockBoost=1,maxStrength=0;
    for(const sector of sectors.values()){
      if(sector.rockBoost>1.001)boosted++;
      maxRockBoost=Math.max(maxRockBoost,sector.rockBoost);
      maxStrength=Math.max(maxStrength,Math.hypot(sector.vx,sector.vy,sector.vz));
    }
    return {flows:flows.filter(f=>f.enabled).length,totalFlows:flows.length,sectors:sectors.size,rockBoostedSectors:boosted,maxRockBoost,maxStrength,revision};
  }
  function applyCategory(id,value){
    const preset=currentCategory(value),flow=flows.find(item=>item.id===id);if(!flow)return null;
    return update(id,{category:preset.id,strength:preset.strength,width:preset.width,height:preset.height,name:flow.name||preset.name});
  }

  return {add,addDefault,update,remove,load,list,get,serialize,setRockFactors,sampleInto,sectorAt,stats,applyCategory,
    get revision(){return revision;},get sectorSize(){return sectorSize;}};
}
