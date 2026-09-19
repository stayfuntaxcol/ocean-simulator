import * as THREE from 'three';
import {createFinMembrane as membrane,createRayFinMaterial,addSurfaceRelief} from './FishSurfaceDetail.js';
import {createClosedReefBody,animateReefMaterial,createReefAnimator,reefUniforms} from './RealisticReefSupport.js';

const PROFILE=[[-1.42,.10,.065],[-1.18,.21,.12],[-.89,.40,.215],[-.46,.60,.295],[.04,.67,.335],[.47,.57,.31],[.80,.40,.24],[1.06,.23,.15],[1.24,.105,.09],[1.29,.065,.05]];
export function createRealisticClownBody(rings=56,sides=36){return createClosedReefBody(PROFILE,rings,sides);}

function clownSkin(){
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.43,metalness:0});
  material.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vClownSkin;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvClownSkin=position;');
    s.fragmentShader=`varying vec3 vClownSkin;
      float clownScale(vec3 p){
        vec2 grid=p.xy*vec2(48.0,60.0); // Fine overlapping scales, not large painted dots.
        grid.x+=mod(floor(grid.y),2.0)*.5;
        vec2 c=fract(grid)-.5;
        float arc=abs(length(vec2(c.x*.86,c.y+.32))-.47);
        float aa=max(fwidth(arc),.02);
        return (1.0-smoothstep(.022,.022+aa,arc))*(1.0-smoothstep(.35,1.2,length(fwidth(grid))))*(1.0-smoothstep(.60,1.02,p.x));
      }
      `+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=vClownSkin;
      float belly=1.0-smoothstep(-.56,.05,p.y);
      vec3 skin=mix(vec3(.92,.175,.012),vec3(1.0,.40,.035),belly*.70);
      skin*=1.0-smoothstep(.10,.68,p.y)*.14;
      // Three irregular anatomical bars: head, broad mid-body and peduncle.
      float head=abs(p.x-.67+p.y*.16+.027*sin(p.y*8.0))-(.087+.020*cos(p.y*5.0));
      float middle=abs(p.x+.24-.075*cos(p.y*5.0))-(.125+.035*cos(p.y*4.0));
      float peduncle=abs(p.x+1.13+p.y*.10)-.066;
      float band=min(head,min(middle,peduncle));
      float aa=max(fwidth(band),.004);
      skin=mix(skin,vec3(.016,.019,.018),1.0-smoothstep(.023-aa,.023+aa,band));
      skin=mix(skin,vec3(.90,.91,.84),1.0-smoothstep(-aa,aa,band));
      float gill=exp(-pow((p.x-.52+p.y*.22+p.y*p.y*.35)*90.0,2.0))*smoothstep(.12,.22,abs(p.z));
      skin*=1.0-gill*.28;
      skin*=1.0-clownScale(p)*.105;
      skin*=.975+.05*fishNoise(p*110.0);
      diffuseColor.rgb=skin;
    `);
    addSurfaceRelief(s,'-clownScale(vClownSkin)','clownScale(vClownSkin)*.09+(fishNoise(vClownSkin*110.0)-.5)*.045',.0012);
  };
  material.customProgramCacheKey=()=>'realistic-clown-bands-scales-v1';return material;
}

export function createRealisticClownAssets(){
  const geometry=[],materials=[],instances=new Set();let disposed=false;
  const own=g=>{g.computeBoundingSphere();g.boundingSphere.radius+=.14;geometry.push(g);return g;},mat=(color,roughness=.45)=>{const m=new THREE.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
  const near=own(createRealisticClownBody()),far=own(createRealisticClownBody(24,16));
  const sphere=own(new THREE.SphereGeometry(1,20,14));
  const skin=clownSkin();materials.push(skin);
  const fin=createRayFinMaterial(0xec7827);materials.push(fin);
  const finHook=fin.onBeforeCompile.bind(fin);
  fin.onBeforeCompile=s=>{
    finHook(s);
    s.fragmentShader=s.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
      float blackRim=smoothstep(.78,.84,vRayUV.x)*(1.0-smoothstep(.968,1.0,vRayUV.x));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.014,.020,.019),blackRim*.97);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.91,.87,.70),smoothstep(.975,1.0,vRayUV.x)*.8);
      diffuseColor.a=max(diffuseColor.a,blackRim*.88);
    `);
  };
  fin.customProgramCacheKey=()=>'realistic-clown-ray-black-rim-v1';
  const orbitMat=mat(0x7a3b17,.36),irisMat=mat(0xb58a43,.27),pupilMat=mat(0x050a0c,.10),crease=mat(0x753d23,.57);
  irisMat.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vNaturalIris;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNaturalIris=position;');
    s.fragmentShader='varying vec3 vNaturalIris;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float irisAngle=atan(vNaturalIris.y,vNaturalIris.x);
      float irisRay=(.5+.5*sin(irisAngle*43.0+length(vNaturalIris.xy)*12.0))*(1.0-smoothstep(.5,2.0,fwidth(irisAngle*43.0)));
      diffuseColor.rgb*=.65+.35*irisRay;
    `);
  };
  irisMat.customProgramCacheKey=()=>'clown-natural-iris-v1';
  const dorsal=own(membrane([[-1.31,.15,0],[-.92,.38,0],[-.43,.61,0],[.08,.66,0],[.54,.54,0]],
    [[-1.35,.28,0],[-1.06,.65,0],[-.63,.93,0],[-.05,.93,0],[.56,.55,0]],36,7,19));
  const anal=own(membrane([[-1.32,-.15,0],[-.96,-.35,0],[-.63,-.53,0],[-.32,-.65,0]],
    [[-1.39,-.30,0],[-1.05,-.64,0],[-.69,-.86,0],[-.32,-.65,0]],28,6,14));
  const tail=own(membrane([[-1.41,.095,0],[-1.45,0,0],[-1.41,-.095,0]],
    [[-1.97,.40,0],[-2.18,.31,0],[-2.23,0,0],[-2.18,-.31,0],[-1.97,-.40,0]],28,7,17));
  const pectoral=own(membrane([[0,.045,0],[0,0,0],[0,-.045,0]],
    [[-.35,.19,.07],[-.55,-.03,.10],[-.47,-.27,.06],[-.18,-.30,0]],20,6,12));
  const pelvic=own(membrane([[.18,-.60,0],[.04,-.64,0],[-.12,-.66,0]],
    [[.18,-.62,0],[-.11,-.86,.035],[-.39,-.82,0]],18,5,9));
  const curve=(points,radius)=>own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,radius,5,false));
  const gill=curve([[.58,.34,.265],[.44,.13,.322],[.46,-.17,.30],[.59,-.33,.24]],.0055);
  const mouth=curve([[1.235,-.053,-.073],[1.295,-.045,0],[1.235,-.053,.073]],.008);
  function create(fish){
    if(disposed)throw Error('Realistic clown assets disposed');
    const group=new THREE.Group();group.name='Realistische clownvis';group.visible=false;fish.add(group);
    const uniforms=reefUniforms(),bodyMaterial=animateReefMaterial(skin,uniforms),finMaterial=animateReefMaterial(fin,uniforms,{fin:true});
    const mesh=(g,m,name,pos=[0,0,0],scale=[1,1,1])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...pos);o.scale.set(...scale);group.add(o);return o;};
    const body=mesh(near,bodyMaterial,'Clown body');
    mesh(dorsal,finMaterial,'Dorsal membrane');mesh(anal,finMaterial,'Anal membrane');mesh(tail,finMaterial,'Caudal membrane');
    mesh(mouth,crease,'Mouth seam');
    const details=[],pectorals=[];
    for(const side of [-1,1]){
      mesh(sphere,orbitMat,'Eye orbit',[.90,.17,side*.211],[.108,.106,.046]);
      mesh(sphere,irisMat,'Natural iris',[.905,.17,side*.242],[.084,.084,.022]);
      mesh(sphere,pupilMat,'Natural pupil',[.917,.17,side*.261],[.052,.058,.012]);
      const g=mesh(gill,crease,'Gill cover');g.scale.z=side;details.push(g);
      details.push(mesh(sphere,crease,'Nostril',[1.13,.077,side*.120],[.011,.008,.005]));
      const p=mesh(pectoral,finMaterial,'Pectoral membrane',[.37,-.10,side*.299]);p.scale.z=side;p.rotation.y=-side*.42;pectorals.push(p);
      const v=mesh(pelvic,finMaterial,'Pelvic membrane',[0,0,side*.085]);v.scale.z=side;v.rotation.x=side*.16;
    }
    const instance=createReefAnimator(fish,group,body,near,far,{uniforms,pectorals,details,materials:[bodyMaterial,finMaterial]});
    const dispose=instance.dispose;instance.dispose=()=>{dispose();instances.delete(instance);};instances.add(instance);return instance;
  }
  return {create,dispose(){if(disposed)return;disposed=true;for(const i of [...instances])i.dispose();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
