import * as THREE from 'three';
import {createFinMembrane,createRayFinMaterial,addSurfaceRelief} from './FishSurfaceDetail.js';

export function createRealisticPufferAssets(){
  const geometries=[],materials=[];
  const own=g=>(geometries.push(g),g);
  const near=own(new THREE.SphereGeometry(1,48,32)),far=own(new THREE.SphereGeometry(1,20,14));
  const sphere=own(new THREE.SphereGeometry(1,20,14));
  const fin=own(createFinMembrane([[0,.025,0],[0,0,0],[0,-.025,0]],
    [[-.17,.25,0],[-.43,.17,0],[-.47,-.11,0],[-.23,-.25,0]],60,6));
  const tailGeometry=own(createFinMembrane([[0,.055,0],[0,0,0],[0,-.055,0]],
    [[-.46,.31,0],[-.61,.23,0],[-.57,0,0],[-.61,-.23,0],[-.46,-.31,0]],60,6));
  const dorsalGeometry=own(createFinMembrane([[.10,0,0],[0,.025,0],[-.18,0,0]],
    [[.04,.22,0],[-.20,.33,0],[-.38,.19,0]],24,6));
  const spine=own(new THREE.ConeGeometry(.012,.14,7));spine.translate(0,.07,0);
  const beak=own(new THREE.SphereGeometry(1,16,10));
  const mat=(color,roughness=.58)=>{const m=new THREE.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
  const skin=mat(0xffffff,.52),finMat=createRayFinMaterial(0xb9b081),eyeWhite=mat(0x7c7959,.31),iris=mat(0xa9a65c,.25),pupil=mat(0x040806,.09),beakMat=mat(0xd8cbb1,.4),spineMat=mat(0xcbbf99,.59),lipMat=mat(0x928065,.53),gillMat=mat(0x574e33,.66);
  materials.push(finMat);
  iris.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vIris;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIris=position;');
    s.fragmentShader='varying vec3 vIris;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float angle=atan(vIris.y,vIris.x);
      float radial=pow(.5+.5*sin(angle*53.0+length(vIris.xy)*17.0),5.0);
      radial*=1.0-smoothstep(.3,2.0,fwidth(angle*53.0));
      diffuseColor.rgb*=.55+.45*radial;
      diffuseColor.rgb*=mix(1.0,.35,smoothstep(.75,1.0,length(vIris.xy)));
    `);
  };
  iris.customProgramCacheKey=()=>'puffer-radial-iris-v2';
  skin.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vRealPuffer;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRealPuffer=position;');
    s.fragmentShader='varying vec3 vRealPuffer;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=vRealPuffer;
      float belly=1.0-smoothstep(-.46,.12,p.y);
      float pigment=fishNoise(p*8.0+fishNoise(p*17.0)*1.7);
      float spots=1.0-smoothstep(.29,.39,pigment);
      spots*=1.0-smoothstep(.7,2.0,length(fwidth(p*18.0)));
      float pores=fishNoise(p*115.0);
      float microFade=1.0-smoothstep(.45,1.5,length(fwidth(p*115.0)));
      vec3 back=mix(vec3(.25,.25,.125),vec3(.56,.49,.28),fishNoise(p*4.5));
      back=mix(back,vec3(.065,.060,.028),spots*.85);
      diffuseColor.rgb=mix(back,vec3(.83,.78,.60),belly*.94);
      diffuseColor.rgb*=1.0+(pores-.5)*.12*microFade;
    `);
    addSurfaceRelief(s,'(fishNoise(vRealPuffer*115.0)-.5)*(1.0-smoothstep(.45,1.5,length(fwidth(vRealPuffer*115.0))))',
      '(fishNoise(vRealPuffer*52.0)-.5)*.15',.0022);
  };
  skin.customProgramCacheKey=()=>'realistic-puffer-skin-v3';
  function create(fish){
    const group=new THREE.Group();group.name='Realistische kogelvis';group.visible=false;fish.add(group);
    const mesh=(g,m,name,p=[0,0,0],sc=[1,1,1])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...p);o.scale.set(...sc);group.add(o);return o;};
    const body=mesh(near,skin,'Real puffer body',[0,0,0],[1.20,.66,.61]);
    const face=[],fins=[],eyes=[];
    for(const side of [-1,1]){
      // Move the complete orbit with inflation, never scale the inter-layer
      // offsets: iris and pupil stay seated on the fixed-size eyeball.
      const orbit=new THREE.Group();orbit.name='Real puffer eye assembly';orbit.position.set(.73,.24,side*.475);group.add(orbit);face.push(orbit);eyes.push(orbit);
      for(const [name,material,pos,scale] of [
        ['Real puffer eye',eyeWhite,[0,0,0],[.155,.17,.092]],
        ['Real puffer iris',iris,[.025,.005,side*.078],[.094,.108,.029]],
        ['Real puffer pupil',pupil,[.031,.005,side*.103],[.046,.067,.012]],
      ]) {const o=new THREE.Mesh(sphere,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);orbit.add(o);}
      const f=mesh(fin,finMat,'Real puffer pectoral',[-.04,-.04,side*.605]);fins.push(f);
      const gill=mesh(sphere,gillMat,'Real puffer gill slit',[.12,-.035,side*.595],[.018,.095,.016]);face.push(gill);
      face.push(mesh(sphere,lipMat,'Puffer nostril',[.99,.125,side*.225],[.023,.018,.014]));
    }
    const mouth=new THREE.Group();mouth.name='Real puffer mouth assembly';mouth.position.set(1.17,-.085,0);group.add(mouth);face.push(mouth);
    for(const [name,material,pos,scale] of [
      ['Puffer fleshy muzzle',lipMat,[0,0,0],[.11,.10,.135]],
      ['Puffer mouth aperture',pupil,[.091,0,0],[.016,.043,.070]],
      ['Puffer beak upper',beakMat,[.104,.031,0],[.016,.018,.052]],
      ['Puffer beak lower',beakMat,[.101,-.029,0],[.014,.016,.049]],
    ]) {const o=new THREE.Mesh(beak,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);mouth.add(o);}
    const tail=mesh(tailGeometry,finMat,'Real puffer tail',[-1.15,-.01,0]);
    const dorsal=mesh(dorsalGeometry,finMat,'Real puffer dorsal',[-.72,.515,0]);
    const anal=mesh(dorsalGeometry,finMat,'Real puffer anal',[-.72,-.515,0],[.85,-.8,1]);
    const spines=new THREE.InstancedMesh(spine,spineMat,192);spines.name='Real puffer spines';spines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(spines);
    const directions=[];
    for(let i=0;i<192;i++){const y=1-2*(i+.5)/192,a=i*2.399963,r=Math.sqrt(1-y*y),n=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);if(n.x>.62)n.x=-n.x;directions.push(n.normalize());}
    const rest=new Map([...face,...fins,tail,dorsal,anal].map(o=>[o,o.position.clone()]));
    return {group,body,face,eyes,fins,tail,dorsal,anal,spines,directions,rest};
  }
  let disposed=false;
  return {near,far,create,dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
