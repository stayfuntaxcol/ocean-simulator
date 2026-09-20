// Portable, self-contained GLB files. No Firebase records or remote textures.
export const MAX_FISH_BYTES = 25 * 1024 * 1024;
export const SPECIES_NAMES = Object.freeze({clown:'Clownvis',butterfly:'Koraalvlindervis',koi:'Koi',storyblue:'Blauwe verhalenvis',flatgreen:'Groene bodemvis',orange_story:'Oranje verhalenvis'});
const JSON_CHUNK = 0x4e4f534a;

export function readGlb(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) throw Error('Dit is geen geldig GLB-bestand.');
  if (buffer.byteLength > MAX_FISH_BYTES) throw Error('Dit bestand is groter dan 25 MB. Exporteer een kleiner model.');
  const view = new DataView(buffer);
  if (view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2 || view.getUint32(8,true)!==buffer.byteLength) throw Error('Alleen complete GLB-bestanden (versie 2) worden ondersteund.');
  const chunks=[];
  for(let offset=12;offset<buffer.byteLength;) {
    if(offset+8>buffer.byteLength) throw Error('Het GLB-bestand is beschadigd.');
    const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);
    if(length%4 || offset+8+length>buffer.byteLength) throw Error('Het GLB-bestand is onvolledig.');
    chunks.push({type,bytes:new Uint8Array(buffer,offset+8,length)});offset+=8+length;
  }
  if(chunks[0]?.type!==JSON_CHUNK) throw Error('GLB-modelgegevens ontbreken.');
  const json=JSON.parse(new TextDecoder().decode(chunks[0].bytes).trim());
  if(json.asset?.version!=='2.0') throw Error('De modelversie wordt niet ondersteund.');
  for(const resource of [...(json.images||[]),...(json.buffers||[])]) {
    if(resource.uri && !/^data:/i.test(resource.uri)) throw Error('Deze vis verwijst naar externe bestanden. Exporteer een GLB met ingesloten afbeeldingen.');
  }
  return {json,chunks};
}

export function validateProject(value) {
  if(!value || value.version!==1 || !Object.hasOwn(SPECIES_NAMES,value.species)) return null;
  if(typeof value.pattern!=='string' || value.pattern.length>60 || typeof value.storybook!=='boolean') return null;
  for(const key of ['palette','storyBluePalette','flatGreenPalette','orangeStoryPalette']) {
    if(!Array.isArray(value[key]) || value[key].length<4 || value[key].length>8 || !value[key].every(c=>/^#[\da-f]{6}$/i.test(c))) return null;
  }
  for(const part of ['body','tail']) for(const layer of ['base','paint']) {
    const url=value.layers?.[part]?.[layer];
    if(typeof url!=='string' || url.length>4*1024*1024 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)) return null;
  }
  return structuredClone(value);
}

export function fishMetadata(buffer,fileName='Mijn vis.glb') {
  const {json}=readGlb(buffer);
  const metadata=json.extras?.fishLibrary || json.nodes?.find(n=>n.extras?.fishLibrary)?.extras.fishLibrary || {};
  const rawProject=json.nodes?.find(n=>n.extras?.fishStudio)?.extras.fishStudio;
  const project=validateProject(rawProject);
  return {name:String(metadata.name||fileName.replace(/\.glb$/i,'')).slice(0,80),author:String(metadata.author||'').slice(0,60),species:project?.species||'',project};
}

// Rename/credit a portable file without recomputing its geometry or embedded textures.
export function labelGlb(buffer,{name,author}) {
  const {json,chunks}=readGlb(buffer);
  json.extras={...json.extras,fishLibrary:{name:String(name).slice(0,80),author:String(author||'').slice(0,60)}};
  const bytes=new TextEncoder().encode(JSON.stringify(json));
  const padded=new Uint8Array(Math.ceil(bytes.length/4)*4);padded.fill(32);padded.set(bytes);
  chunks[0]={type:JSON_CHUNK,bytes:padded};
  const output=new ArrayBuffer(12+chunks.reduce((n,c)=>n+8+c.bytes.length,0)),view=new DataView(output);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,output.byteLength,true);
  let offset=12;
  for(const chunk of chunks){view.setUint32(offset,chunk.bytes.length,true);view.setUint32(offset+4,chunk.type,true);new Uint8Array(output,offset+8,chunk.bytes.length).set(chunk.bytes);offset+=8+chunk.bytes.length;}
  return output;
}

export function fileNameFor(name) { return (String(name).normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'mijn-vis')+'.glb'; }
export function formatBytes(bytes) {return bytes>=1024*1024 ? (bytes/1024/1024).toFixed(1)+' MB' : Math.max(1,Math.round(bytes/1024))+' KB';}
