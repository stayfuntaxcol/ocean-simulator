// Keep this suite in tests/*.test.js so npm test actually executes it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import vm from 'node:vm';
import {createMicroGeometry,MICRO_TYPES} from '../graphics/MicroLifeGeometry.js';
import {createMicroLife,createMicroMaterial,MICRO_QUALITY} from '../graphics/MicroLife.js';

const habitats=()=>Array.from({length:25},(_,i)=>({x:(i%5-2)*12,z:(Math.floor(i/5)-2)*12}));
function fixture(options={}){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,-16,0);
  const life=createMicroLife({scene,getHabitats:habitats,...options});return {scene,camera,life};
}
function levels(life,type){return [type,type+'-far'].map(name=>life.root.getObjectByName(name));}
function matrices(life){return MICRO_TYPES.map(type=>levels(life,type).flatMap(mesh=>Array.from(mesh.instanceMatrix.array.slice(0,mesh.count*16))));}
function positions(mesh){const result=[],m=new THREE.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);result.push(new THREE.Vector3().setFromMatrixPosition(m));}return result;}

test('all five creatures and tiny fish have finite coloured anatomy with cheaper detail levels',()=>{
  for(const type of [...MICRO_TYPES,'minnow']){
    const a=createMicroGeometry(type),b=createMicroGeometry(type,true),again=createMicroGeometry(type);
    assert.deepEqual(a.attributes.position.array,again.attributes.position.array);
    for(const name of ['position','normal','color','microFlex','microJoint','microAxis'])assert.ok(a.attributes[name].array.every(Number.isFinite));
    assert.ok(a.index.count/3<6000);assert.ok(b.index.count/3<1200);assert.ok(b.attributes.position.count<a.attributes.position.count);
    const size=a.boundingBox.getSize(new THREE.Vector3());assert.ok(size.x>0&&size.y>0&&size.z>0);
    if(type==='starfish')assert.ok(size.x>size.y*4);
    if(type==='urchin')assert.ok(size.y>.5);
    if(type==='shrimp')assert.ok(size.x>1,'Antennae extend beyond the segmented body');
    if(type==='shell')assert.ok(size.x>size.y*3,'A thick paired shell, still broad and low');
    a.dispose();b.dispose();again.dispose();
  }
});

test('bounded instanced population follows terrain and excludes occupied ground',()=>{
  const obstacle=new THREE.Box3(new THREE.Vector3(-6,-25,-6),new THREE.Vector3(6,8,6));
  const terrain=(x,z)=>-18+x*.04+z*.025;
  const {life,camera}=fixture({terrain,getObstacles:()=>[obstacle]});life.update(.04,camera,{quality:'high'});
  assert.equal(life.root.children.length,14,'Near/far instances, one contact batch, and plankton');
  assert.ok(life.stats.bottom>0);
  for(const type of MICRO_TYPES)for(const mesh of levels(life,type)){assert.ok(mesh.isInstancedMesh&&mesh.count<=48);for(const p of positions(mesh)){assert.ok(type==='shrimp'?p.y>terrain(p.x,p.z)+.43:Math.abs(p.y-terrain(p.x,p.z)-.016)<1e-5);assert.ok(!obstacle.clone().expandByScalar(.28).containsPoint(p));}}
  assert.ok(life.stats.fish<=160);assert.ok(life.stats.plankton<=800);life.dispose();
});

test('world anchored positions are deterministic, pause exactly and survive toggles',()=>{
  const a=fixture(),b=fixture();a.life.update(.04,a.camera);b.life.update(.04,b.camera);assert.deepEqual(matrices(a.life),matrices(b.life));
  const before=matrices(a.life),time=a.life.clock;
  a.life.update(5,a.camera,{paused:true});assert.equal(a.life.clock,time);assert.deepEqual(matrices(a.life),before);
  a.life.update(1,a.camera,{enabled:false});assert.equal(a.life.clock,time);assert.equal(a.life.stats.bottom,0);
  a.life.update(0,a.camera);assert.deepEqual(matrices(a.life),before);
  a.life.update(1,a.camera,{editor:true});assert.equal(a.life.root.visible,false);assert.equal(a.life.clock,time);
  a.life.update(1,a.camera,{inspect:true});assert.equal(a.life.root.visible,false);
  for(let i=0;i<400;i++)a.life.update(.04,a.camera);
  assert.notDeepEqual(matrices(a.life)[0],before[0],'Shrimp swims independently');
  a.life.dispose();b.life.dispose();
});

test('terrain edits and removed habitats rebuild safely without saved creature records',()=>{
  let floor=-18,items=habitats();const {life,camera}=fixture({terrain:()=>floor,getHabitats:()=>items});
  life.update(.04,camera);assert.ok(life.stats.bottom>0);
  floor=-16;life.update(0,camera,{revision:1});
  for(const type of MICRO_TYPES)for(const mesh of levels(life,type))for(const p of positions(mesh))assert.ok(type==='shrimp'?p.y>-15.57:Math.abs(p.y+15.984)<1e-5);
  floor=20;life.update(0,camera,{revision:2});assert.equal(life.stats.bottom,0);assert.equal(life.stats.fish,0);
  floor=-18;items=[];life.update(0,camera,{revision:3});assert.equal(life.stats.bottom,0);assert.equal(life.stats.fish,0);
  life.dispose();
});

