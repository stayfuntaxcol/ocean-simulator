import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Original humpback-inspired character, +X nose; dimensions are world meters.
export const WHALE_EXTENT=new THREE.Vector3(15,5.5,9);
export const WHALE_MARGIN=17.5; // radius encloses the horizontal silhouette during turns
export function createWhaleBody(rings=64,sides=32){
  const curve=new THREE.CatmullRomCurve3([
    [-10,.18,.20],[-8,.48,.62],[-5,1.30,1.40],[-1,2.40,2.30],
    [3.5,2.90,2.75],[7.7,2.50,2.65],[10.5,1.72,2.05],[12.4,.55,.92],[12.7,.08,.15],
  ].map(p=>new THREE.Vector3(...p)));
  const positions=[],indices=[];
  for(let i=0;i<=rings;i++){
    const p=curve.getPoint(i/rings);
    for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;positions.push(p.x,Math.cos(a)*p.y,Math.sin(a)*p.z);}
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
    const a=i*sides+j,b=i*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);
  }
  const back=positions.length/3;positions.push(-10,0,0,12.7,0,0);
  for(let j=0;j<sides;j++){const k=(j+1)%sides;indices.push(back,k,j,back+1,rings*sides+j,rings*sides+k);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();g.boundingSphere.radius+=.6;return g;
}
export function whaleBend(x,phase,amplitude){const u=THREE.MathUtils.clamp((2-x)/12,0,1);return amplitude*u*u*Math.sin(phase+x*.27);}
function fin(points,depth=.20){
  const shape=new THREE.Shape();shape.moveTo(...points[0]);
  for(let i=1;i<points.length;i+=3)shape.bezierCurveTo(...points[i],...points[i+1],...points[i+2]);
  shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:2,steps:1,curveSegments:12});
  g.translate(0,0,-depth/2);return g;
}
export function createWhale(){
  const root=new THREE.Group();root.name='Walvis';
  root.userData={isFishRoot:true,isWhale:true,visualSpecies:'Walvis',health:100,phase:.8,velocity:new THREE.Vector3(1.15,0,0)};
  const uniforms={whalePhase:{value:.8},whaleAmplitude:{value:.3}};
  const skin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.54});
  skin.onBeforeCompile=s=>{
    Object.assign(s.uniforms,uniforms);
    s.vertexShader=`varying vec3 vWhale;uniform float whalePhase;uniform float whaleAmplitude;
      float whaleWave(float x){float u=clamp((2.0-x)/12.0,0.0,1.0);return whaleAmplitude*u*u*sin(whalePhase+x*.27);}\n`+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      objectNormal.x-=(whaleWave(position.x+.001)-whaleWave(position.x-.001))/.002*objectNormal.y;`)
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvWhale=position;transformed.y+=whaleWave(position.x);');
    s.fragmentShader='varying vec3 vWhale;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=vWhale;
      float mottling=sin(p.x*2.2+sin(p.z*3.0))*sin(p.y*3.8+p.z)*.045;
      vec3 blue=vec3(.10,.25,.33)+mottling;
      float belly=(1.0-smoothstep(-.85,.15,p.y))*smoothstep(-5.0,3.0,p.x);
      vec3 throat=vec3(.43,.53,.56);
      float folds=cos(p.z*11.0/(1.0+max(0.0,p.x-7.0)*.18)+p.x*.20);
      float grooves=pow(.5+.5*folds,12.0)*(1.0-smoothstep(.6,2.0,fwidth(p.z*11.0)));
      throat*=1.0-grooves*.28;
      diffuseColor.rgb=mix(blue,throat,belly);
    `);
  };
  skin.customProgramCacheKey=()=>'whale-skin-pleats-v1';
  const finMaterial=new THREE.MeshStandardMaterial({color:0x557f95,roughness:.56});
  const lipMaterial=new THREE.MeshStandardMaterial({color:0x223f50,roughness:.62});
  const white=new THREE.MeshStandardMaterial({color:0xdde8db,roughness:.3});
  const black=new THREE.MeshStandardMaterial({color:0x102932,roughness:.16});
  const near=createWhaleBody(),far=createWhaleBody(32,16);
  const body=new THREE.Mesh(near,skin);body.name='Whale body';root.add(body);
  const flipperGeo=fin([[0,0],[-.8,1.6],[-2.1,5.2],[-3.5,6.2],[-4.1,6.9],[-4.5,6.4],[-4.1,5.7],[-2.6,2.9],[-1.6,.25],[0,0]],.24);
  flipperGeo.rotateX(Math.PI/2);
  const flippers=[];
  for(const side of [-1,1]){
    const p=new THREE.Mesh(flipperGeo,finMaterial);p.name='Long pectoral';p.position.set(4.1,-1.2,side*2);p.scale.z=side;root.add(p);flippers.push(p);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.30,16,12),white);eye.name='Whale eye';eye.position.set(7.7,.12,side*2.60);eye.scale.z=.55;root.add(eye);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(.15,12,8),black);pupil.position.set(7.79,.10,side*2.76);pupil.scale.z=.55;root.add(pupil);
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(5.8,-.70,side*2.68),new THREE.Vector3(8.6,-.67,side*2.45),
      new THREE.Vector3(10.7,-.35,side*1.99),new THREE.Vector3(12.38,-.10,side*.87),new THREE.Vector3(12.72,0,0),
    ]);
    const mouth=new THREE.Mesh(new THREE.TubeGeometry(curve,36,.055,6,false),lipMaterial);mouth.name='Curved mouth';root.add(mouth);
  }
  const dorsal=new THREE.Mesh(fin([[-5,1.10],[-4.8,2.7],[-3.6,2.8],[-3.0,1.85],[-2.8,1.6],[-4.1,1.3],[-5,1.10]]),finMaterial);dorsal.name='Small dorsal';root.add(dorsal);
  const tailGeo=fin([[0,0],[-.6,1.6],[-2,3.8],[-3.6,4.6],[-4.3,4.8],[-4.1,2.1],[-3.4,.35],[-3.0,.18],[-3.0,-.18],[-3.4,-.35],[-4.1,-2.1],[-4.3,-4.8],[-3.6,-4.6],[-2,-3.8],[-.6,-1.6],[0,0]],.2);tailGeo.rotateX(Math.PI/2);
  const tail=new THREE.Mesh(tailGeo,finMaterial);tail.name='Whale flukes';tail.position.x=-10;root.add(tail);
  // Tubercles on the broad snout, merged into one mesh.
  const lumps=[];
  for(const side of [-1,1])for(let i=0;i<8;i++){
    const g=new THREE.SphereGeometry(.10+i*.008,8,6);g.scale(1,.6,1);g.translate(8.0+i*.48,2.30-i*.17,side*(1.3-i*.1));lumps.push(g);
  }
  const bumpGeometry=mergeGeometries(lumps);lumps.forEach(g=>g.dispose());
  const bumps=new THREE.Mesh(bumpGeometry,finMaterial);bumps.name='Snout tubercles';root.add(bumps);
  let disposed=false,lastTime=null,phase=.8;
  function animate(dt,time,quality='medium',distance=0){
    const elapsed=lastTime===null?0:Math.max(0,Math.min(.08,time-lastTime));lastTime=time;
    const speed=root.userData.velocity.length();phase+=elapsed*(.25+speed*.62);
    uniforms.whalePhase.value=phase;uniforms.whaleAmplitude.value=.12+Math.min(2,speed)*.23;
    tail.position.y=whaleBend(-10,phase,uniforms.whaleAmplitude.value);
    const slope=(whaleBend(-9.999,phase,uniforms.whaleAmplitude.value)-whaleBend(-10.001,phase,uniforms.whaleAmplitude.value))/.002;
    tail.rotation.z=Math.atan(slope);
    dorsal.position.y=whaleBend(-4,phase,uniforms.whaleAmplitude.value);
    flippers.forEach((p,i)=>p.rotation.x=(i===0?-1:1)*(.11+Math.sin(phase*.75+i*.45)*.08));
    body.geometry=distance<(quality==='low'?30:55)?near:far;
    bumps.visible=quality!=='low'&&distance<40;
  }
  function dispose(){if(disposed)return;disposed=true;const gs=new Set([near,far]),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
  return {root,animate,dispose};
}
