import { normalizeVolumeSculpt } from './VolumeSculpt.js';
const TYPES=new Set(['rocks','coral','anemone','sponge','seagrass','shell']);
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function normalizeWorldBlueprint(value,{worldHalf=144,maxObjects=1200}={}){
  if(!value||typeof value!=='object')throw Error('Het AI-wereldplan is geen geldig JSON-object.');
  if(value.format!=='ocean-world-blueprint-v1')throw Error('Gebruik een ocean-world-blueprint-v1 bouwplan.');
  if(!Array.isArray(value.objects))throw Error('Het AI-wereldplan bevat geen objectenlijst.');
  if(value.objects.length>maxObjects)throw Error(`Het AI-wereldplan bevat meer dan ${maxObjects} objecten.`);
  const objects=[];
  for(const [index,item] of value.objects.entries()){
    if(!item||!TYPES.has(item.type))throw Error(`Object ${index+1} heeft een onbekend type.`);
    const x=finite(item.x),z=finite(item.z);
    if(x==null||z==null||Math.abs(x)>worldHalf||Math.abs(z)>worldHalf)throw Error(`Object ${index+1} staat buiten de wereld.`);
    const scale=clamp(finite(item.scale)??1,.2,5);
    const rotation=clamp(finite(item.rotation)??0,-Math.PI*20,Math.PI*20);
    objects.push({type:item.type,x,z,scale,rotation});
  }
  const terrain=[];
  if(value.terrain!=null){
    if(!Array.isArray(value.terrain)||value.terrain.length>650)throw Error('Het AI-terreinplan is te groot of ongeldig.');
    for(const [index,item] of value.terrain.entries()){
      const ix=finite(item?.ix),iz=finite(item?.iz),offset=finite(item?.offset);
      if(!Number.isInteger(ix)||!Number.isInteger(iz)||offset==null||Math.abs(ix)>worldHalf/6||Math.abs(iz)>worldHalf/6)throw Error(`Terreinpunt ${index+1} is ongeldig.`);
      terrain.push({ix,iz,offset:clamp(offset,-12,10)});
    }
  }
  const sculpt=normalizeVolumeSculpt(value.sculpt,{worldHalf,maxCells:12000});
  return {format:'ocean-world-blueprint-v1',name:String(value.name||'AI-landschap').slice(0,80),objects,terrain,sculpt};
}
