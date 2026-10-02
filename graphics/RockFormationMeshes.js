import * as THREE from 'three';
import { createRockSkinLibrary,ROCK_SKINS,applyRockSkinToGeometry } from './RockFormationSkins.js';
import { buildContinuousRockSurface } from '../worlds/RockFormationGenerator.js';

export function createRockFormationMeshSystem({parent}={}){
  const records=new Map(),skins=createRockSkinLibrary();

  function remove(id){
    const record=records.get(id);if(!record)return false;
    parent.remove(record.root);
    record.geometry?.dispose?.();
    records.delete(id);
    return true;
  }
  function clear(){for(const id of [...records.keys()])remove(id);}

  function applyTransform(record,descriptor={}){
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

  function build(formation,descriptor={}){
    const id=formation.id,old=records.get(id);
    const transform=old?transformFor(id):descriptor.transform;
    remove(id);

    const surface=buildContinuousRockSurface(formation,{smooth:true});
    if(!surface.positions.length||!surface.indices.length)throw Error('Geen rotsoppervlak uit deze sculpt kunnen maken.');

    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.positions,3));
    geometry.setIndex(surface.indices);
    geometry.computeVertexNormals();
    applyRockSkinToGeometry(geometry,descriptor.skin,formation.center);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const mesh=new THREE.Mesh(geometry,skins.get(descriptor.skin));
    mesh.name='Aaneengesloten sculpt-rots';
    mesh.visible=true;
    mesh.frustumCulled=false;
    mesh.castShadow=false;
    mesh.receiveShadow=true;
    mesh.userData.formationSurface=true;

    const root=new THREE.Group();
    root.name='Sculpt rock formation '+id;
    root.userData.editorKind='aaneengesloten rotsformatie';
    root.userData.generatedFormationMesh=true;
    root.userData.formationId=id;
    root.userData.isSolidRock=true;
    root.userData.editorLocked=descriptor.locked===true;
    root.userData.formationSkin=ROCK_SKINS[descriptor.skin]?descriptor.skin:'grey_reef';
    root.add(mesh);parent.add(root);

    const record={
      id,root,mesh,geometry,center:{...formation.center},
      surfaceCount:surface.stats.exposedFaces,
      totalCells:formation.cells.length,
      vertices:surface.stats.vertices,
      triangles:surface.stats.triangles
    };
    records.set(id,record);
    applyTransform(record,{...descriptor,transform:transform||descriptor.transform});
    return root;
  }

  function setSkin(id,skin){
    const record=records.get(id);if(!record)return false;
    const key=ROCK_SKINS[skin]?skin:'grey_reef';
    record.mesh.material=skins.get(key);
    applyRockSkinToGeometry(record.geometry,key,record.center);
    record.root.userData.formationSkin=key;
    return true;
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
  return {build,remove,clear,setSkin,setLocked,get,roots,rootFromObject,transformFor,dispose,get size(){return records.size;}};
}
