import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { ORGANIC_REEF_TYPES, makeOrganicReefGeometry, createOrganicReefMaterial } from '../graphics/OrganicReef.js';
import { createReefLife } from '../graphics/ReefLife.js';

const light = { oceanTime: { value: 12 }, oceanStrength: { value: .3 } };
function colony(library, type = 'plate') {
  const root = new THREE.Group(); root.position.set(3, -12, 5); root.rotation.y = .34;
  root.userData.layerId = 19;
  const original = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshStandardMaterial());
  original.position.y = 1; root.add(original); new THREE.Scene().add(root);
  library.attach(root, type, 0xea9966, 2); root.updateMatrixWorld(true);
  return { root, original, basic: root.children[0], detailed: root.children[1] };
}
function shader(material) {
  const result = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(result); return result;
}

test('organic variants are deterministic, finite, indexed, bounded and cheaper at distance', () => {
  for (const type of ORGANIC_REEF_TYPES) for (let variant = 0; variant < 3; variant++) {
    const near = makeOrganicReefGeometry(type, variant), copy = makeOrganicReefGeometry(type, variant), far = makeOrganicReefGeometry(type, variant, true);
    assert.deepEqual(near.attributes.position.array, copy.attributes.position.array);
    for (const geometry of [near, far]) {
      for (const attribute of Object.values(geometry.attributes)) assert.ok(attribute.array.every(Number.isFinite));
      assert.ok(geometry.index.array.every(i => i < geometry.attributes.position.count));
      assert.equal(geometry.attributes.color.count, geometry.attributes.position.count);
      assert.equal(geometry.attributes.reefFlex.count, geometry.attributes.position.count);
      for (const value of geometry.boundingBox.min.toArray()) assert.ok(Math.abs(value) < 1e-5);
      for (const value of geometry.boundingBox.max.toArray()) assert.ok(Math.abs(value - 1) < 1e-5);
      assert.ok(geometry.index.count / 3 <= (geometry === far ? 2400 : 9000));
    }
    assert.ok(far.index.count < near.index.count * .45);
    near.dispose(); copy.dispose(); far.dispose();
  }
  assert.throws(() => makeOrganicReefGeometry('grass'), /Unknown/);
});

test('organic plate tops support placement and keep outward top normals', () => {
  const geometry = makeOrganicReefGeometry('plate');
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()); mesh.updateMatrixWorld();
  const hits = new THREE.Raycaster(new THREE.Vector3(.68, 2, .55), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
  assert.ok(hits.length && hits[0].point.y > .7 && hits[0].face.normal.y > 0);
});

test('sponge vessels include inward-facing shaded walls and outward-facing shells', () => {
  const geometry = makeOrganicReefGeometry('sponge'), p = geometry.attributes.position, n = geometry.attributes.normal, c = geometry.attributes.color;
  const profileCount = 18, segments = 28;
  // Corresponding outer and inner rings of the first vessel, away from seams.
  for (let segment = 1; segment < segments; segment++) {
    const outer = segment * profileCount + 5, inner = segment * profileCount + 13;
    assert.ok(n.getX(outer) * n.getX(inner) + n.getZ(outer) * n.getZ(inner) < 0);
    assert.ok(c.getX(inner) < c.getX(outer));
    assert.ok(p.getY(outer) > 0 && p.getY(inner) > 0);
  }
});

test('anemone keeps a rigid foot and 42 independently phased tentacles at both LODs', () => {
  const phases = [];
  for (const low of [false, true]) {
    const geometry = makeOrganicReefGeometry('anemone', 1, low), f = geometry.attributes.reefFlex;
    const set = new Set(); let fixed = 0;
    for (let i = 0; i < f.count; i++) {
      if (f.getW(i) === 0) fixed++; else { set.add(f.getZ(i)); assert.ok(f.getY(i) > 0); }
    }
    assert.ok(fixed > 50); assert.equal(set.size, 42); phases.push([...set]);
  }
  assert.deepEqual(phases[0], phases[1]);
  const material = createOrganicReefMaterial('anemone', 0x99aa77, { ...light, reefTime: { value: 0 }, reefMotion: { value: 1 } });
  const s = shader(material);
  assert.match(s.vertexShader, /t\*t\*reefFlex.w\*reefMotion/);
  assert.match(s.vertexShader, /objectNormal.y-=dot/);
  assert.match(s.vertexShader, /transformed.xz\+=organicFlow/);
});