test('distant schools and layered plankton stay submerged and respect independent switches',()=>{
  const {life,camera}=fixture();life.update(.04,camera,{quality:'high'});
  const fish=levels(life,'minnow');assert.ok(life.stats.fish>0);
  for(let frame=0;frame<50;frame++){
    life.update(.08,camera,{quality:'high'});
    for(const mesh of fish)for(const p of positions(mesh)){assert.ok(p.y<19.25&&p.y>-17.3);assert.ok(p.distanceTo(camera.position)>=1.19);}
  }
  // Centers retain safe separation as each group turns; no packed intersecting fish.
  const all=fish.flatMap(positions);for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert.ok(all[i].distanceTo(all[j])>.75);
  const points=life.root.getObjectByName('Planktonlagen'),p=points.geometry.attributes.position,ys=[];
  for(let i=0;i<points.geometry.drawRange.count;i++){ys.push(p.getY(i));assert.ok(p.getY(i)>-17.3&&p.getY(i)<19.05);}
  assert.ok(ys.length>0);assert.ok(ys.every(y=>Math.abs(y/8-Math.round(y/8))<.15),'Particles form distinct vertical layers');
  life.update(0,camera,{showSchools:false,showPlankton:false});assert.equal(life.stats.fish,0);assert.equal(life.stats.plankton,0);assert.ok(life.stats.bottom>0);
  life.dispose();
});

test('plankton overlapping world tiles retain positions when the camera moves',()=>{
  const {life,camera}=fixture();life.update(0,camera,{quality:'high'});
  const mesh=life.root.getObjectByName('Planktonlagen');
  const snapshot=()=>{const a=mesh.geometry.attributes.position;return new Set(Array.from({length:mesh.geometry.drawRange.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)].join(',')));};
  const before=snapshot();camera.position.x+=12;life.update(0,camera,{quality:'high'});const after=snapshot();
  assert.ok([...after].filter(key=>before.has(key)).length>after.size*.65);life.dispose();
});

test('quality decreases geometry and populations, and all allocated resources dispose once',()=>{
  const {life,camera,scene}=fixture();life.update(.04,camera,{quality:'high'});
  const mesh=life.root.getObjectByName('starfish'),high=mesh.geometry.attributes.position.count;let materialDisposed=0,geometryDisposed=0;
  mesh.material.addEventListener('dispose',()=>materialDisposed++);mesh.geometry.addEventListener('dispose',()=>geometryDisposed++);
  life.update(0,camera,{quality:'low'});assert.equal(mesh.count,0);assert.ok(life.root.getObjectByName('starfish-far').geometry.attributes.position.count<high);assert.ok(life.stats.bottom<=MICRO_QUALITY.low.patches*5);assert.ok(life.stats.fish<=48);assert.ok(life.stats.plankton<=160);
  life.update(0,camera,{quality:'invalid'});assert.ok(life.stats.bottom<=140);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,30,0),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(life.root,true).length,0);
  life.dispose();life.dispose();assert.equal(materialDisposed,1);assert.equal(geometryDisposed,1);assert.equal(life.root.parent,null);assert.equal(scene.children.length,0);
});

test('micro shaders preserve lighting and fog; review imports actual models and app handles pause',()=>{
  const material=createMicroMaterial('shrimp',{value:0});
  const s={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(s);
  assert.ok(s.uniforms.microTime);assert.match(s.vertexShader,/instanceMatrix/);assert.match(s.fragmentShader,/#include <fog_fragment>/);assert.match(s.fragmentShader,/normal=fishMicroNormal/);assert.match(s.fragmentShader,/#include <lights_fragment_begin>/);material.dispose();
  const {life,camera}=fixture();life.update(0,camera);const points=life.root.getObjectByName('Planktonlagen'),ps={uniforms:{},vertexShader:THREE.ShaderLib.points.vertexShader,fragmentShader:THREE.ShaderLib.points.fragmentShader};points.material.onBeforeCompile(ps);assert.match(ps.vertexShader,/transformed\+=vec3/);assert.match(ps.fragmentShader,/gl_PointCoord/);assert.match(ps.fragmentShader,/#include <fog_fragment>/);life.dispose();
  const url=new URL('../graphics/micro-life-review.js',import.meta.url),script=fs.readFileSync(url,'utf8');
  for(const m of script.matchAll(/from '([^']+)'/g))if(m[1].startsWith('.'))assert.ok(fs.existsSync(new URL(m[1],url)));
  assert.doesNotThrow(()=>new vm.Script(script.replace(/^import .*$/gm,'')));
  const app=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(app,/microLife.update\(dt,camera/);assert.match(app,/paused:referencePaused/);
});
