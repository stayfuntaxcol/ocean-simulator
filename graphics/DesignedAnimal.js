import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {normalizeAnimalDesign} from '../animals/design/AnimalDesign.js';
import {buildAnimalSurface} from '../animals/design/AnimalSculpt.js';
import {orcaRig,orcaWeights,motionPose} from '../animals/design/AnimalRig.js';
const surfaces=new Map();
function geometryFromSurface(surface,design){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(surface.positions.slice(),3));g.setAttribute('normal',new THREE.BufferAttribute(surface.normals.slice(),3));g.setIndex(new THREE.BufferAttribute(surface.indices.slice(),1));
 const uv=[],si=[],sw=[],bones=orcaRig(design.form);
 for(let i=0;i<surface.positions.length;i+=3){const p=Array.from(surface.positions.slice(i,i+3)),w=orcaWeights(p,bones,design.form);si.push(...w.indices);sw.push(...w.weights);uv.push((p[0]/design.form.length+.5),Math.atan2(p[2],p[1])/(2*Math.PI)+.5);}
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));g.computeBoundingSphere();return g;
}
export function createAnimalSkin(design,{clay=false}={}){
 const s=design.skin,m=new THREE.MeshStandardMaterial({color:clay?'#b2c3ba':'#ffffff',roughness:clay?.8:s.roughness,metalness:.02,side:THREE.DoubleSide});
 if(clay)return m;
 // Rest-space coordinates keep spots and scars attached to the deforming skin.
 m.onBeforeCompile=shader=>{
  shader.uniforms.coatDark={value:new THREE.Color(s.dark)};shader.uniforms.coatLight={value:new THREE.Color(s.light)};shader.uniforms.coatSaddle={value:new THREE.Color(s.saddle)};shader.uniforms.coatPores={value:s.pores};shader.uniforms.coatScars={value:s.scars};shader.uniforms.patchSize={value:s.patchSize};shader.uniforms.coatSeed={value:s.seed};shader.uniforms.bodyLength={value:design.form.length};shader.uniforms.bodyGirth={value:design.form.girth};
  const dots=s.paint.flatMap(p=>p.mirror?[p,{...p,point:[p.point[0],p.point[1],-p.point[2]]}]:[p]);
  // Fixed uniform array avoids recompiling GLSL for every paint dot.
  const count=Math.min(128,dots.length);shader.uniforms.paintCount={value:count};shader.uniforms.paintPoints={value:Array.from({length:128},(_,i)=>new THREE.Vector4(...(dots[i]?.point||[0,0,0]),dots[i]?.radius||.01))};shader.uniforms.paintColors={value:Array.from({length:128},(_,i)=>new THREE.Vector4(...new THREE.Color(dots[i]?.color||'#000000').toArray(),dots[i]?.opacity||0))};
  shader.vertexShader='varying vec3 animalRest;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nanimalRest=position;');
  shader.fragmentShader=`varying vec3 animalRest;uniform vec3 coatDark,coatLight,coatSaddle;uniform float coatPores,coatScars,patchSize,coatSeed,bodyLength,bodyGirth;uniform int paintCount;uniform vec4 paintPoints[128],paintColors[128];
   float animalHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7))+coatSeed)*43758.5453);}
   float animalNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(animalHash(i),animalHash(i+vec3(1,0,0)),f.x),mix(animalHash(i+vec3(0,1,0)),animalHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(animalHash(i+vec3(0,0,1)),animalHash(i+vec3(1,0,1)),f.x),mix(animalHash(i+vec3(0,1,1)),animalHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=animalRest;float x=p.x*40.0/bodyLength;float belly=(1.0-smoothstep(-2.35,-1.25,p.y/bodyGirth))*smoothstep(-16.0,-10.0,x);belly*=1.0-smoothstep(3.5,5.0,abs(p.z));
   float eyeMark=1.0-smoothstep(.8,1.05,length((vec2(x,p.y)-vec2(12.4,1.8))/vec2(2.25*patchSize,.94*patchSize)));eyeMark*=smoothstep(1.6,2.4,abs(p.z));
   float saddle=(1.0-smoothstep(.8,1.05,length(vec2((x+4.0)/3.3,p.z/3.0))))*smoothstep(2.0,3.3,p.y);
   vec3 coat=mix(coatDark,coatSaddle,saddle*.85);coat=mix(coat,coatLight,max(belly,eyeMark));
   float pores=animalNoise(p*18.0),mottle=animalNoise(p*1.3);coat*=.95+.07*mottle+coatPores*(pores-.5)*.035;
   float scratch=pow(max(0.0,sin(x*2.8+p.z*.7+animalNoise(p*.8)*.8)),90.0)*pow(animalNoise(p*.22),5.0)*coatScars;coat=mix(coat,coatSaddle,scratch*.6);
   for(int i=0;i<128;i++){if(i>=paintCount)break;float mask=1.0-smoothstep(paintPoints[i].w*.7,paintPoints[i].w,length(p-paintPoints[i].xyz));coat=mix(coat,paintColors[i].rgb,mask*paintColors[i].a);}
   #ifdef USE_MAP
    coat*=texture2D(map,vMapUv).rgb;
   #endif
   diffuseColor.rgb=coat;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float relief=(animalNoise(animalRest*18.0)-.5)*coatPores*.004;
   vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);vec3 r1=cross(q1,normal),r2=cross(normal,q0);float det=dot(q0,r1);normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*r1+dFdy(relief)*r2));
  `);
 };
 m.customProgramCacheKey=()=>`animal-skin-v1`;return m;
}
export function createDesignedOrca(input,{surface,settings={size:1.25,stroke:1},clay=false,studio=false}={}){
 const design=normalizeAnimalDesign(input),root=new THREE.Group();root.name=design.name;
 root.scale.setScalar(studio?1:design.worldLength/design.form.length*settings.size/1.25);
 root.userData={isFishRoot:true,isOrca:true,visualSpecies:'Orka',velocity:new THREE.Vector3(2.8,0,0),health:100,designFormat:design.format};
 if(!surface){const key=JSON.stringify({...design,resolution:.65,skin:null,motion:null});surface=surfaces.get(key);if(!surface){surface=buildAnimalSurface(design,{cellSize:.65});if(surfaces.size>=6)surfaces.delete(surfaces.keys().next().value);surfaces.set(key,surface);}}
 const specs=orcaRig(design.form),bones=specs.map(b=>{const o=new THREE.Bone();o.name=b.name;return o;}),byName=new Map(bones.map(b=>[b.name,b]));
 specs.forEach((spec,i)=>{const parent=spec.parent&&byName.get(spec.parent);bones[i].position.fromArray(spec.position);if(parent){const p=specs.find(x=>x.name===spec.parent);bones[i].position.sub(new THREE.Vector3(...p.position));parent.add(bones[i]);}});
 const material=createAnimalSkin(design,{clay}),mesh=new THREE.SkinnedMesh(geometryFromSurface(surface,design),material);mesh.name='Bewerkbare orka';mesh.frustumCulled=false;mesh.add(bones[0]);mesh.bind(new THREE.Skeleton(bones));root.add(mesh);
 const eyeMat=new THREE.MeshStandardMaterial({color:'#030708',roughness:.08}),white=new THREE.MeshStandardMaterial({color:design.skin.light,roughness:.4}),mouth=new THREE.MeshStandardMaterial({color:'#351c25',roughness:.6});
 const sx=design.form.length/40;
 function attachment(geometry,mat,bone,position,scale){const item=new THREE.Mesh(geometry,mat);item.position.fromArray(position).sub(new THREE.Vector3(...specs.find(b=>b.name===bone).position));item.scale.fromArray(scale);byName.get(bone).add(item);return item;}
 for(const side of [-1,1]){attachment(new THREE.SphereGeometry(.31,20,12),eyeMat,'head',[15.5*sx,.65,side*2.7*design.form.girth*design.form.head],[1,1,.58]);attachment(new THREE.SphereGeometry(.075,10,8),white,'head',[15.58*sx,.74,side*2.89*design.form.girth*design.form.head],[1,1,.5]);}
 const jaw=attachment(new THREE.SphereGeometry(1,32,16),white,'jaw',[16*sx,-1.25,0],[3.8*sx,.62,2.03*design.form.girth]);jaw.name='Onderkaak';
 attachment(new THREE.SphereGeometry(1,24,12),mouth,'jaw',[16*sx,-.65,0],[3.6*sx,.12,1.95*design.form.girth]);
 const teeth=[];for(const side of [-1,1])for(let i=0;i<9;i++){const u=i/8,g=new THREE.ConeGeometry(.095,.35,8);g.translate((13+u*6)*sx,-.45,side*(1.78-u*.55)*design.form.girth);teeth.push(g);}attachment(mergeGeometries(teeth),white,'jaw',[0,0,0],[1,1,1]);teeth.forEach(g=>g.dispose());
 attachment(new THREE.SphereGeometry(1,20,12),eyeMat,'neck',[9*sx,4.07*design.form.girth,0],[.45,.07,.25]);
 const plume=new THREE.Group();plume.visible=false;root.add(plume);const mist=new THREE.MeshStandardMaterial({color:'#d8eeef',transparent:true,opacity:.4,depthWrite:false});for(let i=0;i<7;i++){const o=new THREE.Mesh(new THREE.SphereGeometry(.4+i*.13,12,8),mist);o.position.set(9*sx+i*.12,4.3*design.form.girth+i*.65,(i%2?1:-1)*i*.08);plume.add(o);}
 let disposed=false,jawTimer=0,jawAmount=0,texture;const textureLoader=new THREE.TextureLoader();
 if(design.skin.texture)textureLoader.load(design.skin.texture,t=>{if(disposed){t.dispose();return;}texture=t;t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.ClampToEdgeWrapping;material.map=t;material.needsUpdate=true;});
 const helper=new THREE.SkeletonHelper(mesh);helper.visible=false;
 return {root,mesh,bones,byName,helper,design,stats:surface.stats,animate(dt,time){if(disposed)return;jawTimer=Math.max(0,jawTimer-dt);jawAmount+=((jawTimer>0?1:0)-jawAmount)*(1-Math.exp(-dt*5));const pose=motionPose(design.motion,time,specs,{stroke:settings.stroke||1,jaw:jawAmount});for(const bone of bones)bone.rotation.fromArray([...pose.get(bone.name),'XYZ']);root.updateMatrixWorld(true);},openMouth(){jawTimer=3;},setBreathing(a){plume.visible=a>0;plume.scale.setScalar(.8+a*.6);},dispose(){if(disposed)return;disposed=true;texture?.dispose();const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());helper.geometry.dispose();helper.material.dispose();mesh.skeleton.dispose();}};
}
