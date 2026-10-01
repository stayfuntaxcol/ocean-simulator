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
      uniform float oceanWaveSpeed;
      uniform float oceanTurbulence;
      float oceanCaustic(vec2 p) {
        float speed=max(.15,oceanWaveSpeed);
        p+=vec2(sin(p.y*1.8+oceanTime*.32*speed),cos(p.x*1.6-oceanTime*.27*speed))*(.65+oceanTurbulence*.42);
        p+=sin(p.yx*vec2(1.1,1.4)+oceanTime*speed)*oceanTurbulence*.32;
        float a=sin(p.x*2.6+p.y*1.7+oceanTime*.38*speed);
        float b=sin(p.y*3.1-p.x*1.3-oceanTime*.29*speed);
        return pow(max(0.0,1.0-abs(a+b)*(2.5-oceanTurbulence*.45)),3.0);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float oceanDepth=max(0.0,20.0-vOceanWorld.y);
      float oceanUnder=1.0-smoothstep(19.0,20.5,vOceanWorld.y);
      float oceanFace=clamp(dot(normal,normalize(mat3(viewMatrix)*vec3(0.0,1.0,0.0))),0.0,1.0);
      float oceanLight=oceanCaustic(vOceanWorld.xz*.42+vOceanWorld.y*.06);
      outgoingLight += diffuseColor.rgb*vec3(.62,.93,1.0)*oceanLight*oceanFace*exp(-oceanDepth*.018)*oceanStrength*oceanUnder;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'ocean-caustics-v2';
  return material;
}

const DEFAULT_WEATHER = Object.freeze({ daylight: 1, moonlight: 0, sunsetWarmth: 0,
  elevation: 1, sunX: 0, cloudCover: .08, wind: .3, waveHeight: .55, waveSpeed: .82,
  caustics: 1, visibility: 1, fishDepthBias: 0, storminess: 0, lightningFlash: 0 });

