import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRealisticGreenBody,createRealisticGreenAssets} from '../graphics/RealisticGreenFish.js';
import {createRealisticClownBody,createRealisticClownAssets} from '../graphics/RealisticClownFish.js';
import {createGreenReefLibrary} from '../graphics/GreenReefFish.js';
import {createBlueReefLibrary} from '../graphics/BlueReefFish.js';
import {bottomClearance} from '../graphics/SpeciesBehavior.js';

function shaderOf(material){
  const s={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
  material.onBeforeCompile(s);return s;
}
function checkClosed(g){
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),index=g.index.array,edges=new Map();
  for(const value of [...p.array,...n.array])assert.ok(Number.isFinite(value));
  for(let k=0;k<index.length;k+=3)for(let j=0;j<3;j++){
    const a=index[k+j],b=index[k+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1);
  }
  assert.ok([...edges.values()].every(count=>count===2),'Every body edge belongs to exactly two faces');
  for(let i=0;i<p.count-2;i++)assert.ok(p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)>0,'Outward side normals');
  assert.ok(n.getX(p.count-2)<-.99);assert.ok(n.getX(p.count-1)>.99);
  g.computeBoundingBox();return g.boundingBox.getSize(new THREE.Vector3());
}

test('batch two bodies have distinct closed anatomy and bounded LOD silhouettes',()=>{
  for(const factory of [createRealisticGreenBody,createRealisticClownBody]){
    const near=factory(),far=factory(24,16),size=checkClosed(near),farSize=checkClosed(far);
    assert.ok(near.index.count>far.index.count*2);assert.ok(size.distanceTo(farSize)<.025);assert.ok(near.boundingSphere.radius<2);
    if(factory===createRealisticGreenBody){assert.ok(size.y/size.z<.26);assert.ok(size.z>1.55);assert.ok((size.y/2+.08)*.48<bottomClearance(.48));}
    else{assert.ok(size.y/size.z>1.7);assert.ok(size.y<1.4);}
    near.dispose();far.dispose();
  }
});

