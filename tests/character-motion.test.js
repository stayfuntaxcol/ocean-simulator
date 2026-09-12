import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBlueReefLibrary} from '../graphics/BlueReefFish.js';
import {createGreenReefLibrary} from '../graphics/GreenReefFish.js';
import {characterBend} from '../graphics/CharacterMotion.js';

function specimen(lib,scene,phase=.5){
  const fish=new THREE.Group();fish.userData={phase,velocity:new THREE.Vector3(1,0,0)};
  scene.add(fish);return {fish,m:lib.attach(fish)};
}
function pose(m){return m.detailed.children.map(p=>[...p.position.toArray(),...p.rotation.toArray(),...p.scale.toArray()]);}

for(const [name,make,flat] of [['blue',()=>createBlueReefLibrary(),false],['green',()=>createGreenReefLibrary(),true],['clown',()=>createBlueReefLibrary({clown:true}),false]]){
  test(`${name}: pause is deterministic, fins move, tail follows body and face stays stable`,()=>{
    const lib=make(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
    const {fish,m}=specimen(lib,scene);const b=specimen(lib,scene,2);
    lib.update(camera,'high',true,12);const first=pose(m);
    lib.update(camera,'high',true,12);assert.deepEqual(pose(m),first);
    assert.notEqual(m.motion.uniforms.characterPhase.value,b.m.motion.uniforms.characterPhase.value);
    const tail=m.detailed.children.find(p=>p.name==='Tail'||p.name==='Fan tail');
    assert.ok(Math.abs(tail.position[flat?'y':'z']-characterBend(tail.position.x,m.motion.uniforms.characterPhase.value,m.motion.uniforms.characterAmplitude.value))<1e-10);
    assert.equal(characterBend(.75,12,.3),0,'head does not deform away from eyes');
    lib.update(camera,'high',true,12.25);assert.notDeepEqual(pose(m),first);
    const pupil=m.detailed.children.find(p=>p.name==='Pupil');assert.ok(pupil.position.x>.7&&pupil.position.x<1);
    const frozen=pose(m);fish.userData.dead=true;lib.update(camera,'high',true,20);assert.deepEqual(pose(m),frozen);
    lib.dispose();
  });
}

test('motion shader composes with all species skins and fin details; removed fish release owned materials once',()=>{
  for(const lib of [createBlueReefLibrary(),createGreenReefLibrary(),createBlueReefLibrary({clown:true})]){
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),{fish,m}=specimen(lib,scene);
    let disposed=0;
    for(const part of m.detailed.children.filter(p=>['Rounded body','Flat body','Dorsal fin','Fan tail','Tail','Side fringe'].includes(p.name))){
      const s={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
      part.material.onBeforeCompile(s);
      assert.equal(s.uniforms.characterPhase,m.motion.uniforms.characterPhase);
      assert.match(s.vertexShader,/objectNormal.x-=/);
      assert.match(s.fragmentShader,/#include <lights_fragment_begin>/);
      part.material.addEventListener('dispose',()=>disposed++);
    }
    scene.remove(fish);lib.update(camera,'high',true,1);const count=disposed;assert.ok(count>=3);
    lib.update(camera,'high',true,2);lib.dispose();assert.equal(disposed,count);
  }
});

test('clownfish has three band shader regions, rounded tail and a smaller pectoral fin',()=>{
  const lib=createBlueReefLibrary({clown:true}),scene=new THREE.Scene(),{fish,m}=specimen(lib,scene);
  assert.equal(fish.userData.visualSpecies,'Clownvis');
  const fins=m.detailed.children.filter(p=>p.name==='Pectoral fin');
  assert.equal(fins.length,2);assert.ok(fins[1].scale.x<fins[0].scale.x);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  m.body.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/abs\(x-.54\)/);assert.match(shader.fragmentShader,/abs\(x\+.30\)/);assert.match(shader.fragmentShader,/abs\(x\+1.12\)/);
  lib.dispose();
});
