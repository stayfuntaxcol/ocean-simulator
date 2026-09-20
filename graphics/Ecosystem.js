// Deterministic ecosystem calculations. Nothing in this module is persisted:
// carrying capacity is derived from the world layers that are already saved.
export const HABITAT_VALUES=Object.freeze({
  rocks:    Object.freeze({food:.15,shelter:3.5,nursery:.5,filtration:.3,biodiversity:.6}),
  coral:    Object.freeze({food:3.6,shelter:3.0,nursery:2.5,filtration:.8,biodiversity:3.0}),
  seagrass: Object.freeze({food:4.2,shelter:1.8,nursery:3.8,filtration:2.6,biodiversity:2.4}),
  sponge:   Object.freeze({food:2.0,shelter:2.1,nursery:1.6,filtration:4.0,biodiversity:2.8}),
  mixed:    Object.freeze({food:5.8,shelter:4.8,nursery:5.0,filtration:4.2,biodiversity:5.2})
});

export const ECOSYSTEM_STAGES=Object.freeze([
  Object.freeze({id:0,name:'Lege oceaan',description:'Geen voedselweb en geen natuurlijke vissen.'}),
  Object.freeze({id:1,name:'Pionierleven',description:'Plankton en klein bodemleven krijgen een eerste kans.'}),
  Object.freeze({id:2,name:'Jong rif',description:'Kleine rifbaarzen en kardinaalvissen verschijnen.'}),
  Object.freeze({id:3,name:'Groeiend rif',description:'Scholen en bodembewoners vinden voldoende voedsel.'}),
  Object.freeze({id:4,name:'Bloeiend rif',description:'Gezinnen en gespecialiseerde koraalvissen vestigen zich.'}),
  Object.freeze({id:5,name:'Rijk ecosysteem',description:'De volledige biodiversiteit van het rif is mogelijk.'})
]);

export const SPECIES_INTRODUCTION=Object.freeze([
  Object.freeze({species:7,name:'Kleine rifbaars',stage:2,min:4,maxGroup:10,weight:1.35,needs:h=>h.coral+h.mixed>=1}),
  Object.freeze({species:5,name:'Kardinaalvis',stage:2,min:2,maxGroup:4,weight:.85,needs:h=>h.sponge+h.coral+h.mixed>=1}),
  Object.freeze({species:1,name:'Blauwe rifvis',stage:3,min:5,maxGroup:12,weight:1.3,needs:h=>h.seagrass+h.mixed>=1&&h.rocks+h.coral+h.mixed>=1}),
  Object.freeze({species:6,name:'Groene platvis',stage:3,min:2,maxGroup:3,weight:.55,needs:h=>h.seagrass+h.mixed>=2}),
  Object.freeze({species:0,name:'Clownvisgezin',stage:4,min:4,maxGroup:6,weight:.8,needs:h=>h.sponge+h.mixed>=1&&h.coral+h.mixed>=1}),
  Object.freeze({species:2,name:'Koraalvlindervis',stage:4,min:2,maxGroup:2,weight:.65,needs:h=>h.coral+h.mixed>=3}),
  Object.freeze({species:3,name:'Doktersvis',stage:5,min:1,maxGroup:3,weight:.55,needs:h=>h.seagrass+h.coral+h.mixed>=4&&h.rocks+h.coral+h.mixed>=2}),
  Object.freeze({species:4,name:'Kogelvis',stage:5,min:1,maxGroup:1,weight:.3,needs:h=>h.coral+h.mixed>=4&&h.rocks+h.mixed>=1})
]);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const cleanCount=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;

export function normalizeHabitats(source={}){
  return Object.fromEntries(Object.keys(HABITAT_VALUES).map(type=>[type,cleanCount(source[type])]));
}

export function habitatResources(source={}){
  const habitats=normalizeHabitats(source),resources={food:0,shelter:0,nursery:0,filtration:0,biodiversity:0};
  for(const [type,count] of Object.entries(habitats))for(const key of Object.keys(resources))resources[key]+=HABITAT_VALUES[type][key]*count;
  return {habitats,resources};
}

function ecosystemStage(score,capacity,livingLayers){
  if(!livingLayers||capacity<=0)return 0;
  if(capacity<8||score<20)return 1;
  if(capacity<24||score<35)return 2;
  if(capacity<55||score<50)return 3;
  if(capacity<110||score<68)return 4;
  return 5;
}

