import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { createUnderwaterAtmosphere, installCaustics, seededRandom, QUALITY } from '../graphics/UnderwaterAtmosphere.js';
import { REFERENCE } from '../graphics/reference-scene.js';

function fixture() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b5364);
  scene.fog = new THREE.FogExp2(0x0b5364, .035);
  const camera = new THREE.PerspectiveCamera();
  camera.position.y = -7;
  const sun = new THREE.DirectionalLight(0xcaf8ff, 2.1);
  const ambient = new THREE.HemisphereLight(0x8fe7ff, 0x10242a, 1.6);
  const glow = new THREE.PointLight(0x2fb7ff, 12);
  const renderer = { toneMapping: THREE.NoToneMapping, toneMappingExposure: 1,
    setPixelRatio(n) { this.ratio = n; }, getPixelRatio() { return this.ratio; } };
  const atmosphere = createUnderwaterAtmosphere({ scene, camera, sun, ambient, glow, renderer });
  return { atmosphere, scene, camera, sun, renderer };
}

test('quality settings bound geometry and resolution, including invalid input', () => {
  const { atmosphere, scene, renderer } = fixture();
  const [, shafts, dust] = scene.children[0].children;
  for (const name of Object.keys(QUALITY)) {
    atmosphere.setQuality(name);
    assert.equal(shafts.geometry.drawRange.count, QUALITY[name].shafts * 6);
    assert.equal(dust.geometry.drawRange.count, QUALITY[name].particles);
    assert.ok(renderer.ratio <= QUALITY[name].pixelRatio);
  }
  atmosphere.setQuality('__proto__');
  assert.equal(atmosphere.quality, 'medium');
});

test('original mode restores light, fog, background and tone mapping', () => {
  const { atmosphere, scene, renderer, sun } = fixture();
  atmosphere.update(12);
  assert.equal(scene.children[0].visible, true);
  assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping);
  atmosphere.setEnabled(false);
  atmosphere.update(12);
  assert.equal(scene.children[0].visible, false);
  assert.equal(scene.background.getHex(), 0x0b5364);
  assert.equal(scene.fog.density, .035);
  assert.equal(sun.intensity, 2.1);
  assert.equal(renderer.toneMapping, THREE.NoToneMapping);
  assert.equal(atmosphere.uniforms.oceanStrength.value, 0);
});

test('editor and terrain inspection suppress effects and preserve their environment', () => {
  const { atmosphere, scene } = fixture();
  for (const mode of ['editor', 'inspect']) {
    scene.background.set(0xc7e3e8);
    scene.fog = mode === 'editor' ? null : new THREE.FogExp2(0x4a8793, .0085);
    atmosphere.update(12, { [mode]: true });
    assert.equal(scene.background.getHex(), 0xc7e3e8);
    assert.equal(scene.children[0].visible, false);
    assert.equal(atmosphere.uniforms.oceanStrength.value, 0);
    if (mode === 'inspect') assert.equal(scene.fog.density, .0085);
  }
});

test('shared caustic uniforms patch the installed Three.js standard shader', () => {
  const { atmosphere } = fixture();
  const material = installCaustics(new THREE.MeshStandardMaterial(), atmosphere.uniforms);
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
  material.onBeforeCompile(shader);
  assert.match(shader.vertexShader, /vOceanWorld = \(modelMatrix \* oceanVertex\)/);
  assert.match(shader.fragmentShader, /outgoingLight \+= diffuseColor.rgb/);
  assert.equal(shader.uniforms.oceanTime, atmosphere.uniforms.oceanTime);
  assert.equal(shader.uniforms.oceanStrength, atmosphere.uniforms.oceanStrength);
  atmosphere.update(27);
  assert.equal(shader.uniforms.oceanTime.value, 27);
});

test('reference scene has reproducible randomness and a bounded composition', () => {
  const a = seededRandom(REFERENCE.seed), b = seededRandom(REFERENCE.seed);
  for (let i = 0; i < 1000; i++) { const n = a(); assert.equal(n, b()); assert.ok(n >= 0 && n < 1); }
  assert.equal(new Set(REFERENCE.cells.map(([x,z]) => `${x},${z}`)).size, REFERENCE.cells.length);
  assert.ok(REFERENCE.cells.length <= 12);
  assert.equal(REFERENCE.fishCount, 40);
});

test('simulator module parses after removing imports (no browser or Firebase execution)', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const withoutImports = source.replace(/^import .+;\r?$/gm, '');
  assert.doesNotThrow(() => new vm.Script(withoutImports));
});
