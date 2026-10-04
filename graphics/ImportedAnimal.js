import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {ANIMAL_NAMES,importedScale} from '../animals/design/AnimalSpecies.js';
import {base64ArrayBuffer} from '../animals/design/ImportedAsset.js';
import {normalizeAnimalDesign} from '../animals/design/AnimalDesign.js';
export function disposeImportedScene(scene){const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});textures.forEach(t=>{t.source?.data?.close?.();t.dispose();});materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());skeletons.forEach(s=>s.dispose());}
export function createImportedAnimal(input,{studio=false,settings={size:1.25},age=30}={}){
 const design=normalizeAnimalDesign(input),asset=design.asset,root=new THREE.Group(),pivot=new THREE.Group(),center=new THREE.Group();root.add(pivot);pivot.add(center);root.name=design.name;root.scale.setScalar(studio?1:design.worldLength/40*importedScale(design,settings,age));
 root.userData={isFishRoot:true,isOrca:design.species==='orca',isWhale:design.species==='whale',isReefVisitor:true,visualSpecies:design.species==='custom'?design.name:ANIMAL_NAMES[design.species],health:100,velocity:new THREE.Vector3(2.8,0,0),importedAnimal:true};
 let disposed=false,mixer,action,gltf,helper=new THREE.SkeletonHelper(center);helper.visible=false;
 const model={root,mesh:center,helper,design,bones:[],restRotations:new Map(),byName:new Map(),clips:[],stats:{triangles:0},animate(dt,time){if(mixer){for(const bone of model.bones)bone.quaternion.copy(model.restRotations.get(bone));if(studio)mixer.setTime(time);else mixer.update(dt*asset.speed*(settings.stroke||1));for(const bone of model.bones){model.restRotations.get(bone).copy(bone.quaternion);const keys=model.design.motion.keys.filter(k=>k.bone===bone.name);if(!keys.length)continue;const phase=(studio?time:mixer.time)%model.design.motion.duration,frames=keys.sort((a,b)=>a.time-b.time);let left=frames.at(-1),right=frames[0],a=left.time-model.design.motion.duration,b=right.time;for(let i=0;i<frames.length-1;i++)if(phase>=frames[i].time&&phase<frames[i+1].time){left=frames[i];right=frames[i+1];a=left.time;b=right.time;}if(phase>=frames.at(-1).time){left=frames.at(-1);right=frames[0];a=left.time;b=right.time+model.design.motion.duration;}const f=b>a?THREE.MathUtils.clamp((phase-a)/(b-a),0,1):0;const rotation=left.rotation.map((v,i)=>THREE.MathUtils.lerp(v,right.rotation[i],f));bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)));}}},openMouth(){},setBreathing(){},selectClip(index){asset.clip=index;action?.stop();action=gltf?.animations[index]?mixer.clipAction(gltf.animations[index]):null;action?.reset().play();},dispose(){if(disposed)return;disposed=true;mixer?.stopAllAction();if(gltf)mixer?.uncacheRoot(gltf.scene);disposeImportedScene(root);helper.geometry.dispose();helper.material.dispose();}};
 const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(!url.startsWith('data:')&&!url.startsWith('blob:'))throw Error('Dit model bevat externe bestanden. Importeer het opnieuw met alle textures en buffers.');return url;});
 const draco=new DRACOLoader();draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/libs/draco/');
 const loader=new GLTFLoader(manager).setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
 model.ready=(async()=>{try{
  const data=asset.kind==='glb'?base64ArrayBuffer(asset.data):asset.data;
  gltf=await loader.parseAsync(data,'');if(disposed){disposeImportedScene(gltf.scene);return model;}
  // An imported camera or light must not change the studio/ocean lighting.
  gltf.scene.traverse(o=>{if(o.isLight||o.isCamera)o.visible=false;if(o.isBone){model.bones.push(o);model.restRotations.set(o,o.quaternion.clone());model.byName.set(o.name,o);}if(o.isMesh){model.stats.triangles+=(o.geometry.index?.count||o.geometry.attributes.position?.count||0)/3;o.frustumCulled=false;}});
  if(!model.stats.triangles||model.stats.triangles>300000)throw Error('Gebruik een model met 1 tot 300.000 driehoeken.');
  center.add(gltf.scene);center.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),mid=box.getCenter(new THREE.Vector3());center.position.copy(mid).negate();pivot.rotation.fromArray([...asset.rotation,'XYZ']);pivot.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(pivot),size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.x)||size.x<=.00001||size.y/size.x>4||size.z/size.x>4)throw Error('Model heeft ongeldige of extreme afmetingen.');
  pivot.scale.setScalar(40/size.x);model.bounds=size.toArray().map(v=>v/size.x/2);model.helper.geometry.dispose();model.helper.material.dispose();helper=new THREE.SkeletonHelper(gltf.scene);helper.visible=false;model.helper=helper;
  model.clips=gltf.animations;if(asset.clip>=model.clips.length)asset.clip=-1;mixer=new THREE.AnimationMixer(gltf.scene);model.selectClip(asset.clip);root.updateMatrixWorld(true);return model;
 }catch(e){if(gltf)disposeImportedScene(gltf.scene);root.userData.importError=e.message;throw e;}finally{draco.dispose();}})();
 // Ocean factories are synchronous; keep failure observable without an unhandled rejection.
 model.ready.catch(error=>console.warn('Diermodel laden mislukt:',error.message));return model;
}
