import * as THREE from 'three';

export const QUALITY = Object.freeze({
  low: { pixelRatio: 1, particles: 120, shafts: 3, caustics: 0.20 },
  medium: { pixelRatio: 1.5, particles: 280, shafts: 6, caustics: 0.30 },
  high: { pixelRatio: 2, particles: 520, shafts: 9, caustics: 0.38 },
});

export function seededRandom(seed = 611) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Project animated light onto the actual terrain and reef geometry: no floating decal.
export function installCaustics(material, uniforms) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec3 vOceanWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `
      #include <worldpos_vertex>
      vec4 oceanVertex = vec4(transformed, 1.0);
      #ifdef USE_BATCHING
        oceanVertex = batchingMatrix * oceanVertex;
      #endif
      #ifdef USE_INSTANCING
        oceanVertex = instanceMatrix * oceanVertex;
      #endif
      vOceanWorld = (modelMatrix * oceanVertex).xyz;
    `);
    shader.fragmentShader = `
      varying vec3 vOceanWorld;
      uniform float oceanTime;
      uniform float oceanStrength;
      float oceanCaustic(vec2 p) {
        p += vec2(sin(p.y * 1.8 + oceanTime * .32),
                  cos(p.x * 1.6 - oceanTime * .27)) * .65;
        float a = sin(p.x * 2.6 + p.y * 1.7 + oceanTime * .38);
        float b = sin(p.y * 3.1 - p.x * 1.3 - oceanTime * .29);
        return pow(max(0.0, 1.0 - abs(a + b) * 2.5), 3.0);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float oceanDepth = max(0.0, 20.0 - vOceanWorld.y);
      float oceanUnder = 1.0 - smoothstep(19.0, 20.5, vOceanWorld.y);
      float oceanFace = clamp(dot(normal, normalize(mat3(viewMatrix) * vec3(0.0, 1.0, 0.0))), 0.0, 1.0);
      float oceanLight = oceanCaustic(vOceanWorld.xz * .42 + vOceanWorld.y * .06);
      outgoingLight += diffuseColor.rgb * vec3(.62, .93, 1.0) * oceanLight
        * oceanFace * exp(-oceanDepth * .018) * oceanStrength * oceanUnder;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'ocean-caustics-v1';
  return material;
}

export function createUnderwaterAtmosphere({ scene, renderer, camera, sun, ambient, glow }) {
  const group = new THREE.Group();
  group.name = 'Underwater atmosphere';
  scene.add(group);
  const uniforms = { oceanTime: { value: 0 }, oceanStrength: { value: 0.3 } };
  const time = uniforms.oceanTime;
  const random = seededRandom(611);
  let quality = 'medium';
  let enabled = true;
  const original = { background: scene.background.clone(), sun: sun.color.clone(),
    sunIntensity: sun.intensity, ambientIntensity: ambient.intensity,
    ambientColor: ambient.color.clone(), groundColor: ambient.groundColor.clone(),
    glowIntensity: glow.intensity, toneMapping: renderer.toneMapping,
    exposure: renderer.toneMappingExposure };
  const waterColor = new THREE.Color();
  const shallow = new THREE.Color(0x126575);
  const deep = new THREE.Color(0x052737);
  const sunlight = new THREE.Color(0xffefd5);

  const surfaceMaterial = new THREE.ShaderMaterial({
    uniforms: { oceanTime: time }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `
      uniform float oceanTime;
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        p.z += sin(p.x * .10 + oceanTime * .55) * .22 + cos(p.y * .13 - oceanTime * .4) * .16;
        vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }`,
    fragmentShader: `
      uniform float oceanTime;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz;
        vec3 n = normalize(vec3(cos(p.x * .10 + oceanTime * .55) * .14,
          1.0, sin(p.y * .13 - oceanTime * .4) * .12));
        vec3 eye = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - abs(dot(n, eye)), 3.0);
        float glint = pow(max(0.0, dot(reflect(-normalize(vec3(-.3, 1.0, .25)), n), eye)), 70.0);
        float ripple = pow(max(0.0, sin(p.x * .32 + sin(p.y * .27 + oceanTime * .3))
          * cos(p.y * .38 - oceanTime * .24)), 8.0);
        float fade = exp(-length(cameraPosition - vWorld) * .012);
        gl_FragColor = vec4(mix(vec3(.10, .40, .46), vec3(.44, .77, .78), fresnel)
          + vec3(.45, .55, .50) * (glint + ripple * .4), (.23 + fresnel * .42) * fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(800, 800, 80, 80), surfaceMaterial);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 20;
  surface.name = 'Animated water surface';
  group.add(surface);

  // Nine soft ribbons in one draw call. An inexpensive approximation, not volumetric ray marching.
  const shaftPositions = [], shaftUVs = [];
  for (let i = 0; i < 9; i++) {
    const x = (random() - .5) * 82, z = (random() - .5) * 66;
    const w = 1.3 + random() * 2.4;
    const corners = [[x-w,20,z],[x+w,20,z],[x+12+w*3,-17,z-8],[x+12-w*3,-17,z-8]];
    const uv = [[0,1],[1,1],[1,0],[0,0]];
    for (const k of [0,1,2,0,2,3]) { shaftPositions.push(...corners[k]); shaftUVs.push(...uv[k]); }
  }
  const shaftsGeometry = new THREE.BufferGeometry();
  shaftsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shaftPositions, 3));
  shaftsGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(shaftUVs, 2));
  const shafts = new THREE.Mesh(shaftsGeometry, new THREE.ShaderMaterial({
    uniforms: { oceanTime: time }, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; varying float vDistance;
      void main(){ vUv=uv; vec4 p=modelViewMatrix*vec4(position,1.0);
        vDistance=length(p.xyz); gl_Position=projectionMatrix*p; }`,
    fragmentShader: `uniform float oceanTime; varying vec2 vUv; varying float vDistance;
      void main(){ float edge=pow(max(0.0,sin(vUv.x*3.14159265)),3.0);
        float ends=smoothstep(0.0,.26,vUv.y)*(1.0-smoothstep(.90,1.0,vUv.y));
        float drift=.82+.18*sin(oceanTime*.35+vUv.y*5.0);
        float fade=exp(-vDistance*.025)*smoothstep(1.0,5.0,vDistance);
        gl_FragColor=vec4(.33,.68,.73,edge*ends*drift*fade*.095);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  group.add(shafts);

  const positions = new Float32Array(520 * 3);
  for (let i = 0; i < positions.length; i++) positions[i] = random();
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointRatio = { value: 1 };
  const dust = new THREE.Points(dustGeometry, new THREE.ShaderMaterial({
    uniforms: { oceanTime: time, pointRatio }, transparent: true, depthWrite: false,
    vertexShader: `uniform float oceanTime; uniform float pointRatio; varying float vFade;
      void main(){
        vec3 p=mod(position*vec3(72.0,44.0,72.0)+vec3(oceanTime*.10,oceanTime*.045,0.0)
          -cameraPosition,vec3(72.0,44.0,72.0))+cameraPosition-vec3(36.0,22.0,36.0);
        vec4 view=modelViewMatrix*vec4(p,1.0);
        float dist=length(view.xyz);
        vFade=(1.0-smoothstep(22.0,35.0,dist))*smoothstep(.8,3.0,dist)
          *(1.0-smoothstep(18.0,20.0,p.y));
        gl_PointSize=clamp(20.0/max(1.0,-view.z),1.0,3.5)*pointRatio;
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader: `varying float vFade;
      void main(){ float r=length(gl_PointCoord-.5)*2.0;
        float alpha=(1.0-smoothstep(.1,1.0,r))*vFade*.32;
        if(alpha<.005) discard;
        gl_FragColor=vec4(.66,.86,.84,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  dust.frustumCulled = false; // The GPU wraps particles around the camera.
  group.add(dust);

  function setQuality(value) {
    quality = Object.hasOwn(QUALITY, value) ? value : 'medium';
    const settings = QUALITY[quality];
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, settings.pixelRatio));
    pointRatio.value = renderer.getPixelRatio();
    dustGeometry.setDrawRange(0, settings.particles);
    shaftsGeometry.setDrawRange(0, settings.shafts * 6);
  }

  function update(t, { editor = false, inspect = false } = {}) {
    time.value = t;
    const active = enabled && !editor && !inspect;
    group.visible = active;
    uniforms.oceanStrength.value = active ? QUALITY[quality].caustics : 0;
    renderer.toneMapping = active ? THREE.ACESFilmicToneMapping : original.toneMapping;
    renderer.toneMappingExposure = active ? 1.12 : original.exposure;
    sun.color.copy(active ? sunlight : original.sun);
    sun.intensity = active ? 2.65 : original.sunIntensity;
    ambient.intensity = active ? 1.15 : original.ambientIntensity;
    ambient.color.copy(active ? shallow : original.ambientColor);
    ambient.groundColor.copy(active ? deep : original.groundColor);
    glow.intensity = active ? 3 : original.glowIntensity;
    if (editor || inspect) return;
    if (active) {
      const depth = THREE.MathUtils.clamp((20 - camera.position.y) / 52, 0, 1);
      waterColor.copy(shallow).lerp(deep, depth);
      scene.background.copy(waterColor);
      if (scene.fog) { scene.fog.color.copy(waterColor); scene.fog.density = .029 + depth * .012; }
    } else {
      scene.background.copy(original.background);
      if (scene.fog) { scene.fog.color.copy(original.background); scene.fog.density = .035; }
    }
  }
  setQuality(quality);
  return { uniforms, update, setQuality, setEnabled(value) { enabled = Boolean(value); },
    get enabled() { return enabled; }, get quality() { return quality; } };
}
