import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeRockGeometry, createRockLibrary, ROCK_TYPES } from '../graphics/ReefRocks.js';
import { installSeabedMaterial } from '../graphics/SeabedMaterials.js';

const caustics = { oceanTime: { value: 12 }, oceanStrength: { value: .3 } };

test('both rock families are deterministic closed meshes with bounded complexity', () => {
  for (const type of ROCK_TYPES) {
    const a = makeRockGeometry(type, 2), b = makeRockGeometry(type, 2);
    assert.deepEqual(a.attributes.position.array, b.attributes.position.array);
    assert.equal(a.index.count / 3, 320);
    assert.ok(a.boundingSphere.radius < 1.2 && a.boundingSphere.radius > .5);
    assert.ok(a.attributes.normal.array.every(Number.isFinite));
    const edges = new Map();
    const indices = a.index.array;
    for (let i = 0; i < indices.length; i += 3) {
      for (const [j,k] of [[0,1],[1,2],[2,0]]) {
        const pair = [indices[i+j],indices[i+k]].sort((x,y) => x-y).join(',');
        edges.set(pair, (edges.get(pair) || 0) + 1);
      }
    }
    assert.ok([...edges.values()].every(count => count === 2), 'no open seams');
    a.dispose(); b.dispose();
  }
});

test('distance detail changes visual geometry without changing raycast hits', () => {
  const library = createRockLibrary(caustics);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1), new THREE.MeshStandardMaterial());
  library.decorate(rock, 2, 7);
  rock.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera();
  camera.position.z = 6;
  library.update(camera, 'high');
  const near = rock.geometry;
  const ray = new THREE.Raycaster(new THREE.Vector3(0,0,5), new THREE.Vector3(0,0,-1));
  const nearHits = ray.intersectObject(rock);
  assert.ok(nearHits.length > 0);
  camera.position.z = 100;
  library.update(camera, 'high');
  const far = rock.geometry;
  assert.equal(far.index.count / 3, 80);
  assert.notEqual(far, near);
  const farHits = ray.intersectObject(rock);
  assert.equal(farHits[0].distance, nearHits[0].distance);
  assert.equal(rock.geometry, far, 'raycast restores visual geometry');
  assert.ok(far.boundingBox.containsBox(near.boundingBox));
});

test('original appearance returns and streaming releases only owned geometry', () => {
  const library = createRockLibrary(caustics);
  const group = new THREE.Group();
  const original = new THREE.DodecahedronGeometry(1);
  let originalDisposed = 0, sharedDisposed = 0;
  original.addEventListener('dispose', () => originalDisposed++);
  const material = new THREE.MeshStandardMaterial();
  const a = new THREE.Mesh(original, material);
  const b = new THREE.Mesh(new THREE.DodecahedronGeometry(1), material);
  library.decorate(a, 3, 5); library.decorate(b, 3, 5);
  group.add(a);
  assert.equal(a.geometry, b.geometry);
  a.geometry.addEventListener('dispose', () => sharedDisposed++);
  library.update(new THREE.PerspectiveCamera(), 'medium', false);
  assert.equal(a.geometry, original);
  assert.equal(a.material, material);
  assert.deepEqual(a.scale.toArray(), [3,3,3]);
  library.release(group); library.release(group);
  assert.equal(library.size, 1);
  assert.equal(originalDisposed, 1);
  assert.equal(sharedDisposed, 0);
});

test('seabed material composes with light shader and keeps inspection toggle shared', () => {
  const detail = { value: 1 };
  const keys = new Set();
  for (const type of ['sand', ...ROCK_TYPES]) {
    const material = installSeabedMaterial(new THREE.MeshStandardMaterial(), caustics, detail, type);
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.oceanTime, caustics.oceanTime);
    assert.equal(shader.uniforms.seabedDetail, detail);
    assert.match(shader.fragmentShader, /float bedHeight =/);
    assert.match(shader.fragmentShader, /outgoingLight \+= diffuseColor.rgb/);
    assert.match(shader.fragmentShader, /#include <normal_fragment_maps>/);
    assert.match(shader.fragmentShader, /#include <color_fragment>/);
    keys.add(material.customProgramCacheKey());
  }
  assert.equal(keys.size, 3, 'materials cannot share the wrong compiled program');
});
