import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createNightFlashlight, FLASHLIGHT_STYLES } from '../graphics/NightLighting.js';
import { createJellyfishSwarm } from '../graphics/JellyfishSwarm.js';

test('night flashlight supports three luminous styles and follows the camera',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  camera.position.set(2,3,4);camera.lookAt(2,3,-5);
  const torch=createNightFlashlight({scene,camera});
  assert.deepEqual(Object.keys(FLASHLIGHT_STYLES),['fluorescent','turquoise','ethereal']);
  torch.setEnabled(true);torch.applyStyle('fluorescent');torch.update({nightFactor:1});
  assert.ok(torch.light.intensity>0);
  assert.equal(torch.light.color.getHex(),FLASHLIGHT_STYLES.fluorescent.color);
  assert.ok(torch.target.position.z<camera.position.z);
  torch.dispose();
});

test('jellyfish swarm is bounded, animated and brighter at night',()=>{
  const scene=new THREE.Scene();
  const swarm=createJellyfishSwarm({scene,terrain:()=>-18,boundary:100,isBlocked:()=>false,count:12});
  const bells=swarm.root.children[0],strands=swarm.root.children[1],glows=swarm.root.children[2];
  swarm.update(.016,1,{nightFactor:0,storminess:0});
  const dayGlow=glows.material.opacity,dayEmission=bells.material.emissiveIntensity;
  swarm.update(.016,2,{nightFactor:1,storminess:.2});
  assert.ok(glows.material.opacity>dayGlow);
  assert.ok(bells.material.emissiveIntensity>dayEmission);
  assert.ok(strands.geometry.attributes.position.needsUpdate!==false);
  assert.ok(Math.abs(swarm.center.x)<100&&Math.abs(swarm.center.z)<100);
  swarm.dispose();
});
