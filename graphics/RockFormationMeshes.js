import * as THREE from 'three';
import { createRockSkinLibrary,ROCK_SKINS } from './RockFormationSkins.js';

export function createRockFormationMeshSystem({parent,caustics}={}){
  const records=new Map(),skins=createRockSkinLibrary(caustics);

  function remove(id){
    const record=records.get(id);if(!record)return false;
    parent.remove(record.root);
    record.geometry.dispose();
    records.delete(id);
    return true;
  }
  function clear(){for(const id of [...records.keys()])remove(id);}
  function applyDescriptor(record,descriptor={}){
    const skin=ROCK_SKINS[descriptor.skin]?descriptor.skin:'grey_reef';
    record.mesh.material=skins.get(skin);
    record.root.userData.formationSkin=skin;
    record.root.userData.formationStyle=descriptor.style||'rounded_reef';
    record.root.userData.variantSeed=Number(descriptor.seed)||1;
    record.root.userData.variantDeviation=Number(descriptor.deviation)||.07;
    record.root.userData.formationAccepted=descriptor.accepted===true;
    record.root.userData.editorLocked=descriptor.locked===true;
    const transform=descriptor.transform||{};
    const offset=Array.isArray(transform.position)?transform.position:[0,0,0];
    const rotation=Array.isArray(transform.rotation)?transform.rotation:[0,0,0];
    const scale=Array.isArray(transform.scale)?transform.scale:[1,1,1];
    record.root.position.set(
      record.center.x+(Number(offset[0])||0),
      record.center.y+(Number(offset[1])||0),
      record.center.z+(Number(offset[2])||0)
    );
    record.root.rotation.set(...rotation.map(v=>Number(v)||0));
    record.root.scale.fromArray(scale.map(v=>Number(v)||1));
    record.root.updateMatrixWorld(true);
  }

  function upsert(meshData,descriptor={}){
    const id=meshData.formationId,existing=records.get(id);
    if(existing){
      const position=existing.geometry.getAttribute('position');
      const sameTopology=position?.count===meshData.positions.length/3&&existing.geometry.index?.count===meshData.indices.length;
      if(sameTopology){
        position.array.set(meshData.positions);position.needsUpdate=true;
        existing.geometry.deleteAttribute('normal');existing.geometry.computeVertexNormals();
        existing.geometry.computeBoundingBox();existing.geometry.computeBoundingSphere();
        existing.center={...meshData.center};existing.meshData=meshData;
        applyDescriptor(existing,descriptor);return existing.root;
      }
      remove(id);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(meshData.positions),3));
    geometry.setIndex(meshData.indices);
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();

    const mesh=new THREE.Mesh(geometry,skins.get(descriptor.skin));
    mesh.name='Rock formation surface';mesh.castShadow=false;mesh.receiveShadow=false;
    mesh.userData.formationSurface=true;
    const root=new THREE.Group();
    root.name='Sculpt rock formation '+id;
    root.userData.editorKind='sculpt-rotsformatie';
    root.userData.generatedFormationMesh=true;
    root.userData.formationId=id;
    root.userData.isSolidRock=true;
    root.add(mesh);parent.add(root);
    const record={id,root,mesh,geometry,center:{...meshData.center},meshData};
    records.set(id,record);applyDescriptor(record,descriptor);
    return root;
  }

  function setSkin(id,skin){
    const record=records.get(id);if(!record)return false;
    const key=ROCK_SKINS[skin]?skin:'grey_reef';
    record.mesh.material=skins.get(key);record.root.userData.formationSkin=key;return true;
  }
  function setLocked(id,value){
    const record=records.get(id);if(!record)return false;
    record.root.userData.editorLocked=Boolean(value);return true;
  }
  function get(id){return records.get(id)||null;}
  function roots(){return [...records.values()].map(r=>r.root);}
  function rootFromObject(object){
    let current=object;
    while(current&&current!==parent){
      if(current.userData?.generatedFormationMesh)return current;
      current=current.parent;
    }
    return null;
  }
  function transformFor(id){
    const record=records.get(id);if(!record)return {position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};
    return {
      position:[
        record.root.position.x-record.center.x,
        record.root.position.y-record.center.y,
        record.root.position.z-record.center.z
      ],
      rotation:[record.root.rotation.x,record.root.rotation.y,record.root.rotation.z],
      scale:record.root.scale.toArray()
    };
  }
  function dispose(){clear();skins.dispose();}
  return {upsert,remove,clear,setSkin,setLocked,get,roots,rootFromObject,transformFor,dispose,get size(){return records.size;}};
}
