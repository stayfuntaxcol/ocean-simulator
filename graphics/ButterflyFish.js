import * as THREE from 'three';

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
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .42, metalness: .06 });
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
    shader.fragmentShader = 'varying vec3 vFishLocal;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p=vFishLocal;
      vec3 skin=mix(vec3(.85,.66,.10),vec3(.94,.91,.72),smoothstep(-.5,.4,p.x)*.65);
      float lines=pow(.5+.5*cos((p.x*.75+p.y)*32.0),8.0);
      lines*=1.0-smoothstep(.35,1.8,fwidth((p.x*.75+p.y)*32.0));
      skin*=1.0-lines*.14;
      float mask=1.0-smoothstep(.085,.155,abs(p.x-.85+p.y*.20));
      skin=mix(skin,vec3(.012,.018,.023),mask);
      float spot=length((p.xy-vec2(-.82,.45))*vec2(1.0,1.12));
      skin=mix(skin,vec3(.95,.66,.055),1.0-smoothstep(.19,.24,spot));
      skin=mix(skin,vec3(.012,.027,.035),1.0-smoothstep(.135,.17,spot));
      float gill=exp(-pow((p.x-.48+p.y*.22)*38.0,2.0));
      skin*=1.0-gill*.32*smoothstep(.1,.22,abs(p.z));
      float belly=smoothstep(-.95,-.25,p.y);
      skin=mix(skin*vec3(.8,.88,.96),skin,belly);
      diffuseColor.rgb=skin;
    `);
  };
  material.customProgramCacheKey=()=>'butterfly-skin-v1';
  return material;
}

function finMaterial(swim = null) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffcc39, roughness: .55,
    transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    if(swim) {
      Object.assign(shader.uniforms,swim);
      shader.vertexShader=`uniform float swimPhase; uniform float swimAmplitude;
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
        transformed.z+=finBend(position.x);
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
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.91,.77),smoothstep(.88,1.0,vFin.x)*.65);
      diffuseColor.a*=mix(1.0,.45,vFin.x);
    `);
  };
  material.customProgramCacheKey=()=>swim?'butterfly-fin-swim-v1':'butterfly-fin-v1';
  return material;
}

function membrane(inner, outer, segments = 20) {
  const a = new THREE.CatmullRomCurve3(inner.map(p=>new THREE.Vector3(...p)));
  const b = new THREE.CatmullRomCurve3(outer.map(p=>new THREE.Vector3(...p)));
  const positions=[],uvs=[],indices=[];
  for(let i=0;i<=segments;i++) {
    const u=i/segments, start=a.getPoint(u), end=b.getPoint(u);
    for(let j=0;j<=4;j++) {
      const v=j/4, p=start.clone().lerp(end,v);
      p.z+=Math.sin(v*Math.PI)*.025;
      positions.push(...p.toArray()); uvs.push(v,u);
    }
  }
  for(let i=0;i<segments;i++) for(let j=0;j<4;j++) {
    const k=i*5+j; indices.push(k,k+1,k+5,k+1,k+6,k+5);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createButterflyLibrary() {
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
  const irisMaterial=new THREE.MeshStandardMaterial({color:0xb89848,roughness:.32,metalness:.2});
  const pupilMaterial=new THREE.MeshStandardMaterial({color:0x050b10,roughness:.12,metalness:.02});
  const mouthGeometry=new THREE.TorusGeometry(.055,.014,6,12);
  const mouthMaterial=new THREE.MeshStandardMaterial({color:0x685033,roughness:.6});
  const members=new Map();

  function attach(fish) {
    const basic=new THREE.Group(); basic.name='Original fish';
    for(const child of [...fish.children]) basic.add(child);
    fish.add(basic);
    const detailed=new THREE.Group(); detailed.name='Koraalvlindervis'; fish.add(detailed);
    const uniforms={swimPhase:{value:0},swimAmplitude:{value:.15}};
    const body=new THREE.Mesh(bodyNear,skinMaterial(uniforms)); body.name='Body'; detailed.add(body);
    const tail=new THREE.Mesh(tailGeometry,fin); tail.name='Caudal fin'; tail.position.x=-1.45; detailed.add(tail);
    const bodyFin=finMaterial(uniforms);
    const dorsal=new THREE.Mesh(dorsalGeometry,bodyFin); dorsal.name='Dorsal fin'; detailed.add(dorsal);
    const anal=new THREE.Mesh(analGeometry,bodyFin); anal.name='Anal fin'; detailed.add(anal);
    const pectorals=[], eyes=[];
    for(const side of [-1,1]) {
      const pectoral=new THREE.Mesh(pectoralGeometry,fin);
      pectoral.position.set(.38,-.12,side*.29); detailed.add(pectoral); pectorals.push(pectoral);
      const iris=new THREE.Mesh(irisGeometry,irisMaterial);
      iris.position.set(.81,.20,side*.18); iris.scale.z=.48; detailed.add(iris); eyes.push(iris);
      const pupil=new THREE.Mesh(pupilGeometry,pupilMaterial);
      pupil.position.set(.82,.20,side*.224); pupil.scale.z=.30; detailed.add(pupil); eyes.push(pupil);
    }
    const mouth=new THREE.Mesh(mouthGeometry,mouthMaterial);
    mouth.position.x=1.49; mouth.rotation.y=Math.PI/2; detailed.add(mouth);
    fish.userData.visualSpecies='Koraalvlindervis';
    const member={basic,detailed,body,tail,dorsal,anal,pectorals,eyes,mouth,uniforms};
    members.set(fish,member);
    basic.visible=false;
    return member;
  }

  function update(time,camera,quality,enabled=true) {
    const limit=quality==='low'?14:quality==='high'?38:24;
    for(const [fish,m] of members) {
      if(!fish.parent) { m.body.material.dispose(); m.dorsal.material.dispose(); members.delete(fish); continue; }
      m.basic.visible=!enabled; m.detailed.visible=enabled;
      if(!enabled || !fish.visible || fish.userData.dead) continue;
      const near=fish.position.distanceToSquared(camera.position)<limit*limit;
      m.body.geometry=near?bodyNear:bodyFar;
      for(const eye of m.eyes) eye.visible=near;
      m.mouth.visible=near;
      const speed=THREE.MathUtils.clamp(fish.userData.velocity?.length() ?? 1, .2,3);
      // Fixed frequency keeps motion continuous when the fish changes speed.
      const phase=time*5.4+(fish.userData.phase||0), amplitude=.12+speed*.035;
      m.uniforms.swimPhase.value=phase; m.uniforms.swimAmplitude.value=amplitude;
      m.tail.position.z=swimOffset(-1.45,phase,amplitude);
      const slope=(swimOffset(-1.449,phase,amplitude)-swimOffset(-1.451,phase,amplitude))/.002;
      m.tail.rotation.y=-Math.atan(slope)+Math.sin(phase-2.3)*.12;
      m.dorsal.rotation.x=Math.sin(phase*.8)*.035;
      m.anal.rotation.x=-Math.sin(phase*.8)*.03;
      m.pectorals.forEach((p,i)=>{
        p.visible=near;
        p.rotation.y=(i===0?-1:1)*(.38+Math.sin(phase*.75+i*.3)*.30);
      });
    }
  }
  return {attach,update,get size(){return members.size;}};
}
