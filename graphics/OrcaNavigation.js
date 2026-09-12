import * as THREE from 'three';
import { ORCA_CLEARANCE } from './Orca.js';

// Conservative clearance for a single large animal. It deliberately avoids narrow overhangs.
export function orcaRouteClear(from,to,{rocks=[],terrain=()=>-18,boundary=144,radius=ORCA_CLEARANCE}={}) {
  const delta=to.clone().sub(from),length=delta.length();
  const ray=new THREE.Ray(from,delta.clone().normalize()),intersection=new THREE.Vector3();
  for(const rock of rocks) {
    const box=rock.clone().expandByScalar(radius);
    if(box.containsPoint(from)||box.containsPoint(to))return false;
    if(length>0 && ray.intersectBox(box,intersection) && intersection.distanceTo(from)<=length)return false;
  }
  const steps=Math.max(1,Math.ceil(length/1.5));
  for(let i=0;i<=steps;i++) {
    const p=from.clone().lerp(to,i/steps);
    if(![p.x,p.y,p.z].every(Number.isFinite))return false;
    if(Math.abs(p.x)>boundary-radius || Math.abs(p.z)>boundary-radius || p.y>16-radius)return false;
    const floor=Math.max(terrain(p.x,p.z),terrain(p.x-radius,p.z),terrain(p.x+radius,p.z),
      terrain(p.x,p.z-radius),terrain(p.x,p.z+radius));
    if(p.y<floor+radius)return false;
  }
  return true;
}

export function createOrcaCruise(root,clearPath) {
  let target=null,retry=0;
  const dummy=new THREE.Object3D();
  return {
    update(dt,time) {
      if(dt<=0 || root.userData.dead)return;
      if(!target || root.position.distanceTo(target)<3) {
        if(time<retry)return;
        target=null;retry=time+1.5;
        const heading=Math.atan2(root.userData.velocity.z,root.userData.velocity.x);
        for(const turn of [.35,-.55,.95,-1.3,1.8,-2.4,Math.PI]) {
          const angle=heading+turn;
          const candidate=root.position.clone().add(new THREE.Vector3(Math.cos(angle)*16,Math.sin(time*.15)*1.4,Math.sin(angle)*16));
          if(clearPath(root.position,candidate)) { target=candidate;break; }
        }
        if(!target){root.userData.velocity.multiplyScalar(.5);return;}
      }
      const desired=target.clone().sub(root.position).normalize().multiplyScalar(1.7);
      const velocity=root.userData.velocity.clone().lerp(desired,1-Math.exp(-dt*.7));
      const next=root.position.clone().addScaledVector(velocity,dt);
      if(!clearPath(root.position,next)){target=null;retry=time+.5;root.userData.velocity.multiplyScalar(.6);return;}
      root.position.copy(next);root.userData.velocity.copy(velocity);
      if(velocity.lengthSq()>.001) {
        dummy.position.copy(root.position);dummy.lookAt(root.position.clone().add(velocity));dummy.rotateY(-Math.PI/2);
        root.quaternion.slerp(dummy.quaternion,1-Math.exp(-dt*1.8));
      }
    },
  };
}

export function validateOrcaRecord(record) {
  if(!record || !Array.isArray(record.position)||record.position.length!==3 ||
    !record.position.every(Number.isFinite))return null;
  const [x,y,z]=record.position;
  if(Math.abs(x)>140 || Math.abs(z)>140 || y< -40 || y>13)return null;
  const heading=Number.isFinite(record.heading)?record.heading:0;
  return {position:[x,y,z],heading,health:THREE.MathUtils.clamp(Number.isFinite(record.health)?record.health:100,0,100)};
}
