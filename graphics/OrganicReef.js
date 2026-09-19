import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { installCaustics, seededRandom } from './UnderwaterAtmosphere.js';
import { addSurfaceRelief } from './FishSurfaceDetail.js';

export const ORGANIC_REEF_TYPES = Object.freeze(['branch', 'plate', 'sponge', 'anemone']);
const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// Colours encode soft growth gradients and cavity occlusion, not a second light rig.
function attributes(geometry, tint = () => [1, 1, 1], flex = [0, 1, 0, 0]) {
  const p = geometry.attributes.position, colors = [], motion = [];
  for (let i = 0; i < p.count; i++) {
    colors.push(...tint(p.getX(i), p.getY(i), p.getZ(i), i));
    motion.push(...flex);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('reefFlex', new THREE.Float32BufferAttribute(motion, 4));
  geometry.deleteAttribute('uv');
  return geometry;
}

function softTube(points, radius, steps, sides, tint, flex, bulb = false) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(steps, false), positions = [], indices = [];
  const capRings = 3, rings = steps + capRings;
  const taperAt = t => (1 - t * .55) * (bulb ? 1 + .65 * Math.exp(-(((t - .88) / .19) ** 2)) : 1);
  const tipRadius = radius * taperAt(1), tangent = curve.getTangentAt(1);
  for (let i = 0; i <= rings; i++) {
    const t = Math.min(i / steps, 1), frame = Math.min(i, steps);
    const center = curve.getPointAt(t);
    const capAngle = Math.max(0, (i - steps) / capRings) * Math.PI / 2;
    if (i > steps) center.addScaledVector(tangent, tipRadius * Math.sin(capAngle));
    const r = i > steps ? tipRadius * Math.cos(capAngle) : radius * taperAt(t);
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2;
      const p = center.clone().addScaledVector(frames.normals[frame], -Math.cos(a) * r).addScaledVector(frames.binormals[frame], Math.sin(a) * r);
      positions.push(p.x, p.y, p.z);
      if (i < rings && j < sides) {
        const k = i * (sides + 1) + j, next = k + sides + 1;
        indices.push(k, next, k + 1, next, next + 1, k + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Join duplicated UV-free seams; cap poles share the end tangent.
  const normals = geometry.attributes.normal;
  for (let i = 0; i <= rings; i++) {
    const first = i * (sides + 1), last = first + sides;
    const n = new THREE.Vector3().fromBufferAttribute(normals, first).add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, n.x, n.y, n.z); normals.setXYZ(last, n.x, n.y, n.z);
    if (i === rings) for (let j = first; j <= last; j++) normals.setXYZ(j, tangent.x, tangent.y, tangent.z);
  }
  return attributes(geometry, tint, flex);
}

function growthTint(y, height) {
  const tip = THREE.MathUtils.smoothstep(y / height, .62, 1);
  const shade = .76 + .18 * THREE.MathUtils.clamp(y / height, 0, 1);
  return [shade + .10 * tip, shade + .17 * tip, shade + .15 * tip];
}

function branch(parts, random, low) {
  const steps = low ? 3 : 7, sides = low ? 4 : 9;
  const add = (points, r) => parts.push(softTube(points, r, steps, sides, (_, y) => growthTint(y, 2.5)));
  add([v(0, 0), v(.06, .65, -.03), v(-.08, 1.3, .05), v(.1, 2.45, .04)], .18);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.39996 + random() * .35, y = .35 + i * .16;
    const reach = .55 + random() * .25;
    const start = v(0, y), fork = v(Math.cos(a) * reach, y + .58, Math.sin(a) * reach);
    add([start, start.clone().lerp(fork, .45).add(v(0, -.06)), fork, fork.clone().add(v(0, .32))], .10);
    for (let j = 0; j < 3; j++) {
      const angle = a + (j - 1) * .85, height = .42 + random() * .35;
      const end = fork.clone().add(v(Math.cos(angle) * .30, height, Math.sin(angle) * .30));
      add([fork, fork.clone().lerp(end, .65), end], .065);
    }
  }
  const foot = new THREE.SphereGeometry(.27, 12, 6);
  foot.scale(1, .45, 1); foot.translate(0, .05, 0);
  parts.push(attributes(foot, () => [.72, .73, .70]));
}

function plates(parts, variant, low) {
  const angles = low ? 24 : 64, rings = low ? 4 : 10;
  for (let layer = 0; layer < 3; layer++) {
    const positions = [], colors = [], indices = [], radius = .70 + layer * .31;
    const stride = angles + 1, half = (rings + 1) * stride;
    for (let side = 0; side < 2; side++) for (let i = 0; i <= rings; i++) for (let j = 0; j <= angles; j++) {
      const u = i / rings, a = j / angles * Math.PI * 2, phase = layer * .9 + variant;
      const edge = 1 + .09 * Math.sin(a * 3 + phase) + .035 * Math.cos(a * 7 - phase);
      const r = radius * u * edge, thickness = .045 + .075 * (1 - u * u);
      const y = .16 + layer * .42 + u * u * .17 + Math.sin(a * 5 + phase) * .07 * u ** 3;
      positions.push(Math.cos(a) * r + layer * .055, y - side * thickness, Math.sin(a) * r);
      const rim = THREE.MathUtils.smoothstep(u, .85, 1), shade = side ? .64 : .87 + .05 * u;
      colors.push(shade + rim * .13, shade + rim * .18, shade + rim * .15);
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < angles; j++) {
      const k = i * stride + j, b = k + half;
      indices.push(k, k + 1, k + stride, k + 1, k + stride + 1, k + stride);
      indices.push(b, b + stride, b + 1, b + 1, b + stride, b + stride + 1);
    }
    for (let j = 0; j < angles; j++) {
      const a = rings * stride + j, b = a + half;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    attributes(geometry);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    parts.push(geometry);
  }
  const foot = new THREE.CylinderGeometry(.12, .22, 1.04, low ? 7 : 12);
  foot.translate(0, .44, 0); parts.push(attributes(foot, () => [.73, .72, .70]));
}

function sponges(parts, random, low) {
  // Outside, rounded lip, inner wall, recessed floor. Each vessel is truly hollow.
  const profile = [[0,0],[.16,0],[.26,.05],[.28,.22],[.245,.45],[.28,.68],
    [.31,.89],[.32,.97],[.305,1],[.275,1.015],[.245,1],[.23,.97],
    [.22,.88],[.19,.66],[.16,.43],[.13,.22],[.08,.16],[0,.15]];
  for (let i = 0; i < 5; i++) {
    const height = .9 + random() * 1.2, width = .78 + random() * .42;
    const phase = random() * Math.PI * 2, bend = (random() - .5) * .28;
    const a = i * 2.39996, distance = i ? .42 + random() * .12 : .06;
    const shape = new THREE.LatheGeometry(profile.map(([r,y]) => new THREE.Vector2(r * width, y * height)), low ? 12 : 28);
    const p = shape.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j), t = y / height;
      const angle = Math.atan2(z, x);
      const irregular = 1 + .075 * Math.sin(angle * 3 + phase) + .025 * Math.cos(angle * 5 - phase + t * 3);
      p.setXYZ(j, x * irregular + bend * t * t + Math.cos(a) * distance,
        y + .025 * Math.sin(angle * 3 + phase) * t ** 4,
        z * irregular + .06 * Math.sin(t * 2 + phase) * t + Math.sin(a) * distance);
    }
    shape.computeVertexNormals();
    parts.push(attributes(shape, (_, y, __, index) => {
      const profileIndex = index % profile.length, t = y / height;
      const inner = profileIndex >= 11;
      const shade = inner ? .32 + .49 * THREE.MathUtils.smoothstep(t, .22, 1) : .76 + t * .19;
      const lip = profileIndex >= 7 && profileIndex <= 11 ? .08 : 0;
      return [shade + lip, shade + lip * 1.2, shade + lip * .6];
    }));
  }
}

