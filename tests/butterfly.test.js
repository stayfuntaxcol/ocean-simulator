import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createButterflyBody, createButterflyLibrary, swimOffset } from '../graphics/ButterflyFish.js';

function specimen(library,scene) {
  const fish=new THREE.Group();
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.7,1.5,3),new THREE.MeshStandardMaterial());
  fish.add(tail); fish.scale.setScalar(.75);
  fish.userData={tail,phase:.8,velocity:new THREE.Vector3(1.5,0,0),isFishRoot:true};
  const parts=library.attach(fish); scene.add(fish);
  return {fish,parts,tail};
}

test('fish body is watertight with outward normals and a bounded triangle count',()=>{
  const geometry=createButterflyBody();
  const edges=new Map(), indices=geometry.index.array;
  assert.equal(indices.length/3,1968);
  for(let i=0;i<indices.length;i+=3) for(const [j,k] of [[0,1],[1,2],[2,0]]) {
    const edge=[indices[i+j],indices[i+k]].sort((a,b)=>a-b).join(',');
    edges.set(edge,(edges.get(edge)||0)+1);
  }
  assert.ok([...edges.values()].every(count=>count===2));
  const p=geometry.attributes.position, n=geometry.attributes.normal;
  for(let i=24;i<p.count-26;i++) {
    assert.ok(Number.isFinite(n.getX(i)+n.getY(i)+n.getZ(i)));
    assert.ok(p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)>0,'outward side normal');
  }
});

test('switching appearance preserves the existing root, scale, tail and school state',()=>{
  const library=createButterflyLibrary(), scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera();
  const {fish,parts,tail}=specimen(library,scene);
  fish.userData.schoolId='reef_2';
  library.update(12,camera,'medium',false);
  assert.equal(parts.basic.visible,true); assert.equal(parts.detailed.visible,false);
  assert.equal(fish.userData.tail,tail); assert.equal(tail.parent,parts.basic);
  assert.deepEqual(fish.scale.toArray(),[.75,.75,.75]);
  assert.equal(fish.userData.schoolId,'reef_2');
  library.update(12,camera,'medium',true);
  assert.equal(parts.basic.visible,false); assert.equal(parts.detailed.visible,true);
});

test('paused pose is reproducible and the caudal fin follows the deforming body',()=>{
  const library=createButterflyLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const {parts}=specimen(library,scene);
  library.update(12,camera,'medium');
  const pose=[parts.tail.position.z,parts.tail.rotation.y,parts.pectorals[0].rotation.y];
  library.update(12,camera,'medium');
  assert.deepEqual([parts.tail.position.z,parts.tail.rotation.y,parts.pectorals[0].rotation.y],pose);
  assert.equal(parts.tail.position.z,swimOffset(-1.45,parts.uniforms.swimPhase.value,parts.uniforms.swimAmplitude.value));
  library.update(12.1,camera,'medium');
  assert.notEqual(parts.tail.position.z,pose[0]);
  assert.ok(Math.abs(swimOffset(1.48,parts.uniforms.swimPhase.value,.2))<1e-12,'nose stays stable');
});

test('shared geometry uses independent swim uniforms and simplifies at distance',()=>{
  const library=createButterflyLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const a=specimen(library,scene),b=specimen(library,scene);
  b.fish.userData.phase=2;
  library.update(12,camera,'high');
  assert.equal(a.parts.body.geometry,b.parts.body.geometry);
  assert.notEqual(a.parts.uniforms,b.parts.uniforms);
  assert.notEqual(a.parts.uniforms.swimPhase.value,b.parts.uniforms.swimPhase.value);
  const nearCount=a.parts.body.geometry.index.count;
  camera.position.z=100;
  library.update(12,camera,'low');
  assert.ok(a.parts.body.geometry.index.count<nearCount);
  assert.ok(a.parts.eyes.every(eye=>!eye.visible));
  let disposed=0; a.parts.body.material.addEventListener('dispose',()=>disposed++);
  scene.remove(a.fish); library.update(12,camera,'low');
  assert.equal(disposed,1); assert.equal(library.size,1);
});

