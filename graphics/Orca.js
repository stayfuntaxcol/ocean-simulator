import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {addSurfaceRelief} from './FishSurfaceDetail.js';

export const ORCA_SCALE=1.65;
export const ORCA_CLEARANCE=4*ORCA_SCALE;
const profile=[[-3,.09,.08],[-2.5,.18,.15],[-1.8,.48,.38],[-.8,.82,.67],
  [.3,.94,.76],[1.2,.78,.62],[1.9,.51,.43],[2.5,.28,.27],[2.85,.08,.08]];

export function createOrcaBody(rings=48,sides=28) {
  const curve=new THREE.CatmullRomCurve3(profile.map(p=>new THREE.Vector3(...p)));
  const positions=[],indices=[];
  for(let i=0;i<=rings;i++) {
    const p=curve.getPoint(i/rings);
    for(let j=0;j<sides;j++) {
      const a=j/sides*Math.PI*2;
      let y=Math.cos(a)*p.y;
      if(p.x>1.18)y=Math.max(y,-.18); // Flat upper palate above the articulated jaw.
      positions.push(p.x,y,Math.sin(a)*p.z);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++) {
    const a=i*sides+j,b=i*sides+(j+1)%sides;
    indices.push(a,b,a+sides,b,b+sides,a+sides);
  }
  const back=positions.length/3; positions.push(-3,0,0);
  const front=positions.length/3; positions.push(2.85,0,0);
  for(let j=0;j<sides;j++) {
    const k=(j+1)%sides;
    indices.push(back,k,j,front,rings*sides+j,rings*sides+k);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.boundingSphere.radius+=.25;
  return geometry;
}

// A rounded mandible with a broad rear attachment and a tapered chin.
export function createOrcaJaw(rings=30,sides=20){
  const curve=new THREE.CatmullRomCurve3([
    [-.24,.25,.20],[0,.59,.60],[.36,.55,.55],[.88,.39,.39],[1.35,.25,.23],[1.65,.045,.07],
  ].map(p=>new THREE.Vector3(...p)));
  const positions=[],indices=[];
  for(let i=0;i<=rings;i++){
    const p=curve.getPoint(i/rings);
    for(let j=0;j<sides;j++){
      const a=j/sides*Math.PI*2,c=Math.cos(a);
      const chinRise=.10*THREE.MathUtils.smoothstep(p.x,1.35,1.65);
      positions.push(p.x,(c>=0?c*.018:c*p.z)+chinRise,Math.sin(a)*p.y);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
    const a=i*sides+j,b=i*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);
  }
  const back=positions.length/3;positions.push(-.24,-.05,0,1.65,-.02,0);
  for(let j=0;j<sides;j++){const k=(j+1)%sides;indices.push(back,k,j,back+1,rings*sides+j,rings*sides+k);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

export function orcaBend(x,phase,amplitude) {
  const u=THREE.MathUtils.clamp((.6-x)/3.6,0,1);
  return amplitude*u*u*Math.sin(phase+x*.85);
}

function extrudedFin(points,depth=.09) {
  const shape=new THREE.Shape();shape.moveTo(...points[0]);
  for(let i=1;i<points.length;i+=3)shape.bezierCurveTo(...points[i],...points[i+1],...points[i+2]);
  shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.025,
    bevelThickness:.025,bevelSegments:2,steps:1,curveSegments:10});
  geometry.translate(0,0,-depth/2);return geometry;
}

function teeth(lower=false) {
  const parts=[];
  for(const side of [-1,1])for(let i=0;i<9;i++) {
    const u=i/8,x=1.35+u*1.28,z=side*(.30-u*.13);
    const geometry=new THREE.ConeGeometry(.037,.13,7);
    if(!lower)geometry.rotateZ(Math.PI);
    geometry.translate(lower?x-1.18:x,lower?.07:-.23,z);parts.push(geometry);
  }
  const result=mergeGeometries(parts);
  for(const p of parts)p.dispose();return result;
}

export function createOrca() {
  const root=new THREE.Group();root.name='Orka';root.scale.setScalar(ORCA_SCALE);
  root.userData={isFishRoot:true,isOrca:true,visualSpecies:'Orka',phase:.6,speed:1.7,
    velocity:new THREE.Vector3(1.7,0,0),health:100};
  const black=new THREE.MeshStandardMaterial({color:0x071219,roughness:.32,metalness:.02});
  const white=new THREE.MeshStandardMaterial({color:0xe8e6cd,roughness:.4});
  const mouthMaterial=new THREE.MeshStandardMaterial({color:0x382124,roughness:.75});
  const toothMaterial=new THREE.MeshStandardMaterial({color:0xf2eed6,roughness:.38});
  const eyeMaterial=new THREE.MeshStandardMaterial({color:0x010305,roughness:.09});
  const uniforms={orcaPhase:{value:0},orcaAmplitude:{value:.17}};
  const skin=black.clone();
  skin.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=`varying vec3 vOrcaLocal;uniform float orcaPhase;uniform float orcaAmplitude;
      float orcaWave(float x){float u=clamp((.6-x)/3.6,0.0,1.0);
        return orcaAmplitude*u*u*sin(orcaPhase+x*.85);}
    `+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`
      #include <beginnormal_vertex>
      objectNormal.x-=(orcaWave(position.x+.001)-orcaWave(position.x-.001))/.002*objectNormal.y;
    `).replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vOrcaLocal=position;transformed.y+=orcaWave(position.x);
    `);
    shader.fragmentShader='varying vec3 vOrcaLocal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 p=vOrcaLocal;
      float belly=1.0-smoothstep(-.38,-.25,p.y+sin(p.x*1.1)*.10);
      belly*=smoothstep(-2.5,-1.5,p.x);
      float eyePatch=1.0-smoothstep(.88,1.05,length((p.xy-vec2(1.17,.39))/vec2(.39,.17)));
      eyePatch*=smoothstep(.26,.40,abs(p.z));
      float saddle=(1.0-smoothstep(.8,1.05,length((p.xz-vec2(-.8,0.0))/vec2(.66,.53))))*smoothstep(.40,.65,p.y);
      float pores=fishNoise(p*31.0);
      float subtleMottle=fishNoise(vec3(p.x*4.0,p.y*7.0,p.z*6.0));
      vec3 coat=mix(vec3(.007,.016,.023),vec3(.13,.19,.22),saddle*.72);
      coat*=.91+subtleMottle*.13;
      diffuseColor.rgb=mix(coat,vec3(.82,.84,.79)*(.96+pores*.07),max(belly,eyePatch));
    `);
    addSurfaceRelief(shader,'(fishNoise(vOrcaLocal*31.0)-.5)*.14',
      '(fishNoise(vOrcaLocal*31.0)-.5)*.10',.0008);
  };
  skin.customProgramCacheKey=()=>'orca-skin-relief-v2';
  const near=createOrcaBody(),far=createOrcaBody(24,16);
  const body=new THREE.Mesh(near,skin);body.name='Body';root.add(body);
  const finSkin=black.clone();
  finSkin.onBeforeCompile=shader=>addSurfaceRelief(shader,
    '(fishNoise(-vViewPosition*24.0)-.5)*.13','(fishNoise(-vViewPosition*24.0)-.5)*.08',.0005);
  finSkin.customProgramCacheKey=()=>'orca-fin-relief-v2';
  const dorsal=new THREE.Mesh(extrudedFin([[.65,.72],[.20,1.25],[.05,2.2],[-.35,2.45],
    [-.28,1.65],[-.43,1.12],[-.95,.70],[-.48,.73],[.18,.72],[.65,.72]]),black);
  dorsal.name='Dorsal fin';root.add(dorsal);
  const flipperGeometry=extrudedFin([[0,0],[-.25,.44],[-.63,1.17],[-1.02,1.19],
    [-1.25,1.02],[-.86,.26],[-.42,.06],[-.22,.02],[-.1,0],[0,0]]);
  flipperGeometry.rotateX(Math.PI/2);
  const pectorals=[];
  for(const side of [-1,1]) {
    const fin=new THREE.Mesh(flipperGeometry,finSkin);fin.name='Pectoral fin';
    fin.position.set(1,-.37,side*.48);fin.scale.z=side;root.add(fin);pectorals.push(fin);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),eyeMaterial);
    eye.position.set(1.79,.14,side*.44);root.add(eye);
  }
  const flukesGeometry=extrudedFin([[0,0],[-.17,.70],[-.38,1.26],[-.65,1.4],
    [-.90,1.18],[-.79,.38],[-.71,.08],[-.84,.035],[-.84,-.035],[-.71,-.08],
    [-.79,-.38],[-.90,-1.18],[-.65,-1.4],[-.38,-1.26],[-.17,-.7],[0,0]],.075);
  flukesGeometry.rotateX(Math.PI/2);
  const flukes=new THREE.Mesh(flukesGeometry,finSkin);flukes.name='Horizontal flukes';flukes.position.x=-3;root.add(flukes);
  const jaw=new THREE.Group();jaw.name='Lower jaw';jaw.position.set(1.18,-.18,0);root.add(jaw);
  const lower=new THREE.Mesh(createOrcaJaw(),white);lower.name='Rounded mandible';jaw.add(lower);
  const gums=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),mouthMaterial);
  gums.position.set(.78,.025,0);gums.scale.set(.77,.028,.29);jaw.add(gums);
  const upper=new THREE.Mesh(gums.geometry,mouthMaterial);
  upper.position.set(1.96,-.18,0);upper.scale.set(.77,.025,.29);root.add(upper);
  const upperTeeth=new THREE.Mesh(teeth(),toothMaterial),lowerTeeth=new THREE.Mesh(teeth(true),toothMaterial);
  upperTeeth.name='Upper teeth';lowerTeeth.name='Lower teeth';root.add(upperTeeth);jaw.add(lowerTeeth);
  // During a short surface visit the body remains in the water and only the
  // blowhole reaches the ceiling. The plume is a translucent, rising mist.
  const breath=new THREE.Group();breath.name='Orca breath plume';breath.visible=false;root.add(breath);
  const breathMaterial=new THREE.MeshStandardMaterial({color:0xd8f4f2,transparent:true,opacity:.52,depthWrite:false,roughness:.25});
  for(let i=0;i<7;i++){
    const puff=new THREE.Mesh(new THREE.SphereGeometry(.12+i*.025,10,7),breathMaterial);
    puff.position.set(1.03+i*.07,.87+i*.18,(i%2?1:-1)*i*.028);puff.scale.set(1,1.5,1);breath.add(puff);
  }
  let jawTimer=0,jawAmount=0,disposed=false,surfaceBaseY=null;
  function animate(dt,time,quality='medium',distance=0) {
    uniforms.orcaPhase.value=time*2.35+.6;
    uniforms.orcaAmplitude.value=.13+Math.min(2.5,root.userData.velocity.length())*.035;
    flukes.position.y=orcaBend(-3,uniforms.orcaPhase.value,uniforms.orcaAmplitude.value);
    const slope=(orcaBend(-2.999,uniforms.orcaPhase.value,uniforms.orcaAmplitude.value)-
      orcaBend(-3.001,uniforms.orcaPhase.value,uniforms.orcaAmplitude.value))/.002;
    flukes.rotation.z=Math.atan(slope)+Math.sin(uniforms.orcaPhase.value-2.0)*.12;
    pectorals.forEach((fin,i)=>fin.rotation.x=(i===0?-1:1)*(.10+Math.sin(time*1.7+i*.35)*.08));
    jawTimer=Math.max(0,jawTimer-dt);
    jawAmount=THREE.MathUtils.lerp(jawAmount,jawTimer>0?1:0,1-Math.exp(-dt*5));
    jaw.rotation.z=-jawAmount*.43;
    upperTeeth.visible=lowerTeeth.visible=jawAmount>.08;
    const detailed=distance<(quality==='low'?20:40);
    body.geometry=detailed?near:far;
    const cycle=(time+(root.userData.phase||0)*11)%74;
    const rise=THREE.MathUtils.smoothstep(cycle,42,49)-THREE.MathUtils.smoothstep(cycle,57,65);
    if(rise>.001&&surfaceBaseY===null)surfaceBaseY=root.position.y;
    if(surfaceBaseY!==null)root.position.y=THREE.MathUtils.lerp(surfaceBaseY,15.45,rise);
    if(cycle>65&&surfaceBaseY!==null){root.position.y=surfaceBaseY;surfaceBaseY=null;}
    const blowing=cycle>50&&cycle<53&&rise>.92;
    breath.visible=blowing;
    if(blowing){breath.position.set(0,2.05,0);breath.scale.setScalar(.72+(cycle-50)*.30);}
  }
  function dispose() {
    if(disposed)return;disposed=true;
    const geometries=new Set([near,far]),materials=new Set();
    root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  return {root,animate,openMouth(){jawTimer=3.2;},dispose};
}
