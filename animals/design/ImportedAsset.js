// Portable, self-contained glTF payloads. References never fetch arbitrary remote URLs.
export const ASSET_MAX_BYTES=12*1024*1024;
export const ASSET_MAX_TEXT= Math.ceil(ASSET_MAX_BYTES*4/3)+1024;
const rows=v=>Array.isArray(v)?v:Object.values(v||{});
const finite=(v,f,a,b)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):f;
export function gltfDocument(data){
 if(typeof data==='string')return JSON.parse(data);
 const view=new DataView(data);
 if(data.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==data.byteLength)throw Error('Geen geldig GLB 2.0-bestand.');
 const length=view.getUint32(12,true);
 if(view.getUint32(16,true)!==0x4e4f534a||20+length>data.byteLength)throw Error('GLB bevat geen geldig glTF-document.');
 return JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,length)));
}
export function validateGltf(doc){
 if(doc?.asset?.version!=='2.0')throw Error('Alleen glTF 2.0 wordt ondersteund.');
 if(rows(doc.accessors).some(a=>!Number.isSafeInteger(a.count)||a.count<0||a.count>1000000)||rows(doc.nodes).length>5000)throw Error('Dit model is te complex voor de studio.');
 let bytes=0;for(const item of [...rows(doc.buffers),...rows(doc.images)]){if(item.uri!=null){if(typeof item.uri!=='string'||!/^data:[\w.+/-]*;base64,[A-Za-z0-9+/=]*$/.test(item.uri))throw Error('Selecteer ook alle lokale .bin-bestanden en textures. Externe links worden niet geladen.');bytes+=item.uri.length*.75;}if(item.byteLength>ASSET_MAX_BYTES)throw Error('Een modelbuffer is te groot.');}
 if(bytes>ASSET_MAX_BYTES)throw Error('Model en textures mogen samen maximaal 12 MB zijn.');
 const supported=new Set(['KHR_materials_unlit','KHR_texture_transform','KHR_materials_clearcoat','KHR_materials_transmission','KHR_materials_volume','KHR_materials_ior','KHR_materials_specular','KHR_materials_sheen','KHR_materials_iridescence','KHR_materials_anisotropy','KHR_materials_emissive_strength','KHR_materials_dispersion','KHR_mesh_quantization','KHR_lights_punctual','EXT_mesh_gpu_instancing','EXT_meshopt_compression','KHR_draco_mesh_compression']);
 for(const ext of doc.extensionsRequired||[])if(!supported.has(ext))throw Error(`Model vereist ${ext}. Exporteer een gewone GLB met PNG/JPEG-textures.`);
 return doc;
}
let validatedData=null,validatedKind=null;
export function normalizeImportedAsset(input){
 if(!input||!['glb','gltf'].includes(input.kind)||typeof input.data!=='string'||input.data.length>ASSET_MAX_TEXT)throw Error('Ongeldig of te groot geïmporteerd model (maximaal 12 MB).');
 if(input.data!==validatedData||input.kind!==validatedKind){
  if(input.kind==='glb'){if(!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data))throw Error('Ongeldige GLB-data.');const raw=atob(input.data);validateGltf(gltfDocument(Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer));}
  else validateGltf(gltfDocument(input.data));
  validatedData=input.data;validatedKind=input.kind;
 }
 return {kind:input.kind,data:input.data,filename:String(input.filename||'model').slice(0,120),author:String(input.author||'').slice(0,160),license:String(input.license||'').slice(0,160),source:String(input.source||'').slice(0,500),rotation:[0,1,2].map(i=>finite(input.rotation?.[i],0,-Math.PI,Math.PI)),clip:Math.round(finite(input.clip,0,-1,255)),speed:finite(input.speed,1,.1,3),bounds:[0,1,2].map(i=>finite(input.bounds?.[i],i===0?.5:.25,.001,2))};
}
export function arrayBufferBase64(buffer){let text='';const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
export async function importAnimalFiles(files){
 const all=[...files],models=all.filter(f=>/\.(glb|gltf)$/i.test(f.name));
 if(models.length!==1)throw Error('Selecteer precies één GLB of glTF, samen met de bijbehorende bestanden.');
 if(all.reduce((sum,f)=>sum+f.size,0)>ASSET_MAX_BYTES)throw Error('Model en textures mogen samen maximaal 12 MB zijn.');
 const file=models[0],kind=/\.glb$/i.test(file.name)?'glb':'gltf';let data;
 if(kind==='glb')data=arrayBufferBase64(await file.arrayBuffer());
 else{
  const doc=gltfDocument(await file.text()),base=(file.webkitRelativePath||file.name).split('/').slice(0,-1);
  function path(parts){const out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p);}return out.join('/');}
  for(const item of [...rows(doc.buffers),...rows(doc.images)]){if(!item.uri||item.uri.startsWith('data:'))continue;
   if(/^(?:[a-z]+:|\/\/)/i.test(item.uri))throw Error('Gebruik lokale textures en buffers; externe links worden niet geladen.');
   let uri;try{uri=decodeURIComponent(item.uri);}catch{throw Error('Ongeldige bestandsnaam in glTF.');}
   const exact=path([...base,...uri.split('/')]),matches=all.filter(f=>path((f.webkitRelativePath||f.name).split('/'))===exact);
   const candidates=matches.length?matches:all.filter(f=>f.name===uri.split('/').pop());
   if(candidates.length!==1)throw Error(`Bestand ontbreekt of is dubbel: ${item.uri}. Selecteer de volledige map.`);
   const dependency=candidates[0],mime=dependency.type||(/\.png$/i.test(dependency.name)?'image/png':/\.jpe?g$/i.test(dependency.name)?'image/jpeg':'application/octet-stream');
   item.uri=`data:${mime};base64,${arrayBufferBase64(await dependency.arrayBuffer())}`;
  }
  data=JSON.stringify(validateGltf(doc));
 }
 return normalizeImportedAsset({kind,data,filename:file.name});
}
