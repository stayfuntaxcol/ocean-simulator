import * as THREE from 'three';
import {createFinMembrane as membrane,createRayFinMaterial,addSurfaceRelief} from './FishSurfaceDetail.js';
import {createClosedReefBody,animateReefMaterial,createReefAnimator,reefUniforms} from './RealisticReefSupport.js';

// Dorsoventrally flattened, leaf-shaped flounder inspiration; the broad face
// points +X and both small eyes sit above the dorsal surface for sand resting.
const PROFILE=[[-1.45,.045,.12],[-1.18,.09,.40],[-.82,.14,.65],[-.30,.18,.81],[.22,.19,.80],[.67,.16,.64],[1.01,.115,.40],[1.24,.07,.18],[1.33,.035,.075]];
export function createRealisticGreenBody(rings=60,sides=40){return createClosedReefBody(PROFILE,rings,sides);}

function greenSkin(){
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.51,metalness:0});
  material.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vFlatSkin;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFlatSkin=position;');
    s.fragmentShader=`varying vec3 vFlatSkin;
      float flatScales(vec3 p){
        vec2 grid=p.xz*vec2(57.0,65.0);grid.x+=mod(floor(grid.y),2.0)*.5;
        vec2 c=fract(grid)-.5;
        float arc=abs(length(vec2(c.x*.86,c.y+.34))-.49);
        return (1.0-smoothstep(.022,.022+max(fwidth(arc),.02),arc))*(1.0-smoothstep(.35,1.2,length(fwidth(grid))))*(1.0-smoothstep(.73,1.13,p.x));
      }
      `+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=vFlatSkin;
      float broad=fishNoise(vec3(p.x*3.8,p.z*4.9,2.7));
      float mottles=fishNoise(vec3(p.x*12.0,p.z*13.5,5.2));
      float fine=fishNoise(p*76.0);
      vec3 upper=mix(vec3(.18,.23,.073),vec3(.49,.47,.24),smoothstep(.20,.78,broad));
      upper=mix(upper,vec3(.095,.145,.055),smoothstep(.60,.76,mottles)*.64);
      upper=mix(upper,vec3(.65,.62,.40),smoothstep(.72,.84,fishNoise(vec3(p.x*24.0,p.z*27.0,8.0)))*.50);
      // Soft pale rings form irregular ocelli, integrated into the camouflage.
      float rosette=1.0-smoothstep(.035,.075,abs(mottles-.58));
      upper=mix(upper,vec3(.56,.53,.30),rosette*.14);
      float lateral=exp(-pow((abs(p.z)-(.23+.065*sin(p.x*2.6)))*110.0,2.0));
      upper*=1.0-lateral*.13*(1.0-smoothstep(.55,1.03,p.x));
      vec3 underside=vec3(.73,.71,.52)*(.96+.08*fishNoise(p*22.0));
      float dorsal=smoothstep(-.040,.055,p.y);
      vec3 skin=mix(underside,upper,dorsal);
      skin*=1.0-flatScales(p)*.085*dorsal;
      skin*=.975+fine*.05;
      diffuseColor.rgb=skin;
    `);
    addSurfaceRelief(s,'-flatScales(vFlatSkin)*smoothstep(-.04,.055,vFlatSkin.y)',
      'flatScales(vFlatSkin)*.08+(fishNoise(vFlatSkin*76.0)-.5)*.08',.0011);
  };
  material.customProgramCacheKey=()=>'realistic-flatfish-camouflage-relief-v1';return material;
}

export function createRealisticGreenAssets(){
  const geometry=[],materials=[],instances=new Set();let disposed=false;
  const own=g=>{g.computeBoundingSphere();g.boundingSphere.radius+=.10;geometry.push(g);return g;},mat=(color,roughness=.45)=>{const m=new THREE.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
  const near=own(createRealisticGreenBody()),far=own(createRealisticGreenBody(26,16)),sphere=own(new THREE.SphereGeometry(1,20,14));
  const skin=greenSkin();materials.push(skin);
  const fin=createRayFinMaterial(0x879052);materials.push(fin);
  const finHook=fin.onBeforeCompile.bind(fin);
  fin.onBeforeCompile=s=>{
    finHook(s);
    s.fragmentShader=s.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
      float fringeMottle=fishNoise(vec3(vRayUV*vec2(8.0,45.0),3.6));
      diffuseColor.rgb*=1.0-smoothstep(.52,.78,fringeMottle)*.37;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.37,.39,.20),smoothstep(.84,.91,vRayUV.x)*(1.0-smoothstep(.95,1.0,vRayUV.x))*.5);
    `);
  };
  fin.customProgramCacheKey=()=>'realistic-flatfish-mottled-ray-v1';
  const olive=mat(0x737746,.53),iris=mat(0xaa9755,.30),eye=mat(0x080f09,.13),crease=mat(0x384529,.62);
  iris.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vFlatIris;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFlatIris=position;');
    s.fragmentShader='varying vec3 vFlatIris;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float angle=atan(vFlatIris.z,vFlatIris.x);
      float streak=(.5+.5*sin(angle*37.0+length(vFlatIris.xz)*12.0))*(1.0-smoothstep(.5,2.0,fwidth(angle*37.0)));
      diffuseColor.rgb*=.59+.41*streak;
    `);
  };
  iris.customProgramCacheKey=()=>'flatfish-dorsal-iris-v1';
  const horizontal=(inner,outer,segments=36)=>{const g=membrane(inner,outer,segments,7,21);g.rotateX(Math.PI/2);return own(g);};
  const fringe=horizontal([[-1.34,.23,0],[-.93,.59,0],[-.37,.79,0],[.25,.78,0],[.77,.55,0],[1.18,.20,0]],
    [[-1.48,.32,0],[-1.08,.83,0],[-.49,1.04,0],[.20,1.02,0],[.80,.75,0],[1.18,.20,0]],48);
  const fringeOther=own(fringe.clone());fringeOther.scale(1,1,-1);
  const tail=horizontal([[-1.43,.10,0],[-1.46,0,0],[-1.43,-.10,0]],
    [[-2.04,.39,0],[-2.19,.25,0],[-2.23,0,0],[-2.19,-.25,0],[-2.04,-.39,0]],28);
  const pectoral=horizontal([[0,.015,0],[0,0,0],[0,-.015,0]],
    [[-.14,.20,0],[-.43,.23,0],[-.48,.01,0],[-.20,-.06,0]],20);
  const curve=(points,radius)=>own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),22,radius,5,false));
  const mouth=curve([[1.25,.001,-.13],[1.335,-.010,0],[1.25,.001,.13]],.007);
  const gill=curve([[.93,.079,.36],[.78,.108,.43],[.69,.065,.51],[.78,.015,.51]],.006);
  function create(fish){
    if(disposed)throw Error('Realistic green assets disposed');
    const group=new THREE.Group();group.name='Realistische groene platvis';group.visible=false;fish.add(group);
    const uniforms=reefUniforms(),bodyMaterial=animateReefMaterial(skin,uniforms,{flat:true}),finMaterial=animateReefMaterial(fin,uniforms,{flat:true,fin:true});
    const mesh=(g,m,name,pos=[0,0,0],scale=[1,1,1])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...pos);o.scale.set(...scale);group.add(o);return o;};
    const body=mesh(near,bodyMaterial,'Flatfish body');
    mesh(fringe,finMaterial,'Dorsal fringe membrane');mesh(fringeOther,finMaterial,'Anal fringe membrane');mesh(tail,finMaterial,'Caudal membrane');
    mesh(mouth,crease,'Mouth seam');
    const eyes=[],lids=[],seams=[],details=[];
    for(const side of [-1,1]){
      mesh(sphere,olive,'Eye mound',[.70,.155,side*.16],[.14,.085,.11]);
      eyes.push(mesh(sphere,iris,'Natural iris',[.745,.217,side*.16],[.084,.038,.079]));
      eyes.push(mesh(sphere,eye,'Natural pupil',[.760,.249,side*.16],[.039,.014,.043]));
      const lid=mesh(sphere,olive,'Sleep lid',[.745,.236,side*.16],[.090,.045,.085]);lid.visible=false;lids.push(lid);
      const seam=mesh(sphere,crease,'Sleep seam',[.754,.279,side*.16],[.059,.003,.008]);seam.visible=false;seams.push(seam);
      const g=mesh(gill,crease,'Gill cover');g.scale.z=side;details.push(g);
      details.push(mesh(sphere,crease,'Nostril',[1.155,.072,side*.12],[.016,.004,.009]));
      const p=mesh(pectoral,finMaterial,'Pectoral membrane',[.66,.04,side*.39]);p.scale.z=side;
    }
    const instance=createReefAnimator(fish,group,body,near,far,{flat:true,uniforms,details,eyes,lids,seams,materials:[bodyMaterial,finMaterial]});
    const dispose=instance.dispose;instance.dispose=()=>{dispose();instances.delete(instance);};instances.add(instance);return instance;
  }
  return {create,dispose(){if(disposed)return;disposed=true;for(const i of [...instances])i.dispose();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
