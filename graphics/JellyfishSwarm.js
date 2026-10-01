import * as THREE from 'three';
import { seededRandom } from './UnderwaterAtmosphere.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export function createJellyfishSwarm({scene,terrain=()=>-18,boundary=140,isBlocked=()=>false,count=28}={}){
  const root=new THREE.Group();root.name='Jellyfish swarm';scene.add(root);
  const random=seededRandom(88421);
  const bellGeo=new THREE.SphereGeometry(.78,18,10,0,Math.PI*2,0,Math.PI*.56);
  bellGeo.scale(1, .72, 1);
  const bellMat=new THREE.MeshStandardMaterial({
    color:0x7ce9e4,transparent:true,opacity:.36,roughness:.18,metalness:0,
    emissive:0x27d9cf,emissiveIntensity:.18,side:THREE.DoubleSide,depthWrite:false
  });
  const bells=new THREE.InstancedMesh(bellGeo,bellMat,count);bells.frustumCulled=false;root.add(bells);

  const strandsPer=7,segments=7;
  const pos=new Float32Array(count*strandsPer*segments*2*3);
  const strandGeo=new THREE.BufferGeometry();strandGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const strandMat=new THREE.LineBasicMaterial({color:0x66fff4,transparent:true,opacity:.24,blending:THREE.AdditiveBlending,depthWrite:false});
  const strands=new THREE.LineSegments(strandGeo,strandMat);strands.frustumCulled=false;root.add(strands);

  const glowGeo=new THREE.SphereGeometry(.98,12,8);
  const glowMat=new THREE.MeshBasicMaterial({color:0x52fff0,transparent:true,opacity:.035,blending:THREE.AdditiveBlending,depthWrite:false});
  const glows=new THREE.InstancedMesh(glowGeo,glowMat,count);glows.frustumCulled=false;root.add(glows);

  const members=[];
  for(let i=0;i<count;i++)members.push({
    angle:random()*Math.PI*2,
    radius:3+random()*13,
    y:(random()-.5)*8,
    phase:random()*Math.PI*2,
    scale:.72+random()*.65,
    drift:random()*Math.PI*2
  });

  const center=new THREE.Vector3(0,1,0),target=new THREE.Vector3(26,0,-18),velocity=new THREE.Vector3(.18,0,.11);
  let targetTimer=0,enabled=true;
  const dummy=new THREE.Object3D(),p=new THREE.Vector3(),prevCenter=new THREE.Vector3();

  function chooseTarget(){
    for(let i=0;i<20;i++){
      const a=random()*Math.PI*2,r=25+random()*(boundary*.62);
      const x=Math.cos(a)*r,z=Math.sin(a)*r,floor=terrain(x,z);
      const y=Math.min(12,Math.max(floor+8,-2+random()*12));
      const candidate=new THREE.Vector3(x,y,z);
      if(Math.abs(x)>boundary-12||Math.abs(z)>boundary-12||isBlocked(candidate,1.4))continue;
      target.copy(candidate);targetTimer=42+random()*55;return;
    }
    target.set(-center.x*.6,Math.max(-4,center.y),-center.z*.6);targetTimer=30;
  }

  function update(dt,time,{nightFactor=0,storminess=0}={}){
    root.visible=enabled;if(!enabled||dt<=0)return;
    prevCenter.copy(center);targetTimer-=dt;if(targetTimer<=0||center.distanceTo(target)<8)chooseTarget();
    const desired=target.clone().sub(center);desired.y*=.32;
    if(desired.lengthSq())desired.normalize().multiplyScalar(.20+storminess*.08);
    velocity.lerp(desired,1-Math.exp(-dt*.28));
    velocity.x+=Math.sin(time*.07)*dt*.018;velocity.z+=Math.cos(time*.06)*dt*.018;
    velocity.y+=Math.sin(time*.09)*dt*.008;
    velocity.clampLength(0,.32+storminess*.10);
    const next=center.clone().addScaledVector(velocity,dt);
    const floor=terrain(next.x,next.z);
    next.y=THREE.MathUtils.clamp(next.y,floor+7,14-storminess*3.5);
    if(Math.abs(next.x)<boundary-10&&Math.abs(next.z)<boundary-10&&!isBlocked(next,2.2))center.copy(next);
    else {velocity.multiplyScalar(-.45);targetTimer=0;}

    bellMat.emissiveIntensity=.12+nightFactor*2.8;
    bellMat.opacity=.28+nightFactor*.16;
    strandMat.opacity=.16+nightFactor*.52;
    glowMat.opacity=.015+nightFactor*.16;

    let k=0;
    for(let i=0;i<count;i++){
      const m=members[i],pulse=.5+.5*Math.sin(time*(1.0+m.scale*.22)+m.phase);
      const orbit=m.angle+time*(.018+.008*Math.sin(m.drift));
      const breathe=1+.12*Math.sin(time*.34+m.phase);
      p.set(
        center.x+Math.cos(orbit)*m.radius*breathe+Math.sin(time*.17+m.phase)*1.2,
        center.y+m.y+Math.sin(time*.31+m.phase)*1.5+pulse*.22,
        center.z+Math.sin(orbit)*m.radius*breathe+Math.cos(time*.15+m.phase)*1.1
      );
      const pfloor=terrain(p.x,p.z);p.y=THREE.MathUtils.clamp(p.y,pfloor+4.5,16);
      if(isBlocked(p,.8)){p.x=center.x+(p.x-center.x)*.55;p.z=center.z+(p.z-center.z)*.55;}
      dummy.position.copy(p);
      dummy.scale.set(m.scale*(1+.08*pulse),m.scale*(.86-.08*pulse),m.scale*(1+.08*pulse));
      dummy.rotation.y=orbit+Math.PI*.5;dummy.rotation.z=Math.sin(time*.18+m.phase)*.08;dummy.updateMatrix();
      bells.setMatrixAt(i,dummy.matrix);
      dummy.scale.multiplyScalar(1.2+nightFactor*.20);dummy.updateMatrix();glows.setMatrixAt(i,dummy.matrix);

      for(let strand=0;strand<strandsPer;strand++){
        const a=strand/strandsPer*Math.PI*2+m.phase;
        let x=p.x+Math.cos(a)*m.scale*.38,z=p.z+Math.sin(a)*m.scale*.38,y=p.y-m.scale*.12;
        for(let seg=0;seg<segments;seg++){
          const x2=p.x+Math.cos(a)*m.scale*(.36-.025*seg)+Math.sin(time*.72+m.phase+seg*.7+a)*(.08+seg*.035);
          const z2=p.z+Math.sin(a)*m.scale*(.36-.025*seg)+Math.cos(time*.61+m.phase+seg*.62+a)*(.08+seg*.035);
          const y2=p.y-m.scale*(.25+(seg+1)*.38)-Math.sin(time*.9+m.phase+seg*.4)*.05;
          pos[k++]=x;pos[k++]=y;pos[k++]=z;pos[k++]=x2;pos[k++]=y2;pos[k++]=z2;
          x=x2;y=y2;z=z2;
        }
      }
    }
    bells.instanceMatrix.needsUpdate=true;glows.instanceMatrix.needsUpdate=true;strandGeo.attributes.position.needsUpdate=true;
  }
  chooseTarget();
  return {root,update,setEnabled(v){enabled=Boolean(v);},get enabled(){return enabled;},get center(){return center;},dispose(){
    scene.remove(root);bellGeo.dispose();bellMat.dispose();strandGeo.dispose();strandMat.dispose();glowGeo.dispose();glowMat.dispose();
  }};
}
