import {listModels,readDesign} from './DesignStore.js';
import {animalKinds,animalSchema,GROUP_LABELS,releasedModelSettings,normalizeAnimalSettings} from '../animals/AnimalSettings.js';
export function createAnimalManager(container,{getSettings,applySettings,release,remove,edit,status=()=>{},canEdit=()=>true}){
 container.classList.add('animal-manager');const title=document.createElement('h2');title.textContent='Mijn dieren · bewaren en vrijlaten';
 const select=document.createElement('select');select.id='animal-library-select';select.setAttribute('aria-label','Opgeslagen diermodel');
 const count=document.createElement('input');count.id='animal-release-count';count.type='number';count.min=1;count.max=20;count.step=1;count.value=1;count.setAttribute('aria-label','Aantal vrijlaten');
 const button=document.createElement('button');button.id='animal-release';button.textContent='Vrijlaten in oceaan';
 const refresh=document.createElement('button');refresh.textContent='Ververs modelcollectie';const rows=document.createElement('div');rows.id='animal-active-controls';
 const hint=document.createElement('p');hint.textContent='Begin met één dier. Bewaar nieuwe GLB/glTF-modellen in Animal Design Studio; hier kun je elk opgeslagen model vrijlaten en het gedrag wijzigen.';
 container.append(title,select,count,button,refresh,hint,rows);let metadata=new Map();
 async function update(){
  const settings=getSettings();metadata=new Map();try{for(const row of await listModels())metadata.set(row.id,row);}catch(e){status('Modelcollectie laden mislukt: '+e.message);}
  for(const kind of animalKinds(settings)){const d=settings[kind].design;if(d?.id&&d.asset)metadata.set(d.id,{id:d.id,name:d.name,species:d.species,kind});}
  const selected=select.value;select.replaceChildren(...[...metadata.values()].map(row=>{const o=document.createElement('option');o.value=row.id;o.textContent=row.name;return o;}));if(metadata.has(selected))select.value=selected;button.disabled=!metadata.size||!canEdit();count.disabled=!canEdit();rows.replaceChildren();
  for(const kind of animalKinds(settings)){if(kind==='custom'||(!settings[kind].design&&!['orca','whale','turtle','stingray','squid'].includes(kind)))continue;
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=settings[kind].design?.name||({orca:'Orka',whale:'Walvis',turtle:'Zeeschildpad',stingray:'Stingray',squid:'Squid'}[kind]||kind);details.append(summary);
   for(const key of ['count','groupMode','groupDistance','personalSpace','cohesion','wander','speed','turnRate','depth','depthVariation','animationSpeed']){
    const schema=animalSchema(kind,settings)[key];if(!schema)continue;const label=document.createElement('label');label.textContent=schema.label+' ';const input=document.createElement(schema.type==='select'?'select':'input');input.dataset.kind=kind;input.dataset.setting=key;
    if(schema.type==='select'){for(const v of schema.options){const o=document.createElement('option');o.value=v;o.textContent=GROUP_LABELS[v]||v;input.append(o);}}else{input.type='number';input.min=schema.min;input.max=schema.max;input.step=schema.step;}input.value=settings[kind][key];input.disabled=!canEdit();
    input.onchange=()=>{if(!canEdit())return;const next=normalizeAnimalSettings(getSettings());next[kind][key]=schema.type==='select'&&typeof schema.value==='string'?input.value:Number(input.value);if(next[kind].design)next[kind].design.behavior={...next[kind].design.behavior,[key]:next[kind][key]};applySettings(normalizeAnimalSettings(next));input.value=getSettings()[kind][key];};label.append(input);details.append(label);
   }
   if(settings[kind].design?.asset){const label=document.createElement('label');label.textContent='Lengte in oceaan (m) ';const input=document.createElement('input');input.type='number';input.min=.05;input.max=30;input.step=.05;input.value=settings[kind].design.worldLength;input.disabled=!canEdit();input.onchange=()=>{if(!canEdit())return;const next=normalizeAnimalSettings(getSettings());next[kind].design.worldLength=Math.max(.05,Math.min(30,Number(input.value)||.05));applySettings(next);input.value=next[kind].design.worldLength;};label.append(input);details.append(label);}
   const releaseButton=document.createElement('button');releaseButton.textContent='Vrijlaten / aantal bijwerken';releaseButton.disabled=!canEdit();releaseButton.onclick=()=>{if(canEdit())release(kind);};const removeButton=document.createElement('button');removeButton.textContent='Haal deze dieren weg';removeButton.disabled=!canEdit();removeButton.onclick=()=>{if(canEdit())remove(kind);};details.append(releaseButton,removeButton);
   if(edit){const editButton=document.createElement('button');editButton.textContent='Open in Animal Design Studio';editButton.onclick=()=>edit(kind);details.append(editButton);}rows.append(details);
  }
 }
 refresh.onclick=()=>update();button.onclick=async()=>{if(!canEdit())return;button.disabled=true;try{const meta=metadata.get(select.value),current=getSettings();const design=meta?.kind?current[meta.kind].design:await readDesign('model:'+select.value);const result=releasedModelSettings(current,design,Math.round(Math.max(1,Math.min(20,Number(count.value)||1))));applySettings(result.settings);release(result.kind);await update();}catch(e){status('Vrijlaten mislukt: '+e.message);}finally{button.disabled=!metadata.size||!canEdit();}};
 update();return {refresh:update};
}
