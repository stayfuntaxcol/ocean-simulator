// Species policy separated from scene rendering for deterministic checks.
export const SPECIES_POLICY={
  reef_0:{kind:'family',cruiseSpeed:1.05,cohesion:.85,alignment:.28,separation:.38,habitatPull:1.1,exploration:.03,finRate:10},
  reef_1:{kind:'shoal',cruiseSpeed:1.15,cohesion:.62,alignment:.72,separation:.78,habitatPull:.85,exploration:.12},
  // Depth bands and speeds are tuned simulation preferences, not biological constants.
  reef_2:{kind:'coral-pair',cruiseSpeed:.62,cohesion:.68,alignment:.52,separation:.68,habitatPull:1.16,exploration:.035,depthMin:2,depthMax:35,reefHeight:.9,verticalSpeed:.35,finRate:7},
  reef_3:{kind:'tang',cruiseSpeed:.82,cohesion:.44,alignment:.60,separation:.72,habitatPull:1.05,exploration:.09,depthMin:2,depthMax:40,reefHeight:1.2,verticalSpeed:.30,finRate:7,swimRate:4.3,bodyClearance:1.3},
  reef_4:{kind:'puffer',cruiseSpeed:.30,cohesion:.16,alignment:.18,separation:1.12,habitatPull:1.05,exploration:.025,depthMin:3,depthMax:40,reefHeight:.55,verticalSpeed:.18,finRate:9},
  reef_5:{kind:'cardinal',cruiseSpeed:.32,cohesion:.72,alignment:.22,separation:.48,habitatPull:1.3,exploration:.018,depthMin:1,depthMax:20,reefHeight:.70,verticalSpeed:.15,finRate:9,swimRate:6,bodyClearance:1.3},
  reef_6:{kind:'bottom',cruiseSpeed:.48,cohesion:.25,alignment:.24,separation:.85,habitatPull:1.05,exploration:.04,finRate:3},
  reef_7:{kind:'chromis',cruiseSpeed:.72,cohesion:.82,alignment:.78,separation:.50,habitatPull:1.1,exploration:.055,depthMin:1,depthMax:35,reefHeight:1.8,verticalSpeed:.36,finRate:11,swimRate:8,bodyClearance:.9},
};
export function populationPlan(count){
  const counts=Array.from({length:8},(_,i)=>Math.floor(count/8)+(i<count%8?1:0));
  if(count>=32){const extra=Math.min(4,counts[3]);counts[0]+=extra;counts[3]-=extra;}
  const groups=[];let familyIndex=0;
  for(let species=0;species<8;species++){
    let left=counts[species];
    while(left){
      let n=species===0?Math.min(4+familyIndex%3,left):species===6?Math.min(3,left):species===1?Math.min(12,left):species===2?Math.min(2,left):species===4?1:left;
      if(species===3)n=Math.min(3,left);
      if(species===5)n=Math.min(4,left);
      if(species===7)n=Math.min(10,left);
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
  if(species==='reef_3')return types.includes('seagrass')&&cell.rockPoints.length?12:types.includes('mixed')?10:cell.rockPoints.length?8:types.includes('coral')?6:1;
  if(species==='reef_5')return types.includes('anemone')?13:types.includes('coral')?12:types.includes('mixed')?10:types.includes('seagrass')?6:1;
  if(species==='reef_7')return types.includes('coral')?13:types.includes('mixed')?10:types.includes('seagrass')?3:1;
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
  if(species==='reef_3')return .70+Math.pow(.5+.5*Math.sin(time*.60+phase),3)*.40;
  // Long hover intervals, then a brief relocation; pectorals remain active.
  if(species==='reef_5')return .03+Math.pow(.5+.5*Math.sin(time*.47+phase),10)*1.30;
  if(species==='reef_7')return .50+Math.pow(.5+.5*Math.sin(time*1.9+phase),5)*1.10;
  return .72+burst*.52;
}
export function bottomClearance(scale=1){return Math.max(.32,scale*.48+.18);}

export function reefTargetHeight(species,floor,habitatY=floor,variation=0,ceiling=18){
  const policy=SPECIES_POLICY[species];
  if(!policy?.reefHeight)return Math.min(ceiling,Math.max(floor+1.1,habitatY+1.2));
  // Habitat proximity wins over a nominal depth range in an unusually deep/shallow edited world.
  const anchor=Math.max(floor,Number.isFinite(habitatY)?habitatY:floor);
  const localMin=Math.max(floor+1.1,anchor+.35),localMax=Math.max(localMin,anchor+2.2);
  const preferred=anchor+policy.reefHeight+Math.max(-.3,Math.min(.3,variation));
  const bandMin=Math.max(localMin,20-policy.depthMax),bandMax=Math.min(localMax,20-policy.depthMin,ceiling);
  return bandMin<=bandMax?Math.max(bandMin,Math.min(bandMax,preferred)):Math.min(ceiling,Math.max(localMin,preferred));
}

export function reefMotionPace(species,distance,panic=0,inflation=0){
  if(!SPECIES_POLICY[species]?.reefHeight)return 1;
  // Ease into inspection/hover; do not keep circling a reached point at full cruise speed.
  const arrival=Math.max(.08,Math.min(1,distance/2));
  return Math.max(arrival,Math.min(1,panic))*(species==='reef_4'?1-Math.max(0,Math.min(1,inflation))*.65:1);
}

export function advanceFinPhase(fish,dt){
  if(!Number.isFinite(dt)||dt<=0||fish.userData.dead||fish.userData.sleeping||!fish.visible)return;
  const d=fish.userData,policy=SPECIES_POLICY[d.speciesId];
  if(!policy?.finRate)return;
  d.finPhase=(d.finPhase??d.phase??0)+dt*policy.finRate*(.55+Math.min(1.5,Math.max(0,d.motionSpeed||0)));
}

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
