// Species policy separated from scene rendering for deterministic checks.
export const SPECIES_POLICY={
  reef_0:{kind:'pair',cruiseSpeed:1.05,cohesion:.85,alignment:.28,separation:.38,habitatPull:1.1,exploration:.03},
  reef_1:{kind:'shoal',cruiseSpeed:1.15,cohesion:.62,alignment:.72,separation:.78,habitatPull:.85,exploration:.12},
  reef_6:{kind:'bottom',cruiseSpeed:.48,cohesion:.25,alignment:.24,separation:.85,habitatPull:1.05,exploration:.04},
};
export function populationPlan(count){
  const counts=Array.from({length:8},(_,i)=>Math.floor(count/8)+(i<count%8?1:0));
  if(counts[0]%2){counts[0]--;counts[1]++;}
  const groups=[];
  for(let species=0;species<8;species++){
    let left=counts[species];
    while(left){
      let n=species===0?2:species===6?Math.min(3,left):species===1?Math.min(12,left):left;
      if(species===6&&left===4)n=2;
      groups.push({species,count:n});left-=n;
    }
  }
  return groups;
}
export function habitatPreference(species,cell){
  const types=cell.livingPoints.map(p=>p.type);
  if(species==='reef_0')return types.includes('anemone')?12:types.includes('coral')?9:types.includes('mixed')?7:1;
  if(species==='reef_1')return types.includes('seagrass')&&cell.rockPoints.length?12:types.includes('mixed')?9:types.includes('seagrass')?6:cell.rockPoints.length?3:1;
  return 1;
}
export function swimRhythm(species,time,phase=0){
  // Smooth bursts with a long glide, shared within a pair but different across groups.
  const wave=.5+.5*Math.sin(time*(species==='reef_0'?1.8:.63)+phase);
  const burst=Math.pow(wave,species==='reef_0'?8:3);
  return species==='reef_0'?.35+burst*1.85:species==='reef_6'?.38+burst*.52:.72+burst*.52;
}
export function bottomClearance(scale=1){return Math.max(.32,scale*.48+.18);}