export function createUnderwaterAtmosphere({ scene, renderer, camera, sun, ambient, glow }) {
  const group = new THREE.Group();
  group.name = 'Underwater atmosphere';
  scene.add(group);
  const uniforms = { oceanTime: { value: 0 }, oceanStrength: { value: .3 },
    oceanWaveSpeed: { value: 1 }, oceanTurbulence: { value: 0 } };
  const time = uniforms.oceanTime;
  const random = seededRandom(611);
  let quality = 'medium', enabled = true;
  const original = { background: scene.background.clone(), sun: sun.color.clone(),
    sunIntensity: sun.intensity, ambientIntensity: ambient.intensity,
    ambientColor: ambient.color.clone(), groundColor: ambient.groundColor.clone(),
    glowIntensity: glow.intensity, toneMapping: renderer.toneMapping,
    exposure: renderer.toneMappingExposure };
  const waterColor = new THREE.Color();
  const shallow = new THREE.Color(0x126575), deep = new THREE.Color(0x052737);
  const nightShallow = new THREE.Color(0x031828), nightDeep = new THREE.Color(0x010914);
  const duskWater = new THREE.Color(0x5a4650), stormWater = new THREE.Color(0x142a33);
  const sunlight = new THREE.Color(), moonColor = new THREE.Color(0x9fc7e7);
  const noonLight = new THREE.Color(0xffefd5), sunsetLight = new THREE.Color(0xff9d62);

  const surfaceUniforms = { oceanTime: time, waveHeight: { value: .55 }, waveSpeed: { value: .82 },
    storminess: { value: 0 }, surfaceLight: { value: 1 }, sunsetWarmth: { value: 0 } };
  const surfaceMaterial = new THREE.ShaderMaterial({
    uniforms: surfaceUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `uniform float oceanTime;uniform float waveHeight;uniform float waveSpeed;uniform float storminess;
      varying vec3 vWorld;void main(){vec3 p=position;float t=oceanTime*waveSpeed;
        float wave=sin(p.x*.10+t*.55)*.22+cos(p.y*.13-t*.4)*.16;
        wave+=sin((p.x+p.y)*.22-t*.92)*.10*storminess;p.z+=wave*waveHeight/.55;
        vWorld=(modelMatrix*vec4(p,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
    fragmentShader: `uniform float oceanTime;uniform float waveHeight;uniform float waveSpeed;uniform float storminess;
      uniform float surfaceLight;uniform float sunsetWarmth;varying vec3 vWorld;void main(){
        vec2 p=vWorld.xz;float t=oceanTime*waveSpeed;
        vec3 n=normalize(vec3(cos(p.x*.10+t*.55)*.14*waveHeight,1.0,sin(p.y*.13-t*.4)*.12*waveHeight));
        vec3 eye=normalize(cameraPosition-vWorld);float fresnel=pow(1.0-abs(dot(n,eye)),3.0);
        float glint=pow(max(0.0,dot(reflect(-normalize(vec3(-.3,1.0,.25)),n),eye)),mix(70.0,20.0,storminess));
        float ripple=pow(max(0.0,sin(p.x*.32+sin(p.y*.27+t*.3))*cos(p.y*.38-t*.24)),mix(8.0,3.0,storminess));
        float fade=exp(-length(cameraPosition-vWorld)*.012);vec3 base=mix(vec3(.045,.16,.22),vec3(.10,.40,.46),surfaceLight);
        base=mix(base,vec3(.44,.25,.20),sunsetWarmth*.42);
        gl_FragColor=vec4(mix(base,vec3(.44,.77,.78)*surfaceLight,fresnel)+vec3(.45,.55,.50)*(glint+ripple*.4)*surfaceLight,(.23+fresnel*.42)*fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>}`,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(800, 800, 80, 80), surfaceMaterial);
  surface.rotation.x = -Math.PI / 2; surface.position.y = 20; surface.name = 'Animated water surface';
  group.add(surface);

  const shaftPositions = [], shaftUVs = [];
  for (let i = 0; i < 9; i++) {
    const x=(random()-.5)*82,z=(random()-.5)*66,w=1.3+random()*2.4;
    const corners=[[x-w,20,z],[x+w,20,z],[x+12+w*3,-17,z-8],[x+12-w*3,-17,z-8]],uv=[[0,1],[1,1],[1,0],[0,0]];
    for(const k of [0,1,2,0,2,3]){shaftPositions.push(...corners[k]);shaftUVs.push(...uv[k]);}
  }
  const shaftsGeometry = new THREE.BufferGeometry();
  shaftsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(shaftPositions,3));
  shaftsGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(shaftUVs,2));
  const shaftStrength={value:1},shaftChaos={value:0},shaftColor={value:new THREE.Color(0x54adb9)};
  const shafts = new THREE.Mesh(shaftsGeometry,new THREE.ShaderMaterial({
    uniforms:{oceanTime:time,shaftStrength,shaftChaos,shaftColor},transparent:true,depthWrite:false,
    side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float oceanTime;uniform float shaftChaos;varying vec2 vUv;varying float vDistance;
      void main(){vUv=uv;vec3 p=position;p.x+=sin(oceanTime*(.35+shaftChaos)+p.y*.16)*shaftChaos*2.2;
        vec4 view=modelViewMatrix*vec4(p,1.0);vDistance=length(view.xyz);gl_Position=projectionMatrix*view;}`,
    fragmentShader:`uniform float oceanTime;uniform float shaftStrength;uniform float shaftChaos;uniform vec3 shaftColor;
      varying vec2 vUv;varying float vDistance;void main(){float edge=pow(max(0.0,sin(vUv.x*3.14159265)),3.0);
        float ends=smoothstep(0.0,.26,vUv.y)*(1.0-smoothstep(.90,1.0,vUv.y));
        float drift=.82+.18*sin(oceanTime*(.35+shaftChaos*.8)+vUv.y*(5.0+shaftChaos*3.0));
        float fade=exp(-vDistance*.025)*smoothstep(1.0,5.0,vDistance);
        gl_FragColor=vec4(shaftColor,edge*ends*drift*fade*.095*shaftStrength);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>}`,
  }));
  group.add(shafts);

  const positions=new Float32Array(520*3);for(let i=0;i<positions.length;i++)positions[i]=random();
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const pointRatio={value:1},dustLight={value:1};
  const dust=new THREE.Points(dustGeometry,new THREE.ShaderMaterial({
    uniforms:{oceanTime:time,pointRatio,dustLight},transparent:true,depthWrite:false,
    vertexShader:`uniform float oceanTime;uniform float pointRatio;varying float vFade;void main(){
      vec3 p=mod(position*vec3(72.0,44.0,72.0)+vec3(oceanTime*.10,oceanTime*.045,0.0)-cameraPosition,vec3(72.0,44.0,72.0))+cameraPosition-vec3(36.0,22.0,36.0);
      vec4 view=modelViewMatrix*vec4(p,1.0);float dist=length(view.xyz);vFade=(1.0-smoothstep(22.0,35.0,dist))*smoothstep(.8,3.0,dist)*(1.0-smoothstep(18.0,20.0,p.y));
      gl_PointSize=clamp(20.0/max(1.0,-view.z),1.0,3.5)*pointRatio;gl_Position=projectionMatrix*view;}`,
    fragmentShader:`uniform float dustLight;varying float vFade;void main(){float r=length(gl_PointCoord-.5)*2.0;
      float alpha=(1.0-smoothstep(.1,1.0,r))*vFade*.32*dustLight;if(alpha<.005)discard;gl_FragColor=vec4(.66,.86,.84,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>}`,
  }));
  dust.frustumCulled=false;group.add(dust);

  const cloudUniforms={oceanTime:time,cloudCover:{value:.08},cloudWind:{value:.3},cloudStorm:{value:0},cloudFlash:{value:0}};
  const cloudDeck=new THREE.Mesh(new THREE.PlaneGeometry(800,800),new THREE.ShaderMaterial({
    uniforms:cloudUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
    fragmentShader:`uniform float oceanTime;uniform float cloudCover;uniform float cloudWind;uniform float cloudStorm;uniform float cloudFlash;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 p=vUv*8.0+vec2(oceanTime*.010*cloudWind,oceanTime*.004*cloudWind);float n=noise(p)+noise(p*2.07)*.5+noise(p*4.11)*.25;n/=1.75;
      float cloud=smoothstep(1.0-cloudCover*.72,1.02-cloudCover*.43,n);vec3 color=mix(vec3(.68,.77,.78),vec3(.10,.14,.17),cloudStorm)+cloudFlash*.75;
      gl_FragColor=vec4(color,cloud*(.20+cloudCover*.48));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>}`,
  }));
  cloudDeck.rotation.x=-Math.PI/2;cloudDeck.position.y=24.5;cloudDeck.name='Weather cloud deck';group.add(cloudDeck);

  const celestialGeometry=new THREE.CircleGeometry(6,32);
  const sunDisc=new THREE.Mesh(celestialGeometry,new THREE.MeshBasicMaterial({color:0xffe8ae,transparent:true,opacity:.92,depthWrite:false,toneMapped:false}));
  sunDisc.name='Sun disc';group.add(sunDisc);
  const moonDisc=new THREE.Mesh(celestialGeometry,new THREE.MeshBasicMaterial({color:0xcbe5ff,transparent:true,opacity:.70,depthWrite:false,toneMapped:false}));
  moonDisc.name='Full moon';group.add(moonDisc);
  const lightning=new THREE.PointLight(0xd8edff,0,180,1.5);lightning.name='Lightning flash';group.add(lightning);

  function setQuality(value){
    quality=Object.hasOwn(QUALITY,value)?value:'medium';const settings=QUALITY[quality];
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,settings.pixelRatio));pointRatio.value=renderer.getPixelRatio();
    dustGeometry.setDrawRange(0,settings.particles);shaftsGeometry.setDrawRange(0,settings.shafts*6);
  }

  function update(t,{editor=false,inspect=false,weather=DEFAULT_WEATHER}={}){
    const state={...DEFAULT_WEATHER,...weather};time.value=t;const active=enabled&&!editor&&!inspect;group.visible=active;
    uniforms.oceanWaveSpeed.value=state.waveSpeed;uniforms.oceanTurbulence.value=state.storminess;
    const skyLight=THREE.MathUtils.clamp(state.daylight*(1-state.cloudCover*.55)+state.moonlight+state.lightningFlash*.8,.04,1.2);
    uniforms.oceanStrength.value=active?QUALITY[quality].caustics*state.caustics*skyLight:0;
    renderer.toneMapping=active?THREE.ACESFilmicToneMapping:original.toneMapping;
    renderer.toneMappingExposure=active ? .62+skyLight*.50 : original.exposure;
    sunlight.lerpColors(moonColor,noonLight,state.daylight).lerp(sunsetLight,state.sunsetWarmth*.70);
    sun.color.copy(active?sunlight:original.sun);sun.intensity=active ? .18+skyLight*2.47+state.lightningFlash*4 : original.sunIntensity;
    ambient.intensity=active ? .23+skyLight*.92 : original.ambientIntensity;
    ambient.color.copy(active?shallow:original.ambientColor).lerp(nightShallow,active?1-Math.min(1,skyLight):0);
    ambient.groundColor.copy(active?deep:original.groundColor).lerp(nightDeep,active?1-Math.min(1,skyLight):0);
    glow.intensity=active ? .5+skyLight*2.5+state.lightningFlash*9 : original.glowIntensity;
    if(editor||inspect)return;
    if(active){
      const depth=THREE.MathUtils.clamp((20-camera.position.y)/52,0,1);
      const dayShallow=shallow.clone().lerp(stormWater,state.storminess*.7),dayDeep=deep.clone().lerp(stormWater,state.storminess*.35);
      const currentShallow=nightShallow.clone().lerp(dayShallow,Math.min(1,skyLight)),currentDeep=nightDeep.clone().lerp(dayDeep,Math.min(1,skyLight));
      currentShallow.lerp(duskWater,state.sunsetWarmth*.35);waterColor.copy(currentShallow).lerp(currentDeep,depth);
      if(state.lightningFlash)waterColor.lerp(new THREE.Color(0x91b8c8),state.lightningFlash*.25);
      scene.background.copy(waterColor);if(scene.fog){scene.fog.color.copy(waterColor);scene.fog.density=(.029+depth*.012)/state.visibility;}
      surfaceUniforms.waveHeight.value=state.waveHeight;surfaceUniforms.waveSpeed.value=state.waveSpeed;surfaceUniforms.storminess.value=state.storminess;
      surfaceUniforms.surfaceLight.value=skyLight;surfaceUniforms.sunsetWarmth.value=state.sunsetWarmth;
      shaftStrength.value=state.caustics*skyLight*(1+state.lightningFlash*1.8);shaftChaos.value=state.storminess*1.2;
      shaftColor.value.copy(sunlight).lerp(new THREE.Color(0x6fb8c7),.55);dustLight.value=.28+skyLight*.72;
      cloudUniforms.cloudCover.value=state.cloudCover;cloudUniforms.cloudWind.value=state.wind;cloudUniforms.cloudStorm.value=state.storminess;cloudUniforms.cloudFlash.value=state.lightningFlash;
      cloudDeck.visible=state.cloudCover>.025;surface.position.x=cloudDeck.position.x=camera.position.x;surface.position.z=cloudDeck.position.z=camera.position.z;
      sun.position.set(state.sunX*75,Math.max(4,15+state.elevation*70),-30);
      sunDisc.position.set(camera.position.x+state.sunX*72,Math.max(23,27+state.elevation*64),camera.position.z-65);
      moonDisc.position.set(camera.position.x-state.sunX*68,Math.max(25,28-state.elevation*55),camera.position.z-62);
      sunDisc.lookAt(camera.position);moonDisc.lookAt(camera.position);sunDisc.visible=state.daylight>.08&&state.cloudCover<.93;moonDisc.visible=state.daylight<.30&&state.cloudCover<.88;
      sunDisc.material.opacity=(.45+state.daylight*.5)*(1-state.cloudCover*.72);moonDisc.material.opacity=state.moonlight*2.4*(1-state.cloudCover*.65);
      lightning.position.set(camera.position.x+15,24,camera.position.z-12);lightning.intensity=state.lightningFlash*35;
    }else{
      scene.background.copy(original.background);if(scene.fog){scene.fog.color.copy(original.background);scene.fog.density=.035;}
    }
  }
  setQuality(quality);
  return {uniforms,update,setQuality,setEnabled(value){enabled=Boolean(value);},get enabled(){return enabled;},get quality(){return quality;}};
}
