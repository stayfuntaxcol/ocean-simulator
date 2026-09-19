import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { installSeabedMaterial } from './SeabedMaterials.js';

export const ROCK_TYPES = ['limestone', 'basalt'];

export function makeRockGeometry(type, variant = 0, detail = 3) {
  if (!ROCK_TYPES.includes(type)) throw new Error('Unknown rock type');
  const source = new THREE.IcosahedronGeometry(1, detail);
  source.deleteAttribute('normal');
  source.deleteAttribute('uv');
  const geometry = mergeVertices(source);
  source.dispose();
  const positions = geometry.attributes.position;
  const p = new THREE.Vector3();
  const phase = variant * 1.73;
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    const broad = Math.sin(p.x*3.7+phase)*Math.cos(p.z*3.1-phase)*Math.sin(p.y*2.6+1.3);
    const chips = Math.sin(p.x*9.0+p.z*5.0+phase)*Math.cos(p.y*8.0-phase);
    if (type === 'limestone') {
      const ledge = Math.sin(p.y*13.0+phase)*.035;
      p.multiplyScalar(.89 + broad*.095 + chips*.025 + ledge);
      p.y *= .82;
    } else {
      p.multiplyScalar(.86 + broad*.105 + chips*.045);
      // Broad weathered faces rather than a perfect rounded polyhedron.
      p.x = THREE.MathUtils.clamp(p.x, -.76, .82);
      p.z = THREE.MathUtils.clamp(p.z, -.85, .74);
    }
    positions.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.sharedRock = true;
  return geometry;
}

// A bounded cache: two stone families, four variants, two detail levels.
// Collision geometry always stays at the near level, even when visuals simplify.
export function createRockLibrary(caustics) {
  const uniform = { value: 1 };
  const materials = ROCK_TYPES.map(type => installSeabedMaterial(
    new THREE.MeshStandardMaterial({ roughness: .94, metalness: 0 }), caustics, uniform, type));
  const cache = ROCK_TYPES.map(type => Array.from({ length: 4 }, (_, i) => {
    const near = makeRockGeometry(type, i, 3), far = makeRockGeometry(type, i, 1);
    // Broad-phase collision bounds must enclose the near geometry in either LOD.
    far.boundingBox.copy(near.boundingBox);
    far.boundingSphere.copy(near.boundingSphere);
    return { near, far };
  }));
  const meshes = new Set();
  let enabled = true;
  const raycast = THREE.Mesh.prototype.raycast;
  const worldPosition = new THREE.Vector3();

  function decorate(mesh, radius, seed) {
    const family = (seed >>> 2) % ROCK_TYPES.length;
    const shapes = cache[family][seed % 4];
    const original = { geometry: mesh.geometry, material: mesh.material };
    // Both modes use unit geometry and the exact same object transforms.
    mesh.scale.multiplyScalar(radius);
    mesh.userData.rockAppearance = { original, shapes, material: materials[family] };
    mesh.raycast = function (caster, hits) {
      const visibleGeometry = this.geometry;
      this.geometry = enabled ? shapes.near : original.geometry;
      try { raycast.call(this, caster, hits); }
      finally { this.geometry = visibleGeometry; }
    };
    meshes.add(mesh);
    mesh.geometry = enabled ? shapes.near : original.geometry;
    mesh.material = enabled ? materials[family] : original.material;
    return mesh;
  }

  function update(camera, quality, active = true) {
    enabled = active;
    const nearDistance = quality === 'low' ? 20 : quality === 'high' ? 48 : 34;
    for (const mesh of meshes) {
      const { original, shapes, material } = mesh.userData.rockAppearance;
      mesh.getWorldPosition(worldPosition);
      mesh.geometry = active ? (worldPosition.distanceToSquared(camera.position) < nearDistance**2
        ? shapes.near : shapes.far) : original.geometry;
      mesh.material = active ? material : original.material;
    }
  }

  function release(root) {
    root.traverse(mesh => {
      if (!meshes.delete(mesh)) return;
      mesh.userData.rockAppearance.original.geometry.dispose();
    });
  }
  return { decorate, update, release, get size() { return meshes.size; } };
}