test('organic materials retain caustics, actual relief and matte lighting; hard colonies stay still', () => {
  for (const type of ORGANIC_REEF_TYPES) {
    const material = createOrganicReefMaterial(type, 0xff8877, light), s = shader(material);
    assert.equal(s.uniforms.oceanTime, light.oceanTime);
    assert.equal(material.metalness, 0); assert.equal(material.vertexColors, true);
    assert.match(s.fragmentShader, /normal=fishMicroNormal/);
    assert.match(s.fragmentShader, /fwidth\(poreP\)/);
    assert.match(s.fragmentShader, /outgoingLight \+= diffuseColor.rgb/);
    assert.match(s.fragmentShader, /#include <lights_fragment_begin>/);
    if (type !== 'anemone') assert.doesNotMatch(s.vertexShader, /organicFlow/);
  }
});

test('opt-in preserves defaults, placement roots, cached resources and hidden-mesh raycast rules', () => {
  const originalLibrary = createReefLife(light), library = createReefLife(light, { style: 'organic' });
  const old = colony(originalLibrary), a = colony(library), b = colony(library);
  assert.equal(old.detailed.geometry.userData.organicReef, undefined);
  assert.equal(a.detailed.geometry.userData.organicReef, true);
  assert.equal(a.detailed.geometry, b.detailed.geometry); assert.equal(a.detailed.material, b.detailed.material);
  library.attach(a.root, 'plate'); assert.equal(a.root.children.length, 2);
  const position = a.root.position.clone(), rotation = a.root.rotation.clone(), scale = a.root.scale.clone();
  const camera = { position: a.root.position.clone() };
  library.update(camera, 'high', true);
  const ray = new THREE.Raycaster(new THREE.Vector3(3, 5, 5), new THREE.Vector3(0, -1, 0));
  assert.equal(ray.intersectObject(a.basic, true).length, 0);
  const nearHits = ray.intersectObject(a.detailed).map(hit => hit.point.y);
  library.update({ position: new THREE.Vector3(0, 0, 100) }, 'low', true);
  assert.deepEqual(ray.intersectObject(a.detailed).map(hit => hit.point.y), nearHits);
  library.update(camera, 'high', false);
  assert.equal(ray.intersectObject(a.detailed).length, 0); assert.ok(ray.intersectObject(a.basic, true).length > 0);
  assert.deepEqual(a.root.position, position); assert.ok(a.root.rotation.equals(rotation)); assert.deepEqual(a.root.scale, scale);
  assert.equal(a.root.userData.layerId, 19);
  const grass = colony(library, 'grass'); assert.equal(grass.detailed.geometry.userData.organicReef, undefined);
  originalLibrary.dispose(); library.dispose();
});

test('pause clock is shared, editor freezes deformation, and dispose releases caches exactly once', () => {
  const library = createReefLife(light, { style: 'organic' }), a = colony(library, 'anemone');
  const s = shader(a.detailed.material); library.setTime(14); assert.equal(s.uniforms.reefTime.value, 14);
  library.setTime(14, true); assert.equal(s.uniforms.reefTime.value, 14); assert.equal(s.uniforms.reefMotion.value, 0);
  let geometryDisposed = 0, materialDisposed = 0, originalDisposed = 0;
  a.detailed.geometry.addEventListener('dispose', () => geometryDisposed++);
  a.detailed.material.addEventListener('dispose', () => materialDisposed++);
  a.original.geometry.addEventListener('dispose', () => originalDisposed++);
  library.release(a.root); library.release(a.root); assert.equal(geometryDisposed, 0);
  library.dispose(); library.dispose();
  assert.equal(geometryDisposed, 1); assert.equal(materialDisposed, 1); assert.equal(originalDisposed, 1);
});

test('real anemone factory connects only in organic mode without consuming scene randomness', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const factory = html.slice(html.indexOf('function addAnemone('), html.indexOf('function addStarfish('));
  const outputs = [];
  for (const organicReef of [false, true]) {
    const reef = new THREE.Group(), calls = []; let draws = 0;
    const context = { THREE, reef, organicReef, reefMat: color => new THREE.MeshStandardMaterial({ color }),
      oceanRandom: () => { draws++; return .4; }, styleReef: (...args) => calls.push(args) };
    vm.runInNewContext(factory + '\naddAnemone(1,2,.7,0xdd9966);', context);
    outputs.push(draws); assert.equal(calls.length, organicReef ? 1 : 0);
    assert.deepEqual(reef.children[0].position.toArray(), [1, -17.55, 2]);
    if (organicReef) assert.equal(calls[0][1], 'anemone');
  }
  assert.equal(outputs[0], outputs[1]);
});
