import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fishMetadata,labelGlb,fileNameFor,MAX_FISH_BYTES} from './FishFormat.js';
import {saveFish} from './FishStore.js';

export function disposeFish(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();t.source?.data?.close?.();});
}
export async function parseFish(buffer) {
  const metadata=fishMetadata(buffer);
  const manager=new THREE.LoadingManager();
  manager.setURLModifier(url=>{if(!/^(blob:|data:)/i.test(url))throw Error('Alle afbeeldingen moeten in het GLB-bestand zitten.');return url;});
  const gltf=await new GLTFLoader(manager).parseAsync(buffer,'');
  let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh)meshes++;});
  const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3());
  if(!meshes||box.isEmpty()||!Number.isFinite(size.length())||size.length()===0){disposeFish(gltf.scene);throw Error('Dit bestand bevat geen zichtbaar vismodel.');}
  return {...metadata,root:gltf.scene};
}

// A single temporary renderer for an entire batch; never store 3D previews in Firebase.
export function createThumbnails() {
  let renderer;
  return {
    render(root) {
      renderer??=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
      renderer.setSize(480,300,false);renderer.setPixelRatio(1);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      const scene=new THREE.Scene();scene.background=new THREE.Color('#dceeed');
      scene.add(new THREE.HemisphereLight(0xffffff,0x536f73,2.4));
      const light=new THREE.DirectionalLight(0xfff1db,2.5);light.position.set(4,7,10);scene.add(light);
      const copy=root.clone(true);scene.add(copy);copy.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(copy),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
      copy.position.sub(center);
      const camera=new THREE.PerspectiveCamera(36,1.6,.01,10000);
      const distance=Math.max(size.y,size.x/1.6,size.z)*1.9+size.z;
      camera.position.set(distance*.10,distance*.10,distance);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
      renderer.render(scene,camera);
      return renderer.domElement.toDataURL('image/webp',.82);
    },
    dispose(){if(renderer){renderer.dispose();renderer.forceContextLoss();renderer=null;}}
  };
}

export async function importFishFile(file,thumbnails) {
  if(file.size>MAX_FISH_BYTES)throw Error('Dit bestand is groter dan 25 MB. Exporteer een kleiner model.');
  const buffer=await file.arrayBuffer(),metadata=fishMetadata(buffer,file.name);
  const {root}=await parseFish(buffer);
  try {
    return await saveFish({...metadata,source:'bestand',blob:new Blob([buffer],{type:'model/gltf-binary'}),thumbnail:thumbnails.render(root)});
  } finally {disposeFish(root);}
}
export async function downloadFish(record) {
  const bytes=labelGlb(await record.blob.arrayBuffer(),record);
  const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));
  const a=document.createElement('a');a.href=url;a.download=fileNameFor(record.name);a.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
