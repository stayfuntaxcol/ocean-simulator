import * as THREE from 'three';
import { SEA_LEVEL_Y,DEPTH_LAYER_HEIGHT,MIN_DEPTH_LAYER,MAX_DEPTH_LAYER,layerTopY,layerBottomY,depthFromWorldY,depthLayerForY } from '../worlds/DepthLayers.js';

export function createDepthLayerGuide({scene,radius=144}={}){
  const root=new THREE.Group();root.name='Depth layer guide';scene.add(root);
  const seaMat=new THREE.MeshBasicMaterial({color:0x25d9f2,transparent:true,opacity:.105,depthWrite:false,side:THREE.DoubleSide});
  const seaGeo=new THREE.CircleGeometry(radius,6);seaGeo.rotateZ(Math.PI/6);
  const sea=new THREE.Mesh(seaGeo,seaMat);sea.rotation.x=-Math.PI/2;sea.position.y=SEA_LEVEL_Y;sea.name='SEA LEVEL 0m';root.add(sea);

  const outlineMat=new THREE.LineBasicMaterial({color:0x55dfee,transparent:true,opacity:.44});
  const deepMat=new THREE.LineBasicMaterial({color:0x5c83a8,transparent:true,opacity:.30});
  for(let layer=MAX_DEPTH_LAYER;layer>=MIN_DEPTH_LAYER;layer--){
    const height=DEPTH_LAYER_HEIGHT;
    const geo=new THREE.CylinderGeometry(radius,radius,height,6,1,true);geo.rotateY(Math.PI/6);
    const edges=new THREE.EdgesGeometry(geo);geo.dispose();
    const lines=new THREE.LineSegments(edges,layer===0?outlineMat:deepMat);
    lines.position.y=(layerTopY(layer)+layerBottomY(layer))/2;
    lines.name=`Depth Layer ${layer}`;root.add(lines);
  }
  const seamGeo=new THREE.RingGeometry(radius-.28,radius+.28,6);seamGeo.rotateZ(Math.PI/6);
  for(let layer=MAX_DEPTH_LAYER;layer>MIN_DEPTH_LAYER;layer--){
    const seam=new THREE.Mesh(seamGeo,new THREE.MeshBasicMaterial({color:0x8ea9c5,transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false}));
    seam.rotation.x=-Math.PI/2;seam.position.y=layerBottomY(layer);seam.name=`Layer ${layer-1} top`;root.add(seam);
  }
  root.visible=false;
  return {
    root,sea,
    setVisible(value){root.visible=Boolean(value);},
    describe(y){
      const depth=depthFromWorldY(y),layer=depthLayerForY(y);
      return {depth,layer,seaLevelY:SEA_LEVEL_Y,layerTop:layerTopY(layer),layerBottom:layerBottomY(layer)};
    },
    dispose(){
      scene.remove(root);
      root.traverse(o=>{o.geometry?.dispose?.();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material.dispose?.();}});
    }
  };
}
