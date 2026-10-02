import * as THREE from 'three';
import { createRockSkinLibrary,ROCK_SKINS } from './RockFormationSkins.js';
import { surfaceCellsForFormation } from '../worlds/RockFormationGenerator.js';

function cellAngle(ix,iy,iz){
  const n=Math.abs((ix*73856093)^(iy*19349663)^(iz*83492791));
  return (n%6283)/1000;
}

export function createRockFormationMeshSystem({parent,caustics}={}){
  const records=new Map(),skins=createRockSkinLibrary(caustics);
  const cellGeometry=new THREE.IcosahedronGeometry(1,0);
  const dummy=new THREE.Object3D();

  function remove(id){
    const record=records.get(id);if(!record)return false;
    parent.remove(record.root);records.delete(id);return true;
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
    const id=formation.id;remove(id);
    const surface=surfaceCellsForFormation(formation);
    const mesh=new THREE.InstancedMesh(cellGeometry,skins.get(descriptor.skin),Math.max(1,surface.length));
    mesh.name='Sculpt rock skin surface';
    mesh.count=surface.length;
    mesh.frustumCulled=false;
    mesh.visible=true;
    mesh.renderOrder=2;
    mesh.userData.formationSurface=true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    for(let i=0;i<surface.length;i++){
      const c=surface[i],density=Math.max(.18,Math.min(1,c.density));
      const radius=formation.cellSize*(.72+.10*density);
      dummy.position.set(c.x-formation.center.x,c.y-formation.center.y,c.z-formation.center.z);
      const a=cellAngle(c.ix,c.iy,c.iz);
      dummy.rotation.set(a*.17,a,a*.11);
      dummy.scale.set(radius*(.96+.06*Math.sin(a)),radius*(.90+.08*Math.cos(a*.7)),radius*(.96+.06*Math.sin(a*.43)));
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    // Keep culling disabled in the builder: large sculpt formations span many instances.

    const root=new THREE.Group();
    root.name='Sculpt rock formation '+id;
    root.userData.editorKind='sculpt-rotsformatie';
    root.userData.generatedFormationMesh=true;
    root.userData.formationId=id;
    root.userData.isSolidRock=true;
    root.userData.editorLocked=descriptor.locked===true;
    root.userData.formationSkin=ROCK_SKINS[descriptor.skin]?descriptor.skin:'grey_reef';
    root.add(mesh);parent.add(root);

    const record={id,root,mesh,center:{...formation.center},surfaceCount:surface.length,totalCells:formation.cells.length};
    records.set(id,record);applyTransform(record,descriptor);
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
  function dispose(){clear();cellGeometry.dispose();skins.dispose();}
  return {build,remove,clear,setSkin,setLocked,get,roots,rootFromObject,transformFor,dispose,get size(){return records.size;}};
}
