import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROCK_SKINS,ROCK_SKIN_IDS,createRockSkinMaterial} from '../graphics/RockFormationSkins.js';

const caustics={oceanTime:{value:1},oceanStrength:{value:.3},oceanWaveSpeed:{value:1},oceanTurbulence:{value:0}};

test('six directly usable rock skins expose distinct material programs',()=>{
  assert.equal(ROCK_SKIN_IDS.length,6);
  const keys=new Set();
  for(const id of ROCK_SKIN_IDS){
    assert.ok(ROCK_SKINS[id].name);
    const material=createRockSkinMaterial(id,caustics);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    material.onBeforeCompile(shader);
    assert.match(shader.fragmentShader,/rockNoise/);
    assert.match(shader.fragmentShader,/rockColor/);
    assert.match(shader.fragmentShader,/rockHeight/);
    assert.equal(shader.uniforms.oceanTime,caustics.oceanTime);
    keys.add(material.customProgramCacheKey());
    material.dispose();
  }
  assert.equal(keys.size,ROCK_SKIN_IDS.length);
});
