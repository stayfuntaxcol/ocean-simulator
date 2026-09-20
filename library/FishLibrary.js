import {listFish,getFish,updateFish,deleteFish} from './FishStore.js';
import {SPECIES_NAMES,formatBytes} from './FishFormat.js';
import {createThumbnails,importFishFile,downloadFish} from './FishAssets.js';

function element(tag,className,text) {const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}

export function installFishLibrary({onOpen=()=>{},onPlace,onEdit,onNew,canPlace=()=>true,placeLabel='Voeg toe aan mijn oceaan',getCount=()=>8}={}) {
  const dialog=element('dialog','fish-library');dialog.id='fishLibraryDialog';dialog.setAttribute('aria-labelledby','fishLibraryTitle');
  // Static markup only. User names, credits and errors always use textContent.
  dialog.innerHTML=`
    <header class="fl-header"><div><span class="fl-eyebrow">FISH STUDIO / COLLECTIE</span><h2 id="fishLibraryTitle">Mijn visbibliotheek</h2><p>Jouw ontwerpen, klaar voor een nieuwe oceaan.</p></div><button class="fl-close" aria-label="Sluit visbibliotheek">✕</button></header>
    <div class="fl-toolbar"><label class="fl-search">Zoek een vis<input type="search" placeholder="Naam, maker of soort…" aria-label="Zoek in visbibliotheek"></label><label>Toon<select class="fl-filter"><option value="all">Alle vissen</option><option value="favorite">Favorieten</option><option value="editable">Bewerkbare ontwerpen</option><option value="bestand">Toegevoegde bestanden</option></select></label><button class="fl-import">Bestanden toevoegen</button><button class="fl-new fl-primary">+ Ontwerp een vis</button><input class="fl-files" type="file" accept=".glb,model/gltf-binary" multiple hidden></div>
    <div class="fl-message" role="status" aria-live="polite"></div>
    <div class="fl-content"><section class="fl-gallery" aria-label="Opgeslagen vissen"><div class="fl-summary"></div><div class="fl-grid"></div><div class="fl-empty"><div class="fl-empty-icon">≈</div><h3>Geef je vissen een thuis</h3><p>Bewaar je ontwerp vanuit de studio of voeg bestaande GLB-bestanden toe. Je kunt meerdere bestanden tegelijk kiezen of hierheen slepen.</p><button class="fl-empty-import">Voeg je eerste vissen toe</button></div></section><aside class="fl-detail" aria-label="Geselecteerde vis"></aside></div>
    <footer class="fl-footer"><span>Op dit apparaat · geen Firebase-verbruik</span><span>Gebruik dezelfde browser en website. Download deelbestanden als reservekopie; gewiste browsergegevens verwijderen deze collectie.</span></footer>`;
  document.body.append(dialog);
  const $=selector=>dialog.querySelector(selector),grid=$('.fl-grid'),detail=$('.fl-detail'),message=$('.fl-message');
  let items=[],selected=null,busy=false,loadRevision=0;
  const say=(text,error=false)=>{message.textContent=text;message.classList.toggle('fl-error',error);};
  function button(text,action,className='') {const b=element('button',className,text);b.type='button';b.onclick=()=>task(action);return b;}
  async function task(action) {
    if(busy)return;busy=true;dialog.setAttribute('aria-busy','true');
    dialog.querySelectorAll('button').forEach(b=>{if(!b.classList.contains('fl-close')){b.dataset.wasDisabled=String(b.disabled);b.disabled=true;}});
    try{await action();}catch(error){say(error.message||'Deze actie is niet gelukt.',true);}
    finally{busy=false;dialog.removeAttribute('aria-busy');dialog.querySelectorAll('button[data-was-disabled]').forEach(b=>{b.disabled=b.dataset.wasDisabled==='true';delete b.dataset.wasDisabled;});if(dialog.open)await refresh();}
  }
  function draw() {
    const query=$('.fl-search input').value.trim().toLocaleLowerCase(),filter=$('.fl-filter').value;
    const visible=items.filter(f=>(filter==='all'||filter==='favorite'&&f.favorite||filter==='editable'&&f.editable||filter==='bestand'&&f.source==='bestand')&&[f.name,f.author,SPECIES_NAMES[f.species]||'GLB-model'].join(' ').toLocaleLowerCase().includes(query));
    $('.fl-summary').textContent=`${items.length} ${items.length===1?'ontwerp':'ontwerpen'} · ${items.length?formatBytes(items.reduce((n,f)=>n+f.size,0)):'0 KB'} lokaal bewaard`;
    grid.replaceChildren();
    $('.fl-empty').hidden=items.length>0;
    if(items.length&&!visible.length)grid.append(element('p','fl-no-results','Geen vissen gevonden. Probeer een andere naam of filter.'));
    for(const item of visible) {
      const card=element('button','fl-card');card.type='button';card.setAttribute('aria-label',`Bekijk ${item.name}`);card.setAttribute('aria-pressed',String(item.id===selected));
      const image=element('img');image.src=item.thumbnail;image.alt=item.name;image.loading='lazy';
      const info=element('div','fl-card-info');info.append(element('span','fl-card-type',item.editable?'BEWERKBAAR ONTWERP':'GLB-MODEL'),element('strong','',item.name),element('span','fl-card-sub',item.author?`Door ${item.author}`:SPECIES_NAMES[item.species]||'Eigen vismodel'));
      card.append(image,info);if(item.favorite)card.append(element('span','fl-star','★'));
      card.onclick=()=>{selected=item.id;draw();drawDetail();if(innerWidth<=700)detail.scrollIntoView({behavior:'smooth',block:'start'});};grid.append(card);
    }
  }
  function drawDetail() {
    detail.replaceChildren();const item=items.find(f=>f.id===selected);
    if(!item){detail.append(element('p','fl-hint','Selecteer een vis om hem te bekijken, te delen of in je oceaan te plaatsen.'));return;}
    const image=element('img','fl-detail-image');image.src=item.thumbnail;image.alt=item.name;detail.append(image);
    const heading=element('div','fl-detail-heading');heading.append(element('h3','',item.name));
    const favorite=button(item.favorite?'★':'☆',async()=>{await updateFish(item.id,{favorite:!item.favorite});},'fl-favorite');favorite.setAttribute('aria-label',item.favorite?'Verwijder favoriet':'Maak favoriet');favorite.setAttribute('aria-pressed',String(item.favorite));heading.append(favorite);detail.append(heading);
    detail.append(element('p','fl-hint',`${SPECIES_NAMES[item.species]||'Eigen GLB-model'} · ${formatBytes(item.size)} · ${new Date(item.updatedAt).toLocaleDateString('nl-NL')}`));
    const form=element('div','fl-fields'),nameLabel=element('label','','Naam'),name=element('input');name.value=item.name;name.maxLength=80;nameLabel.append(name);
    const authorLabel=element('label','','Maker (optioneel)'),author=element('input');author.value=item.author;author.maxLength=60;authorLabel.append(author);
    form.append(nameLabel,authorLabel,button('Naam en maker bewaren',async()=>{if(!name.value.trim())throw Error('Vul een naam in.');await updateFish(item.id,{name:name.value,author:author.value});say('Naam en maker bewaard.');},'fl-subtle'));
    if(onPlace){
      const placement=element('div','fl-placement'),countLabel=element('label','','Aantal vissen'),count=element('select');count.setAttribute('aria-label','Aantal vissen uit bibliotheek');
      for(const n of [1,8,20,50]){const option=element('option','',n===1?'1 vis':`${n} vissen`);option.value=n;count.append(option);}count.value=String([1,8,20,50].includes(Number(getCount()))?getCount():8);countLabel.append(count);placement.append(countLabel);
      const place=button(placeLabel,async()=>{const record=await getFish(item.id);if(!record)throw Error('Deze vis is niet meer beschikbaar.');if(!canPlace())throw Error('Je kunt alleen vissen toevoegen aan een wereld die je mag bewerken.');await onPlace(record,Number(count.value));say(`${count.value} vissen toegevoegd. Bibliotheek blijft bewaard op dit apparaat.`);},'fl-primary');place.disabled=!canPlace();placement.append(place);
      if(!canPlace())placement.append(element('p','fl-hint','Open een eigen wereld om vissen toe te voegen.'));detail.append(placement);
    }
    const actions=element('div','fl-actions');
    if(onEdit){const edit=button('Verder ontwerpen',async()=>{const record=await getFish(item.id);if(!record?.project)throw Error('Dit GLB-bestand heeft geen bewerkbare verflagen.');await onEdit(record);dialog.close();});edit.disabled=!item.editable;actions.append(edit);}
    actions.append(button('Download deelbestand',async()=>{const record=await getFish(item.id);if(!record)throw Error('Deze vis is niet meer beschikbaar.');await downloadFish(record);say('Deelbestand gedownload. Stuur het zelf door; de ontvanger kiest ‘Bestanden toevoegen’.');}));detail.append(actions);
    detail.append(element('p','fl-hint',item.editable?'Het deelbestand bevat de 3D-vis én je bewerkbare verflagen.':'Ouder GLB-bestand: je kunt deze vis plaatsen en delen. De oorspronkelijke verflagen ontbreken.'));
    const metadata=element('details','fl-metadata');metadata.append(element('summary','','Naam en maker aanpassen'),form);detail.append(metadata);
    detail.append(button('Verwijder uit bibliotheek',async()=>{
      if(!confirm(`‘${item.name}’ uit deze browser verwijderen? Download eerst een deelbestand als je een reservekopie wilt. Vissen die al zwemmen blijven staan.`))return;
      await deleteFish(item.id);selected=null;say('Vis uit de bibliotheek verwijderd.');
    },'fl-delete'));
  }
  async function refresh() {
    const revision=++loadRevision;
    try{const next=await listFish();if(revision!==loadRevision)return;items=next;if(!items.some(f=>f.id===selected))selected=items[0]?.id||null;draw();drawDetail();}
    catch(error){say(error.message||'De bibliotheek is niet beschikbaar.',true);}
  }
  async function importFiles(files) {
    const batch=Array.from(files);if(!batch.length||busy)return;
    await task(async()=>{
      const thumbnails=createThumbnails();let added=0,duplicates=0;const failures=[];
      try{for(let i=0;i<batch.length;i++){
        const file=batch[i];say(`Vis ${i+1} van ${batch.length} verwerken: ${file.name}…`);
        try{const result=await importFishFile(file,thumbnails);selected=result.id;result.duplicate?duplicates++:added++;}
        catch(error){failures.push(`${file.name}: ${error.message}`);}
      }}finally{thumbnails.dispose();}
      say(`${added} toegevoegd${duplicates?` · ${duplicates} al aanwezig`:''}${failures.length?` · ${failures.join(' · ')}`:'. Je vindt ze voortaan hier terug.'}`,failures.length>0);
    });
  }
  $('.fl-close').onclick=()=>dialog.close();
  $('.fl-search input').oninput=draw;$('.fl-filter').onchange=draw;
  $('.fl-import').onclick=$('.fl-empty-import').onclick=()=>$('.fl-files').click();
  $('.fl-files').onchange=async()=>{await importFiles($('.fl-files').files);$('.fl-files').value='';};
  $('.fl-new').onclick=()=>task(async()=>{await onNew?.();dialog.close();});$('.fl-new').hidden=!onNew;
  dialog.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dialog.classList.add('fl-dragging');}});
  dialog.addEventListener('dragleave',e=>{if(!dialog.contains(e.relatedTarget))dialog.classList.remove('fl-dragging');});
  dialog.addEventListener('drop',e=>{e.preventDefault();dialog.classList.remove('fl-dragging');importFiles(e.dataTransfer.files);});
  dialog.addEventListener('keydown',e=>{e.stopPropagation();});
  addEventListener('focus',()=>{if(dialog.open&&!busy)refresh();});
  return {async open(id){onOpen();if(id)selected=id;if(!dialog.open)dialog.showModal();await refresh();$('.fl-search input').focus();},close:()=>dialog.close(),refresh,importFiles,get isOpen(){return dialog.open;}};
}
