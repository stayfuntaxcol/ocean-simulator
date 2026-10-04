import {normalizeAnimalDesign} from './design/AnimalDesign.js';
// One schema drives the studio, world saves and model/behaviour limits.
const n=(label,value,min,max,step=.01,group='Beweging')=>({label,value,min,max,step,group,type:'number'});
const b=(label,value,group='Gedrag')=>({label,value,group,type:'boolean'});
const choice=(label,value,options,group='Groep')=>({label,value,options,group,type:'select'});
export const ANIMAL_SCHEMA={
 orca:{size:n('Grootte',1.25,.6,1.8,.01,'Model'),dorsal:n('Rugvin',.65,.35,1.2,.01,'Model'),flippers:n('Zijvinnen',1.15,.6,1.6,.01,'Model'),tail:n('Staartbreedte',1.1,.7,1.5,.01,'Model'),roughness:n('Huidruwheid',.32,.1,.9,.01,'Model'),speed:n('Kruissnelheid (m/s)',2.8,.6,5),huntSpeed:n('Voedselsprint (m/s)',4.2,1,7),turnRate:n('Draaisnelheid',.6,.15,1.5),stroke:n('Staartslag',1,.3,2),count:choice('Volwassen orka’s',1,[1,3,8]),feeding:b('Dode importvissen eten',false),turtleHunting:b('Bij schaarste jonge schildpadden eten',false),hungerRate:n('Honger per minuut',1.5,0,10,.1,'Voeding'),meal:n('Voedingswaarde per vis',18,2,50,1,'Voeding'),huntThreshold:n('Jagen vanaf honger (%)',35,5,90,1,'Voeding'),sense:n('Zoekafstand (m)',65,15,120,1,'Voeding'),calfSize:n('Grootte jong',.48,.25,.65,.01,'Groep'),familyDistance:n('Afstand moeder en jong (m)',9,5,20,.5,'Groep'),surfaceInterval:n('Ademcyclus (s)',90,30,240,1,'Ademen'),surfaceDuration:n('Tijd aan oppervlak (s)',7,3,15,1,'Ademen')},
 whale:{size:n('Grootte',1.18,.65,1.5,.01,'Model'),dorsal:n('Rugvin',1.15,.6,1.8,.01,'Model'),flippers:n('Zijvinnen',1.12,.6,1.4,.01,'Model'),tail:n('Staartbreedte',1.2,.7,1.5,.01,'Model'),roughness:n('Huidruwheid',.54,.15,.9,.01,'Model'),speed:n('Kruissnelheid (m/s)',1.6,.5,3.5),turnRate:n('Draaisnelheid',.18,.08,.6),stroke:n('Staartslag',1.8,.5,2.6),count:choice('Walvissen',1,[1,2,3]),surfaceInterval:n('Ademcyclus (s)',118,35,300,1,'Ademen'),surfaceDuration:n('Tijd aan oppervlak (s)',9,4,18,1,'Ademen'),migration:b('Samen migreren',true),residence:n('Verblijf per wereld (s)',300,60,1200,5,'Migratie'),returnTime:n('Terugkeer zonder buurwereld (s)',90,15,600,5,'Migratie'),groupDistance:n('Afstand tussen dieren (m)',26,20,50,1,'Groep')},
 turtle:{size:n('Volwassen grootte',1,.6,1.6,.01,'Model'),shellHeight:n('Hoogte schild',.85,.6,1.2,.01,'Model'),flippers:n('Zijvinnen',1.1,.6,1.6,.01,'Model'),roughness:n('Huidruwheid',.6,.2,.9,.01,'Model'),age:n('Startleeftijd (jaar)',0,0,100,1,'Levensloop'),adultAge:n('Volwassen vanaf (jaar)',30,15,60,1,'Levensloop'),oldAge:n('Solistisch vanaf (jaar)',80,65,120,1,'Levensloop'),babyScale:n('Grootte pasgeboren',.22,.12,.4,.01,'Levensloop'),speed:n('Volwassen snelheid (m/s)',1.2,.4,2.5),babySpeed:n('Jonge snelheid (m/s)',.45,.15,.9),stroke:n('Flipperslag',1,.4,2),turnRate:n('Draaisnelheid',.8,.2,1.5),migration:b('Migreren en ouder worden',true),residence:n('Verblijf per wereld (s)',420,60,1800,5,'Migratie'),returnTime:n('Terugkeer zonder buurwereld (s)',90,15,600,5,'Migratie'),groupDistance:n('Afstand in stoet (m)',1.5,.8,4,.1,'Groep')},
 stingray:{size:n('Grootte',1.2,.6,1.8,.01,'Model'),roughness:n('Huidruwheid',.56,.2,.9,.01,'Model'),speed:n('Kruissnelheid (m/s)',.95,.3,2),stroke:n('Golfbeweging',1,.4,2),turnRate:n('Draaisnelheid',.6,.2,1.2),count:choice('Roggen',1,[1,3,8])}
};
export const ANIMAL_KINDS=Object.keys(ANIMAL_SCHEMA);
export function normalizeAnimalSettings(input={}){
 const out={version:1};
 for(const kind of ANIMAL_KINDS){out[kind]={};for(const [key,s] of Object.entries(ANIMAL_SCHEMA[kind])){
  const v=input?.[kind]?.[key];out[kind][key]=s.type==='boolean'?(typeof v==='boolean'?v:s.value):s.type==='select'?(s.options.includes(Number(v))?Number(v):s.value):(typeof v==='number'&&Number.isFinite(v)?Math.max(s.min,Math.min(s.max,v)):s.value);
 }}
 if(input?.orca?.design){out.orca.design=normalizeAnimalDesign(input.orca.design);}
 return out;
}
export const DEFAULT_ANIMAL_SETTINGS=normalizeAnimalSettings();
export function turtleLife(age,settings=DEFAULT_ANIMAL_SETTINGS.turtle){
 const maturity=Math.max(0,Math.min(1,age/settings.adultAge)),old=Math.max(0,Math.min(1,(age-settings.adultAge)/(settings.oldAge-settings.adultAge)));
 return {maturity,old,scale:settings.size*(settings.babyScale+(1-settings.babyScale)*maturity),speed:settings.babySpeed+(settings.speed-settings.babySpeed)*maturity,beat:(4.6-3*maturity)*(1-.25*old)*settings.stroke,groupSize:age>=settings.oldAge?1:Math.max(2,Math.round(20-18*age/settings.oldAge))};
}
export function animalPreset(name){const s=normalizeAnimalSettings();if(name==='cinematic'){s.orca.speed=2.2;s.whale.stroke=2.3;s.whale.speed=1.3;}if(name==='family'){s.orca.feeding=true;s.orca.count=3;s.whale.count=2;s.stingray.count=3;}return s;}
export function parseAnimalPreset(text){const data=JSON.parse(text);if(data.format!=='ocean-animal-studio-v1'||!data.settings)throw Error('Geen Animal Studio-preset.');return normalizeAnimalSettings(data.settings);}
