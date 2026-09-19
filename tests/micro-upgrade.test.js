import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMicroLife,createMicroMaterial} from '../graphics/MicroLife.js';
import {createMicroLife as createClassicLife} from '../graphics/MicroLifeClassic.js';
import {createMicroGeometry,MICRO_TYPES} from '../graphics/MicroLifeGeometry.js';
const habitats=()=>[{x:0,z:0},{x:18,z:0},{x:-18,z:0},{x:0,z:-20}];
function fixture(factory=createMicroLife,options={}) {
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,-15,3);
  return {camera,life:factory({scene,getHabitats:habitats,...options})};
}
function bodies(life,type) {
  const result=[];
  for(const suffix of ['','-far']){
    const mesh=life.root.getObjectByName(type+suffix);if(!mesh)continue;
    for(let i=0;i<mesh.count;i++){const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);result.push({matrix,position:new THREE.Vector3().setFromMatrixPosition(matrix),state:mesh.geometry.attributes.microState?.getY(i)});}
  }
  return result;
}

test('continuous sloping reef supports bottom invertebrates; shrimp swims and crabs require rocks',()=>{
  const terrain=(x,z)=>-18+.25*x+.04*z;
  const old=fixture(createClassicLife,{terrain}),upgraded=fixture(createMicroLife,{terrain});
  old.life.update(0,old.camera);upgraded.life.update(0,upgraded.camera);
  assert.equal(old.life.stats.bottom,0);assert.ok(upgraded.life.stats.bottom>=20);
  assert.equal(upgraded.life.stats.species.crab,0,'No crabs exposed on bare sand without rock shelter');
  assert.ok(upgraded.life.stats.shrimp>0);
  for(const type of ['starfish','urchin','shell']){
    assert.ok(upgraded.life.stats.species[type]>0);
    for(const body of bodies(upgraded.life,type)){
      const normal=new THREE.Vector3(0,1,0).transformDirection(body.matrix);
      assert.ok(normal.dot(new THREE.Vector3(-.25,1,-.04).normalize())>.99999);
    }
  }
  old.life.dispose();upgraded.life.dispose();
});

test('cliffs and fully occupied habitat produce no bottom animals, without putting them in midwater',()=>{
  const cases=[{terrain:x=>-18+x*2},{getObstacles:()=>[new THREE.Box3(new THREE.Vector3(-100,-40,-100),new THREE.Vector3(100,30,100))]}];
  for(const options of cases){const {life,camera}=fixture(createMicroLife,options);life.update(0,camera);assert.equal(life.stats.bottom,0);life.dispose();}
});

test('near and far geometry are used together and low quality moves all instances to the cheaper meshes',()=>{
  const {life,camera}=fixture();life.update(0,camera,{quality:'high'});
  let near=0,far=0;
  for(const type of MICRO_TYPES){near+=life.root.getObjectByName(type).count;far+=life.root.getObjectByName(type+'-far').count;}
  assert.ok(near>0&&far>0);
  life.update(0,camera,{quality:'low'});
  for(const type of [...MICRO_TYPES,'minnow'])assert.equal(life.root.getObjectByName(type).count,0);
  assert.ok(life.stats.bottom>0);life.dispose();
});

test('shrimp tail has a dedicated escape flex and walking phase is driven by actual travel',()=>{
  const geometry=createMicroGeometry('shrimp');assert.ok([...geometry.attributes.microFlex.array].some(v=>v===3));geometry.dispose();
  const material=createMicroMaterial('shrimp',{value:0}),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  assert.match(shader.vertexShader,/microAngle\+=state.z\*1.25/);assert.match(shader.vertexShader,/phase=state.x\+microAxis.w/);material.dispose();
});

test('moving appendages contain valid pivots and normals rotate with the surface; shells have upward outer faces',()=>{
  for(const type of ['shrimp','crab','shell','urchin','minnow']){
    const geometry=createMicroGeometry(type),j=geometry.attributes.microJoint,a=geometry.attributes.microAxis;
    let moving=0;
    for(let i=0;i<j.count;i++){
      if(j.getW(i)!==0)moving++;
      assert.ok(Math.hypot(a.getX(i),a.getY(i),a.getZ(i))>.9);
    }
    assert.ok(moving>0);geometry.dispose();
  }
  const material=createMicroMaterial('crab',{value:0}),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);
  assert.match(shader.vertexShader,/microJoint.xyz\+microRotate\(position-microJoint.xyz/);
  assert.match(shader.vertexShader,/objectNormal=microRotate/);
  assert.match(shader.vertexShader,/microFlex<1.5\?max\(0.0,sin\(phase\)\)/,'Feet lift above their resting plane');
  const mesh=new THREE.Mesh(createMicroGeometry('shell'),new THREE.MeshStandardMaterial());mesh.updateMatrixWorld();
  const hits=new THREE.Raycaster(new THREE.Vector3(.1,1,0),new THREE.Vector3(0,-1,0)).intersectObject(mesh);
  assert.ok(hits.length&&hits[0].face.normal.y>0);
});

test('school fish remain available between three and eleven metres, facing their actual travel direction',()=>{
  const {life,camera}=fixture();life.update(0,camera,{quality:'high'});
  const initial=bodies(life,'minnow');assert.ok(initial.some(f=>f.position.distanceTo(camera.position)<11));
  life.update(.04,camera,{quality:'high'});
  const after=bodies(life,'minnow');assert.equal(initial.length,after.length);
  for(let i=0;i<after.length;i++){
    const delta=after[i].position.clone().sub(initial[i].position);
    const forward=new THREE.Vector3(1,0,0).transformDirection(after[i].matrix);
    // Outer fish have extra turning velocity, but never swim tail-first.
    assert.ok(delta.dot(forward)>0);
  }
  life.dispose();
});
