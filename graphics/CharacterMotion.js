import * as THREE from 'three';

export function characterBend(x,phase,amplitude) {
  const u=THREE.MathUtils.clamp((.45-x)/2.05,0,1);
  return amplitude*u*u*Math.sin(phase+x*1.7);
}

// Own materials per fish, shared geometry. Uses simulation time so pause is exact.
export function createCharacterMotion(group,fish,{flat=false,clown=false}={}) {
  const uniforms={characterPhase:{value:0},characterAmplitude:{value:0}};
  const owned=[],rest=new Map();
  const axis=flat?'y':'z';
  for(const part of group.children) {
    rest.set(part,{position:part.position.clone(),rotation:part.rotation.clone(),scale:part.scale.clone()});
    const flexibleFin=['Side fringe','Pectoral fin','Tail','Fan tail'].includes(part.name);
    if(!flexibleFin&&!['Rounded body','Flat body','Dorsal fin','Ventral fin'].includes(part.name))continue;
    const deformAxis=flexibleFin?'z':axis;
    const original=part.material,material=original.clone();
    const hook=original.onBeforeCompile.bind(original),key=original.customProgramCacheKey();
    material.onBeforeCompile=shader=>{
      hook(shader);Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=`uniform float characterPhase; uniform float characterAmplitude;
        float characterWave(float x) {
          float u=clamp(${flexibleFin?'(-x)/.9':'(.45-x)/2.05'},0.0,1.0);
          return characterAmplitude*${flexibleFin?'.32':'1.0'}*u*u*sin(characterPhase+x*1.7);
        }\n`+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
        objectNormal.x-=(characterWave(position.x+.001)-characterWave(position.x-.001))/.002*objectNormal.${deformAxis};`);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.${deformAxis}+=characterWave(position.x);`);
    };
    material.customProgramCacheKey=()=>key+'-character-motion-'+deformAxis+(flexibleFin?'-fin':'-body');
    part.material=material;owned.push({part,original,material});
    // Shader motion remains within the expanded culling bounds.
    part.geometry.computeBoundingSphere();part.geometry.boundingSphere.radius=Math.max(part.geometry.boundingSphere.radius,3);
  }
  function update(time,near=true) {
    const phase=time*(flat?3.1:clown?6.0:4.6)+(fish.userData.phase||0);
    const speed=THREE.MathUtils.clamp(fish.userData.velocity?.length()??1,.2,3);
    const amplitude=(flat?.10:.14)+speed*.025;
    uniforms.characterPhase.value=phase;uniforms.characterAmplitude.value=amplitude;
    const breath=.5+.5*Math.sin(time*2.1+(fish.userData.phase||0));
    for(const [part,r] of rest) {
      part.position.copy(r.position);part.rotation.copy(r.rotation);part.scale.copy(r.scale);
      if(part.name==='Fan tail'||part.name==='Tail') {
        const x=r.position.x;
        part.position[axis]+=characterBend(x,phase,amplitude);
        const slope=(characterBend(x+.001,phase,amplitude)-characterBend(x-.001,phase,amplitude))/.002;
        if(flat)part.rotation.z+=Math.atan(slope);else part.rotation.y-=Math.atan(slope);
      }
      if(part.name==='Pectoral fin')part.rotation.y+=Math.sign(r.position.z)*Math.sin(phase*.78)*.38;
      if(part.name==='Side fringe') {
        part.position.y+=characterBend(r.position.x,phase,amplitude)*.4;
        part.rotation.x+=Math.sign(r.position.z)*Math.sin(phase+r.position.z)*.13;
      }
      if(!near)continue;
      if(part.name==='Lower lip')part.position.y-=breath*(flat?.018:.045);
      if(part.name==='Mouth opening')part.scale.y*=1+breath*.35;
      if(part.name==='Cheek'||part.name==='Eye mound')part.scale.z*=1+breath*.018;
      if(part.name==='Pupil'||part.name==='Eye glint') {
        part.position.x+=Math.sin(time*.73+(fish.userData.phase||0))*.022;
        part.position.y+=Math.sin(time*.51+(fish.userData.phase||0))*.012;
      }
      if(part.name==='Brow')part.position.y+=Math.sin(time*.85+(fish.userData.phase||0))*.023;
    }
  }
  let disposed=false;
  function dispose(){if(disposed)return;disposed=true;for(const {part,original,material} of owned){part.material=original;material.dispose();}}
  return {update,dispose,uniforms};
}

export function addFinDetail(material) {
  const hook=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  material.onBeforeCompile=s=>{
    hook(s);
    s.vertexShader='varying vec3 vCharacterFin;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCharacterFin=position;');
    s.fragmentShader='varying vec3 vCharacterFin;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float rays=(vCharacterFin.y+vCharacterFin.x*.18)*75.0;
      float line=pow(.5+.5*cos(rays),10.0);
      line*=1.0-smoothstep(.5,2.0,fwidth(rays));
      diffuseColor.rgb*=1.0-line*.24;
    `);
  };
  material.customProgramCacheKey=()=>key+'-fin-rays-v1';
}
