import * as THREE from 'three';
import { createRockSkinLibrary,ROCK_SKINS,applyRockSkinToGeometry } from './RockFormationSkins.js';
import { buildContinuousRockSurface } from '../worlds/RockFormationGenerator.js';
import { buildSculptSurfaceNets,sculptRenderChunks,sculptChunkBoundarySides } from '../worlds/SculptSurfaceNets.js';
import { simplifySculptSurface } from '../worlds/SculptMeshLOD.js';
import { SculptCollision } from '../worlds/SculptCollision.js';
import { SculptChunkManager, SCULPT_BUDGETS } from '../worlds/SculptChunkManager.js';

export function createRockFormationMeshSystem({parent,caustics=null,camera=null}={}){
  const records=new Map(),skins=createRockSkinLibrary(caustics);
  const worldBox=new THREE.Box3(),center=new THREE.Vector3(),frustum=new THREE.Frustum(),projection=new THREE.Matrix4();
  let buildMs=0,budgetCulledChunks=0;
  function remove(id){
    const record=records.get(id);if(!record)return false;
    parent.remove(record.root);
    for(const chunk of record.chunks.values())for(const geometry of new Set(chunk.lods.values()))geometry.dispose();
    records.delete(id);return true;
  }
  function clear(){for(const id of [...records.keys()])remove(id);}
  function applyTransform(record,descriptor={}){
    const transform=descriptor.transform||{},offset=transform.position||[0,0,0];
    record.root.position.set(record.center.x+(Number(offset[0])||0),record.center.y+(Number(offset[1])||0),record.center.z+(Number(offset[2])||0));
    record.root.rotation.set(...(transform.rotation||[0,0,0]).map(v=>Number(v)||0));
    record.root.scale.fromArray((transform.scale||[1,1,1]).map(v=>Number(v)||1));record.root.updateMatrixWorld(true);
  }
  function ensureChunk(record,chunk){
    if(chunk.mesh)return;
    const start=performance.now();
    const cells=[...chunk.data.cells].map(key=>{
      const [ix,iy,iz]=key.split(',').map(Number);return {ix,iy,iz,density:record.manager.cells.get(key)};
    });
    const surface=record.shapeLevel===1
      ? buildContinuousRockSurface({...record.formation,cells},{smooth:false,shapeLevel:1,occupiedCells:record.formation.cells})
      : buildSculptSurfaceNets(record.manager,chunk.data,{center:record.center,shapeLevel:record.shapeLevel});
    chunk.surface=surface;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.positions,3));geometry.setIndex(surface.indices);
    if(surface.normals)geometry.setAttribute('normal',new THREE.Float32BufferAttribute(surface.normals,3));else geometry.computeVertexNormals();
    applyRockSkinToGeometry(geometry,record.root.userData.formationSkin,record.center);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,skins.get(record.root.userData.formationSkin));
    mesh.name='Sculpt rock chunk '+chunk.data.key;mesh.frustumCulled=true;mesh.receiveShadow=true;
    mesh.userData.formationSurface=true;record.root.add(mesh);
    chunk.mesh=mesh;chunk.lods.set(0,geometry);geometry.userData.triangles=surface.stats.triangles;chunk.triangles=surface.stats.triangles;chunk.vertices=surface.stats.vertices;
    record.triangles+=chunk.triangles;record.vertices+=chunk.vertices;
    record.mesh ||= mesh;record.geometry ||= geometry;
    buildMs=performance.now()-start;
  }
  function build(formation,descriptor={}){
    const transform=records.has(formation.id)?transformFor(formation.id):descriptor.transform;
    const manager=new SculptChunkManager({cellSize:formation.cellSize});manager.load(formation.densityCells||formation.cells);manager.dirty.clear();
    const root=new THREE.Group();root.name='Sculpt rock formation '+formation.id;
    Object.assign(root.userData,{editorKind:'rotsformatie',generatedFormationMesh:true,formationId:formation.id,isSolidRock:true,
      editorLocked:descriptor.locked===true,formationSkin:ROCK_SKINS[descriptor.skin]?descriptor.skin:'grey_reef'});
    const record={id:formation.id,root,center:{...formation.center},formation,manager,chunks:new Map(),surfaceCount:0,
      totalCells:formation.cells.length,vertices:0,triangles:0,shapeLevel:Math.max(1,Math.min(5,Math.round(Number(descriptor.shapeLevel)||3)))};
    for(const data of (record.shapeLevel===1?manager.chunks:sculptRenderChunks(manager)).values()){
      const min=data.min.map(n=>n*formation.cellSize),extent=manager.chunkCells*formation.cellSize;
      const bounds=new THREE.Box3(new THREE.Vector3(...min).sub(center.set(formation.center.x,formation.center.y,formation.center.z)).addScalar(-formation.cellSize),
        new THREE.Vector3(...min).addScalar(extent+formation.cellSize).sub(center));
      record.chunks.set(data.key,{data,bounds,lods:new Map(),mesh:null,lod:0,lastSeen:performance.now()/1000});
      record.surfaceCount+=manager.surfaceCells(data).length;
    }
    record.collision=new SculptCollision(manager,{center:record.center,shapeLevel:record.shapeLevel});
    root.userData.sculptBounds=record.collision.bounds;
    applyTransform(record,{...descriptor,transform});
    // Initial meshes are constructed per chunk, never from a monolithic surface.
    try{for(const chunk of record.chunks.values()){
      worldBox.copy(chunk.bounds).applyMatrix4(root.matrixWorld);
      if(!camera||worldBox.distanceToPoint(camera.position)<=60)ensureChunk(record,chunk);
    }}catch(error){for(const chunk of record.chunks.values())for(const g of chunk.lods.values())g.dispose();throw error;}
    remove(formation.id);records.set(formation.id,record);parent.add(root);return root;
  }
  function ensureLOD(record,chunk,lod){
    if(chunk.lods.has(lod))return chunk.lods.get(lod);
    if(lod===0||record.shapeLevel===1){chunk.lods.set(lod,chunk.lods.get(0));return chunk.lods.get(0);}
    const start=performance.now(),s=record.manager.cellSize,n=record.manager.chunkCells;
    const min=chunk.data.min.map((v,i)=>v*s-[record.center.x,record.center.y,record.center.z][i]),max=min.map(v=>v+n*s);
    const surface=simplifySculptSurface(chunk.surface,{min,max,cellSize:s,ratio:lod===1?.75:.3,gridOrigin:[record.center.x,record.center.y,record.center.z],boundarySides:sculptChunkBoundarySides(record.chunks,chunk.data)});
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(surface.normals,3));geometry.setIndex(surface.indices);
    applyRockSkinToGeometry(geometry,record.root.userData.formationSkin,record.center);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    geometry.userData.triangles=surface.stats.triangles;chunk.lods.set(lod,geometry);buildMs=performance.now()-start;return geometry;
  }
  function update(view=camera,{highRadius=30,activeRadius=48,cullRadius=60,budget=SCULPT_BUDGETS.desktop}={}){
    if(!view)return;
    const candidates=[],now=performance.now()/1000;
    if(view.isCamera){view.updateWorldMatrix(true,false);projection.multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);}
    for(const record of records.values()){
      record.root.updateWorldMatrix(true,true);
      for(const chunk of record.chunks.values()){
        worldBox.copy(chunk.bounds).applyMatrix4(record.root.matrixWorld);const distance=worldBox.distanceToPoint(view.position);
        if(chunk.mesh)chunk.mesh.visible=false;
        if(distance>cullRadius){
          if(chunk.mesh&&distance>cullRadius+24&&now-chunk.lastSeen>5){
            record.root.remove(chunk.mesh);for(const geometry of new Set(chunk.lods.values()))geometry.dispose();
            record.triangles-=chunk.triangles;record.vertices-=chunk.vertices;
            if(record.mesh===chunk.mesh){record.mesh=null;record.geometry=null;}
            chunk.mesh=null;chunk.surface=null;chunk.lods.clear();chunk.lod=0;
          }continue;
        }
        chunk.lastSeen=now;
        const inFrustum=!view.isCamera||frustum.intersectsBox(worldBox);
        candidates.push({record,chunk,distance,inFrustum});
      }
    }
    candidates.sort((a,b)=>a.distance-b.distance);let triangles=0;budgetCulledChunks=0;
    for(const {record,chunk,distance,inFrustum} of candidates){
      if(!chunk.mesh&&distance<=activeRadius&&inFrustum)ensureChunk(record,chunk);
      if(!chunk.mesh||!inFrustum)continue;
      // Hysteresis prevents rapid switching while moving around a threshold.
      let lod=chunk.lod;
      if(lod===0&&distance>highRadius+3)lod=1;
      if(lod===1&&distance<highRadius-3)lod=0;
      if(lod===1&&distance>activeRadius+3)lod=2;
      if(lod===2&&distance<activeRadius-3)lod=1;
      let geometry=ensureLOD(record,chunk,lod);
      if(triangles+geometry.userData.triangles>budget){lod=2;geometry=ensureLOD(record,chunk,lod);}
      if(triangles+geometry.userData.triangles>budget){budgetCulledChunks++;continue;}
      chunk.mesh.geometry=geometry;chunk.lod=lod;chunk.mesh.visible=true;
      triangles+=geometry.userData.triangles;
    }
    return {triangles,overBudget:triangles>=budget};
  }
  function setSkin(id,skin){
    const record=records.get(id);if(!record)return false;
    const key=ROCK_SKINS[skin]?skin:'grey_reef';record.root.userData.formationSkin=key;
    for(const chunk of record.chunks.values()){
      if(chunk.mesh)chunk.mesh.material=skins.get(key);
      for(const geometry of new Set(chunk.lods.values()))applyRockSkinToGeometry(geometry,key,record.center);
    }return true;
  }
  function setLocked(id,value){const r=records.get(id);if(!r)return false;r.root.userData.editorLocked=Boolean(value);return true;}
  function get(id){return records.get(id)||null;}
  function roots(){return [...records.values()].map(r=>r.root);}
  function rootFromObject(object){let o=object;while(o&&o!==parent){if(o.userData?.generatedFormationMesh)return o;o=o.parent;}return null;}
  function transformFor(id){
    const r=records.get(id);if(!r)return {position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};
    return {position:[r.root.position.x-r.center.x,r.root.position.y-r.center.y,r.root.position.z-r.center.z],
      rotation:[r.root.rotation.x,r.root.rotation.y,r.root.rotation.z],scale:r.root.scale.toArray()};
  }
  function segmentHit(from,to,radius=0){
    let nearest=null;
    for(const r of records.values()){const hit=r.collision.segment(r.root,from,to,radius);if(hit&&(!nearest||hit.distance<nearest.distance))nearest=hit;}
    return nearest;
  }
  function stats(){
    const out={visibleChunks:0,loadedChunks:0,totalChunks:0,triangles:0,buildMs,dirtyChunks:0,lod0:0,lod1:0,lod2:0,collisionQueries:0,collisionCells:0,budgetCulledChunks};
    for(const r of records.values()){out.collisionQueries+=r.collision.queries;out.collisionCells+=r.collision.visited;for(const c of r.chunks.values()){
      out.totalChunks++;if(c.mesh){out.loadedChunks++;if(c.mesh.visible&&r.root.visible){out.visibleChunks++;out.triangles+=c.mesh.geometry.userData.triangles;out['lod'+c.lod]++;}}
    }}return out;
  }
  function dispose(){clear();skins.dispose();}
  return {build,remove,clear,update,segmentHit,setSkin,setLocked,get,roots,rootFromObject,transformFor,dispose,get stats(){return stats();},get size(){return records.size;}};
}
