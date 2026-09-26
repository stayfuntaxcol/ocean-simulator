import { HEX, SIDES, neighborSide, arrivalPosition, parseWorldId } from './HexWorld.js';

export function validateWorldRecord(record) {
  if(!record||typeof record!=='object'||!record.world||![1,2,3,4].includes(record.world.version))throw Error('Dit wereldbestand wordt nog niet ondersteund.');
  const w=record.world;
  if(!Array.isArray(w.cells)||w.cells.length>20000||!Array.isArray(w.terrain??[]))throw Error('De wereld bevat ongeldige landschapsgegevens.');
  if(w.worldHalf!=null&&w.worldHalf!==HEX.radius)throw Error('Deze wereld heeft een andere maat en kan nog niet aansluiten.');
  for(const item of [...w.cells,...(w.terrain??[])])if(!item||!/^[-]?\d+,[-]?\d+$/.test(String(item.key)))throw Error('Een terreincoördinaat is ongeldig.');
  if((w.terrain??[]).some(t=>!Number.isFinite(t.offset)))throw Error('Een bodemhoogte is ongeldig.');
  for(const c of w.cells)if(c.layers!=null&&(!Array.isArray(c.layers)||c.layers.some(l=>!l||typeof l.type!=='string')))throw Error('Een landschapslaag is ongeldig.');
  return record;
}

// At most seven fetched worlds: current + six neighbours. Drafts are separate,
// never evicted silently. Existing v1-v4 records are read without rewriting them.
export function createWorldTravel({readWorld,capture,activate,getUserId=()=>null,onStatus=()=>{},onCache=()=>{},timeout=15000}) {
  const cache=new Map(),pending=new Map(),drafts=new Map(),positions=new Map();
  let current=null,busy=false,disposed=false;
  const copy=value=>structuredClone(value);
  const owned=r=>!r.ownerId||r.ownerId===getUserId();
  function setPosition(id,position) {
    if(!Number.isSafeInteger(position.hexQ)||!Number.isSafeInteger(position.hexR))throw Error('Kies een geldige positie.');
    for(const [other,p] of positions)if(other!==id&&p.hexQ===position.hexQ&&p.hexR===position.hexR)throw Error('Op deze positie staat al een wereld.');
    positions.set(id,{hexQ:position.hexQ,hexR:position.hexR});
  }
  function setCurrent(id,record,position) {
    validateWorldRecord(record);setPosition(id,position);current={id,record:copy(record)};cache.set(id,copy(record));prune();
  }
  function prune(){for(const id of cache.keys()){if(cache.size<=7)break;if(id!==current?.id)cache.delete(id);}}
  async function prefetch(id,{fresh=false}={}) {
    if(disposed)throw Error('Reissessie is afgesloten.');
    if(id==='local-world'){const r=drafts.get(id)??(current?.id===id?capture():null);if(!r)throw Error('Deze lokale wereld is niet beschikbaar.');return copy(r);}
    parseWorldId(id);
    if(!fresh&&cache.has(id))return copy(cache.get(id));
    if(pending.has(id)){
      if(!fresh)return pending.get(id);
      await pending.get(id);
      return prefetch(id,{fresh:true});
    }
    let timer;
    const request=Promise.race([Promise.resolve().then(()=>readWorld(id)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Laden duurt te lang. Je blijft in je huidige wereld.')),timeout);})])
      .then(record=>{validateWorldRecord(record);if(disposed)throw Error('Reissessie is afgesloten.');cache.delete(id);cache.set(id,copy(record));prune();onCache(id);return copy(record);})
      .finally(()=>{clearTimeout(timer);pending.delete(id);});
    pending.set(id,request);return request;
  }
  function neighbor(side){if(!current)return null;const a=positions.get(current.id),s=SIDES[side];if(!s)return null;return [...positions].find(([id,b])=>id!==current.id&&b.hexQ===a.hexQ+s.q&&b.hexR===a.hexR+s.r)?.[0]??null;}
  async function travelTo(id,exitPosition,{allowDistant=false,beforeActivate=null,mode='swim'}={}) {
    if(busy||disposed||!current||id===current.id)return false;
    const from=current,fromPosition=positions.get(from.id),toPosition=positions.get(id);
    const side=toPosition&&fromPosition?neighborSide(fromPosition,toPosition):-1;
    if(!toPosition||(!allowDistant&&side<0)){onStatus('Kies eerst een wereld die direct naast je ligt.');return false;}
    busy=true;onStatus('Doorgang voorbereiden…');let previous=null,activated=false;
    try{
      // Re-read through the adapter rather than trusting our preview cache.
      // The Firebase SDK may fall back to its cache offline; this is not a server-only guarantee.
      const remote=await prefetch(id,{fresh:true});
      previous=copy(capture());validateWorldRecord(previous);
      if(owned(previous)){
        const snapshot=copy(previous);const budget=[...drafts].filter(([key])=>key!==from.id).reduce((n,[,v])=>n+JSON.stringify(v).length,0)+JSON.stringify(snapshot).length;
        if(budget>32000000)throw Error('Bewaar of exporteer eerst je open bouwwerken; de reisbuffer is vol.');
        drafts.set(from.id,snapshot);
      }
      const destination=owned(remote)&&drafts.has(id)?copy(drafts.get(id)):remote;
      // Always honor the fresh owner's identity, even when an old local draft exists.
      destination.ownerId=remote.ownerId;destination.visibility=remote.visibility;
      // Zwemmen gebruikt de gedeelde grens. De atlas mag ook naar een verder
      // gelegen bekende wereld springen en zet de bezoeker dan veilig centraal.
      const arrival=side>=0
        ? arrivalPosition(fromPosition,toPosition,exitPosition)
        : {x:0,y:Number.isFinite(exitPosition?.y)?exitPosition.y:0,z:0};
      if(beforeActivate)await beforeActivate({from:from.id,to:id,direct:side<0});
      current={id,record:copy(destination)};activated=true;
      await activate(id,copy(destination),arrival,{from:from.id,toPosition,restoreDraft:destination!==remote,direct:side<0});
      onStatus(`${mode==='atlas'?'Je bent nu in':'Je zwemt nu in'} ${destination.name||'de volgende wereld'}.`);return true;
    }catch(error){
      current=from;
      if(activated&&previous){try{await activate(from.id,previous,exitPosition,{rollback:true,toPosition:fromPosition});}catch{onStatus('Terugzetten mislukte. Je bouwwerk blijft in de reisbuffer beschikbaar.');return false;}}
      onStatus(`Reizen niet gelukt: ${error.message}`);return false;
    }finally{busy=false;}
  }
  return {setPosition,setCurrent,prefetch,travelTo,neighbor,positions,
    get current(){return current;},get busy(){return busy;},get cacheSize(){return cache.size;},
    cached:id=>cache.has(id)?copy(cache.get(id)):null,
    draft:id=>drafts.has(id)?copy(drafts.get(id)):null,
    forgetDraft:id=>drafts.delete(id),
    dispose(){disposed=true;cache.clear();drafts.clear();positions.clear();}};
}
