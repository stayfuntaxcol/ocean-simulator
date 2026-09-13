import * as THREE from 'three';
import {createRealisticPufferAssets} from './RealisticPufferFish.js';

export const PUFFER_HOLD=120, PUFFER_DEFLATE=30, PUFFER_THREAT_DISTANCE=8;
export function createPufferState(){
  let amount=0,remaining=0,threatened=false;
  return {
    trigger(){remaining=PUFFER_HOLD;},
    step(dt,distance=Infinity){
      if(!Number.isFinite(dt)||dt<=0)return amount;
      threatened=distance<(threatened?10:PUFFER_THREAT_DISTANCE);
      if(threatened)remaining=PUFFER_HOLD;
      const held=Math.min(dt,remaining);remaining=Math.max(0,remaining-dt);
      if(held>0)amount=Math.min(1,amount+held/1.2);
      amount=Math.max(0,amount-(dt-held)/PUFFER_DEFLATE);
      return amount;
    },
    get amount(){return amount;},get remaining(){return remaining;},get threatened(){return threatened;},
  };
}

export function createPufferLibrary(){
  const realisticAssets=createRealisticPufferAssets();
  const near=new THREE.SphereGeometry(1,32,24),far=new THREE.SphereGeometry(1,16,12);
  const sphere=new THREE.SphereGeometry(1,14,10);
  const finGeometry=new THREE.SphereGeometry(1,12,8);
  const spikeGeometry=new THREE.ConeGeometry(.035,.20,5);spikeGeometry.translate(0,.10,0);
  const skin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.67});
  skin.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vPuffer;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPuffer=position;');
    s.fragmentShader='varying vec3 vPuffer;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=vPuffer;
      float grain=sin(p.x*22.0+sin(p.y*19.0))*sin(p.z*24.0)*.035;
      float spot=pow(max(0.0,sin(p.x*16.0)*sin(p.y*15.0)*sin(p.z*17.0)),3.0);
      spot*=1.0-smoothstep(.35,1.5,length(fwidth(p*17.0)));
      vec3 back=vec3(.40,.39,.18)+grain;
      vec3 belly=vec3(.90,.83,.61);
      diffuseColor.rgb=mix(belly,back,smoothstep(-.55,.15,p.y));
      diffuseColor.rgb*=1.0-spot*.65;
    `);
  };
  skin.customProgramCacheKey=()=>'puffer-mottled-skin-v1';
  const mat=(color,roughness=.6)=>new THREE.MeshStandardMaterial({color,roughness});
  const finMat=mat(0xc6a564),white=mat(0xf7edce,.28),black=mat(0x172a24,.15),lip=mat(0xd2b97d),spikeMat=mat(0xcfc099);
  const mouthGeometry=new THREE.TorusGeometry(.10,.027,8,20);mouthGeometry.rotateY(Math.PI/2);
  const members=new Map();let disposed=false;
  function attach(fish){
    if(disposed)throw Error('Puffer library disposed');if(members.has(fish))return members.get(fish);
    const basic=new THREE.Group();for(const c of [...fish.children])basic.add(c);fish.add(basic);
    const detailed=new THREE.Group();detailed.name='Kogelvis';fish.add(detailed);
    const mesh=(g,m,name,pos,scale)=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...pos);o.scale.set(...scale);detailed.add(o);return o;};
    const body=mesh(near,skin,'Puffer body',[0,0,0],[1.15,.72,.67]);
    const face=[],fins=[];
    for(const side of [-1,1]){
      face.push(mesh(sphere,white,'Puffer eye',[.73,.27,side*.48],[.23,.25,.15]));
      face.push(mesh(sphere,black,'Puffer pupil',[.83,.28,side*.595],[.095,.13,.047]));
      fins.push(mesh(finGeometry,finMat,'Puffer pectoral',[-.12,-.04,side*.64],[.28,.26,.045]));
    }
    face.push(mesh(mouthGeometry,lip,'Puffer lips',[1.13,-.10,0],[1,1,1]));
    face.push(mesh(sphere,black,'Puffer mouth',[1.14,-.10,0],[.012,.072,.072]));
    const tail=mesh(finGeometry,finMat,'Puffer tail',[-1.36,0,0],[.40,.35,.055]);
    const dorsal=mesh(finGeometry,finMat,'Puffer dorsal',[-.60,.57,0],[.27,.26,.045]);
    const spikes=new THREE.InstancedMesh(spikeGeometry,spikeMat,72);spikes.name='Puffer spines';detailed.add(spikes);
    const directions=[];
    for(let i=0;i<72;i++){
      const y=1-2*(i+.5)/72,a=i*2.399963,r=Math.sqrt(1-y*y);
      const n=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
      // Leave the face clear so the expression remains readable.
      if(n.x>.58)n.x=-n.x;
      directions.push(n.normalize());
    }
    spikes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const rest=new Map([...face,...fins,tail,dorsal].map(o=>[o,o.position.clone()]));
    fish.userData.isPuffer=true;fish.userData.visualSpecies='Kogelvis';fish.userData.pufferInflation=0;
    const realistic=realisticAssets.create(fish);
    const state=createPufferState(),m={basic,detailed,body,face,fins,tail,dorsal,spikes,directions,rest,state,realistic};
    basic.visible=false;members.set(fish,m);return m;
  }
  function trigger(fish){if(!fish.userData.dead)members.get(fish)?.state.trigger();}
  const box=new THREE.Box3(),closest=new THREE.Vector3(),dummy=new THREE.Object3D();
  function step(dt,orca){
    const predator=orca?.parent&&!orca.userData.dead;
    if(predator){orca.updateMatrixWorld(true);box.setFromObject(orca);}
    for(const [fish,m] of members){
      if(!fish.parent){m.spikes.dispose();m.realistic.spines.dispose();members.delete(fish);continue;}
      if(fish.userData.dead)continue;
      const distance=predator?box.clampPoint(fish.position,closest).distanceTo(fish.position):Infinity;
      fish.userData.pufferInflation=m.state.step(dt,distance);
    }
  }
  function updateAppearance(fish,m,a,time,close,realistic=false){
      const v=realistic?m.realistic:m;
      const spines=realistic?v.spines:v.spikes;
      const restScale=realistic?new THREE.Vector3(1.20,.66,.61):new THREE.Vector3(1.15,.72,.67);
      const scale=realistic?new THREE.Vector3(1.20+a*.28,.66+a*.81,.61+a*.86):new THREE.Vector3(1.15+a*.32,.72+a*.75,.67+a*.80);
      v.body.scale.copy(scale);v.body.geometry=close?(realistic?realisticAssets.near:near):(realistic?realisticAssets.far:far);
      const ratio=scale.clone().divide(restScale);
      for(const [o,p] of v.rest)o.position.copy(p).multiply(ratio);
      for(const o of v.face)if(o.name.includes('pupil')){
        const p=v.rest.get(o),side=Math.sign(p.z);
        if(realistic)o.position.set(.73*ratio.x+.08,.24*ratio.y+.005,side*(.475*ratio.z+.102));
        else o.position.set(.73*ratio.x+.10,.27*ratio.y+.01,side*(.48*ratio.z+.115));
      }
      const speed=THREE.MathUtils.clamp(fish.userData.motionSpeed??fish.userData.velocity?.length()??0,0,3);
      const phase=fish.userData.swimPhase??((fish.userData.phase??0)+time*speed*4);
      const finPhase=fish.userData.finPhase??time*7+(fish.userData.phase??0);
      const effort=THREE.MathUtils.smoothstep(speed,0,1.3);
      v.fins.forEach((f,i)=>{
        const side=i?1:-1;
        f.rotation.y=side*(.48+Math.sin(finPhase+i*.15)*(.20+effort*.13));
        f.rotation.x=side*Math.cos(finPhase+.6)*.09;
      });
      // Puffers propel mainly with pectoral/dorsal/anal fins; the trunk stays
      // rigid and the caudal fin contributes only while actually translating.
      v.tail.rotation.y=Math.sin(phase)*(.045+effort*.09)*effort*(1-a*.88);
      v.dorsal.rotation.x=Math.sin(finPhase+1.1)*(.10+effort*.05);
      if(v.anal)v.anal.rotation.x=-Math.sin(finPhase+1.25)*(.10+effort*.05);
      if(v.eyes)for(const eye of v.eyes)eye.visible=close;
      spines.visible=close;
      if(close){
        v.directions.forEach((n,i)=>{
          dummy.position.copy(n).multiply(scale);
          dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n.clone().divide(scale).normalize());
          dummy.scale.set(1,.20+a*.80,1);dummy.updateMatrix();spines.setMatrixAt(i,dummy.matrix);
        });spines.instanceMatrix.needsUpdate=true;spines.computeBoundingSphere();
      }
  }
  function update(time,camera,quality,enabled=true,style='cartoon'){
    for(const [fish,m] of members){
      if(!fish.parent){m.spikes.dispose();m.realistic.spines.dispose();members.delete(fish);continue;}
      const realistic=enabled&&style==='realistic';
      m.basic.visible=!enabled;m.detailed.visible=enabled&&!realistic;m.realistic.group.visible=realistic;
      if(!enabled||!fish.visible||fish.userData.dead)continue;
      const a=m.state.amount;
      const close=fish.position.distanceToSquared(camera.position)<(quality==='low'?14:35)**2;
      updateAppearance(fish,m,a,time,close,realistic);
    }
  }
  function dispose(){if(disposed)return;disposed=true;for(const [f,m] of members){f.remove(m.detailed);f.remove(m.realistic.group);for(const c of [...m.basic.children])f.add(c);f.remove(m.basic);m.spikes.dispose();m.realistic.spines.dispose();delete f.userData.isPuffer;delete f.userData.pufferInflation;delete f.userData.visualSpecies;}members.clear();
    realisticAssets.dispose();for(const g of [near,far,sphere,finGeometry,spikeGeometry,mouthGeometry])g.dispose();for(const m of [skin,finMat,white,black,lip,spikeMat])m.dispose();}
  return {attach,trigger,step,update,dispose,get size(){return members.size;}};
}
