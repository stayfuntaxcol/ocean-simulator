// Complete owned-world snapshots survive navigation and browser reloads.
// A transaction must finish before travel can clear the active landscape.
let connection;
function database(){
  return connection??=(new Promise((resolve,reject)=>{
    const request=indexedDB.open('ocean-world-drafts-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{connection=null;reject(request.error);};
  }));
}
async function transaction(mode,ownerId,worldId,value){
  const db=await database(),key=JSON.stringify([ownerId||'local',worldId]);
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts',mode),store=tx.objectStore('drafts');
    const request=mode==='readonly'?store.get(key):value===undefined?store.delete(key):store.put(value,key);
    tx.oncomplete=()=>resolve(request.result??null);
    tx.onabort=()=>reject(tx.error||new Error('Wereld bewaren is afgebroken.'));
    tx.onerror=()=>reject(tx.error||request.error);
  });
}
export const readWorldDraft=(ownerId,worldId)=>transaction('readonly',ownerId,worldId);
export const writeWorldDraft=(ownerId,worldId,record)=>transaction('readwrite',ownerId,worldId,record);
export const deleteWorldDraft=(ownerId,worldId)=>transaction('readwrite',ownerId,worldId);