test('skin and fin shaders keep lighting hooks and use separate program keys',()=>{
  const library=createButterflyLibrary(),scene=new THREE.Scene();
  const {parts}=specimen(library,scene);
  const keys=new Set();
  for(const material of [parts.body.material,parts.tail.material,parts.dorsal.material]) {
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,
      fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    material.onBeforeCompile(shader);
    assert.match(shader.fragmentShader,/#include <lights_fragment_begin>/);
    assert.match(shader.fragmentShader,/#include <color_fragment>/);
    keys.add(material.customProgramCacheKey());
    if(material===parts.body.material) {
      assert.equal(shader.uniforms.swimPhase,parts.uniforms.swimPhase);
      assert.match(shader.vertexShader,/objectNormal.x -= bendSlope/);
    }
  }
  assert.equal(keys.size,3);
});
test('coral fish has independent cartoon and realistic appearances with one behavior root',()=>{
  const library=createButterflyLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),{fish,parts,tail}=specimen(library,scene);
  fish.userData.schoolId='reef_2';library.update(4,camera,'high',true,'cartoon');
  assert.ok(parts.cartoon.group.visible);assert.equal(parts.detailed.visible,false);
  const cartoonTail=parts.cartoon.tail.rotation.y;library.update(4.2,camera,'high',true,'cartoon');assert.notEqual(parts.cartoon.tail.rotation.y,cartoonTail);
  library.update(4.2,camera,'high',true,'realistic');assert.equal(parts.cartoon.group.visible,false);assert.ok(parts.detailed.visible);
  assert.equal(fish.userData.schoolId,'reef_2');assert.equal(fish.userData.tail,tail);library.dispose();assert.equal(tail.parent,fish);
});

test('butterfly uses measured translation, keeps facial attachments on bent skin, and separates hover fins',()=>{
  const library=createButterflyLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),{fish,parts}=specimen(library,scene);
  Object.assign(fish.userData,{motionSpeed:0,swimPhase:.6,finPhase:1});
  library.update(4,camera,'high');assert.equal(parts.uniforms.swimAmplitude.value,0);assert.ok(parts.tail.rotation.y===0);
  const fin=parts.pectorals[0].rotation.y;library.update(40,camera,'high');assert.equal(parts.pectorals[0].rotation.y,fin);
  fish.userData.finPhase+=.5;library.update(40,camera,'high');assert.notEqual(parts.pectorals[0].rotation.y,fin);assert.ok(parts.tail.rotation.y===0);
  fish.userData.motionSpeed=1.5;library.update(40,camera,'high');
  assert.equal(parts.uniforms.swimPhase.value,.6);assert.equal(parts.uniforms.finPhase.value,1.5);
  for(const [part,rest]of parts.rest){
    assert.equal(part.position.z,rest.z+swimOffset(rest.x,.6,parts.uniforms.swimAmplitude.value));
  }
  const tail=parts.tail.position.z;fish.userData.swimPhase+=.5;library.update(40,camera,'high');assert.notEqual(parts.tail.position.z,tail);
  library.dispose();
});

test('coral fin planes are anatomical in both styles and microscale shader affects lighting',()=>{
  const library=createButterflyLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),{fish,parts}=specimen(library,scene);
  fish.userData.motionSpeed=0;fish.userData.swimPhase=0;fish.userData.finPhase=0;
  library.update(0,camera,'high',true,'cartoon');
  for(const fin of [parts.cartoon.tail,parts.cartoon.dorsal,parts.tail,parts.dorsal,parts.anal]){
    fin.geometry.computeBoundingBox();const size=fin.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(size.x>.2&&size.y>.2);assert.ok(size.z<.04);
    const normal=new THREE.Vector3(0,0,1).applyQuaternion(fin.quaternion);assert.ok(Math.abs(normal.z)>.99,'vertical fin lies in body XY plane');
  }
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  parts.body.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/float fishScale/);assert.match(shader.fragmentShader,/normal=fishMicroNormal/);
  assert.match(shader.fragmentShader,/roughnessFactor=clamp/);assert.match(shader.fragmentShader,/#include <lights_fragment_begin>/);
  library.dispose();
});

test('butterfly attachment is idempotent and shared new eye resources dispose only once',()=>{
  const library=createButterflyLibrary(),scene=new THREE.Scene(),a=specimen(library,scene),b=specimen(library,scene);
  const childCount=a.fish.children.length;assert.equal(library.attach(a.fish),a.parts);assert.equal(a.fish.children.length,childCount);
  assert.equal(a.parts.eyes[0].geometry,b.parts.eyes[0].geometry);assert.equal(a.parts.eyes[0].material,b.parts.eyes[0].material);
  let geometries=0,materials=0;a.parts.eyes[0].geometry.addEventListener('dispose',()=>geometries++);a.parts.eyes[0].material.addEventListener('dispose',()=>materials++);
  library.dispose();library.dispose();assert.equal(geometries,1);assert.equal(materials,1);assert.equal(library.size,0);
  assert.throws(()=>library.attach(new THREE.Group()),/disposed/);
});
