import * as THREE from 'three';
import {WHALE_MARGIN,WHALE_EXTENT} from './Whale.js';

export function whaleRouteClear(from,to,{rocks=[],terrain=()=>-18,boundary=144}={}){
  const padding=new THREE.Vector3(WHALE_MARGIN,WHALE_EXTENT.y,WHALE_MARGIN);
  const delta=to.clone().sub(from),length=delta.length(),ray=new THREE.Ray(from,delta.clone().normalize()),hit=new THREE.Vector3();
  for(const rock of rocks){const box=rock.clone().expandByVector(padding);if(box.containsPoint(from)||box.containsPoint(to))return false;
    if(length>0&&ray.intersectBox(box,hit)&&hit.distanceTo(from)<=length)return false;}
  const steps=Math.max(1,Math.ceil(length/1.5));
  for(let i=0;i<=steps;i++){
    const p=from.clone().lerp(to,i/steps);
    if(!p.toArray().every(Number.isFinite)||Math.abs(p.x)>boundary-WHALE_MARGIN||Math.abs(p.z)>boundary-WHALE_MARGIN||p.y>19.55-WHALE_EXTENT.y)return false;
    // Cover the footprint, not just the center. Reject narrow ridges before turning over them.
    for(let dx=-WHALE_MARGIN;dx<=WHALE_MARGIN;dx+=WHALE_MARGIN/4)for(let dz=-WHALE_MARGIN;dz<=WHALE_MARGIN;dz+=WHALE_MARGIN/4){
      if(p.y<terrain(p.x+dx,p.z+dz)+WHALE_EXTENT.y)return false;
    }
  }
  return true;
}
export function createWhaleCruise(root,clearPath){
  let target=null,retry=0;const dummy=new THREE.Object3D();
  return {update(dt,time){
    if(dt<=0||root.userData.dead)return;
    if(!target||root.position.distanceTo(target)<2){
      if(time<retry)return;target=null;retry=time+2;
      const heading=Math.atan2(root.userData.velocity.z,root.userData.velocity.x);
      for(const turn of [.2,-.35,.65,-.85,1.2,-1.6,2.2,Math.PI]){
        const a=heading+turn,candidate=root.position.clone().add(new THREE.Vector3(Math.cos(a)*9,Math.sin(time*.08)*.35,Math.sin(a)*9));
        if(clearPath(root.position,candidate)){target=candidate;break;}
      }
      if(!target){root.userData.velocity.set(0,0,0);return;}
    }
    const desired=target.clone().sub(root.position).normalize().multiplyScalar(1.15);
    const velocity=root.userData.velocity.clone().lerp(desired,1-Math.exp(-dt*.5));
    const next=root.position.clone().addScaledVector(velocity,dt);
    if(!clearPath(root.position,next)){target=null;retry=time+.6;root.userData.velocity.set(0,0,0);return;}
    root.position.copy(next);root.userData.velocity.copy(velocity);
    if(velocity.lengthSq()>.001){dummy.position.copy(next);dummy.lookAt(next.clone().add(velocity));dummy.rotateY(-Math.PI/2);root.quaternion.slerp(dummy.quaternion,1-Math.exp(-dt*.6));}
  }};
}
export function validateWhaleRecord(record){
  if(!record||!Array.isArray(record.position)||record.position.length!==3||!record.position.every(Number.isFinite))return null;
  const [x,y,z]=record.position;
  if(Math.abs(x)>144-WHALE_MARGIN||Math.abs(z)>144-WHALE_MARGIN||y< -40||y>19.55-WHALE_EXTENT.y)return null;
  return {position:[x,y,z],heading:Number.isFinite(record.heading)?record.heading:0,health:THREE.MathUtils.clamp(Number.isFinite(record.health)?record.health:100,0,100)};
}
