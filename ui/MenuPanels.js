// Reuse the existing controls and their listeners; each control keeps its ID.
export function installMenuPanels({beforeOpen,onExpert}={}){
  const byId=id=>document.getElementById(id),hud=byId('hud');
  const dialogs=new Map();
  const labels={settings:['Settings','Beeld, details en modules'],design:['Design','Fish Studio en Fish Library'],build:['Build','Bodem, landschap en biodiversiteit'],save:['Save options','Bewaren, delen en de wereldatlas']};
  const navigation=document.createElement('nav');navigation.className='menu-clusters';navigation.setAttribute('aria-label','Hoofdmenu');
  hud.insertBefore(navigation,byId('ecosystemPanel'));
  for(const [name,[title,description]] of Object.entries(labels)){
    const button=document.createElement('button');button.type='button';button.dataset.menuPanel=name;
    button.setAttribute('aria-controls',`${name}Dialog`);button.setAttribute('aria-expanded','false');
    button.innerHTML=`<strong>${title}</strong><span>${description}</span>`;
    button.addEventListener('click',()=>open(name));navigation.append(button);
    const dialog=document.createElement('dialog');dialog.id=`${name}Dialog`;dialog.className='ocean-menu-dialog';
    dialog.setAttribute('aria-labelledby',`${name}DialogTitle`);
    dialog.innerHTML=`<header class="menu-panel-header"><div><h2 id="${name}DialogTitle">${title}</h2><p>${description}</p></div><button type="button" class="menu-close" aria-label="Sluit ${title}">✕</button></header><div class="menu-panel-body"></div>`;
    dialog.querySelector('.menu-close').addEventListener('click',()=>close());
    dialog.addEventListener('close',()=>button.setAttribute('aria-expanded','false'));
    dialog.addEventListener('keydown',event=>{if(event.code==='Escape'){event.preventDefault();event.stopPropagation();close();}});
    byId('app').append(dialog);dialogs.set(name,dialog);
  }
  const body=name=>dialogs.get(name).querySelector('.menu-panel-body');
  const section=(parent,title,opened=false)=>{
    const details=document.createElement('details');details.className='menu-section';details.open=opened;
    const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
    const content=document.createElement('div');content.className='menu-section-body';details.append(content);parent.append(details);return content;
  };
  const move=(parent,...ids)=>ids.forEach(id=>parent.append(byId(id)));
  const settings=body('settings'),graphics=byId('graphicsOptionsPanel');
  graphics.querySelector(':scope > summary').remove();
  const graphicsGroup=section(settings,'Graphics · beeld en kwaliteit',true);graphicsGroup.classList.add('graphics-panel');
  graphicsGroup.append(byId('visualStyle').closest('label'),byId('visualQuality').closest('label'));
  const detailGroup=section(settings,'Details · dieren en rif',true);detailGroup.classList.add('graphics-panel');
  const modules=section(settings,'Modules · tijd, licht, weer en stroming',true);
  move(modules,'weatherOptionsPanel','currentFlowPanel');
  // Put style and the four large animals first; sample-fish controls remain reachable.
  detailGroup.append(byId('fishRenderStyle').closest('label'),byId('fishStyleStatus'));
  for(const [suffix,label,status] of [['Whale','Whale · walvis','whaleStatus'],['Orca','Orca · orka','orcaStatus'],['Stingray','Stingray · rog','stingrayStatus'],['Turtle','Sea Turtle · zeeschildpad','turtleStatus']]){
    const animal=section(detailGroup,'Show '+label);
    for(const action of ['place','follow','remove']){const button=byId(action+suffix);if(button)animal.append(button);}
    move(animal,status);
  }
  for(const id of ['seabedDetail','reefDetail','microLifeEnabled','microSchoolsEnabled','microPlanktonEnabled'])detailGroup.append(byId(id).closest('label'));
  move(detailGroup,'microLifeStatus');
  const examples=section(detailGroup,'Rifvissen en voorbeeldscènes');
  while(graphics.firstChild)examples.append(graphics.firstChild);graphics.remove();

  const design=body('design');
  const designTools=byId('openFishLibrary').parentElement;
  byId('openFishLibrary').textContent='Fish Library · mijn visbibliotheek';
  byId('openFishStudioBtn').textContent='Fish Studio · ontwerpen';
  designTools.prepend(byId('openFishStudioBtn'));
  design.append(designTools);move(design,'fishFiles','importStatus');
  byId('schoolSize').setAttribute('aria-label','Aantal te importeren vissen');

  const build=body('build'),worldTools=byId('worldTools');build.append(worldTools);
  const basic=section(worldTools,'Build Your World · bodem, landschap en biodiversiteit',true);
  const expert=section(worldTools,'Expert · volumetrische rotsformaties');
  const expertButton=document.createElement('button');expertButton.id='openExpertBuild';expertButton.type='button';expertButton.textContent='Build your own Volumetric rock formations';
  const showExpert=()=>{basic.parentElement.open=false;expert.parentElement.open=true;};
  expertButton.addEventListener('click',()=>{onExpert?.();showExpert();});expert.append(expertButton);
  byId('editorSculptBtn').addEventListener('click',showExpert);
  for(const id of ['editorOverviewBtn','editorDetailBtn'])byId(id).addEventListener('click',()=>{basic.parentElement.open=true;expert.parentElement.open=false;});
  const ai=section(worldTools,'Generate AI World · prompt voor ChatGPT');
  const blueprintRow=byId('importBlueprintBtn').parentElement;ai.append(blueprintRow);
  const promptLabel=document.createElement('label');promptLabel.htmlFor='aiWorldDescription';promptLabel.textContent='Beschrijf je wereld';ai.prepend(promptLabel);
  const description=document.createElement('textarea');description.id='aiWorldDescription';description.rows=3;description.placeholder='Bijvoorbeeld: een tropisch rif met een diep ravijn en open zwemroutes.';promptLabel.after(description);
  const generate=document.createElement('button');generate.id='generateWorldPrompt';generate.type='button';generate.textContent='Maak prompt voor ChatGPT';description.after(generate);
  const prompt=document.createElement('textarea');prompt.id='aiWorldPrompt';prompt.rows=10;prompt.readOnly=true;prompt.hidden=true;prompt.setAttribute('aria-label','Prompt voor ChatGPT');generate.after(prompt);
  generate.addEventListener('click',()=>{
    prompt.value=`Maak een JSON-bouwplan voor Ocean Simulator. Wens: ${description.value.trim()||'Een levendig oceaanrif met open zwemroutes.'}\nLever alleen JSON met format "ocean-world-blueprint-v1", name, objects en terrain. objects: maximaal 1200 objecten met type (rocks, coral, anemone, sponge, seagrass of shell), x en z in meters tussen -144 en 144 binnen een hexagon met straal 144; scale 0.2–5; rotation in radialen. terrain: maximaal 650 punten met gehele ix/iz tussen -24 en 24 (raster 6 meter), offset -540 tot 16 meter ten opzichte van de bestaande bodem. Negatief verdiept de bodem. Laat ruime, verbonden zwemroutes tussen rotsen en zorg voor verspreid voedselhabitat. Voorbeeld: {"format":"ocean-world-blueprint-v1","name":"Mijn rif","objects":[{"type":"coral","x":12,"z":0,"scale":1,"rotation":0}],"terrain":[{"ix":0,"iz":0,"offset":-30}]}. Houd het plan binnen de bestaande importmogelijkheden.`;
    prompt.hidden=false;prompt.focus();prompt.select();
  });
  const save=body('save');save.id='saveWorldTools';
  const nameGroup=section(save,'Name Your World',true);move(nameGroup,'cloudWorldName');
  const shareGroup=section(save,'Share Your World',true);move(shareGroup,'shareWorldBtn');
  const atlasGroup=section(save,'Explore in Atlas',true);move(atlasGroup,'worldAtlasBtn');
  const saving=section(save,'Save Local / Save Online',true);
  saving.append(byId('saveWorldBtn').parentElement);move(saving,'cloudSaveBtn','cloudStatus');
  byId('saveWorldBtn').textContent='💾 Save Local';byId('cloudSaveBtn').textContent='☁ Save Online';
  // Remaining landscape controls retain their order; remove emptied action rows.
  for(const child of [...worldTools.children]){
    if(child===basic.parentElement||child===expert.parentElement||child===ai.parentElement)continue;
    if(child.classList.contains('toolrow')&&!child.children.length){child.remove();continue;}
    if(child.id==='volumeSculptTools')expert.append(child);
    else basic.append(child);
  }
  const intro=hud.querySelectorAll(':scope > p');if(intro[1])intro[1].remove();
  byId('ecosystemPanel').open=false;
  const shade=document.createElement('div');shade.className='menu-panel-shade';shade.hidden=true;shade.addEventListener('click',()=>close());byId('app').append(shade);
  function close(){
    const focused=document.activeElement;
    if([...dialogs.values()].some(dialog=>dialog.contains(focused)))focused.blur();
    for(const dialog of dialogs.values())if(dialog.open)dialog.close();
    for(const button of navigation.children)button.setAttribute('aria-expanded','false');
    shade.hidden=true;
  }
  function open(name){
    close();beforeOpen?.(name);
    const dialog=dialogs.get(name);if(!dialog)return;
    hud.classList.add('swimming');hud.classList.remove('settings-open');
    byId('journeyMenu').setAttribute('aria-expanded','false');
    shade.hidden=name==='build';dialog.show();
    navigation.querySelector(`[data-menu-panel="${name}"]`).setAttribute('aria-expanded','true');
  }
  addEventListener('pagehide',()=>close(),{once:true});
  return {open,close,get active(){return [...dialogs].find(([,dialog])=>dialog.open)?.[0]||null;}};
}