function anemone(parts, random, low) {
  const foot = new THREE.SphereGeometry(.58, low ? 16 : 28, low ? 8 : 12);
  foot.scale(1, .30, 1); foot.translate(0, .15, 0);
  parts.push(attributes(foot, (x, _, z) => {
    const center = THREE.MathUtils.smoothstep(Math.hypot(x, z), .03, .24);
    return [.53 + center * .28, .48 + center * .28, .47 + center * .27];
  }));
  // All LODs keep the same tentacles and seeded phase: only tessellation changes.
  for (let i = 0; i < 42; i++) {
    const a = i * 2.39996, r = .19 + .38 * Math.sqrt((i + .5) / 42);
    const height = .52 + random() * .35, bend = .08 + random() * .16;
    const base = v(Math.cos(a) * r, .23, Math.sin(a) * r);
    const tip = v(base.x + Math.cos(a + .45) * bend, .23 + height, base.z + Math.sin(a + .45) * bend);
    const phase = random() * Math.PI * 2;
    const points = [base, base.clone().add(v(-Math.cos(a) * .035, height * .40, -Math.sin(a) * .035)),
      tip.clone().add(v(-.025 * Math.sin(a), -height * .2, .02 * Math.cos(a))), tip];
    parts.push(softTube(points, .045 + random() * .012, low ? 3 : 9, low ? 4 : 8,
      (_, y) => growthTint(y - .23, height), [.23, height, phase, 1], true));
  }
}

