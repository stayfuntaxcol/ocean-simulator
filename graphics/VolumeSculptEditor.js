import * as THREE from 'three';
import {
  SCULPT_CELL_SIZE,SCULPT_MAX_CELLS,normalizeVolumeSculpt,sculptDataFromMap,
  sculptMapFromData,applyVolumeBrush,sculptWorldFromIndex
} from '../worlds/VolumeSculpt.js';

import { SculptChunkManager } from '../worlds/SculptChunkManager.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const VIEW_MODES=new Set(['clay','cells','ghost']);

export function createVolumeSculptEditor({
  scene,worldHalf=144,minY=-24,maxY=18,contains=()=>true,terrain=()=>-18,
  cellSize=SCULPT_CELL_SIZE,maxCells=SCULPT_MAX_CELLS
}={}){
  const group=new THREE.Group();group.name='Volume sculpt blueprint';scene.add(group);
  const cells=new Map(),chunks=new SculptChunkManager({cellSize}),previews=new Map();
  let buildMs=0;
  const cellGeometry=new THREE.IcosahedronGeometry(SCULPT_CELL_SIZE*.72,0);
  const cellMaterial=new THREE.MeshStandardMaterial({
    color:0x58cfe1,emissive:0x1b7f91,emissiveIntensity:.35,
    transparent:false,opacity:1,roughness:.82,metalness:0,depthWrite:true
  });

  const dummy=new THREE.Object3D(),color=new THREE.Color();
  const prismGeometry=new THREE.CylinderGeometry(worldHalf,worldHalf,maxY-minY,6,1,true);
  prismGeometry.rotateY(Math.PI/6);
  const prism=new THREE.LineSegments(new THREE.EdgesGeometry(prismGeometry),new THREE.LineBasicMaterial({color:0x55bfd1,transparent:true,opacity:.12}));
  prism.position.y=(minY+maxY)/2;prism.name='Volume hex boundary';prism.visible=false;group.add(prism);
  prismGeometry.dispose();

  const brush=new THREE.Mesh(
    new THREE.SphereGeometry(1,20,14),
    new THREE.MeshBasicMaterial({color:0x9af5ff,transparent:true,opacity:.24,wireframe:true,depthTest:false})
  );
  brush.name='Sculpt brush';brush.renderOrder=50;brush.visible=false;group.add(brush);

  let visible=false,brushRadius=6,strength=.45,tool='add',viewMode='clay',dirty=true,strokeOpen=false,revision=0;
  const history=[];

  function accepted(c){
    if(c.y<minY||c.y>maxY||!contains(c.x,c.z))return false;
    return c.y>=terrain(c.x,c.z)-cellSize*.65;
  }

  function viewScale(density){
    if(viewMode==='cells')return .38+density*.30;
    return .58+density*.48;
  }
  function applyViewStyle(){
    if(viewMode==='ghost'){
      cellMaterial.transparent=true;cellMaterial.opacity=.18;cellMaterial.depthWrite=false;cellMaterial.emissiveIntensity=.55;
    }else if(viewMode==='cells'){
      cellMaterial.transparent=false;cellMaterial.opacity=1;cellMaterial.depthWrite=true;cellMaterial.emissiveIntensity=.22;
    }else{
      cellMaterial.transparent=false;cellMaterial.opacity=1;cellMaterial.depthWrite=true;cellMaterial.emissiveIntensity=.30;
    }
    cellMaterial.needsUpdate=true;chunks.markAllDirty();dirty=true;refresh();
  }

  function refresh(){
    if(!dirty&&!chunks.dirty.size)return;
    const start=performance.now();dirty=false;
    for(const key of chunks.dirty){
      const previous=previews.get(key);if(previous){group.remove(previous);previous.dispose();previews.delete(key);}
      const chunk=chunks.chunks.get(key);if(!chunk)continue;
      const surface=chunks.surfaceCells(chunk);if(!surface.length)continue;
      const mesh=new THREE.InstancedMesh(cellGeometry,cellMaterial,surface.length);
      mesh.name='Sculpt preview chunk '+key;mesh.userData.volumeSculpt=true;
      mesh.userData.instanceKeys=surface.map(c=>c.key);mesh.frustumCulled=true;
      for(let i=0;i<surface.length;i++){
        const {ix,iy,iz,density}=surface[i];
        dummy.position.set(ix*cellSize,iy*cellSize,iz*cellSize);
        dummy.rotation.set(0,0,0);dummy.scale.setScalar(viewScale(density)*cellSize/SCULPT_CELL_SIZE);dummy.updateMatrix();
        mesh.setMatrixAt(i,dummy.matrix);
        color.setRGB(.12+.10*density,.54+.30*density,.61+.31*density);mesh.setColorAt(i,color);
      }
      mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
      mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);previews.set(key,mesh);
    }
    chunks.dirty.clear();buildMs=performance.now()-start;
  }
  function reloadChunks(){chunks.load(serialize().cells,cellSize);dirty=true;refresh();}
  function updateVisibility(camera,{cullRadius=60}={}){
    refresh();
    for(const mesh of previews.values()){
      mesh.visible=visible&&(!camera||mesh.boundingBox.distanceToPoint(camera.position)<=cullRadius);
    }
  }

  function snapshotHistory(){
    history.push(sculptDataFromMap(cells,cellSize));
    if(history.length>30)history.shift();
  }
  function beginStroke(){if(strokeOpen)return;strokeOpen=true;snapshotHistory();}
  function endStroke(){strokeOpen=false;refresh();}
  function undo(){
    const previous=history.pop();if(!previous)return false;
    const mapped=sculptMapFromData(previous,{worldHalf,minY,maxY,maxCells});cells.clear();
    for(const [key,value] of mapped.cells)cells.set(key,value);
    revision++;reloadChunks();return true;
  }

  function apply(point,mode=tool){
    if(!point||mode==='cell')return 0;
    let changes=0;
    applyVolumeBrush(cells,point,{
      mode,cellSize,radius:brushRadius,strength,
      onChange:(c,density)=>{chunks.setCell(c.ix,c.iy,c.iz,density);changes++;},
      accept:c=>accepted(c)&&(mode!=='add'||cells.has(c.key)||cells.size<maxCells)
    });
    if(changes)revision++;
    dirty=true;if(!strokeOpen)refresh();
    return changes;
  }

  function removeInstance(instanceId,object=previews.values().next().value){
    const key=object?.userData?.instanceKeys?.[Number(instanceId)];
    if(!key||!cells.has(key))return false;
    snapshotHistory();cells.delete(key);chunks.setCell(...key.split(',').map(Number),0);revision++;refresh();return true;
  }

  function brushPointFromHit(hit,mode=tool){
    if(!hit?.point)return null;
    const p=hit.point.clone();
    if(mode==='add'){
      if(hit.object?.userData?.volumeSculpt){
        const n=hit.face?.normal?.clone?.()||new THREE.Vector3(0,1,0);
        n.transformDirection(hit.object.matrixWorld);
        p.addScaledVector(n,cellSize*.55);
      }else{
        p.y=Math.max(p.y+cellSize*.42,terrain(p.x,p.z)+cellSize*.42);
      }
    }
    p.x=clamp(p.x,-worldHalf,worldHalf);p.z=clamp(p.z,-worldHalf,worldHalf);p.y=clamp(p.y,minY,maxY);
    return contains(p.x,p.z)?p:null;
  }

  function pointAtDistance(origin,direction,distance){
    if(!origin||!direction||!(distance>0))return null;
    const p=origin.clone().addScaledVector(direction.clone().normalize(),distance);
    p.x=clamp(p.x,-worldHalf,worldHalf);p.z=clamp(p.z,-worldHalf,worldHalf);p.y=clamp(p.y,minY,maxY);
    return contains(p.x,p.z)?p:null;
  }

  function setBrushPreview(point){
    if(!visible||tool==='cell'||!point){brush.visible=false;return;}
    brush.visible=true;brush.position.copy(point);brush.scale.setScalar(brushRadius);
  }

  function serialize(){return sculptDataFromMap(cells,cellSize);}
  function load(data){
    const normalized=normalizeVolumeSculpt(data,{worldHalf,minY,maxY,maxCells});
    history.length=0;strokeOpen=false;cells.clear();cellSize=normalized.cellSize;
    const mapped=sculptMapFromData(normalized,{worldHalf,minY,maxY,maxCells});
    for(const [key,value] of mapped.cells)if(cells.size<maxCells)cells.set(key,value);
    revision++;reloadChunks();
  }
  function clear(){if(cells.size){snapshotHistory();cells.clear();revision++;}strokeOpen=false;reloadChunks();}
  function setVisible(value){visible=Boolean(value);group.visible=visible;if(!visible)brush.visible=false;refresh();}
  function setBrushRadius(value){brushRadius=clamp(Number(value)||6,cellSize,36);if(brush.visible)brush.scale.setScalar(brushRadius);}
  function setStrength(value){strength=clamp(Number(value)||.45,.05,1);}
  function setTool(value){
    tool=['add','remove','smooth','cell'].includes(value)?value:'add';
    brush.material.color.set(tool==='remove'||tool==='cell'?0xff8b8b:tool==='smooth'?0xffdc78:0x9af5ff);
    if(tool==='cell')brush.visible=false;
  }
  function setViewMode(value){viewMode=VIEW_MODES.has(value)?value:'clay';applyViewStyle();}
  function dispose(){
    scene.remove(group);cellGeometry.dispose();cellMaterial.dispose();for(const mesh of previews.values())mesh.dispose();previews.clear();
    prism.geometry.dispose();prism.material.dispose();brush.geometry.dispose();brush.material.dispose();
  }

  group.visible=false;applyViewStyle();
  return {
    group,get mesh(){return previews.values().next().value;},get meshes(){return [...previews.values()];},brush,apply,beginStroke,endStroke,undo,removeInstance,
    brushPointFromHit,pointAtDistance,setBrushPreview,serialize,load,clear,refresh,
    updateVisibility,setVisible,setBrushRadius,setStrength,setTool,setViewMode,dispose,
    get visible(){return visible;},get count(){return cells.size;},get cellSize(){return cellSize;},get revision(){return revision;},
    get brushRadius(){return brushRadius;},get strength(){return strength;},get tool(){return tool;},get viewMode(){return viewMode;},
    get stats(){let visibleChunks=0,instances=0;for(const mesh of previews.values())if(group.visible&&mesh.visible){visibleChunks++;instances+=mesh.count;}return {visibleChunks,loadedChunks:previews.size,triangles:instances*20,dirtyChunks:chunks.dirty.size,buildMs};},
    isSculptObject:object=>object?.userData?.volumeSculpt===true
  };
}
