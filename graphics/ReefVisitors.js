import * as THREE from 'three';
import {addSurfaceRelief} from './FishSurfaceDetail.js';

export const VISITOR_SPECIES=Object.freeze({
  stingray:{name:'Rog',speed:.85,biomass:3,extent:[3.3,.52,1.5]},
  turtle:{name:'Reuzenschildpad',speed:.65,biomass:4,extent:[1.86,.8,1.95]}
});

function skin(color,roughness=.6){
  const m=new THREE.MeshStandardMaterial({color,roughness});
  const detail={value:0};
  m.userData.detail=detail;
  m.onBeforeCompile=s=>{
    s.uniforms.visitorDetail=detail;
    s.fragmentShader='uniform float visitorDetail;\n'+s.fragmentShader;
    addSurfaceRelief(s,'(fishNoise(-vViewPosition*22.0)-.5)*.12*visitorDetail',
      '(fishNoise(-vViewPosition*22.0)-.5)*.08*visitorDetail',.001);
  };
  m.customProgramCacheKey=()=>'reef-visitor-skin-v1';return m;
}
function ellipsoid(parent,material,position,scale,name){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);
  mesh.name=name;mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;
}
function finish(root,animate,materials,lods=[]){
  let disposed=false;
  return {root,animate(dt,time,quality='medium',distance=0){
    if(disposed||dt<=0)return;
    for(const [mesh,near,far] of lods)mesh.geometry=distance>(quality==='low'?18:42)?far:near;
    animate(dt,time);
  },setStyle(style){
    const real=style==='realistic';
    for(const m of materials){if(m.userData.detail)m.userData.detail.value=real?1:0;m.roughness=real?.56:.8;}
  },dispose(){
    if(disposed)return;disposed=true;
    const geometries=new Set(lods.flatMap(([,a,b])=>[a,b])),mats=new Set(materials);
    root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});
    geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  }};
}
function base(kind){
  const root=new THREE.Group(),p=VISITOR_SPECIES[kind];root.name=p.name;
  root.userData={isFishRoot:true,isReefVisitor:true,visitorKind:kind,visualSpecies:p.name,
    health:100,phase:.4,biomass:p.biomass,velocity:new THREE.Vector3(p.speed,0,0)};return root;
}