export function makeOrganicReefGeometry(type, variant = 0, low = false) {
  if (!ORGANIC_REEF_TYPES.includes(type)) throw new Error('Unknown organic reef type');
  const parts = [], random = seededRandom(2189 + variant * 131);
  if (type === 'branch') branch(parts, random, low);
  if (type === 'plate') plates(parts, variant, low);
  if (type === 'sponge') sponges(parts, random, low);
  if (type === 'anemone') anemone(parts, random, low);
  const result = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  result.computeBoundingBox();
  const min = result.boundingBox.min.clone(), size = result.boundingBox.getSize(new THREE.Vector3());
  result.translate(-min.x, -min.y, -min.z);
  result.scale(1 / size.x, 1 / size.y, 1 / size.z);
  const flex = result.attributes.reefFlex;
  for (let i = 0; i < flex.count; i++) {
    flex.setX(i, (flex.getX(i) - min.y) / size.y);
    flex.setY(i, flex.getY(i) / size.y);
  }
  result.computeBoundingBox(); result.computeBoundingSphere();
  if (type === 'anemone') result.boundingSphere.radius += .14;
  result.userData = { organicReef: true, type, variant, low };
  return result;
}

// Per-tentacle phase, shared current direction, anchored foot and zero slope at base.
export const REEF_FLOW_GLSL = `
  uniform float reefTime;
  uniform float reefMotion;
  attribute vec4 reefFlex;
  vec2 organicFlow(float y) {
    float t=clamp((y-reefFlex.x)/max(reefFlex.y,.001),0.0,1.0);
    float colony=modelMatrix[3].x*.23+modelMatrix[3].z*.17;
    float current=reefTime*.75+colony;
    float ripple=sin(reefTime*1.24+reefFlex.z+t*1.8);
    return vec2(sin(current+t*.65)*.057+ripple*.018,
      cos(current*.83+t*.8)*.034+ripple*.014)*t*t*reefFlex.w*reefMotion;
  }
`;

export function createOrganicReefMaterial(type, color, uniforms) {
  const material = installCaustics(new THREE.MeshStandardMaterial({
    color, vertexColors: true, metalness: 0, roughness: type === 'anemone' ? .68 : .91,
  }), uniforms);
  const lighting = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    lighting(shader);
    shader.vertexShader = 'varying vec3 vOrganicLocal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvOrganicLocal=position;');
    if (type === 'anemone') {
      shader.vertexShader = REEF_FLOW_GLSL + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
        #include <beginnormal_vertex>
        vec2 slope=(organicFlow(position.y+.001)-organicFlow(position.y-.001))/.002;
        objectNormal.y-=dot(slope,objectNormal.xz);
      `).replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.xz+=organicFlow(position.y);');
    }
    shader.fragmentShader = 'varying vec3 vOrganicLocal;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 poreP=vOrganicLocal*${type === 'sponge' ? '85.0' : '62.0'};
      float poreAA=1.0-smoothstep(.35,1.4,length(fwidth(poreP)));
      float poreNoise=fishNoise(poreP);
      float pores=smoothstep(.59,.82,poreNoise)*poreAA;
      float mottling=fishNoise(vOrganicLocal*6.0);
      diffuseColor.rgb*=.94+mottling*.10-pores*${type === 'sponge' ? '.16' : '.055'};
    `);
    addSurfaceRelief(shader, '-pores', 'pores*.055', type === 'sponge' ? .0012 : type === 'anemone' ? .00015 : .00035);
  };
  material.customProgramCacheKey = () => `organic-reef-v1-${type}`;
  return material;
}
