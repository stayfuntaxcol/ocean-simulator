export const OCEAN_TRAITS=Object.freeze({
  O:{name:'Openheid',short:'avontuurlijk'},
  C:{name:'Zorgvuldigheid',short:'doelgericht'},
  E:{name:'Extraversie',short:'sociaal'},
  A:{name:'Meegaandheid',short:'coöperatief'},
  N:{name:'Neuroticisme',short:'waakzaam'}
});

export const OCEAN_PRESETS=Object.freeze([
  {id:'balanced',name:'Evenwichtige zwemmer',description:'Past zich rustig aan, blijft bij de school en zoekt op tijd nieuw voedsel.',traits:{O:50,C:65,E:65,A:70,N:45}},
  {id:'explorer',name:'Nieuwsgierige ontdekker',description:'Verkent graag onbekend water en neemt meer risico om nieuwe voedselplekken te vinden.',traits:{O:88,C:45,E:55,A:55,N:24}},
  {id:'shoal',name:'Sociale schoolvis',description:'Zoekt actief soortgenoten, zwemt compact en voelt zich veilig in een grotere school.',traits:{O:42,C:65,E:92,A:84,N:66}},
  {id:'forager',name:'Voorzichtige foerageerder',description:'Spaart energie, controleert voedsel vroeg en vermijdt lang verblijf in uitgeputte zones.',traits:{O:34,C:92,E:52,A:76,N:72}},
  {id:'territorial',name:'Territoriale durfal',description:'Zwemt zelfstandiger, bewaakt ruimte en wijkt minder snel voor onrust of concurrentie.',traits:{O:62,C:58,E:24,A:18,N:22}}
]);

const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const preset=id=>OCEAN_PRESETS.find(item=>item.id===id)||OCEAN_PRESETS[0];

export function oceanProfileDescription(traits){
  const values=Object.entries(OCEAN_TRAITS).map(([key,value])=>({key,...value,value:clamp(traits?.[key])})).sort((a,b)=>b.value-a.value);
  const first=values[0],second=values[1],low=values.at(-1);
  return `Vooral ${first.short} en ${second.short}; ${low.name.toLowerCase()} is minder sterk aanwezig.`;
}

export function normalizeOceanProfile(value,fallback='balanced'){
  const base=preset(typeof value?.presetId==='string'?value.presetId:fallback);
  const traits={};
  for(const key of Object.keys(OCEAN_TRAITS))traits[key]=clamp(value?.traits?.[key]??base.traits[key]);
  const name=String(value?.name||base.name).trim().slice(0,60)||base.name;
  const presetId=OCEAN_PRESETS.some(item=>item.id===value?.presetId)?value.presetId:'custom';
  const description=String(value?.description||(presetId==='custom'?oceanProfileDescription(traits):base.description)).trim().slice(0,240);
  return {version:1,presetId,name,description,traits};
}

export function oceanPreset(id){return normalizeOceanProfile({...preset(id),presetId:id});}

export function individualOceanTraits(profile,random=Math.random,spread=6){
  const base=normalizeOceanProfile(profile),traits={};
  for(const key of Object.keys(OCEAN_TRAITS))traits[key]=clamp(base.traits[key]+(random()*2-1)*spread);
  return traits;
}

export function oceanBehavior(profile){
  const {traits}=normalizeOceanProfile(profile),O=traits.O/100,C=traits.C/100,E=traits.E/100,A=traits.A/100,N=traits.N/100;
  return {
    cohesion:.38+E*.34+A*.12,
    alignment:.38+E*.34+C*.08,
    separation:.98-A*.24-E*.10,
    habitatPull:.54+C*.32+N*.10,
    exploration:.06+O*.30-C*.07,
    cruiseSpeed:1.10+E*.22+O*.10,
    foodSeekThreshold:.58+C*.25+N*.08,
    metabolism:Math.max(.82,Math.min(1.18,1+O*.15+N*.10-C*.22)),
    panicSensitivity:.72+N*.56-A*.10
  };
}

export function formatOceanTraits(traits){
  return Object.keys(OCEAN_TRAITS).map(key=>`${key} ${clamp(traits?.[key])}`).join(' · ');
}

export const ECOLOGY_CYCLE_SECONDS=300;
export function ecologicalAge(ageSeconds=0){
  const seconds=Math.max(0,Number(ageSeconds)||0),cycles=Math.floor(seconds/ECOLOGY_CYCLE_SECONDS),days=Math.floor(cycles/24),minutes=Math.floor(seconds/60);
  const label=days?`${days} ${days===1?'ecologische dag':'ecologische dagen'} · ${cycles} cycli`:cycles?`${cycles} ${cycles===1?'cyclus':'cycli'} · ${minutes} ecologische minuten`:`${minutes} ecologische ${minutes===1?'minuut':'minuten'} · 0 cycli`;
  return {seconds,cycles,days,minutes,label};
}
