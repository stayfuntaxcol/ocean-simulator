import {normalizeImportedAsset,ASSET_MAX_TEXT} from './ImportedAsset.js';
// Editable, portable source of truth. No generated meshes or executable AI code in saves.
export const DESIGN_FORMAT='ocean-animal-design-v1';
export const DESIGN_LIMITS={strokes:500,paint:64,keys:120,textureBytes:1400000};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,f,a,b)=>typeof v==='number'&&Number.isFinite(v)?clamp(v,a,b):f;
const vec=(v,f,a=-32,b=32)=>f.map((n,i)=>num(v?.[i],n,a,b));
const color=(v,f)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:f;
export const DEFAULT_FORM={length:40,girth:1,head:1,dorsal:.85,flippers:1,flukes:1};
export const DEFAULT_SKIN={dark:'#07131d',light:'#edf0df',saddle:'#626f78',roughness:.3,pores:.45,scars:.25,patchSize:1,seed:17,texture:null,paint:[]};
export const DEFAULT_MOTION={duration:3.1,amplitude:.23,frequency:1,flipper:.15,lag:.65,roll:.025,keys:[]};
const list=(v,name,max)=>{if(v==null)return [];const rows=Array.isArray(v)?v:typeof v==='object'&&Object.keys(v).every(k=>/^\d+$/.test(k))?Object.values(v):null;if(!rows||rows.length>max)throw Error(`${name}: ongeldig formaat of te veel bewerkingen.`);return rows;};
export function normalizeAnimalDesign(input={}){
 if(input.format&&input.format!==DESIGN_FORMAT)throw Error('Onbekend dierontwerp-formaat.');
 if(input.species&&input.species!=='orca')throw Error('Deze eerste sculpt-workbench ondersteunt de orka.');
 if(input.strokes?.length>DESIGN_LIMITS.strokes||input.skin?.paint?.length>DESIGN_LIMITS.paint||input.motion?.keys?.length>DESIGN_LIMITS.keys)throw Error('Dit ontwerp bevat te veel bewerkingen.');
 const f=input.form||{},s=input.skin||{},m=input.motion||{};
 const strokeRows=list(input.strokes,'Sculptuur',DESIGN_LIMITS.strokes),paintRows=list(s.paint,'Huid',DESIGN_LIMITS.paint),keyRows=list(m.keys,'Beweging',DESIGN_LIMITS.keys);
 const form={length:num(f.length,40,32,48),girth:num(f.girth,1,.75,1.25),head:num(f.head,1,.8,1.2),dorsal:num(f.dorsal,.85,.55,1.2),flippers:num(f.flippers,1,.75,1.2),flukes:num(f.flukes,1,.75,1.2)};
 const strokes=strokeRows.map(t=>({mode:['add','remove','smooth'].includes(t?.mode)?t.mode:'add',point:vec(t?.point,[0,0,0]),radius:num(t?.radius,1,.3,5),strength:num(t?.strength,.45,.05,1),mirror:t?.mirror!==false}));
 const skin={dark:color(s.dark,DEFAULT_SKIN.dark),light:color(s.light,DEFAULT_SKIN.light),saddle:color(s.saddle,DEFAULT_SKIN.saddle),roughness:num(s.roughness,.3,.08,.95),pores:num(s.pores,.45,0,1),scars:num(s.scars,.25,0,1),patchSize:num(s.patchSize,1,.65,1.35),seed:Math.round(num(s.seed,17,0,99999)),texture:null,paint:paintRows.map(p=>({point:vec(p?.point,[0,0,0]),radius:num(p?.radius,1,.15,5),color:color(p?.color,'#edf0df'),opacity:num(p?.opacity,1,.05,1),mirror:p?.mirror!==false}))};
 if(s.texture!=null){if(typeof s.texture!=='string'||s.texture.length>DESIGN_LIMITS.textureBytes||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s.texture))throw Error('Gebruik een PNG/JPEG/WebP skin van maximaal 1 MB.');skin.texture=s.texture;}
 const allowedBones=new Set(['torso','neck','head','jaw','dorsal','fluke-left','fluke-right',...Array.from({length:7},(_,i)=>'tail-'+(i+1)),...['left','right'].flatMap(side=>Array.from({length:3},(_,i)=>'flipper-'+side+'-'+(i+1)))]);
 if(keyRows.some(k=>!allowedBones.has(k?.bone)))throw Error('Een bewegingshouding verwijst naar een onbekend bot.');
 const duration=num(m.duration,3.1,.8,12);
 const motion={duration:num(m.duration,3.1,.8,12),amplitude:num(m.amplitude,.23,0,.55),frequency:num(m.frequency,1,.2,3),flipper:num(m.flipper,.15,0,.65),lag:num(m.lag,.65,0,1.8),roll:num(m.roll,.025,0,.15),keys:keyRows.map(k=>({time:num(k?.time,0,0,duration),bone:String(k?.bone||'tail-1').slice(0,40),rotation:vec(k?.rotation,[0,0,0],-.8,.8)})).sort((a,b)=>a.time-b.time)};
 return {format:DESIGN_FORMAT,species:'orca',name:String(input.name||'Orka · sculpt').slice(0,80),resolution:num(input.resolution,.4,.28,.7),worldLength:num(input.worldLength,12,input.asset ? .2 : 6,input.asset?30:14),form,strokes,skin,motion,...(input.asset?{asset:normalizeImportedAsset(input.asset)}:{})};
}
export function parseAnimalDesign(text){if(text.length>ASSET_MAX_TEXT+2200000)throw Error('Dierontwerp is te groot.');const input=JSON.parse(text);if(input.format!==DESIGN_FORMAT)throw Error('Geen Animal Design-bestand.');return normalizeAnimalDesign(input);}
export function designPrompt(design,instruction=''){
 const d=normalizeAnimalDesign(design);d.skin.texture=null;
 return `Ontwerp een overtuigende anatomische orka voor Ocean Animal Design Studio. Beoordeel meegegeven afbeeldingen en tijdgecodeerde videoframes. Retourneer uitsluitend het volledige JSON-ontwerp in onderstaand formaat, geen code. +X is de kop, -X de staart, +Y boven, Z links/rechts. Ontwerplengte 32–48, los van worldLength 6–14 meter. Behoud bewerkingen tenzij wijziging gevraagd. Gebruik form voor grote verhoudingen en strokes voor lokale add/remove/smooth-bewerkingen (punt in ontwerpeenheden, radius .3–5, strength .05–1, mirror). Maximaal 500 strokes. Skin: kleuren, pores/scars 0–1, patchSize .65–1.35, en max 64 paint-stippen op lokale 3D-punten met radius .15–5, color, opacity, mirror. Gebruik geen texture-data in je antwoord. Skeletnamen: torso, neck, head, jaw, dorsal, tail-1 t/m tail-7, fluke-left, fluke-right, flipper-left-1 t/m flipper-left-3 en flipper-right-1 t/m flipper-right-3. motion.keys bevat max 120 {time,bone,rotation:[x,y,z]} in radialen (max ±.8). Herhaal de zwemcyclus met motion.duration .8–12 seconden. Dat is een interpretatie van referenties, geen exacte 3D-motioncapture. Maak alle velden expliciet. Opdracht: ${instruction.slice(0,3000)}\nHuidig ontwerp:\n${JSON.stringify(d)}`;
}
