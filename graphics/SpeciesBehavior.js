// Species policy separated from scene rendering for deterministic checks.
export const SPECIES_POLICY={
  reef_0:{kind:'family',cruiseSpeed:1.05,cohesion:.85,alignment:.28,separation:.38,habitatPull:1.1,exploration:.03},
  reef_1:{kind:'shoal',cruiseSpeed:1.15,cohesion:.62,alignment:.72,separation:.78,habitatPull:.85,exploration:.12},
  reef_2:{kind:'coral-pair',cruiseSpeed:.78,cohesion:.68,alignment:.52,separation:.68,habitatPull:1.16,exploration:.035,depthMin:5,depthMax:14},
  reef_4:{kind:'puffer',cruiseSpeed:.38,cohesion:.16,alignment:.18,separation:1.12,habitatPull:1.05,exploration:.025,depthMin:8,depthMax:18},
  reef_6:{kind:'bottom',cruiseSpeed:.48,cohesion:.25,alignment:.24,separation:.85,habitatPull:1.05,exploration:.04},
};
export function populationPlan(count){
  const counts=Array.from({length:8},(_,i)=>Math.floor(count/8)+(i<count%8?1:0));
  if(count>=32){const extra=Math.min(4,counts[3]);counts[0]+=extra;counts[3]-=extra;}
  const groups=[];let familyIndex=0;
  for(let species=0;species<8;species++){
    let left=counts[species];
    while(left){
      let n=species===0?Math.min(4+familyIndex%3,left):species===6?Math.min(3,left):species===1?Math.min(12,left):species===2?Math.min(2,left):species===4?1:left;
      if(species===6&&left===4)n=2;
      if(species===0){if(left-n>0&&left-n<4)n=left>7?left-4:left;familyIndex++;}
      groups.push({species,count:n});left-=n;
    }
  }
  return groups;
}
export function habitatPreference(species,cell){
  const types=cell.livingPoints.map(p=>p.type);
  if(species==='reef_0')return types.includes('anemone')?12:types.includes('coral')?9:types.includes('mixed')?7:1;
  if(species==='reef_1')return types.includes('seagrass')&&cell.rockPoints.length?12:types.includes('mixed')?9:types.includes('seagrass')?6:cell.rockPoints.length?3:1;
  if(species==='reef_2')return types.includes('coral')?12:types.includes('mixed')?9:types.includes('anemone')?5:1;
  if(species==='reef_4')return types.includes('coral')&&cell.rockPoints.length?12:types.includes('mixed')?9:types.includes('seagrass')?5:2;
  return 1;
}
export function swimRhythm(species,time,phase=0){
  // Smooth bursts with a long glide, shared within a pair but different across groups.
  const wave=.5+.5*Math.sin(time*(species==='reef_0'?1.8:.63)+phase);
  const burst=Math.pow(wave,species==='reef_0'?8:3);
  if(species==='reef_0')return .35+burst*1.85;
  if(species==='reef_6')return .38+burst*.52;
  if(species==='reef_4')return .42+Math.pow(.5+.5*Math.sin(time*.42+phase),5)*.34;
  if(species==='reef_2')return .70+Math.pow(.5+.5*Math.sin(time*1.15+phase),5)*.46;
  return .72+burst*.52;
}
export function bottomClearance(scale=1){return Math.max(.32,scale*.48+.18);}

export function advanceBottomRest(fish,dt,nearBottom){
  const d=fish.userData;
  d.restState??='swim';d.restRemaining??=20+(d.phase||0)*4;
  if(d.restState==='swim'){
    d.restRemaining-=dt;
    if(d.restRemaining<=0&&nearBottom)d.restState='settling';
  }else if(d.restState==='settling'){
    if(!nearBottom){d.restState='swim';d.restRemaining=5;}
    else if(d.velocity.length()<.025){d.restState='sleep';d.restRemaining=120+((d.phase||0)*19)%120;d.velocity.set(0,0,0);}
  }else{
    d.restRemaining-=dt;
    if(d.restRemaining<=0){d.restState='swim';d.restRemaining=25+((d.phase||0)*7)%20;d.wokeUp=true;}
  }
  d.sleeping=d.restState==='sleep';
  const target=d.sleeping?1:0;
  d.eyeClosure=(d.eyeClosure||0)+(target-(d.eyeClosure||0))*(1-Math.exp(-dt*3));
  return d.restState;
}