export function evaluateEcosystem({habitats:source={},lavaVents=0,importedFish=0,naturalFish=0,megafaunaLoad=0,maxNaturalFish=220,capacityOverride=null}={}){
  const {habitats,resources}=habitatResources(source);
  const livingTypes=['coral','seagrass','sponge','mixed'].filter(type=>habitats[type]>0).length;
  const livingLayers=habitats.coral+habitats.seagrass+habitats.sponge+habitats.mixed;
  const structuralTypes=livingTypes+(habitats.rocks>0?1:0);
  const diversityFactor=livingLayers?clamp(.50+livingTypes*.105+(habitats.rocks>0?.08:0),.5,1):0;
  const balanceBase=Math.max(resources.food,resources.shelter,resources.nursery,1);
  const balance=clamp(Math.min(resources.food,resources.shelter*1.35,resources.nursery*1.45)/balanceBase,0,1);
  const lavaPressure=clamp(cleanCount(lavaVents)*.075,0,.72);
  const filtrationRatio=livingLayers?clamp(resources.filtration/(livingLayers*3),0,1):0;
  const quality=clamp((.48+filtrationRatio*.52)*(1-lavaPressure),0,1);
  const rawCapacity=livingLayers?Math.min(resources.food,resources.shelter*1.35,resources.nursery*1.45):0;
  const calculatedCapacity=Math.max(0,Math.floor(rawCapacity*diversityFactor*quality));
  const capacity=capacityOverride==null?calculatedCapacity:Math.max(0,Math.floor(Number(capacityOverride)||0));
  const maturity=clamp(livingLayers/36,0,1);
  const diversity=clamp(structuralTypes/5,0,1);
  const score=livingLayers?Math.round(100*(maturity*.34+diversity*.24+balance*.22+quality*.20)):0;
  const stageId=ecosystemStage(score,capacity,livingLayers),stage=ECOSYSTEM_STAGES[stageId];
  const imported=cleanCount(importedFish),natural=cleanCount(naturalFish),megafauna=Math.max(0,Number(megafaunaLoad)||0);
  // Natuurlijke populaties worden uitsluitend door het habitat bepaald. Importvissen
  // nemen dus geen soorten weg; zij gebruiken de overblijvende lokale voedselruimte.
  const naturalHabitatCapacity=Math.max(0,capacity-megafauna);
  const naturalTarget=stageId<2?0:Math.min(cleanCount(maxNaturalFish),Math.floor(naturalHabitatCapacity*.72));
  const totalLoad=imported+natural+megafauna;
  const supportRatio=totalLoad>0?clamp(capacity/totalLoad,0,1):1;
  const shortage=imported>0?clamp(1-supportRatio,0,1):0;
  return {habitats,resources,livingLayers,livingTypes,diversityFactor,balance,quality,lavaPressure,
    capacity,calculatedCapacity,score,stageId,stage,naturalTarget,importedFish:imported,naturalFish:natural,megafaunaLoad:megafauna,totalLoad,supportRatio,shortage};
}

function splitGroups(species,count,maxGroup,min){
  if(count<min)return [];
  let groupCount=Math.max(1,Math.ceil(count/maxGroup));
  while(groupCount>1&&Math.floor(count/groupCount)<min)groupCount--;
  const base=Math.floor(count/groupCount),extra=count%groupCount;
  return Array.from({length:groupCount},(_,index)=>({species,count:base+(index<extra?1:0)}));
}

export function naturalPopulationPlan(assessment){
  const target=cleanCount(assessment?.naturalTarget),stage=cleanCount(assessment?.stageId),habitats=normalizeHabitats(assessment?.habitats);
  if(!target||stage<2)return [];
  const eligible=SPECIES_INTRODUCTION.filter(item=>stage>=item.stage&&item.needs(habitats));
  if(!eligible.length)return [];
  const counts=new Map(eligible.map(item=>[item.species,0]));let remaining=target;
  // First establish complete, biologically recognisable groups in introduction order.
  for(const item of eligible)if(remaining>=item.min){counts.set(item.species,item.min);remaining-=item.min;}
  const weightTotal=eligible.reduce((sum,item)=>sum+item.weight,0);
  while(remaining>0){
    let chosen=eligible[0],best=-Infinity;
    for(const item of eligible){
      const desired=(target*item.weight/weightTotal),score=desired-(counts.get(item.species)||0);
      if(score>best){best=score;chosen=item;}
    }
    counts.set(chosen.species,(counts.get(chosen.species)||0)+1);remaining--;
  }
  return eligible.flatMap(item=>splitGroups(item.species,counts.get(item.species)||0,item.maxGroup,item.min));
}

export function ecosystemAdvice(assessment){
  if(!assessment?.livingLayers)return 'Begin met zeegras of koraal. Een lege oceaan kan geen vissen voeden.';
  if(assessment.shortage>.02)return `Voedseltekort: de oceaan ondersteunt ${assessment.capacity} visequivalenten, maar de belasting is ${Math.ceil(assessment.totalLoad)}. Voeg vooral zeegras, koraal en sponzen toe.`;
  if(assessment.lavaPressure>.18)return 'De lavabronnen drukken de waterkwaliteit. Bouw extra sponzen en zeegras of beperk het aantal bronnen.';
  const r=assessment.resources;
  if(r.food<=r.shelter*.7)return 'Voedsel is de zwakste schakel. Voeg zeegras, koraal of gemengde biodiversiteit toe.';
  if(r.shelter<=r.food*.62)return 'Er is te weinig beschutting. Voeg rotsen, koraal en sponzen toe.';
  if(r.nursery<=r.food*.72)return 'Er zijn te weinig kraamgebieden. Voeg zeegras, koraal en anemonen toe.';
  if(assessment.livingTypes<3)return 'Vergroot de biodiversiteit door verschillende habitattypen te combineren.';
  if(assessment.stageId<5)return 'De oceaan groeit gezond. Meer gevarieerd leefgebied ontgrendelt de volgende soorten.';
  return 'Voedsel, beschutting en kraamgebied zijn in balans. Er is ruimte voor hoge biodiversiteit.';
}

export function importedHealthStep(health,dt,{shortage=0,hazard=0}={}){
  const current=clamp(Number(health)||0,0,100),delta=clamp(Number(dt)||0,0,.25);
  const heat=clamp(Number(hazard)||0,0,1),lack=clamp(Number(shortage)||0,0,1);
  const damage=heat>0?1.2+heat*7.5:(lack>.01?.015+.265*Math.pow(lack,1.35):0);
  const recovery=damage===0?.12:0;
  return clamp(current+delta*(recovery-damage),0,100);
}
