// IndexedDB keeps larger skins out of localStorage's synchronous quota.
export async function designStore(){
 return new Promise((resolve,reject)=>{const r=indexedDB.open('ocean-animal-designs',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);});
}
export async function readDesign(key){const db=await designStore();try{return await new Promise((resolve,reject)=>{const t=db.transaction('drafts'),r=t.objectStore('drafts').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
export async function saveDesign(key,value){const db=await designStore();try{await new Promise((resolve,reject)=>{const t=db.transaction('drafts','readwrite');t.objectStore('drafts').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}finally{db.close();}}
