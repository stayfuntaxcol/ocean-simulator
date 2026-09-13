import * as THREE from 'three';

// A watertight indexed longitudinal surface with shared cap vertices. +X is nose.
export function createClosedReefBody(profile,rings=56,sides=36) {
  const curve=new THREE.CatmullRomCurve3(profile.map(p=>new THREE.Vector3(...p)));
  const positions=[],indices=[],uv=[];
  for(let i=0;i<=rings;i++){
    const p=curve.getPoint(i/rings);
    for(let j=0;j<sides;j++){
      const a=j/sides*Math.PI*2;
      positions.push(p.x,Math.cos(a)*Math.max(.008,p.y),Math.sin(a)*Math.max(.008,p.z));
      uv.push(i/rings,j/sides);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
    const a=i*sides+j,b=i*sides+(j+1)%sides;
    indices.push(a,b,a+sides,b,b+sides,a+sides);
  }
  const end=positions.length/3;
  positions.push(profile[0][0],0,0,profile.at(-1)[0],0,0);uv.push(0,.5,1,.5);
  for(let j=0;j<sides;j++){
    const k=(j+1)%sides;indices.push(end,k,j,end+1,rings*sides+j,rings*sides+k);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.18;
  return geometry;
}

export function reefBend(x,phase,amplitude){
  const u=THREE.MathUtils.clamp((.5-x)/1.95,0,1);
  return amplitude*u*u*Math.sin(phase+x*1.65);
}

// Preserve each material's StandardMaterial lighting and micro-normal hooks.
export function animateReefMaterial(source,uniforms,{flat=false,fin=false}={}){
  const material=source.clone(),hook=source.onBeforeCompile.bind(source),key=source.customProgramCacheKey();
  const axis=flat?'y':'z';
  material.onBeforeCompile=shader=>{
    hook(shader);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=`uniform float reefPhase; uniform float reefAmplitude; uniform float reefFinPhase; uniform float reefFinEffort;
      float reefWave(float x){float u=clamp((.5-x)/1.95,0.0,1.0);return reefAmplitude*u*u*sin(reefPhase+x*1.65);}
      `+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      objectNormal.x-=(reefWave(position.x+.001)-reefWave(position.x-.001))/.002*objectNormal.${axis};`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.${axis}+=reefWave(position.x);${fin?'\ntransformed.'+axis+'+=sin(reefFinPhase+uv.y*9.0)*uv.x*.010*reefFinEffort;':''}`);
  };
  material.customProgramCacheKey=()=>key+'-reef-wave-'+axis+(fin?'-membrane':'');
  return material;
}

// Integrated simulation phases keep pause and style changes exact. Visual state
// never writes back to wake/sleep timers, root transforms or behavior identity.
export function createReefAnimator(fish,group,body,near,far,{flat=false,materials=[],pectorals=[],details=[],eyes=[],lids=[],seams=[],uniforms}={}){
  const rest=pectorals.map(p=>p.rotation.clone());let disposed=false;
  const update=(time,close)=>{
    body.geometry=close?near:far;
    const sleeping=!!fish.userData.sleeping;
    const speed=THREE.MathUtils.clamp(fish.userData.motionSpeed??fish.userData.velocity?.length()??0,0,3);
    const effort=sleeping?0:THREE.MathUtils.smoothstep(speed,0,1.8);
    const phase=fish.userData.swimPhase??time*speed*(flat?2.3:6)+(fish.userData.phase||0);
    const finPhase=fish.userData.finPhase??time*6+(fish.userData.phase||0);
    uniforms.reefPhase.value=phase;uniforms.reefAmplitude.value=effort*(flat?.07:.115);
    uniforms.reefFinPhase.value=finPhase;uniforms.reefFinEffort.value=sleeping?0:1;
    group.rotation.x=sleeping?0:(fish.userData.turnLean||0)*(flat?.045:.13);
    pectorals.forEach((p,i)=>{p.rotation.copy(rest[i]);if(!sleeping)p.rotation.y+=Math.sign(p.position.z)*Math.sin(finPhase)*(.16+effort*.12);});
    for(const d of details)d.visible=close;
    const closure=THREE.MathUtils.clamp(fish.userData.eyeClosure??(sleeping?1:0),0,1);
    for(const e of eyes)e.visible=closure<.85;
    for(const l of lids){l.visible=closure>.03;l.scale.y=.045*closure;}
    for(const s of seams)s.visible=closure>.85;
  };
  return {group,body,uniforms,update,dispose(){if(disposed)return;disposed=true;fish.remove(group);materials.forEach(m=>m.dispose());}};
}

export function reefUniforms(){return {reefPhase:{value:0},reefAmplitude:{value:0},reefFinPhase:{value:0},reefFinEffort:{value:0}};}
