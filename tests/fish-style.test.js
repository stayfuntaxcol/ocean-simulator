import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBlueReefLibrary} from '../graphics/BlueReefFish.js';

test('style switch preserves simulation state, pauses exactly and allocates only once',()=>{
  const library=createBlueReefLibrary(),scene=new THREE.Scene(),fish=new THREE.Group(),camera=new THREE.PerspectiveCamera();
  const tail=new THREE.Object3D();fish.add(tail);scene.add(fish);
  fish.position.set(2,3,4);fish.scale.setScalar(.7);
  fish.userData={tail,schoolId:'reef_1',health:82,swimPhase:3.2,motionSpeed:.8};
  const before={...fish.userData},m=library.attach(fish);
  assert.equal(m.realistic,null);
  library.update(camera,'high',true,12,'realistic');
  const real=m.realistic;assert.ok(real.group.visible);assert.equal(m.detailed.visible,false);
  const pose=real.group.children.map(p=>p.rotation.toArray());
  library.update(camera,'high',true,12,'realistic');
  assert.deepEqual(real.group.children.map(p=>p.rotation.toArray()),pose);
  const near=real.body.geometry.index.count;
  camera.position.z=100;library.update(camera,'low',true,12,'realistic');
  assert.ok(real.body.geometry.index.count<near);
  for(let i=0;i<10;i++){
    library.update(camera,'high',true,12,'cartoon');assert.equal(real.group.visible,false);assert.ok(m.detailed.visible);
    library.update(camera,'high',true,12,'realistic');assert.equal(m.realistic,real);
  }
  for(const key of Object.keys(before))assert.equal(fish.userData[key],before[key]);
  assert.deepEqual(fish.position.toArray(),[2,3,4]);assert.deepEqual(fish.scale.toArray(),[.7,.7,.7]);
  library.update(camera,'high',false,12,'realistic');assert.ok(m.basic.visible);assert.equal(real.group.visible,false);
  let disposed=0;real.body.material.addEventListener('dispose',()=>disposed++);
  library.dispose();library.dispose();assert.equal(disposed,1);assert.equal(real.group.parent,null);assert.equal(tail.parent,fish);
});

test('realistic assets remain finite, compose lighting with motion and release removed fish',()=>{
  const library=createBlueReefLibrary(),scene=new THREE.Scene(),fish=new THREE.Group(),camera=new THREE.PerspectiveCamera();scene.add(fish);
  const m=library.attach(fish);library.update(camera,'high',true,0,'realistic');
  let triangles=0;
  m.realistic.group.traverse(o=>{if(!o.isMesh)return;for(const a of ['position','normal'])for(const v of o.geometry.attributes[a].array)assert.ok(Number.isFinite(v));triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  assert.ok(triangles<15000);
  const s={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
  m.realistic.body.material.onBeforeCompile(s);
  assert.match(s.fragmentShader,/#include <lights_fragment_begin>/);assert.match(s.vertexShader,/vRealBlue=position/);assert.ok(s.uniforms.characterPhase);
  let disposed=0;m.realistic.body.material.addEventListener('dispose',()=>disposed++);
  scene.remove(fish);library.update(camera,'high');library.dispose();assert.equal(disposed,1);
});

test('clownfish stays cartoon during the blue-only realism rollout',()=>{
  const library=createBlueReefLibrary({clown:true}),fish=new THREE.Group(),scene=new THREE.Scene();scene.add(fish);
  const m=library.attach(fish);library.update(new THREE.PerspectiveCamera(),'high',true,0,'realistic');
  assert.equal(m.realistic,null);assert.ok(m.detailed.visible);assert.equal(fish.userData.visualSpecies,'Clownvis');library.dispose();
});