export function rayWave(x,z,phase){return Math.pow(Math.min(1,Math.abs(z)/1.4),1.7)*.22*Math.sin(phase-x*2.3-Math.abs(z)*1.4);}
function rayDisc(rings=22,sides=64){
  const p=[],colors=[],indices=[];
  // Closed upper/lower discs. A rounded diamond outline keeps the stingray
  // distinct from a manta; outer rings thin into soft, flexible wing edges.
  for(const side of [1,-1])for(let r=0;r<=rings;r++)for(let j=0;j<=sides;j++){
    const u=r/rings,a=j/sides*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
    const x=u*Math.sign(c)*Math.abs(c)**1.3*(c>0?1.18:.92),z=u*Math.sign(s)*Math.abs(s)**1.2*1.4;
    const y=side*(.025+.17*(1-u*u))+.055*Math.exp(-z*z*9)*Math.max(0,x);
    p.push(x,y,z);
    const color=new THREE.Color(side<0?0xe3ddc0:0x416777);colors.push(color.r,color.g,color.b);
  }
  const count=(rings+1)*(sides+1);
  for(let side=0;side<2;side++)for(let r=0;r<rings;r++)for(let j=0;j<sides;j++){
    const a=side*count+r*(sides+1)+j,b=a+sides+1;
    if(side===0)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);
  }
  for(let j=0;j<sides;j++){const a=rings*(sides+1)+j,b=a+count;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();g.boundingSphere.radius+=.3;return g;
}
export function createStingray(){
  const root=base('stingray'),bodyMat=skin(0xffffff),eyeMat=skin(0x061d24,.2),rim=skin(0x557b82),tailMat=skin(0x395968);
  bodyMat.vertexColors=true;
  const wave={value:0},original=bodyMat.onBeforeCompile;
  bodyMat.onBeforeCompile=s=>{
    original(s);s.uniforms.rayPhase=wave;
    s.vertexShader='varying vec3 vRayPoint;uniform float rayPhase;\nfloat rw(vec3 p){return pow(min(1.0,abs(p.z)/1.4),1.7)*.22*sin(rayPhase-p.x*2.3-abs(p.z)*1.4);}\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal.x-=(rw(position+vec3(.001,0.,0.))-rw(position-vec3(.001,0.,0.)))/.002*objectNormal.y;\nobjectNormal.z-=(rw(position+vec3(0.,0.,.001))-rw(position-vec3(0.,0.,.001)))/.002*objectNormal.y;');
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRayPoint=position;transformed.y+=rw(position);');
    s.fragmentShader='varying vec3 vRayPoint;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec2 rq=vRayPoint.xz*18.0;float rh=fract(sin(dot(floor(rq),vec2(127.1,311.7)))*43758.5453);float rs=(1.0-smoothstep(.07,.16,length(fract(rq)-vec2(.5))))*step(.76,rh)*step(0.0,vRayPoint.y);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.48,.61,.63),rs*.5);');
  };bodyMat.customProgramCacheKey=()=>'stingray-wave-v1';
  const near=rayDisc(),far=rayDisc(10,28),body=new THREE.Mesh(near,bodyMat);body.name='Flexible ray disc';root.add(body);
  for(const side of [-1,1]){
    ellipsoid(root,rim,[.64,.20,side*.22],[.15,.09,.11],'Raised eye ridge');
    ellipsoid(root,eyeMat,[.71,.265,side*.27],[.067,.065,.048],'Ray eye');
    ellipsoid(root,eyeMat,[.39,.20,side*.27],[.12,.025,.065],'Spiracle');
  }
  // Several short tapering sections follow the body instead of a rigid rod.
  const tail=[];let parent=root;
  for(let i=0;i<9;i++){
    const joint=new THREE.Group();joint.position.x=i===0?-.88:-.255;parent.add(joint);
    const segment=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(.007,.059-i*.006),Math.max(.005,.053-i*.006),.28,8),tailMat);
    segment.rotation.z=Math.PI/2;segment.position.x=-.13;joint.add(segment);tail.push(joint);parent=joint;
  }
  let phase=.4;
  return finish(root,(dt)=>{
    phase+=dt*(.8+root.userData.velocity.length()*1.8);wave.value=phase;
    tail.forEach((joint,i)=>{joint.rotation.y=Math.sin(phase*.55-i*.35)*.022;joint.rotation.z=Math.sin(phase*.7-i*.4)*.022;});
  },[bodyMat,eyeMat,rim,tailMat],[[body,near,far]]);
}

