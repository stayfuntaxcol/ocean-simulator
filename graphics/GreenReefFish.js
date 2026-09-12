import * as THREE from 'three';
import {createBlueBody,fin} from './BlueReefFish.js';

// Broad, flat original character inspired by the olive-green reference.
export function createGreenBody(rings=40,sides=24) {
  const g=createBlueBody(rings,sides);
  g.scale(1.12,.36,1.75);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function createGreenReefLibrary() {
  const near=createGreenBody(),far=createGreenBody(20,12);
  const sphere=new THREE.SphereGeometry(1,16,12);
  const material=(color,roughness=.65)=>new THREE.MeshStandardMaterial({color,roughness});
  const skin=material(0xffffff),olive=material(0x899343),lip=material(0xa6ae55);
  const white=material(0xfff5db,.32),dark=material(0x233727,.25),finMat=material(0x647849);
  skin.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vGreen;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGreen=position;');
    s.fragmentShader='varying vec3 vGreen;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 grid=vGreen.xz*5.0;
      vec2 id=floor(grid);
      float random=fract(sin(dot(id,vec2(127.1,311.7)))*43758.5453);
      vec2 offset=vec2(random-.5,fract(random*17.7)-.5)*.34;
      float d=length((fract(grid)-.5-offset)*vec2(1.0,1.3));
      float aa=max(fwidth(d),.02);
      float spot=(1.0-smoothstep(.11+random*.08,.11+random*.08+aa,d));
      spot*=1.0-smoothstep(.3,.9,max(fwidth(grid.x),fwidth(grid.y)));
      float upper=smoothstep(-.02,.16,vGreen.y);
      float face=1.0-smoothstep(.55,1.25,vGreen.x);
      vec3 base=mix(vec3(.70,.70,.35),vec3(.38,.46,.12),smoothstep(-.25,.35,vGreen.y));
      base=mix(base,vec3(.19,.34,.20),spot*upper*face*.55);
      diffuseColor.rgb=base;
    `);
  };
  skin.customProgramCacheKey=()=>'green-flatfish-skin-v1';
  const sideFin=fin([[.80,0],[.33,.30],[-.47,.45],[-1.22,.25],[-1.42,.12],[-1.42,-.05],[-1.10,-.10],[-.40,-.16],[.39,-.11],[.80,0]]);
  const tail=fin([[0,.08],[-.25,.22],[-.59,.48],[-.74,.39],[-.85,.18],[-.79,-.18],[-.74,-.39],[-.59,-.48],[-.25,-.22],[0,-.08],[.04,-.05],[.04,.05],[0,.08]]);
  const dorsal=fin([[-1,.20],[-.82,.70],[-.34,.76],[-.12,.32],[-.3,.20],[-.8,.15],[-1,.20]]);
  const curve=(points,radius)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,radius,6,false);
  const smile=curve([[1.08,-.025,-.62],[1.36,-.13,-.32],[1.44,-.16,0],[1.36,-.13,.32],[1.08,-.025,.62]],.032);
  const lowerLip=curve([[1.09,-.075,-.60],[1.36,-.19,-.32],[1.43,-.21,0],[1.36,-.19,.32],[1.09,-.075,.60]],.053);
  const members=new Map();let disposed=false;
  function attach(fish) {
    if(disposed)throw Error('Green reef library disposed');if(members.has(fish))return members.get(fish);
    const basic=new THREE.Group();basic.name='Original green fish';
    for(const c of [...fish.children])basic.add(c);fish.add(basic);
    const detailed=new THREE.Group();detailed.name='Groene platvis';fish.add(detailed);
    const mesh=(g,m,name,pos=[0,0,0],scale=[1,1,1])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...pos);o.scale.set(...scale);detailed.add(o);return o;};
    const body=mesh(near,skin,'Flat body');
    // Soft muzzle blends into the flattened body and supports the wide smile.
    mesh(sphere,olive,'Muzzle',[1.02,-.02,0],[.45,.24,.66]);
    mesh(smile,dark,'Smile');mesh(lowerLip,lip,'Lower lip');
    const details=[];
    for(const side of [-1,1]) {
      const f=mesh(sideFin,finMat,'Side fringe',[-.1,-.02,side*.65]);f.rotation.x=side*Math.PI/2;
      mesh(sphere,olive,'Eye mound',[.65,.31,side*.39],[.27,.16,.25]);
      mesh(sphere,white,'Eye white',[.71,.405,side*.39],[.205,.19,.19]);
      mesh(sphere,dark,'Pupil',[.825,.49,side*.42],[.087,.078,.093]);
      details.push(mesh(sphere,white,'Eye glint',[.859,.535,side*.435],[.023,.024,.024]));
    }
    const caudal=mesh(tail,finMat,'Tail',[-1.55,0,0]);caudal.rotation.x=Math.PI/2;
    mesh(dorsal,finMat,'Dorsal fin',[-.14,.02,0]);
    fish.userData.visualSpecies='Groene platvis';
    const m={body,basic,detailed,details};members.set(fish,m);basic.visible=false;return m;
  }
  function update(camera,quality,enabled=true) {
    const limit=quality==='low'?14:quality==='high'?38:24;
    for(const [fish,m] of members) {
      if(!fish.parent){members.delete(fish);continue;}
      m.basic.visible=!enabled;m.detailed.visible=enabled;
      if(!enabled||!fish.visible)continue;
      const close=fish.position.distanceToSquared(camera.position)<limit*limit;
      m.body.geometry=close?near:far;for(const d of m.details)d.visible=close;
    }
  }
  function dispose() {
    if(disposed)return;disposed=true;
    for(const [fish,m] of members){fish.remove(m.detailed);for(const c of [...m.basic.children])fish.add(c);fish.remove(m.basic);delete fish.userData.visualSpecies;}
    members.clear();
    for(const g of [near,far,sphere,sideFin,tail,dorsal,smile,lowerLip])g.dispose();
    for(const m of [skin,olive,lip,white,dark,finMat])m.dispose();
  }
  return {attach,update,dispose,get size(){return members.size;}};
}
