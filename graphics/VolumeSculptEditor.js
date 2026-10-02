import * as THREE from 'three';
import {
  SCULPT_CELL_SIZE,SCULPT_MAX_CELLS,normalizeVolumeSculpt,sculptDataFromMap,
  sculptMapFromData,applyVolumeBrush,sculptWorldFromIndex
} from '../worlds/VolumeSculpt.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function createVolumeSculptEditor({
  scene,worldHalf=144,minY=-24,maxY=18,contains=()=>true,terrain=()=>-18,
  cellSize=SCULPT_CELL_SIZE,maxCells=SCULPT_MAX_CELLS
}={}){
  const group=new THREE.Group();group.name='Volume sculpt blueprint';scene.add(group);
  const cells=new Map();
  const cellGeometry=new THREE.IcosahedronGeometry(cellSize*.72,1);
  const cellMaterial=new THREE.MeshStandardMaterial({
    color:0x58cfe1,emissive:0x1b7f91,emissiveIntensity:.35,
    transparent:true,opacity:.26,roughness:.62,metalness:0,depthWrite:false
  });
  const mesh=new THREE.InstancedMesh(cellGeometry,cellMaterial,maxCells);
  mesh.name='Volume sculpt cells';mesh.frustumCulled=false;mesh.count=0;mesh.userData.volumeSculpt=true;group.add(mesh);

  const dummy=new THREE.Object3D(),color=new THREE.Color();
  const prismGeometry=new THREE.CylinderGeometry(worldHalf,worldHalf,maxY-minY,6,1,true);
  prismGeometry.rotateY(Math.PI/6);
  const prism=new THREE.LineSegments(new THREE.EdgesGeometry(prismGeometry),new THREE.LineBasicMaterial({color:0x55bfd1,transparent:true,opacity:.28}));
  prism.position.y=(minY+maxY)/2;prism.name='Volume hex boundary';group.add(prism);
  prismGeometry.dispose();

  const brush=new THREE.Mesh(
    new THREE.SphereGeometry(1,18,12),
    new THREE.MeshBasicMaterial({color:0x9af5ff,transparent:true,opacity:.13,wireframe:true,depthTest:false})
  );
  brush.name='Sculpt brush';brush.renderOrder=50;brush.visible=false;group.add(brush);

  let visible=false,brushRadius=6,strength=.45,tool='add',dirty=true,strokeOpen=false;
  const history=[];

  function accepted(c){
    if(c.y<minY||c.y>maxY||!contains(c.x,c.z))return false;
    // Rock sculpt may touch the terrain surface but not fill far beneath it.
    return c.y>=terrain(c.x,c.z)-cellSize*.65;
  }

  function refresh(){
    if(!dirty)return;dirty=false;
    let i=0;
    for(const [key,density] of cells){
      if(i>=maxCells)break;
      const [ix,iy,iz]=key.split(',').map(Number);
      const x=sculptWorldFromIndex(ix,cellSize),y=sculptWorldFromIndex(iy,cellSize),z=sculptWorldFromIndex(iz,cellSize);
      const scale=.54+density*.46;
      dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(scale);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      color.setRGB(.12+.10*density,.55+.28*density,.62+.30*density);mesh.setColorAt(i,color);
      i++;
    }
    mesh.count=i;mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }

  function snapshotHistory(){
    history.push(sculptDataFromMap(cells,cellSize));
    if(history.length>30)history.shift();
  }
  function beginStroke(){if(strokeOpen)return;strokeOpen=true;snapshotHistory();}
  function endStroke(){strokeOpen=false;}
  function undo(){
    const previous=history.pop();if(!previous)return false;
    const mapped=sculptMapFromData(previous,{worldHalf,minY,maxY,maxCells});cells.clear();
    for(const [key,value] of mapped.cells)cells.set(key,value);
    dirty=true;refresh();return true;
  }

  function apply(point,mode=tool){
    if(!point||cells.size>=maxCells&&mode==='add')return 0;
    const changed=applyVolumeBrush(cells,point,{
      mode,cellSize,radius:brushRadius,strength,
      accept:c=>accepted(c)&&(mode!=='add'||cells.has(c.key)||cells.size<maxCells)
    });
    dirty=true;refresh();return changed;
  }

  function brushPointFromHit(hit,mode=tool){
    if(!hit?.point)return null;
    const p=hit.point.clone();
    if(mode==='add'){
      if(hit.object===mesh){
        const n=hit.face?.normal?.clone?.()||new THREE.Vector3(0,1,0);
        n.transformDirection(mesh.matrixWorld);
        p.addScaledVector(n,cellSize*.52);
      }else{
        p.y=Math.max(p.y+cellSize*.42,terrain(p.x,p.z)+cellSize*.42);
      }
    }
    p.x=clamp(p.x,-worldHalf,worldHalf);p.z=clamp(p.z,-worldHalf,worldHalf);p.y=clamp(p.y,minY,maxY);
    return contains(p.x,p.z)?p:null;
  }

  function setBrushPreview(point){
    if(!visible||!point){brush.visible=false;return;}
    brush.visible=true;brush.position.copy(point);brush.scale.setScalar(brushRadius);
  }

  function serialize(){return sculptDataFromMap(cells,cellSize);}
  function load(data){
    const normalized=normalizeVolumeSculpt(data,{worldHalf,minY,maxY,maxCells});
    history.length=0;strokeOpen=false;cells.clear();
    const mapped=sculptMapFromData(normalized,{worldHalf,minY,maxY,maxCells});
    for(const [key,value] of mapped.cells)if(cells.size<maxCells)cells.set(key,value);
    dirty=true;refresh();
  }
  function clear(){if(cells.size)snapshotHistory();cells.clear();strokeOpen=false;dirty=true;refresh();}
  function setVisible(value){visible=Boolean(value);group.visible=visible;if(!visible)brush.visible=false;refresh();}
  function setBrushRadius(value){brushRadius=clamp(Number(value)||6,cellSize,18);if(brush.visible)brush.scale.setScalar(brushRadius);}
  function setStrength(value){strength=clamp(Number(value)||.45,.05,1);}
  function setTool(value){tool=['add','remove','smooth'].includes(value)?value:'add';brush.material.color.set(tool==='remove'?0xff8b8b:tool==='smooth'?0xffdc78:0x9af5ff);}
  function dispose(){
    scene.remove(group);cellGeometry.dispose();cellMaterial.dispose();mesh.dispose?.();
    prism.geometry.dispose();prism.material.dispose();brush.geometry.dispose();brush.material.dispose();
  }

  group.visible=false;
  return {
    group,mesh,brush,apply,beginStroke,endStroke,undo,brushPointFromHit,setBrushPreview,serialize,load,clear,refresh,
    setVisible,setBrushRadius,setStrength,setTool,dispose,
    get visible(){return visible;},get count(){return cells.size;},get cellSize(){return cellSize;},
    get brushRadius(){return brushRadius;},get strength(){return strength;},get tool(){return tool;},
    isSculptObject:object=>object===mesh||object?.userData?.volumeSculpt===true
  };
}
