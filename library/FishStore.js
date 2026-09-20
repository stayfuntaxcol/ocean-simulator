import {MAX_FISH_BYTES,labelGlb} from './FishFormat.js';

// Keep the lightweight gallery separate from GLBs and editable paint layers.
let database;
function openDatabase() {
  if(database)return database;
  database=new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(Error('Deze browser kan de visbibliotheek niet bewaren. Gebruik Chrome of Edge.'));return;}
    const request=indexedDB.open('ocean-fish-library',1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      const meta=db.createObjectStore('fish',{keyPath:'id'});meta.createIndex('hash','hash',{unique:true});
      db.createObjectStore('assets',{keyPath:'id'});
    };
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
    request.onerror=()=>{database=null;reject(request.error);};
    request.onblocked=()=>{database=null;reject(Error('Sluit andere studiotabbladen en probeer opnieuw.'));};
  });
  return database;
}
async function transaction(stores,mode,run) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(stores,mode);let result;
    tx.oncomplete=()=>resolve(result);
    tx.onerror=tx.onabort=()=>reject(tx.error?.name==='QuotaExceededError'?Error('De browseropslag is vol. Download een reservekopie en verwijder ongebruikte vissen.'):tx.error||Error('Bewaren is niet gelukt.'));
    run(tx,value=>{result=value;});
  });
}
export async function listFish() {
  return transaction(['fish'],'readonly',(tx,done)=>{tx.objectStore('fish').getAll().onsuccess=e=>done(e.target.result.sort((a,b)=>b.updatedAt-a.updatedAt));});
}
export async function getFish(id) {
  return transaction(['fish','assets'],'readonly',(tx,done)=>{
    let meta,asset;const finish=()=>{if(meta!==undefined&&asset!==undefined)done(meta&&asset?{...meta,...asset}:null);};
    tx.objectStore('fish').get(id).onsuccess=e=>{meta=e.target.result||null;finish();};
    tx.objectStore('assets').get(id).onsuccess=e=>{asset=e.target.result||null;finish();};
  });
}
export async function saveFish({id,blob,project=null,thumbnail='',name,author='',species='',source='studio'}) {
  if(!(blob instanceof Blob)||!blob.size||blob.size>MAX_FISH_BYTES)throw Error('Kies een GLB-bestand van maximaal 25 MB.');
  name=String(name||'').trim().slice(0,80);if(!name)throw Error('Geef je vis eerst een naam.');
  // Store the same labelled bytes that we share, so a downloaded backup can be
  // re-imported without duplicating its entry.
  const bytes=labelGlb(await blob.arrayBuffer(),{name,author});
  if(bytes.byteLength>MAX_FISH_BYTES)throw Error('Het complete deelbestand is groter dan 25 MB.');
  blob=new Blob([bytes],{type:'model/gltf-binary'});
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  return transaction(['fish','assets'],'readwrite',(tx,done)=>{
    const meta=tx.objectStore('fish');
    meta.index('hash').get(hash).onsuccess=e=>{
      const duplicate=e.target.result;
      if(duplicate&&duplicate.id!==id){done({id:duplicate.id,duplicate:true});return;}
      const write=old=>{
        const key=id||crypto.randomUUID(),now=Date.now();
        meta.put({id:key,name,author:String(author).trim().slice(0,60),species,source,hash,size:blob.size,thumbnail,editable:!!project,favorite:old?.favorite||false,createdAt:old?.createdAt||now,updatedAt:now});
        tx.objectStore('assets').put({id:key,blob,project});done({id:key,duplicate:false});
      };
      if(id)meta.get(id).onsuccess=event=>write(event.target.result);else write(null);
    };
  });
}
export async function updateFish(id,changes) {
  return transaction(['fish'],'readwrite',(tx,done)=>{
    const store=tx.objectStore('fish');store.get(id).onsuccess=e=>{
      const value=e.target.result;if(!value){done(false);return;}
      if(typeof changes.name==='string'&&changes.name.trim())value.name=changes.name.trim().slice(0,80);
      if(typeof changes.author==='string')value.author=changes.author.trim().slice(0,60);
      if(typeof changes.favorite==='boolean')value.favorite=changes.favorite;
      value.updatedAt=Date.now();store.put(value);done(true);
    };
  });
}
export async function deleteFish(id) {
  return transaction(['fish','assets'],'readwrite',(tx,done)=>{tx.objectStore('fish').delete(id);tx.objectStore('assets').delete(id);done(true);});
}
