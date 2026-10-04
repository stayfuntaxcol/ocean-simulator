import * as THREE from 'three';
// Simple preview fallback; imported squid assets replace this visual.
export function createSquid(settings={}){
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:'#a56d88',roughness:.45});root.scale.setScalar(settings.size||1);root.name='Squid · basis';root.userData={isFishRoot:true,isReefVisitor:true,visualSpecies:'Squid / inktvis',velocity:new THREE.Vector3(.45,0,0),health:100};
 const body=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),material);body.scale.set(.25,.14,.14);body.position.x=-.05;root.add(body);const arms=[];
 for(let i=0;i<10;i++){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.008,.018,.3,6),material);arm.rotation.z=Math.PI/2;arm.position.set(.22,Math.cos(i*Math.PI/5)*.06,Math.sin(i*Math.PI/5)*.06);root.add(arm);arms.push(arm);}
 let disposed=false;return {root,animate(dt,time){arms.forEach((arm,i)=>arm.rotation.y=Math.sin(time*4+i)*.13*(settings.stroke||1));},dispose(){if(disposed)return;disposed=true;root.traverse(o=>o.geometry?.dispose());material.dispose();}};
}