test('realistic skins and ray membranes compose Standard lighting, relief and per-instance motion',()=>{
  for(const factory of [createRealisticGreenAssets,createRealisticClownAssets]){
    const assets=factory(),fish=new THREE.Group(),m=assets.create(fish);let triangles=0;
    m.group.traverse(o=>{
      if(!o.isMesh)return;
      for(const a of ['position','normal'])for(const v of o.geometry.attributes[a].array)assert.ok(Number.isFinite(v));
      triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
      if(o.name.includes('membrane')){
        assert.ok(o.geometry.attributes.uv);assert.equal(o.material.side,THREE.DoubleSide);
        const shader=shaderOf(o.material);assert.match(shader.fragmentShader,/fishMicroNormal/);assert.match(shader.fragmentShader,/rayPhase/);
        assert.match(shader.fragmentShader,/#include <lights_fragment_begin>/);assert.ok(shader.uniforms.reefFinPhase);
      }
    });
    assert.ok(triangles<20000);
    const s=shaderOf(m.body.material);
    assert.match(s.fragmentShader,/#include <lights_fragment_begin>/);assert.match(s.fragmentShader,/#include <normal_fragment_maps>/);
    assert.match(s.fragmentShader,/roughnessFactor=clamp/);assert.match(s.fragmentShader,/normal=fishMicroNormal/);
    assert.match(s.vertexShader,/objectNormal.x-=/);assert.ok(s.uniforms.reefPhase);assert.ok(!m.group.getObjectByName('Smile'));
    if(factory===createRealisticGreenAssets){assert.match(s.fragmentShader,/vec3 underside/);assert.match(s.fragmentShader,/rosette/);}
    else{assert.match(s.fragmentShader,/float head=/);assert.match(s.fragmentShader,/float middle=/);assert.match(s.fragmentShader,/float peduncle=/);}
    assets.dispose();
  }
});

test('clown anatomy has natural eyes and symmetrical paired fins while cartoon keeps its small fin',()=>{
  const library=createBlueReefLibrary({clown:true}),fish=new THREE.Group(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();scene.add(fish);
  const m=library.attach(fish),cartoon=m.detailed.children.filter(p=>p.name==='Pectoral fin');
  assert.notEqual(cartoon[0].scale.x,cartoon[1].scale.x);
  library.update(camera,'high',true,0,'realistic');
  const paired=m.realistic.group.children.filter(p=>p.name==='Pectoral membrane');
  assert.equal(paired.length,2);assert.deepEqual(paired[0].scale.toArray().map(Math.abs),paired[1].scale.toArray().map(Math.abs));assert.equal(paired[0].scale.z,-paired[1].scale.z);assert.equal(paired[0].geometry,paired[1].geometry);
  assert.equal(paired[0].position.z,-paired[1].position.z);assert.equal(paired[0].rotation.y,-paired[1].rotation.y);
  const eyes=m.realistic.group.children.filter(p=>p.name==='Natural pupil');assert.equal(eyes.length,2);assert.ok(eyes.every(p=>p.scale.y<.07));
  library.dispose();
});

test('green sleeping pose closes dorsal eyes and remains still as simulation time advances',()=>{
  const assets=createRealisticGreenAssets(),fish=new THREE.Group();fish.userData={sleeping:true,eyeClosure:1,motionSpeed:2,swimPhase:3,finPhase:7,turnLean:.9};
  const m=assets.create(fish);m.update(1,true);
  const pose=m.group.children.map(p=>[...p.position,...p.rotation.toArray(),...p.scale,p.visible]);
  m.update(100,true);assert.deepEqual(m.group.children.map(p=>[...p.position,...p.rotation.toArray(),...p.scale,p.visible]),pose);
  assert.equal(m.uniforms.reefAmplitude.value,0);assert.equal(m.uniforms.reefFinEffort.value,0);assert.equal(m.group.rotation.x,0);
  assert.ok(m.group.children.filter(p=>p.name==='Natural pupil'||p.name==='Natural iris').every(p=>!p.visible));
  assert.ok(m.group.children.filter(p=>p.name==='Sleep seam'||p.name==='Sleep lid').every(p=>p.visible));
  fish.userData.sleeping=false;fish.userData.eyeClosure=0;fish.userData.motionSpeed=0;m.update(100,true);
  assert.equal(m.uniforms.reefAmplitude.value,0);assert.equal(m.uniforms.reefFinEffort.value,1);
  assert.ok(m.group.children.filter(p=>p.name==='Natural pupil').every(p=>p.visible));assets.dispose();
});

test('batch two switches preserve state and root, reuse assets, apply LOD and clean up exactly once',()=>{
  for(const factory of [createGreenReefLibrary,()=>createBlueReefLibrary({clown:true})]){
    const library=factory(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),fish=new THREE.Group(),other=new THREE.Group(),original=new THREE.Group();
    fish.add(original);scene.add(fish,other);fish.position.set(1,2,3);fish.scale.setScalar(.48);
    fish.userData={schoolId:'reef_6',sleeping:true,eyeClosure:1,wakeUntil:44,nextSleep:70,sleepUntil:32,motionSpeed:0,swimPhase:5.1,finPhase:8.9};
    const m=library.attach(fish),n=library.attach(other),before={...fish.userData};assert.equal(m.realistic,null);
    library.update(camera,'high',true,8,'realistic');const real=m.realistic,bodyGeometry=real.body.geometry;
    assert.equal(bodyGeometry,n.realistic.body.geometry);assert.notEqual(real.body.material,n.realistic.body.material);
    for(let i=0;i<8;i++){
      library.update(camera,'high',true,8,'cartoon');assert.ok(m.detailed.visible);assert.equal(real.group.visible,false);
      library.update(camera,'high',true,8,'realistic');assert.equal(m.realistic,real);assert.equal(real.group.visible,true);
    }
    assert.deepEqual(fish.userData,before);assert.deepEqual(fish.position.toArray(),[1,2,3]);assert.equal(fish.scale.x,.48);assert.equal(fish.children.length,3);
    camera.position.z=100;library.update(camera,'low',true,8,'realistic');assert.ok(real.body.geometry.index.count<bodyGeometry.index.count);
    camera.position.z=0;library.update(camera,'high',true,8,'realistic');assert.equal(real.body.geometry,bodyGeometry);
    const uniforms=Object.fromEntries(Object.entries(real.uniforms).map(([k,v])=>[k,v.value]));
    library.update(camera,'high',true,8,'realistic');assert.deepEqual(Object.fromEntries(Object.entries(real.uniforms).map(([k,v])=>[k,v.value])),uniforms);
    library.update(camera,'high',false,8,'realistic');assert.ok(m.basic.visible);assert.equal(real.group.visible,false);
    let materialDisposed=0,geometryDisposed=0;real.body.material.addEventListener('dispose',()=>materialDisposed++);bodyGeometry.addEventListener('dispose',()=>geometryDisposed++);
    scene.remove(fish);library.update(camera,'high');assert.equal(materialDisposed,1);assert.equal(geometryDisposed,0);assert.equal(real.group.parent,null);
    library.dispose();library.dispose();assert.equal(materialDisposed,1);assert.equal(geometryDisposed,1);assert.equal(n.realistic.group.parent,null);
  }
});

test('clown hover moves paired fins independently of forward motion and respects integrated phase',()=>{
  const assets=createRealisticClownAssets(),fish=new THREE.Group();fish.userData={motionSpeed:0,swimPhase:2,finPhase:0};
  const m=assets.create(fish),fins=m.group.children.filter(p=>p.name==='Pectoral membrane');m.update(0,true);
  const first=fins[0].rotation.y;fish.userData.finPhase=1;m.update(0,true);assert.notEqual(fins[0].rotation.y,first);
  assert.equal(m.uniforms.reefAmplitude.value,0);const phase=m.uniforms.reefPhase.value;m.update(999,true);assert.equal(m.uniforms.reefPhase.value,phase);
  const pose=fins.map(p=>p.rotation.toArray());m.update(999,true);assert.deepEqual(fins.map(p=>p.rotation.toArray()),pose);
  fish.userData.motionSpeed=1.2;m.update(999,true);assert.ok(m.uniforms.reefAmplitude.value>0);assert.equal(m.uniforms.reefPhase.value,2);
  assets.dispose();assert.throws(()=>assets.create(new THREE.Group()),/disposed/);
});
