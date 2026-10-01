import * as THREE from 'three';
import {VISITOR_SPECIES} from './ReefVisitors.js';

// Separate flat body and thin tail volumes: width never becomes vertical height.
export function visitorParts(kind){
  return kind==='stingray'?[{center:[.1,0,0],half:[1.13,.49,1.46]},{center:[-2.05,0,0],half:[1.2,.24,.30]}]
    :[{center:[.03,0,0],half:[1.86,.79,1.95]}];
}
export function visitorPathClear(kind,from,to,heading,{rocks=[],terrain=()=>-18,inside=()=>true}={}){
  const c=Math.cos(heading),s=Math.sin(heading),delta=to.clone().sub(from),length=delta.length();
  if(!inside(from)||!inside(to))return false;
  for(const part of visitorParts(kind)){
    const [x,y,z]=part.half,[cx,cy,cz]=part.center;
    const padding=new THREE.Vector3(Math.abs(c)*x+Math.abs(s)*z+.035,y+.035,Math.abs(s)*x+Math.abs(c)*z+.035);
    const offset=new THREE.Vector3(c*cx-s*cz,cy,s*cx+c*cz),a=from.clone().add(offset),b=to.clone().add(offset);
    const ray=new THREE.Ray(a,delta.clone().normalize()),hit=new THREE.Vector3();
    for(const rock of rocks){const box=rock.clone().expandByVector(padding);if(box.containsPoint(a)||box.containsPoint(b)||(length>0&&ray.intersectBox(box,hit)&&hit.distanceTo(a)<=length))return false;}
    for(let i=0,n=Math.max(1,Math.ceil(length/.6));i<=n;i++){
      const p=a.clone().lerp(b,i/n);
      if(p.y+padding.y>19.55)return false;
      for(const dx of [-padding.x,0,padding.x])for(const dz of [-padding.z,0,padding.z])
        if(p.y-padding.y<terrain(p.x+dx,p.z+dz)||!inside(new THREE.Vector3(p.x+dx,p.y,p.z+dz)))return false;
    }
  }
  return true;
}
export function validateVisitorRecords(value){
  const result={};if(value==null)return result;
  if(typeof value!=='object'||Array.isArray(value))throw Error('Ongeldige rog- of schildpadgegevens.');
  for(const kind of Object.keys(VISITOR_SPECIES))if(value[kind]!=null){
    const r=value[kind];
    if(!Array.isArray(r.position)||r.position.length!==3||!r.position.every(Number.isFinite)||Math.abs(r.position[0])>144||Math.abs(r.position[2])>144||r.position[1]<-40||r.position[1]>19.55||!Number.isFinite(r.heading))throw Error('Ongeldige positie van '+VISITOR_SPECIES[kind].name+'.');
    result[kind]={position:[...r.position],heading:r.heading};
  }
  return result;
}
export function createVisitorCruise(root,kind,clear,terrain){
  let heading=Math.atan2(root.userData.velocity.z,root.userData.velocity.x),target=null,nextPick=0,clock=0,lastBreath=0,surfacing=false,surfaceAt=null;
  const speed=VISITOR_SPECIES[kind].speed;
  return {update(dt){
    if(dt<=0)return;clock+=dt;
    if(kind==='turtle'){
      if(!surfacing&&clock-lastBreath>72){surfacing=true;target=null;}
      if(surfacing&&root.position.y>18.4){
        surfaceAt??=clock;
        if(clock-surfaceAt>6){surfacing=false;lastBreath=clock;surfaceAt=null;target=null;}
      }
    }
    if(!target||root.position.distanceTo(target)<.8||clock>nextPick){
      target=null;nextPick=clock+12;
      for(const turn of [.18,-.35,.65,-.95,1.4,-1.8,2.4,Math.PI]){
        const angle=heading+turn,p=root.position.clone().add(new THREE.Vector3(Math.cos(angle)*5,0,Math.sin(angle)*5));
        const rise=kind==='turtle'&&surfacing;
        p.y=rise?18.65:terrain(p.x,p.z)+(kind==='stingray'?1.05:3.5)+Math.sin(clock*.15)*.25;
        p.y=THREE.MathUtils.clamp(p.y,-38,kind==='stingray'?18.8:18.65);
        // Actual gradual turns below are checked before moving or rotating.
        if(clear(root.position,p,angle)){target=p;break;}
      }
      if(!target){root.userData.velocity.set(0,0,0);nextPick=clock+1;return;}
    }
    const desired=target.clone().sub(root.position),angle=Math.atan2(desired.z,desired.x);
    const diff=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading)),nextHeading=heading+THREE.MathUtils.clamp(diff,-dt*.8,dt*.8);
    const pace=kind==='turtle'?.78+.22*Math.sin(clock*1.15):1;
    const velocity=new THREE.Vector3(Math.cos(nextHeading)*speed*pace,THREE.MathUtils.clamp(desired.y*.35,-.38,.38),Math.sin(nextHeading)*speed*pace);
    const next=root.position.clone().addScaledVector(velocity,dt);
    // Cover the yaw arc too. Refuse a turn whose flippers would clip a wall.
    if(!clear(root.position,root.position,(heading+nextHeading)/2)||!clear(root.position,next,nextHeading)){
      target=null;root.userData.velocity.multiplyScalar(.5);return;
    }
    heading=nextHeading;root.position.copy(next);root.rotation.set(0,-heading,0);root.userData.velocity.copy(velocity);
  }};
}
