import * as THREE from 'three';

// Water trough is 19.62; leave a small margin below it, including pitched bodies.
export const WATER_CEILING=19.55;
export function fishExtent(fish){
  const s=Math.max(fish.scale.x,fish.scale.y,fish.scale.z);
  if(fish.userData.isOrca)return new THREE.Vector3(4,2.6,1.8).multiplyScalar(s);
  if(fish.userData.imported){const r=fish.userData.contactRadius||2.2;return new THREE.Vector3(r,r,r);}
  return new THREE.Vector3(...(fish.userData.speciesId==='reef_6'?[2.5,.8,1.25]:[2.4,1.6,.75])).multiplyScalar(s);
}
function support(fish,normal){
  const local=normal.clone().applyQuaternion(fish.quaternion.clone().invert()),e=fishExtent(fish);
  return Math.hypot(local.x*e.x,local.y*e.y,local.z*e.z);
}
export function waterLimit(fish){return WATER_CEILING-support(fish,new THREE.Vector3(0,1,0));}
export function constrainWater(fish){
  const top=waterLimit(fish);
  if(fish.position.y>top){fish.position.y=top;if(fish.userData.velocity)fish.userData.velocity.y=Math.min(0,fish.userData.velocity.y);}
  return top;
}

export function createFishNeighborhood(fishes){
  const list=fishes.filter(f=>f.parent&&!f.userData.dead),grid=new Map();
  const cell=Math.max(3,...list.map(f=>fishExtent(f).length()*2+.8));
  const key=(x,y,z)=>`${x},${y},${z}`;
  for(const fish of list){const p=fish.position,k=key(Math.floor(p.x/cell),Math.floor(p.y/cell),Math.floor(p.z/cell));if(!grid.has(k))grid.set(k,[]);grid.get(k).push(fish);}
  function neighbors(fish){const p=fish.position,x=Math.floor(p.x/cell),y=Math.floor(p.y/cell),z=Math.floor(p.z/cell),out=[];
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)out.push(...(grid.get(key(x+a,y+b,z+c))||[]));return out;}
  return {list,neighbors};
}
export function avoidFish(fish,nearby,out){
  out.set(0,0,0);
  for(const other of nearby){
    if(fish===other)continue;
    const delta=fish.position.clone().sub(other.position),distance=delta.length();
    const n=distance>.0001?delta.divideScalar(distance):new THREE.Vector3(fish.id<other.id?-1:1,0,0);
    const contact=support(fish,n)+support(other,n);
    if(distance<contact+.7)out.addScaledVector(n,Math.min(2,(contact+.7-distance)*1.6));
  }
  return out;
}

// Non-bouncy contact: separate bodies, remove closing velocity, check every correction against terrain/rocks.
export function resolveFishContacts(fishes,previous,canMove=()=>true){
  for(let pass=0;pass<4;pass++){
    const space=createFishNeighborhood(fishes);let contacts=0;
    for(const a of space.list)for(const b of space.neighbors(a)){
      if(a.id>=b.id)continue;
      let delta=a.position.clone().sub(b.position),distance=delta.length();
      let n=distance>.0001?delta.divideScalar(distance):new THREE.Vector3(1,0,0);
      let gap=support(a,n)+support(b,n);
      const oldA=previous.get(a),oldB=previous.get(b);
      if(pass===0&&oldA&&oldB){
        const old=oldA.clone().sub(oldB),change=a.position.clone().sub(b.position).sub(old);
        const u=THREE.MathUtils.clamp(-old.dot(change)/Math.max(1e-9,change.lengthSq()),0,1);
        const closest=old.clone().addScaledVector(change,u);
        if(u>0&&u<1&&closest.length()<gap&&old.length()>=gap){
          a.position.copy(oldA);b.position.copy(oldB);delta=a.position.clone().sub(b.position);distance=delta.length();n=delta.normalize();gap=support(a,n)+support(b,n);
        }
      }
      if(distance>=gap+.001)continue;
      const fixedA=a.userData.sleeping||a.userData.isOrca,fixedB=b.userData.sleeping||b.userData.isOrca;
      if(fixedA&&fixedB)continue;
      contacts++;
      const amount=gap-distance+.002;
      const move=(f,d)=>{const p=f.position.clone().addScaledVector(n,d);if(canMove(f,p)){f.position.copy(p);return true;}return false;};
      const wa=fixedA?0:fixedB?1:.5,wb=fixedB?0:fixedA?1:.5;
      const movedA=wa?move(a,amount*wa):false,movedB=wb?move(b,-amount*wb):false;
      if(!movedA&&wb&&wa)move(b,-amount*wa);
      if(!movedB&&wa&&wb)move(a,amount*wb);
      const closing=a.userData.velocity.clone().sub(b.userData.velocity).dot(n);
      if(closing<0){if(!fixedA)a.userData.velocity.addScaledVector(n,-closing*(fixedB?1:.5));if(!fixedB)b.userData.velocity.addScaledVector(n,closing*(fixedA?1:.5));}
    }
    if(!contacts)break;
  }
}
