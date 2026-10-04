import {normalizeAnimalDesign,designPrompt} from './AnimalDesign.js';
const number={type:'number'},vector={type:'array',items:number,minItems:3,maxItems:3};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const ANIMAL_AI_SCHEMA=object({format:{type:'string',enum:['ocean-animal-design-v1']},species:{type:'string',enum:['orca']},name:{type:'string'},resolution:number,worldLength:number,
 form:object(Object.fromEntries(['length','girth','head','dorsal','flippers','flukes'].map(k=>[k,number]))),
 strokes:{type:'array',items:object({mode:{type:'string',enum:['add','remove','smooth']},point:vector,radius:number,strength:number,mirror:{type:'boolean'}})},
 skin:object({dark:{type:'string'},light:{type:'string'},saddle:{type:'string'},roughness:number,pores:number,scars:number,patchSize:number,seed:number,texture:{type:'null'},paint:{type:'array',items:object({point:vector,radius:number,color:{type:'string'},opacity:number,mirror:{type:'boolean'}})}}),
 motion:object({duration:number,amplitude:number,frequency:number,flipper:number,lag:number,roll:number,keys:{type:'array',items:object({time:number,bone:{type:'string'},rotation:vector})}})});
export function validateAIRequest(body){
 if(!body||typeof body!=='object')throw Error('Ongeldige AI-opdracht.');
 const design=normalizeAnimalDesign(body.design||{}),instruction=String(body.instruction||'').slice(0,3000),refs=body.references||[];
 if(!Array.isArray(refs)||refs.length>18)throw Error('Maximaal 18 referentiebeelden.');
 const references=refs.map(r=>{if(typeof r?.data!=='string'||r.data.length>1400000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(r.data))throw Error('Ongeldig referentiebeeld.');return {data:r.data,label:String(r.label||'Referentie').slice(0,100),time:typeof r.time==='number'&&Number.isFinite(r.time)?Math.max(0,Math.min(12,r.time)):null};});
 return {design,instruction,references};
}
export function buildAIRequest(body,{model,skin=false}={}){
 const {design,instruction,references}=validateAIRequest(body);const content=[{type:'input_text',text:skin?`Draw a detailed seamless cylindrical skin texture atlas for an orca, not a picture of an animal. No text, no lighting baked in, no background scene. Horizontal U: tail at left, head at right. Vertical V wraps body: belly at center, back at top and bottom edges. Fine natural pores, subtle healed scratches and mottling. Neutral white/light gray base with subtle skin detail; the simulator adds black/white orca marking masks separately. Respect references for detail and style. Current skin settings: ${JSON.stringify({...design.skin,texture:null})}. Request: ${instruction}`:designPrompt(design,instruction)}];
 for(const r of references){content.push({type:'input_text',text:r.time===null?r.label:`${r.label}; cyclus-tijd ${r.time} s`},{type:'input_image',image_url:r.data,detail:'high'});}
 const request={model,store:false,input:[{role:'user',content}]};
 if(skin)request.tools=[{type:'image_generation',size:'1536x1024',quality:'high'}];
 else{request.text={format:{type:'json_schema',name:'animal_design',strict:true,schema:ANIMAL_AI_SCHEMA}};request.max_output_tokens=14000;}
 return request;
}
export function readAIResponse(data,{skin=false}={}){
 if(data.status==='incomplete')throw Error('AI-ontwerp is onvolledig. Vraag minder bewerkingen in één stap.');
 if(skin){const result=data.output?.find(o=>o.type==='image_generation_call')?.result;if(!result)throw Error('AI heeft geen huidafbeelding teruggegeven.');return {texture:'data:image/png;base64,'+result};}
 const output=data.output?.flatMap(o=>o.content||[]),refusal=output?.find(c=>c.type==='refusal');if(refusal)throw Error('AI heeft dit ontwerp niet gegenereerd.');const text=output?.filter(c=>c.type==='output_text').map(c=>c.text).join('')||data.output_text;
 if(!text)throw Error('AI heeft geen ontwerp teruggegeven.');return {design:normalizeAnimalDesign(JSON.parse(text))};
}
