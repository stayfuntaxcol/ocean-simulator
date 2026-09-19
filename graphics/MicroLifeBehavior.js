import * as THREE from 'three';
import { seededRandom } from './UnderwaterAtmosphere.js';

// Decorative populations are world anchored, independent of camera and LOD.
// Units match the existing scene; this is an artistic behaviour model.
export const MICRO_BEHAVIOR=Object.freeze({crabLimit:20,shrimpLimit:48,escapeDuration:1,escapeSpeed:2.8,threatRange:2.4});
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const heading=v=>-Math.atan2(v.z,v.x);
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const up=new THREE.Vector3(0,1,0);

export function createMicroBehavior({terrain,groundPose,swimSafe,getThreats=()=>[]}) {
  let animals=[],boxes=[],time=0;
  function groundPath(a,b,r) {
    const steps=Math.max(1,Math.ceil(a.distanceTo(b)/.12));
    for(let i=1;i<=steps;i++)if(!groundPose(THREE.MathUtils.lerp(a.x,b.x,i/steps),THREE.MathUtils.lerp(a.z,b.z,i/steps),r))return false;
    return true;
  }
  function waterPath(a,b) {
    const steps=Math.max(1,Math.ceil(a.distanceTo(b)/.10));
    for(let i=1;i<=steps;i++)if(!swimSafe(a.clone().lerp(b,i/steps),.43))return false;
    return true;
  }
  function base(type,id,position,random) {
    return {type,id,position,home:position.clone(),velocity:new THREE.Vector3(),normal:up.clone(),random,
      scale:.88+random()*.17,phase:random()*6.28,gait:0,fold:0,yaw:random()*6.28,pitch:0,state:type==='crab'?'HIDE':'SWIM',timer:random()*32,cooldown:0};
  }
  function sync(habitats,obstacles,shelters) {
    boxes=obstacles;
    const sorted=[...habitats].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z)||a.x-b.x||a.z-b.z);
    const keys=new Set(sorted.map(h=>`${h.x},${h.z}`));
    const cover=shelters.map(b=>({box:b,key:`${b.min.x},${b.min.z},${b.max.x},${b.max.z}`})).sort((a,b)=>a.key.localeCompare(b.key));
    const coverKeys=new Set(cover.map(b=>b.key));
    animals=animals.filter(a=>{
      if(a.type==='shrimp') {
        if(!keys.has(a.habitat))return false;
        // Terrain editing moves the local water layer, never resets swimming state.
        const floor=terrain(a.position.x,a.position.z),dy=floor-a.floor;a.floor=floor;
        a.position.y+=dy;a.home.y+=dy;
        return swimSafe(a.position,.43);
      }
      if(!keys.size||!coverKeys.has(a.cover))return false;
      const pose=groundPose(a.position.x,a.position.z,.58),home=groundPose(a.home.x,a.home.z,.58);
      if(!pose||!home)return false;
      a.position.copy(pose.position);a.normal.copy(pose.normal);a.home.copy(home.position);
      if(a.target){const target=groundPose(a.target.x,a.target.z,.58);if(target)a.target.copy(target.position);else{a.state='RETURN';a.target=a.home.clone();}}
      return true;
    });
    // Independent territories at rock edges. No rocks means no bottom crabs.
    // Never force a minimum by placing animals into solid geometry.
    for(const {box,key} of cover) {
      if(!sorted.some(h=>Math.hypot(h.x-(box.min.x+box.max.x)/2,h.z-(box.min.z+box.max.z)/2)<20))continue;
      for(let slot=0;slot<12&&animals.filter(a=>a.type==='crab').length<MICRO_BEHAVIOR.crabLimit;slot++) {
        const id=`crab:${key}:${slot}`;if(animals.some(a=>a.id===id))continue;
        const random=seededRandom(hash(id)),side=[2,0,1,3][slot%4],u=.15+random()*.7,padding=.63;
        const x=side===0?box.min.x-padding:side===1?box.max.x+padding:THREE.MathUtils.lerp(box.min.x,box.max.x,u);
        const z=side===2?box.min.z-padding:side===3?box.max.z+padding:THREE.MathUtils.lerp(box.min.z,box.max.z,u);
        const pose=groundPose(x,z,.58);
        if(!pose||animals.some(a=>a.type==='crab'&&a.home.distanceTo(pose.position)<3.3))continue;
        const a=base('crab',id,pose.position,random);a.cover=key;a.normal.copy(pose.normal);animals.push(a);
      }
    }
    // Three small loose shoals, at most 48 individual shrimp, not a fish school.
    for(const h of sorted) {
      if(animals.filter(a=>a.type==='shrimp').length>=MICRO_BEHAVIOR.shrimpLimit)break;
      const habitat=`${h.x},${h.z}`;
      for(let slot=0;slot<16;slot++) {
        if(animals.filter(a=>a.type==='shrimp').length>=MICRO_BEHAVIOR.shrimpLimit)break;
        const id=`shrimp:${habitat}:${slot}`;if(animals.some(a=>a.id===id))continue;
        const random=seededRandom(hash(id));
        for(let attempt=0;attempt<30;attempt++) {
          const spread=5+Math.floor(attempt/10)*4;
          const x=h.x+(random()-.5)*spread,z=h.z+(random()-.5)*spread,floor=terrain(x,z);
          const p=new THREE.Vector3(x,floor+.85+random()*1.5,z);
          if(!swimSafe(p,.43)||animals.some(a=>a.type==='shrimp'&&a.position.distanceTo(p)<.85))continue;
          const a=base('shrimp',id,p,random);a.habitat=habitat;a.floor=floor;
          a.home.set(h.x,terrain(h.x,h.z)+1.5,h.z);
          a.velocity.set(Math.cos(a.yaw)*.18,0,-Math.sin(a.yaw)*.18);a.timer=0;animals.push(a);break;
        }
      }
    }
  }
  function nearestThreat(a,threats) {
    let found=null,best=MICRO_BEHAVIOR.threatRange;
    for(const t of threats){const d=a.position.distanceTo(t.position)-Math.max(0,t.radius??0);if(d<best){best=d;found=t;}}
    return found;
  }
  function stepCrab(a,dt,threat) {
    a.timer-=dt;a.velocity.set(0,0,0);
    if(threat&&a.state!=='HIDE'){a.state='RETURN';a.target=a.home.clone();}
    if(a.state==='HIDE') {
      if(threat){a.timer=Math.max(a.timer,8);return;}
      if(a.timer>0)return;
      for(let i=0;i<12;i++) {
        const angle=a.random()*Math.PI*2,r=.45+a.random()*.45;
        const target=groundPose(a.home.x+Math.cos(angle)*r,a.home.z+Math.sin(angle)*r,.58);
        if(!target||!groundPath(a.home,target.position,.58))continue;
        if(animals.some(b=>b!==a&&b.type==='crab'&&b.home.distanceTo(target.position)<2.2))continue;
        a.target=target.position;a.state='TURN';return;
      }
      a.timer=3+a.random()*5;return;
    }
    if(a.state==='FORAGE'){if(a.timer<=0){a.state='RETURN';a.target=a.home.clone();}return;}
    const direction=a.target.clone().sub(a.position);direction.y=0;const remaining=direction.length();
    if(remaining<.025) {
      a.state=a.state==='RETURN'?'HIDE':'FORAGE';a.timer=a.state==='HIDE'?20+a.random()*28:2+a.random()*3;return;
    }
    direction.normalize();
    // Select either lateral side so the body never has to turn around to return.
    let desired=heading(direction)-Math.PI/2;
    if(Math.abs(angleDelta(a.yaw,desired))>Math.PI/2)desired+=Math.PI;
    const turn=angleDelta(a.yaw,desired);
    a.yaw+=THREE.MathUtils.clamp(turn,-dt*2,dt*2);
    if(Math.abs(turn)>.03)return;
    if(a.state==='TURN')a.state='WALK';
    const speed=(a.state==='RETURN'&&threat?.55:.22)*Math.min(1,remaining/.18);
    const next=a.position.clone().addScaledVector(direction,Math.min(speed*dt,remaining));
    if(!groundPath(a.position,next,.58)||animals.some(b=>b!==a&&b.type==='crab'&&b.position.distanceTo(next)<1.18)) {
      a.state='RETURN';a.target=a.home.clone();return;
    }
    const pose=groundPose(next.x,next.z,.58);
    a.velocity.copy(pose.position).sub(a.position).divideScalar(dt);a.position.copy(pose.position);a.normal.copy(pose.normal);
  }
  function stepShrimp(a,dt,threat,snapshot) {
    a.cooldown=Math.max(0,a.cooldown-dt);
    if(threat&&a.state==='SWIM'&&a.cooldown===0) {
      const away=a.position.clone().sub(threat.position);
      if(away.lengthSq()<1e-8)away.set(-Math.cos(a.yaw),0,Math.sin(a.yaw));
      a.escape=away.normalize();a.state='EVADE';a.timer=0;
      // Face the threat, so a straight impulse away is visibly tail-first.
      const forward=a.escape.clone().negate();a.yaw=heading(forward);a.pitch=Math.asin(THREE.MathUtils.clamp(forward.y,-1,1));
    }
    if(a.state==='EVADE') {
      a.timer+=dt;
      a.velocity.copy(a.escape).multiplyScalar(MICRO_BEHAVIOR.escapeSpeed*Math.exp(-1.9*a.timer));
      a.fold=Math.min(1,a.timer/.075)*Math.max(0,1-a.timer/1.05);a.gait=0;
      if(a.timer>=MICRO_BEHAVIOR.escapeDuration){a.state='RECOVER';a.timer=0;a.cooldown=2.5;}
    } else if(a.state==='RECOVER') {
      a.timer+=dt;a.velocity.multiplyScalar(Math.exp(-4*dt));a.fold*=Math.exp(-12*dt);
      if(a.timer>.65){a.state='SWIM';a.velocity.set(0,0,0);a.fold=0;}
    } else {
      const acceleration=new THREE.Vector3(),center=new THREE.Vector3(),alignment=new THREE.Vector3();let neighbors=0;
      for(const b of snapshot) {
        if(b.id===a.id)continue;
        const offset=a.position.clone().sub(b.position),d=offset.length();
        if(d<3.2){center.add(b.position);alignment.add(b.velocity);neighbors++;}
        if(d<1.3&&d>.0001)acceleration.addScaledVector(offset,(1.3-d)*1.15/d);
      }
      if(neighbors){acceleration.addScaledVector(center.divideScalar(neighbors).sub(a.position),.035);acceleration.addScaledVector(alignment.divideScalar(neighbors).sub(a.velocity),.08);}
      const home=a.home.clone();home.y=terrain(a.position.x,a.position.z)+1.5;
      acceleration.addScaledVector(home.sub(a.position),.045);
      acceleration.add(new THREE.Vector3(Math.sin(time*.47+a.phase),Math.sin(time*.38+a.phase*3)*.4,Math.cos(time*.41+a.phase*2)).multiplyScalar(.075));
      // Turn away before the body envelope touches a rock; swept movement is
      // still checked below, including during the high-speed escape.
      for(const box of boxes){const nearest=box.clampPoint(a.position,new THREE.Vector3()),away=a.position.clone().sub(nearest),d=away.length();if(d>0&&d<1.35)acceleration.addScaledVector(away,(1.35-d)*1.7/d);}
      if(acceleration.length()>.7)acceleration.setLength(.7);
      a.velocity.addScaledVector(acceleration,dt);if(a.velocity.length()>.48)a.velocity.setLength(.48);
      if(a.velocity.lengthSq()>.00001){a.yaw+=angleDelta(a.yaw,heading(a.velocity))*Math.min(1,dt*5);a.pitch=THREE.MathUtils.lerp(a.pitch,Math.asin(a.velocity.y/a.velocity.length()),Math.min(1,dt*4));}
    }
    const next=a.position.clone().addScaledVector(a.velocity,dt);
    if(waterPath(a.position,next)&&!snapshot.some(b=>b.id!==a.id&&b.position.distanceTo(next)<.69))a.position.copy(next);
    else {a.velocity.set(0,0,0);if(a.state==='EVADE'){a.state='RECOVER';a.timer=0;a.cooldown=2.5;}}
    a.floor=terrain(a.position.x,a.position.z);
  }
  function update(dt) {
    if(dt<=0)return;time+=dt;
    const threats=getThreats().filter(t=>t?.position&&[t.position.x,t.position.y,t.position.z].every(Number.isFinite));
    const snapshot=animals.filter(a=>a.type==='shrimp').map(a=>({id:a.id,position:a.position.clone(),velocity:a.velocity.clone()}));
    for(const a of animals) {
      const previous=a.position.clone(),threat=nearestThreat(a,threats);
      if(a.type==='crab')stepCrab(a,dt,threat);else stepShrimp(a,dt,threat,snapshot);
      const speed=a.position.distanceTo(previous)/dt;
      // Only travelled distance drives locomotor limbs. No walking in place.
      a.gait=a.state==='EVADE'||a.state==='RECOVER'?0:Math.min(1,speed/(a.type==='crab'?.20:.28));
      a.phase+=speed*dt*55;
    }
  }
  return {sync,update,get animals(){return animals;},snapshot:()=>animals.map(a=>({id:a.id,type:a.type,state:a.state,position:a.position.toArray(),home:a.home.toArray(),velocity:a.velocity.toArray(),yaw:a.yaw,pitch:a.pitch,gait:a.gait,phase:a.phase,fold:a.fold}))};
}
