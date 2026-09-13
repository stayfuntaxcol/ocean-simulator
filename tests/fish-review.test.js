import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

test('standalone visual review imports actual models without Firebase and its script parses',()=>{
  const url=new URL('../graphics/fish-review.html',import.meta.url),html=fs.readFileSync(url,'utf8');
  const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  for(const match of script.matchAll(/from '([^']+)'/g))if(match[1].startsWith('.'))assert.ok(fs.existsSync(new URL(match[1],url)));
  assert.doesNotThrow(()=>new vm.Script(script.replace(/^import .*$/gm,'')));
  assert.doesNotMatch(html,/firebase|apiKey|gstatic/);
  assert.match(script,/\['puffer','cartoon'/);assert.match(script,/\['puffer','realistic'/);
  assert.match(script,/\['coral','cartoon'/);assert.match(script,/\['coral','realistic'/);
});

test('click selection ignores meshes belonging to an inactive appearance',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const code=html.slice(html.indexOf('function fishRootFromObject'),html.indexOf('function pickFishAtCenter'));
  const scene=new THREE.Scene(),root=new THREE.Group(),cartoon=new THREE.Group(),realistic=new THREE.Group(),a=new THREE.Object3D(),b=new THREE.Object3D();
  root.userData.isFishRoot=true;scene.add(root);root.add(cartoon,realistic);cartoon.add(a);realistic.add(b);realistic.visible=false;
  const ctx={scene};vm.createContext(ctx);vm.runInContext(code,ctx);
  assert.equal(ctx.fishRootFromObject(a),root);assert.equal(ctx.fishRootFromObject(b),null);
  cartoon.visible=false;realistic.visible=true;assert.equal(ctx.fishRootFromObject(a),null);assert.equal(ctx.fishRootFromObject(b),root);
});
