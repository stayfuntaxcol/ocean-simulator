import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROCK_SKINS,ROCK_SKIN_IDS,createRockSkinMaterial} from '../graphics/RockFormationSkins.js';

test('six rock skins use reliable standard materials with distinct visible colors',()=>{
  assert.equal(ROCK_SKIN_IDS.length,6);
  const colors=new Set();
  for(const id of ROCK_SKIN_IDS){
    const skin=ROCK_SKINS[id];
    assert.ok(skin.name);
    const material=createRockSkinMaterial(id);
    assert.equal(material.isMeshStandardMaterial,true);
    assert.equal(material.onBeforeCompile.toString(),THREE.Material.prototype.onBeforeCompile.toString());
    assert.equal(material.transparent,false);
    assert.ok(material.roughness>=.9);
    colors.add(material.color.getHex());
    material.dispose();
  }
  assert.equal(colors.size,ROCK_SKIN_IDS.length);
});