function flipperGeometry(){
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.1,.45,-.45,1.15,-.88,1.3);
  shape.bezierCurveTo(-1.08,1.25,-.8,.62,-.3,.05);shape.quadraticCurveTo(-.12,-.08,0,0);
  const g=new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,steps:1,curveSegments:10});g.rotateX(Math.PI/2);return g;
}
export function createSeaTurtle(){
  const root=base('turtle'),shellMat=skin(0x6e783b),seamMat=skin(0x465732),flesh=skin(0x829b64),belly=skin(0xd5c89a),black=skin(0x071b18,.15),amber=skin(0xa89052),scuteGold=skin(0x83804b);
  ellipsoid(root,flesh,[0,-.06,0],[1.12,.32,.73],'Body');
  ellipsoid(root,belly,[-.05,-.18,0],[1.11,.20,.77],'Plastron');
  const near=new THREE.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI/2),far=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2);
  const shell=new THREE.Mesh(near,seamMat);shell.scale.set(1.22,.64,.86);shell.position.x=-.12;root.add(shell);shell.name='Rigid shell';
  // Individual curved scutes sit above a darker continuous shell. Tiny gaps
  // become real seams rather than a flat painted hexagon texture.
  for(let row=-2;row<=2;row++)for(let col=-3;col<=3;col++){
    const cx=col*.37+(row%2)*.185,cz=row*.32;
    if((cx/1.18)**2+(cz/.82)**2>.82)continue;
    const positions=[],indices=[],ring=[];
    for(let i=0;i<6;i++)for(let edge=0;edge<4;edge++){
      const a=i*Math.PI/3+Math.PI/6,b=a+Math.PI/3,f=edge/4;
      let x=cx+THREE.MathUtils.lerp(Math.cos(a),Math.cos(b),f)*.205,z=cz+THREE.MathUtils.lerp(Math.sin(a),Math.sin(b),f)*.205;
      const r=Math.hypot(x/1.22,z/.86);if(r>.97){x*=.97/r;z*=.97/r;}ring.push([x,z]);
    }
    const surface=(x,z)=>.65*Math.sqrt(Math.max(0,1-(x/1.22)**2-(z/.86)**2))+.015;
    positions.push(cx-.12,surface(cx,cz),cz);
    for(let r=1;r<=5;r++)for(const [ex,ez] of ring){const x=THREE.MathUtils.lerp(cx,ex,r/5),z=THREE.MathUtils.lerp(cz,ez,r/5);positions.push(x-.12,surface(x,z),z);}
    const n=ring.length;
    for(let j=0;j<n;j++)indices.push(0,1+(j+1)%n,1+j);
    for(let r=0;r<4;r++)for(let j=0;j<n;j++){const a=1+r*n+j,b=1+r*n+(j+1)%n;indices.push(a,b,b+n,a,b+n,a+n);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    const scute=new THREE.Mesh(g,(col+row)%3===0?scuteGold:shellMat);scute.name='Curved shell scute';root.add(scute);
  }
  const head=new THREE.Group();head.position.set(.91,.02,0);root.add(head);
  ellipsoid(head,flesh,[.15,0,0],[.48,.24,.28],'Neck');
  ellipsoid(head,flesh,[.55,.07,0],[.34,.27,.29],'Head');
  ellipsoid(head,belly,[.76,-.01,0],[.16,.15,.25],'Rounded beak');
  for(const side of [-1,1]){
    ellipsoid(head,amber,[.65,.16,side*.23],[.12,.115,.065],'Eye rim');
    ellipsoid(head,black,[.68,.17,side*.27],[.071,.08,.034],'Turtle eye');
    ellipsoid(head,black,[.86,.115,side*.085],[.019,.015,.015],'Nostril');
  }
  const flippers=[],geo=flipperGeometry();
  for(const side of [-1,1])for(const front of [true,false]){
    const pivot=new THREE.Group();pivot.position.set(front?.6:-.9,-.14,side*(front?.55:.48));root.add(pivot);
    const fin=new THREE.Mesh(geo,flesh);fin.scale.set(front?1:.45,1,side*(front?1:.48));pivot.add(fin);flippers.push({pivot,side,front});
  }
  ellipsoid(root,flesh,[-1.31,-.05,0],[.25,.065,.075],'Short tail');
  let phase=0;
  return finish(root,(dt,time)=>{
    phase+=dt*(.65+root.userData.velocity.length()*1.3);
    const stroke=Math.sin(phase),glide=.45+.55*Math.max(0,Math.sin(phase*.31));
    for(const {pivot,side,front} of flippers){pivot.rotation.x=side*(front?stroke*.38*glide:.06*Math.sin(phase*.6+side));pivot.rotation.y=side*(front?.12+.08*Math.cos(phase):.12*Math.sin(phase*.4));}
    head.rotation.y=Math.sin(time*.35)*.045;head.rotation.z=Math.sin(time*.6)*.025;
  },[shellMat,seamMat,flesh,belly,black,amber,scuteGold],[[shell,near,far]]);
}
