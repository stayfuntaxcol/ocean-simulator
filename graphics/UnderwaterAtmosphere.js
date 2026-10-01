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

const DEFAULT_WEATHER = Object.freeze({
  daylight: 1, moonlight: 0, twilight: 0, sunriseWarmth: 0, sunsetWarmth: 0,
  horizonGlow: 0, nightFactor: 0, elevation: 1, sunX: 0, sunY: 1, moonX: 0, moonY: -1,
  cloudCover: .08, cloudDensity: .22, wind: .3, waveHeight: .55, waveSpeed: .82,
  waveChoppiness: .2, caustics: 1, visibility: 1, fishDepthBias: 0,
  storminess: 0, lightningFlash: 0,
});

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
  const nightShallow = new THREE.Color(0x00050d), nightDeep = new THREE.Color(0x000106);
  const dawnWater = new THREE.Color(0x49385f), sunriseWater = new THREE.Color(0x9a5738);
  const sunsetWater = new THREE.Color(0x6d2f3d), stormWater = new THREE.Color(0x101b24);
  const sunlight = new THREE.Color(), moonColor = new THREE.Color(0x87a9cf);
  const noonLight = new THREE.Color(0xfff0d2), sunriseLight = new THREE.Color(0xffc36a);
  const sunsetLight = new THREE.Color(0xff704d), duskLight = new THREE.Color(0x9e6bb7);

  const surfaceUniforms = {
    oceanTime: time, waveHeight: { value: .55 }, waveSpeed: { value: .82 },
    waveChoppiness: { value: .2 }, storminess: { value: 0 }, surfaceLight: { value: 1 },
    sunriseWarmth: { value: 0 }, sunsetWarmth: { value: 0 }, twilight: { value: 0 },
  };
  const surfaceMaterial = new THREE.ShaderMaterial({
    uniforms: surfaceUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `uniform float oceanTime;uniform float waveHeight;uniform float waveSpeed;uniform float waveChoppiness;uniform float storminess;
      varying vec3 vWorld;void main(){vec3 p=position;float t=oceanTime*waveSpeed;
        float wave=sin(p.x*.10+t*.55)*.22+cos(p.y*.13-t*.4)*.16;
        wave+=sin((p.x+p.y)*.22-t*.92)*(.06+.16*waveChoppiness);
        wave+=cos((p.x*1.7-p.y)*.31+t*1.35)*.11*waveChoppiness;
        wave+=sin((p.x-p.y*1.9)*.47-t*1.8)*.08*storminess;
        p.z+=wave*waveHeight/.55;
        vWorld=(modelMatrix*vec4(p,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
    fragmentShader: `uniform float oceanTime;uniform float waveHeight;uniform float waveSpeed;uniform float waveChoppiness;uniform float storminess;
      uniform float surfaceLight;uniform float sunriseWarmth;uniform float sunsetWarmth;uniform float twilight;varying vec3 vWorld;void main(){
        vec2 p=vWorld.xz;float t=oceanTime*waveSpeed;
        vec3 n=normalize(vec3(
          cos(p.x*.10+t*.55)*(.11+.12*waveChoppiness)*waveHeight,
          1.0,
          sin(p.y*.13-t*.4)*(.10+.16*waveChoppiness)*waveHeight
        ));
        vec3 eye=normalize(cameraPosition-vWorld);float fresnel=pow(1.0-abs(dot(n,eye)),3.0);
        float glint=pow(max(0.0,dot(reflect(-normalize(vec3(-.3,1.0,.25)),n),eye)),mix(70.0,11.0,max(storminess,waveChoppiness)));
        float ripple=pow(max(0.0,sin(p.x*.32+sin(p.y*.27+t*.3))*cos(p.y*.38-t*.24)),mix(8.0,2.2,max(storminess,waveChoppiness)));
        float fade=exp(-length(cameraPosition-vWorld)*.012);
        vec3 base=mix(vec3(.006,.018,.030),vec3(.10,.40,.46),surfaceLight);
        base=mix(base,vec3(.64,.34,.16),sunriseWarmth*.68);
        base=mix(base,vec3(.66,.17,.13),sunsetWarmth*.78);
        base=mix(base,vec3(.22,.10,.32),twilight*.30);
        vec3 highlight=mix(vec3(.20,.34,.42),vec3(.58,.85,.86),surfaceLight);
        gl_FragColor=vec4(mix(base,highlight,fresnel)+vec3(.55,.52,.42)*(glint+ripple*.45)*surfaceLight,(.22+fresnel*.44)*fade);
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

  const cloudUniforms={
    oceanTime:time,cloudCover:{value:.08},cloudDensity:{value:.22},cloudWind:{value:.3},
    cloudStorm:{value:0},cloudFlash:{value:0},cloudLight:{value:1},
    cloudSunrise:{value:0},cloudSunset:{value:0},
  };
  const cloudDeck=new THREE.Mesh(new THREE.PlaneGeometry(800,800),new THREE.ShaderMaterial({
    uniforms:cloudUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
    fragmentShader:`uniform float oceanTime;uniform float cloudCover;uniform float cloudDensity;uniform float cloudWind;uniform float cloudStorm;uniform float cloudFlash;
      uniform float cloudLight;uniform float cloudSunrise;uniform float cloudSunset;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 drift=vec2(oceanTime*.010*cloudWind,oceanTime*.004*cloudWind);
        vec2 p=vUv*8.0+drift;float n=noise(p)+noise(p*2.07+3.1)*.5+noise(p*4.11-1.7)*.25;n/=1.75;
        float threshold=1.04-cloudCover*.70-cloudDensity*.16;
        float cloud=smoothstep(threshold,threshold+.19,n);
        vec3 day=mix(vec3(.64,.73,.77),vec3(.12,.15,.18),cloudStorm);
        day=mix(day,vec3(.78,.38,.18),cloudSunrise*.48);
        day=mix(day,vec3(.62,.18,.22),cloudSunset*.58);
        vec3 night=vec3(.006,.010,.022);
        vec3 color=mix(night,day,cloudLight)+cloudFlash*.92;
        float alpha=cloud*(.18+cloudCover*.46+cloudDensity*.22);
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>}`,
  }));
  cloudDeck.rotation.x=-Math.PI/2;cloudDeck.position.y=24.5;cloudDeck.name='Weather cloud deck';group.add(cloudDeck);

  const celestialGeometry=new THREE.CircleGeometry(6,32);
  const sunDisc=new THREE.Mesh(celestialGeometry,new THREE.MeshBasicMaterial({color:0xffe8ae,transparent:true,opacity:.92,depthWrite:false,toneMapped:false}));
  sunDisc.name='Sun disc';group.add(sunDisc);
  const sunHalo=new THREE.Mesh(new THREE.CircleGeometry(13,48),new THREE.MeshBasicMaterial({
    color:0xffa24d,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending
  }));
  sunHalo.name='Sunrise sunset halo';group.add(sunHalo);
  const moonDisc=new THREE.Mesh(celestialGeometry,new THREE.MeshBasicMaterial({color:0xcbe5ff,transparent:true,opacity:.70,depthWrite:false,toneMapped:false}));
  moonDisc.name='Full moon';group.add(moonDisc);
  const horizonGlow=new THREE.Mesh(new THREE.PlaneGeometry(220,52),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{glowColor:{value:new THREE.Color(0xff7a45)},glowStrength:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 glowColor;uniform float glowStrength;varying vec2 vUv;void main(){
      float vertical=pow(max(0.0,1.0-abs(vUv.y-.5)*2.0),2.3);
      float horizontal=smoothstep(0.0,.18,vUv.x)*(1.0-smoothstep(.82,1.0,vUv.x));
      gl_FragColor=vec4(glowColor,vertical*horizontal*.34*glowStrength);
    }`
  }));
  horizonGlow.name='Horizon glow';group.add(horizonGlow);
  const lightning=new THREE.PointLight(0xd8edff,0,180,1.5);lightning.name='Lightning flash';group.add(lightning);

  function setQuality(value){
    quality=Object.hasOwn(QUALITY,value)?value:'medium';const settings=QUALITY[quality];
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,settings.pixelRatio));pointRatio.value=renderer.getPixelRatio();
    dustGeometry.setDrawRange(0,settings.particles);shaftsGeometry.setDrawRange(0,settings.shafts*6);
  }

  function update(t,{editor=false,inspect=false,weather=DEFAULT_WEATHER}={}){
    const state={...DEFAULT_WEATHER,...weather};time.value=t;const active=enabled&&!editor&&!inspect;group.visible=active;
    uniforms.oceanWaveSpeed.value=state.waveSpeed;uniforms.oceanTurbulence.value=state.storminess;
    const directDay=state.daylight*(1-state.cloudCover*(.42+.28*(state.cloudDensity||0)));
    const skyLight=THREE.MathUtils.clamp(directDay+state.moonlight+state.lightningFlash*.92,0,1.2);
    const night=THREE.MathUtils.clamp(state.nightFactor??(1-state.daylight),0,1);
    uniforms.oceanStrength.value=active?QUALITY[quality].caustics*state.caustics*skyLight:0;
    renderer.toneMapping=active?THREE.ACESFilmicToneMapping:original.toneMapping;
    renderer.toneMappingExposure=active ? THREE.MathUtils.lerp(.18,.66+skyLight*.50,Math.min(1,state.daylight+state.twilight*.55))+state.lightningFlash*.28 : original.exposure;
    sunlight.copy(moonColor).lerp(noonLight,state.daylight);
    sunlight.lerp(sunriseLight,(state.sunriseWarmth||0)*.88);
    sunlight.lerp(sunsetLight,(state.sunsetWarmth||0)*.94);
    sunlight.lerp(duskLight,state.twilight*.16);
    sun.color.copy(active?sunlight:original.sun);
    sun.intensity=active ? skyLight*2.70+state.lightningFlash*5.2 : original.sunIntensity;
    ambient.intensity=active ? .012+skyLight*.88+state.twilight*.06 : original.ambientIntensity;
    ambient.color.copy(active?nightShallow:original.ambientColor).lerp(shallow,Math.min(1,state.daylight+.12*state.twilight));
    ambient.groundColor.copy(active?nightDeep:original.groundColor).lerp(deep,Math.min(1,state.daylight+.08*state.twilight));
    glow.intensity=active ? .03+skyLight*2.3+state.lightningFlash*11 : original.glowIntensity;
    if(editor||inspect)return;
    if(active){
      const depth=THREE.MathUtils.clamp((20-camera.position.y)/52,0,1);
      const dayShallow=shallow.clone().lerp(stormWater,state.storminess*.76),dayDeep=deep.clone().lerp(stormWater,state.storminess*.44);
      const lightBlend=THREE.MathUtils.clamp(state.daylight+state.twilight*.22+state.moonlight*.5,0,1);
      const currentShallow=nightShallow.clone().lerp(dayShallow,lightBlend);
      const currentDeep=nightDeep.clone().lerp(dayDeep,lightBlend);
      currentShallow.lerp(dawnWater,state.twilight*.20);
      currentShallow.lerp(sunriseWater,(state.sunriseWarmth||0)*.58);
      currentShallow.lerp(sunsetWater,(state.sunsetWarmth||0)*.66);
      currentDeep.lerp(dawnWater,state.twilight*.08);
      currentDeep.lerp(sunsetWater,(state.sunsetWarmth||0)*.20);
      waterColor.copy(currentShallow).lerp(currentDeep,depth);
      if(state.lightningFlash)waterColor.lerp(new THREE.Color(0x91b8c8),state.lightningFlash*.25);
      scene.background.copy(waterColor);
      if(scene.fog){
        scene.fog.color.copy(waterColor);
        scene.fog.density=(.029+depth*.012+night*.014+state.storminess*.010)/Math.max(.28,state.visibility);
      }
      surfaceUniforms.waveHeight.value=state.waveHeight;
      surfaceUniforms.waveSpeed.value=state.waveSpeed;
      surfaceUniforms.waveChoppiness.value=state.waveChoppiness??state.storminess;
      surfaceUniforms.storminess.value=state.storminess;
      surfaceUniforms.surfaceLight.value=skyLight;
      surfaceUniforms.sunriseWarmth.value=state.sunriseWarmth||0;
      surfaceUniforms.sunsetWarmth.value=state.sunsetWarmth||0;
      surfaceUniforms.twilight.value=state.twilight||0;
      shaftStrength.value=state.caustics*skyLight*(1+state.lightningFlash*2.2);
      shaftChaos.value=(state.storminess*1.25+(state.waveChoppiness||0)*.55);
      shaftColor.value.copy(sunlight).lerp(new THREE.Color(0x6fb8c7),.38*(1-state.sunsetWarmth));
      dustLight.value=.05+skyLight*.82;
      cloudUniforms.cloudCover.value=state.cloudCover;
      cloudUniforms.cloudDensity.value=state.cloudDensity||.22;
      cloudUniforms.cloudWind.value=state.wind;
      cloudUniforms.cloudStorm.value=state.storminess;
      cloudUniforms.cloudFlash.value=state.lightningFlash;
      cloudUniforms.cloudLight.value=THREE.MathUtils.clamp(state.daylight+state.twilight*.38+state.moonlight*.3,0,1);
      cloudUniforms.cloudSunrise.value=state.sunriseWarmth||0;
      cloudUniforms.cloudSunset.value=state.sunsetWarmth||0;
      cloudDeck.visible=state.cloudCover>.025;surface.position.x=cloudDeck.position.x=camera.position.x;surface.position.z=cloudDeck.position.z=camera.position.z;
      sun.position.set(state.sunX*78,Math.max(-12,state.elevation*72),-30);
      const celestialY=26+state.elevation*62;
      sunDisc.position.set(camera.position.x+state.sunX*74,celestialY,camera.position.z-67);
      sunHalo.position.copy(sunDisc.position);
      moonDisc.position.set(camera.position.x+(state.moonX??-state.sunX)*70,26+(state.moonY??-state.elevation)*58,camera.position.z-64);
      sunDisc.lookAt(camera.position);sunHalo.lookAt(camera.position);moonDisc.lookAt(camera.position);
      const cloudHide=1-state.cloudCover*.74;
      sunDisc.visible=state.daylight>.015&&state.cloudCover<.985;
      sunDisc.material.opacity=(.20+state.daylight*.78)*Math.max(.08,cloudHide);
      const haloStrength=Math.max(state.sunriseWarmth||0,state.sunsetWarmth||0);
      sunHalo.visible=haloStrength>.01&&state.cloudCover<.995;
      sunHalo.material.opacity=haloStrength*(.52-state.cloudCover*.20);
      sunHalo.material.color.set(state.sunsetWarmth>(state.sunriseWarmth||0)?0xff5f45:0xffb85a);
      moonDisc.visible=night>.30&&state.cloudCover<.94;
      moonDisc.material.opacity=THREE.MathUtils.clamp(.14+night*.44-state.cloudCover*.28,.04,.58);
      horizonGlow.position.set(camera.position.x+(state.sunX||0)*34,21.8,camera.position.z-78);
      horizonGlow.lookAt(camera.position.x,21.5,camera.position.z);
      horizonGlow.material.uniforms.glowStrength.value=haloStrength*(1-state.cloudCover*.45);
      horizonGlow.material.uniforms.glowColor.value.set(state.sunsetWarmth>(state.sunriseWarmth||0)?0xff5a47:0xffb14e);
      horizonGlow.visible=haloStrength>.008;
      lightning.position.set(camera.position.x+15,24,camera.position.z-12);
      lightning.intensity=state.lightningFlash*42;
    }else{
      scene.background.copy(original.background);if(scene.fog){scene.fog.color.copy(original.background);scene.fog.density=.035;}
    }
  }
  setQuality(quality);
  return {uniforms,update,setQuality,setEnabled(value){enabled=Boolean(value);},get enabled(){return enabled;},get quality(){return quality;}};
}
