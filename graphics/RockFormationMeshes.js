import * as THREE from 'three';
import { createRockSkinLibrary,ROCK_SKINS,applyRockSkinToGeometry } from './RockFormationSkins.js';
import { buildContinuousRockSurface,buildGreedyRockSurface } from '../worlds/RockFormationGenerator.js';

const noopRaycast=()=>{};

export function createRockFormationMeshSystem({parent,caustics=null}={}){
  const records=new Map(),skins=createRockSkinLibrary(caustics);
  const collisionMaterial=new THREE.MeshBasicMaterial({color:0x000000});
  const worldPos=new THREE.Vector3(),worldCenter=new THREE.Vector3(),worldScale=new THREE.Vector3();

  function geometryFromSurface(surface,skin,center){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.positions,3));
    geometry.setIndex(surface.indices);
    geometry.computeVertexNormals();
    applyRockSkinToGeometry(geometry,skin,center);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function remove(id){
    const record=records.get(id);if(!record)return false;
    parent.remove(record.root);
    if(record.highGeometry&&record.highGeometry!==record.lowGeometry)record.highGeometry.dispose();
    record.lowGeometry?.dispose?.();
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

    const shapeLevel=Math.max(1,Math.min(5,Math.round(Number(descriptor.shapeLevel)||3)));
    const lowSurface=buildGreedyRockSurface(formation);
    const highSurface=buildContinuousRockSurface(formation,{smooth:true,shapeLevel});
    if(!lowSurface.positions.length||!lowSurface.indices.length)throw Error('Geen rotsoppervlak uit deze sculpt kunnen maken.');

    const lowGeometry=geometryFromSurface(lowSurface,descriptor.skin,formation.center);
    const highNeeded=highSurface.stats.triangles>lowSurface.stats.triangles;
    const highGeometry=highNeeded?geometryFromSurface(highSurface,descriptor.skin,formation.center):lowGeometry;

    const lowMesh=new THREE.Mesh(lowGeometry,skins.getSimple(descriptor.skin));
    lowMesh.name='Sculpt-rots LOD laag';
    lowMesh.visible=!highNeeded;
    lowMesh.frustumCulled=true;
    lowMesh.castShadow=false;lowMesh.receiveShadow=true;
    lowMesh.userData.formationSurface=true;
    lowMesh.raycast=noopRaycast;

    let highMesh=null;
    if(highNeeded){
      highMesh=new THREE.Mesh(highGeometry,skins.get(descriptor.skin));
      highMesh.name='Sculpt-rots LOD hoog';
      highMesh.visible=true;
      highMesh.frustumCulled=true;
      highMesh.castShadow=false;highMesh.receiveShadow=true;
      highMesh.userData.formationSurface=true;
      highMesh.raycast=noopRaycast;
    }

    // Collision is always the cheap greedy surface. It is never rendered.
    const collisionProxy=new THREE.Mesh(lowGeometry,collisionMaterial);
    collisionProxy.name='Sculpt-rots collision proxy';
    collisionProxy.visible=false;
    collisionProxy.userData.formationCollisionProxy=true;

    const root=new THREE.Group();
    root.name='Sculpt rock formation '+id;
    root.userData.editorKind='aaneengesloten rotsformatie';
    root.userData.generatedFormationMesh=true;
    root.userData.formationId=id;
    root.userData.isSolidRock=true;
    root.userData.editorLocked=descriptor.locked===true;
    root.userData.formationSkin=ROCK_SKINS[descriptor.skin]?descriptor.skin:'grey_reef';
    root.userData.collisionProxy=collisionProxy;
    if(highMesh)root.add(highMesh);
    root.add(lowMesh,collisionProxy);
    parent.add(root);

    const record={
      id,root,mesh:highMesh||lowMesh,highMesh,lowMesh,collisionProxy,
      highGeometry,lowGeometry,center:{...formation.center},
      surfaceCount:highSurface.stats.exposedFaces??lowSurface.stats.quads,
      totalCells:formation.cells.length,
      vertices:highSurface.stats.vertices,
      triangles:highSurface.stats.triangles,
      lowTriangles:lowSurface.stats.triangles,
      shapeLevel,
      highVisible:Boolean(highMesh)
    };
    records.set(id,record);
    applyTransform(record,{...descriptor,transform:transform||descriptor.transform});
    return root;
  }

  function setSkin(id,skin){
    const record=records.get(id);if(!record)return false;
    const key=ROCK_SKINS[skin]?skin:'grey_reef';
    if(record.highMesh)record.highMesh.material=skins.get(key);
    record.lowMesh.material=skins.getSimple(key);
    if(record.highGeometry)applyRockSkinToGeometry(record.highGeometry,key,record.center);
    if(record.lowGeometry!==record.highGeometry)applyRockSkinToGeometry(record.lowGeometry,key,record.center);
    record.root.userData.formationSkin=key;
    return true;
  }

  function update(camera,quality='medium',{forceHigh=false}={}){
    const nearDistance=quality==='low'?14:quality==='high'?40:26;
    for(const record of records.values()){
      if(!record.highMesh){record.lowMesh.visible=true;continue;}
      record.root.updateMatrixWorld(true);
      record.root.getWorldPosition(worldPos);
      record.root.getWorldScale(worldScale);
      const sphere=record.lowGeometry.boundingSphere;
      worldCenter.copy(sphere.center).applyMatrix4(record.root.matrixWorld);
      const radius=sphere.radius*Math.max(worldScale.x,worldScale.y,worldScale.z);
      const surfaceDistance=Math.max(0,camera.position.distanceTo(worldCenter)-radius);
      const useHigh=forceHigh||surfaceDistance<nearDistance;
      if(useHigh!==record.highVisible){
        record.highVisible=useHigh;
        record.highMesh.visible=useHigh;
        record.lowMesh.visible=!useHigh;
      }
    }
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
  function dispose(){clear();collisionMaterial.dispose();skins.dispose();}
  return {build,remove,clear,setSkin,update,setLocked,get,roots,rootFromObject,transformFor,dispose,get size(){return records.size;}};
}
