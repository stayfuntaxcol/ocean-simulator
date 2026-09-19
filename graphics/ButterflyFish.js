import * as THREE from 'three';
import {createCartoonCoralAssets} from './CartoonCoralFish.js';
import {createFinMembrane as membrane,addSurfaceRelief} from './FishSurfaceDetail.js';

// An original reef-fish design inspired by butterflyfish. Local +X is the nose.
const PROFILE = [
  [-1.45,.075,.055],[-1.22,.30,.11],[-.85,.83,.25],[-.3,1.02,.34],
  [.25,.91,.32],[.65,.65,.24],[.92,.39,.16],[1.2,.15,.085],[1.48,.065,.055],
];
const outline = new THREE.CatmullRomCurve3(PROFILE.map(p => new THREE.Vector3(...p)));

export function createButterflyBody(rings = 40, sides = 24) {
  const vertices = [], indices = [];
  for (let i = 0; i <= rings; i++) {
    const p = outline.getPoint(i / rings);
    for (let j = 0; j < sides; j++) {
      const a = j / sides * Math.PI * 2;
      vertices.push(p.x, Math.cos(a) * p.y, Math.sin(a) * p.z);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
    const a = i*sides+j, b = i*sides+(j+1)%sides, c = a+sides, d = b+sides;
    indices.push(a,b,c,b,d,c);
  }
  const back = vertices.length/3;
  vertices.push(PROFILE[0][0],0,0);
  const front = vertices.length/3;
  vertices.push(PROFILE.at(-1)[0],0,0);
  for (let j=0;j<sides;j++) {
    const k=(j+1)%sides;
    indices.push(back,k,j,front,rings*sides+j,rings*sides+k);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius += .3; // Room for vertex-shader swimming.
  return geometry;
}

export function swimOffset(x, phase, amplitude) {
  const u = THREE.MathUtils.clamp((1.48-x)/2.93,0,1);
  return amplitude*u*u*Math.sin(phase+x*1.6);
}

function skinMaterial(uniforms) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .43, metalness: 0 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vFishLocal;
      uniform float swimPhase; uniform float swimAmplitude;
      float fishBend(float x) {
        float u=clamp((1.48-x)/2.93,0.0,1.0);
        return swimAmplitude*u*u*sin(swimPhase+x*1.6);
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      #include <beginnormal_vertex>
      float bendSlope=(fishBend(position.x+.001)-fishBend(position.x-.001))/.002;
      objectNormal.x -= bendSlope*objectNormal.z;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vFishLocal=position;
      transformed.z+=fishBend(position.x);
    `);
    shader.fragmentShader = `varying vec3 vFishLocal;
      float fishScale(vec3 p) {
        vec2 grid=p.xy*vec2(55.0,72.0);
        grid.x+=mod(floor(grid.y),2.0)*.5;
        vec2 cell=fract(grid)-.5;
        float edge=smoothstep(.31,.49,length(cell*vec2(.86,1.08)));
        float aa=1.0-smoothstep(.4,1.3,length(fwidth(grid)));
        return edge*aa;
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p=vFishLocal;
      vec3 skin=mix(vec3(.87,.64,.065),vec3(.91,.87,.66),smoothstep(-.6,.35,p.x)*.78);
      float lines=pow(.5+.5*cos((p.x*.75+p.y)*32.0),8.0);
      lines*=1.0-smoothstep(.35,1.8,fwidth((p.x*.75+p.y)*32.0));
      skin*=1.0-lines*.14;
      float mask=1.0-smoothstep(.085,.155,abs(p.x-.85+p.y*.20));
      skin=mix(skin,vec3(.012,.018,.023),mask);
      float spot=length((p.xy-vec2(-.82,.45))*vec2(1.0,1.12));
      skin=mix(skin,vec3(.95,.66,.055),1.0-smoothstep(.19,.24,spot));
      skin=mix(skin,vec3(.012,.027,.035),1.0-smoothstep(.135,.17,spot));
      float gill=exp(-pow((p.x-.47+p.y*.24+p.y*p.y*.24)*65.0,2.0));
      skin*=1.0-gill*.32*smoothstep(.1,.22,abs(p.z));
      float belly=smoothstep(-.95,-.25,p.y);
      skin=mix(skin*vec3(.8,.88,.96),skin,belly);
      float scaleDetail=fishScale(p);
      float scaleZone=1.0-smoothstep(.65,1.08,p.x);
      skin*=1.0-scaleDetail*.11*scaleZone;
      skin*=.97+.06*fishNoise(p*92.0);
      diffuseColor.rgb=skin;
    `);
    addSurfaceRelief(shader,'-fishScale(vFishLocal)*(1.0-smoothstep(.65,1.08,vFishLocal.x))',
      'fishScale(vFishLocal)*.11+(fishNoise(vFishLocal*92.0)-.5)*.055',.0013);
  };
  material.customProgramCacheKey=()=>'butterfly-skin-v3';
  return material;
}

function finMaterial(swim = null) {
  const material = new THREE.MeshStandardMaterial({ color: 0xf3c441, roughness: .46,
    transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    if(swim) {
      Object.assign(shader.uniforms,swim);
      shader.vertexShader=`uniform float swimPhase; uniform float swimAmplitude; uniform float finPhase;
        float finBend(float x) {
          float u=clamp((1.48-x)/2.93,0.0,1.0);
          return swimAmplitude*u*u*sin(swimPhase+x*1.6);
        }
      `+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`
        #include <beginnormal_vertex>
        objectNormal.x -= (finBend(position.x+.001)-finBend(position.x-.001))/.002*objectNormal.z;
      `).replace('#include <begin_vertex>',`
        #include <begin_vertex>
        transformed.z+=finBend(position.x)+sin(finPhase+uv.y*7.0)*uv.x*.010;
      `);
    }
    shader.vertexShader='varying vec2 vFin;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvFin=uv;');
    shader.fragmentShader='varying vec2 vFin;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float rays=pow(.5+.5*cos(vFin.y*100.53),10.0);
      rays*=1.0-smoothstep(.4,2.0,fwidth(vFin.y*100.53));
      diffuseColor.rgb*=1.0-rays*.30;
      float edgeBand=smoothstep(.76,.83,vFin.x)*(1.0-smoothstep(.89,.96,vFin.x));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.13,.047),edgeBand*.65);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.94,.89,.71),smoothstep(.95,1.0,vFin.x)*.80);
      diffuseColor.a*=mix(1.0,.45,vFin.x);
    `);
    addSurfaceRelief(shader,'cos(vFin.y*100.53)*(1.0-smoothstep(.4,2.0,fwidth(vFin.y*100.53)))','-.10*vFin.x',.00045);
  };
  material.customProgramCacheKey=()=>swim?'butterfly-fin-swim-v3':'butterfly-fin-v3';
  return material;
}

export function createButterflyLibrary() {
  const cartoonAssets=createCartoonCoralAssets();
  const bodyNear=createButterflyBody(),bodyFar=createButterflyBody(20,12);
  const fin=finMaterial();
  const tailGeometry=membrane([[0,.06,0],[0,0,0],[0,-.06,0]],
    [[-.65,.48,0],[-.82,.34,0],[-.69,0,0],[-.82,-.34,0],[-.65,-.48,0]]);
  const dorsalGeometry=membrane([[-1.18,.32,0],[-.8,.84,0],[-.3,1.015,0],[.25,.91,0]],
    [[-1.24,.40,0],[-.94,1.1,0],[-.45,1.37,0],[.25,.91,0]]);
  const analGeometry=membrane([[-1.18,-.32,0],[-.8,-.84,0],[-.3,-1.015,0],[.25,-.91,0]],
    [[-1.28,-.42,0],[-.94,-1.14,0],[-.45,-1.25,0],[.25,-.91,0]]);
  const pectoralGeometry=membrane([[0,.015,0],[0,0,0],[0,-.015,0]],
    [[-.36,.30,0],[-.65,.02,0],[-.45,-.32,0]],12);
  const irisGeometry=new THREE.SphereGeometry(.115,12,8);
  const pupilGeometry=new THREE.SphereGeometry(.080,12,8);
  const eyeGeometry=new THREE.SphereGeometry(.125,20,14);
  const eyeMaterial=new THREE.MeshStandardMaterial({color:0x51462b,roughness:.3});
  const irisMaterial=new THREE.MeshStandardMaterial({color:0xb89848,roughness:.24,metalness:0});
  irisMaterial.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vIris;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIris=position/.115;');
    s.fragmentShader='varying vec3 vIris;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float angle=atan(vIris.y,vIris.x);
      float streak=pow(.5+.5*sin(angle*47.0+length(vIris.xy)*10.0),4.0);
      streak*=1.0-smoothstep(.4,2.0,fwidth(angle*47.0));
      diffuseColor.rgb*=.55+streak*.45;
      diffuseColor.rgb*=mix(1.0,.4,smoothstep(.78,1.0,length(vIris.xy)));
    `);
  };
  irisMaterial.customProgramCacheKey=()=>'butterfly-radial-iris-v2';
  const pupilMaterial=new THREE.MeshStandardMaterial({color:0x050b10,roughness:.12,metalness:.02});
  const mouthGeometry=new THREE.TorusGeometry(.055,.014,6,12);
  const mouthMaterial=new THREE.MeshStandardMaterial({color:0x685033,roughness:.6});
  const members=new Map();

  function attach(fish) {
    if(disposed)throw Error('Butterfly library disposed');
    if(members.has(fish))return members.get(fish);
    const basic=new THREE.Group(); basic.name='Original fish';
    for(const child of [...fish.children]) basic.add(child);
    fish.add(basic);
    const detailed=new THREE.Group(); detailed.name='Koraalvlindervis'; fish.add(detailed);
    const uniforms={swimPhase:{value:0},swimAmplitude:{value:0},finPhase:{value:0}};
    const body=new THREE.Mesh(bodyNear,skinMaterial(uniforms)); body.name='Body'; detailed.add(body);
    const tail=new THREE.Mesh(tailGeometry,fin); tail.name='Caudal fin'; tail.position.x=-1.45; detailed.add(tail);
    const bodyFin=finMaterial(uniforms);
    const dorsal=new THREE.Mesh(dorsalGeometry,bodyFin); dorsal.name='Dorsal fin'; detailed.add(dorsal);
    const anal=new THREE.Mesh(analGeometry,bodyFin); anal.name='Anal fin'; detailed.add(anal);
    const pectorals=[], eyes=[];
    for(const side of [-1,1]) {
      const pectoral=new THREE.Mesh(pectoralGeometry,fin);
      pectoral.position.set(.38,-.12,side*.29); detailed.add(pectoral); pectorals.push(pectoral);
      const orbit=new THREE.Mesh(eyeGeometry,eyeMaterial);orbit.name='Butterfly eye orbit';
      orbit.position.set(.81,.20,side*.178);orbit.scale.z=.48;detailed.add(orbit);eyes.push(orbit);
      const iris=new THREE.Mesh(irisGeometry,irisMaterial);iris.name='Butterfly iris';
      iris.position.set(.81,.20,side*.22); iris.scale.set(.86,.86,.24); detailed.add(iris); eyes.push(iris);
      const pupil=new THREE.Mesh(pupilGeometry,pupilMaterial);
      pupil.name='Butterfly pupil';pupil.position.set(.82,.20,side*.244); pupil.scale.set(.68,.76,.16); detailed.add(pupil); eyes.push(pupil);
      const nostril=new THREE.Mesh(pupilGeometry,mouthMaterial);nostril.name='Butterfly nostril';
      nostril.position.set(1.18,.085,side*.070);nostril.scale.set(.17,.13,.10);detailed.add(nostril);eyes.push(nostril);
    }
    const mouth=new THREE.Mesh(mouthGeometry,mouthMaterial);
    mouth.position.x=1.49; mouth.rotation.y=Math.PI/2; detailed.add(mouth);
    fish.userData.visualSpecies='Koraalvlindervis';
    const cartoon=cartoonAssets.create(fish);
    const rest=new Map([...eyes,mouth,...pectorals].map(o=>[o,o.position.clone()]));
    const member={basic,detailed,body,tail,dorsal,anal,pectorals,eyes,mouth,uniforms,cartoon,rest};
    members.set(fish,member);
    basic.visible=false;
    return member;
  }

  function update(time,camera,quality,enabled=true,style='realistic') {
    const limit=quality==='low'?14:quality==='high'?38:24;
    for(const [fish,m] of members) {
      if(!fish.parent) { m.body.material.dispose(); m.dorsal.material.dispose(); members.delete(fish); continue; }
      const cartoon=enabled&&style==='cartoon';
      m.basic.visible=!enabled; m.detailed.visible=enabled&&!cartoon;m.cartoon.group.visible=cartoon;
      if(!enabled || !fish.visible || fish.userData.dead) continue;
      const near=fish.position.distanceToSquared(camera.position)<limit*limit;
      m.body.geometry=near?bodyNear:bodyFar;
      for(const eye of m.eyes) eye.visible=near;
      m.mouth.visible=near;
      const speed=THREE.MathUtils.clamp(fish.userData.motionSpeed??fish.userData.velocity?.length()??0,0,3);
      const phase=fish.userData.swimPhase??time*speed*4+(fish.userData.phase||0);
      const finPhase=fish.userData.finPhase??time*6+(fish.userData.phase||0);
      const effort=THREE.MathUtils.smoothstep(speed,0,1.8),amplitude=effort*.14;
      if(cartoon){
        m.cartoon.tail.rotation.y=Math.sin(phase)*.38*effort;
        m.cartoon.dorsal.rotation.x=Math.sin(finPhase*.55)*.045;
        m.cartoon.pectorals.forEach((p,i)=>p.rotation.y=(i?1:-1)*(.35+Math.sin(finPhase+i*.15)*.25));
        continue;
      }
      m.uniforms.swimPhase.value=phase;m.uniforms.finPhase.value=finPhase;m.uniforms.swimAmplitude.value=amplitude;
      for(const [part,p]of m.rest){part.position.copy(p);part.position.z+=swimOffset(p.x,phase,amplitude);}
      m.tail.position.z=swimOffset(-1.45,phase,amplitude);
      const slope=(swimOffset(-1.449,phase,amplitude)-swimOffset(-1.451,phase,amplitude))/.002;
      m.tail.rotation.y=-Math.atan(slope)+Math.sin(phase-2.3)*.09*effort;
      m.dorsal.rotation.x=0;m.anal.rotation.x=0;
      m.pectorals.forEach((p,i)=>{
        p.visible=near;
        p.rotation.y=(i===0?-1:1)*(.38+Math.sin(finPhase+i*.15)*(.19+effort*.10));
      });
    }
  }
  let disposed=false;
  function dispose(){if(disposed)return;disposed=true;for(const [fish,m] of members){m.body.material.dispose();m.dorsal.material.dispose();fish.remove(m.detailed,m.cartoon.group);for(const child of [...m.basic.children])fish.add(child);fish.remove(m.basic);delete fish.userData.visualSpecies;}members.clear();cartoonAssets.dispose();for(const g of [bodyNear,bodyFar,tailGeometry,dorsalGeometry,analGeometry,pectoralGeometry,irisGeometry,pupilGeometry,eyeGeometry,mouthGeometry])g.dispose();for(const m of [fin,irisMaterial,pupilMaterial,eyeMaterial,mouthMaterial])m.dispose();}
  return {attach,update,dispose,get size(){return members.size;}};
}
