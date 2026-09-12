import * as THREE from 'three';
import {createCharacterMotion,addFinDetail} from './CharacterMotion.js';

// Original character design. +X nose, animated body and independent fin motion.
export function createBlueBody(rings=40,sides=24) {
  const profile=new THREE.CatmullRomCurve3([
    [-1.42,.10,.09],[-1.12,.34,.21],[-.72,.77,.40],[-.16,.98,.53],
    [.38,1.04,.56],[.82,.87,.48],[1.12,.55,.36],[1.26,.20,.20],
  ].map(p=>new THREE.Vector3(...p)));
  const positions=[],indices=[];
  for(let i=0;i<=rings;i++) {
    const p=profile.getPoint(i/rings);
    for(let j=0;j<sides;j++) {
      const a=j/sides*Math.PI*2;
      positions.push(p.x,Math.cos(a)*p.y,Math.sin(a)*p.z);
    }
  }
  for(let i=0;i<rings;i++) for(let j=0;j<sides;j++) {
    const a=i*sides+j,b=i*sides+(j+1)%sides;
    indices.push(a,b,a+sides,b,b+sides,a+sides);
  }
  const end=positions.length/3; positions.push(-1.42,0,0,1.26,0,0);
  for(let j=0;j<sides;j++) {
    const k=(j+1)%sides;
    indices.push(end,k,j,end+1,rings*sides+j,rings*sides+k);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

export function fin(points,depth=.035) {
  const shape=new THREE.Shape(); shape.moveTo(...points[0]);
  for(let i=1;i<points.length;i+=3) shape.bezierCurveTo(...points[i],...points[i+1],...points[i+2]);
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:2,curveSegments:10});
  g.translate(0,0,-depth/2); g.computeVertexNormals(); return g;
}

export function createBlueReefLibrary({clown=false}={}) {
  const near=createBlueBody(),far=createBlueBody(20,12);
  if(clown)for(const g of [near,far]){g.scale(1,.86,1.10);g.computeVertexNormals();}
  for(const g of [near,far]){g.computeBoundingSphere();g.boundingSphere.radius=3;}
  const sphere=new THREE.SphereGeometry(1,20,14);
  const skin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.58,metalness:0});
  skin.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vBluePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBluePosition=position;');
    shader.fragmentShader='varying vec3 vBluePosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float belly=1.0-smoothstep(-.78,-.12,vBluePosition.y);
      float crown=smoothstep(.25,1.05,vBluePosition.y);
      vec3 blue=mix(vec3(.09,.47,.62),vec3(.045,.27,.39),crown*.48);
      // Staggered curved scales; preserve the smooth face and fade below pixel size.
      vec2 grid=vec2(vBluePosition.x*5.8,vBluePosition.y*5.8);
      grid.x+=mod(floor(grid.y),2.0)*.5;
      vec2 cell=fract(grid)-.5;
      float arc=abs(length(vec2(cell.x,cell.y+.42))-.49);
      float aa=max(fwidth(arc),.018);
      float scales=(1.0-smoothstep(.026,.026+aa,arc))*smoothstep(-.35,-.08,cell.y);
      float readable=1.0-smoothstep(.30,.85,max(fwidth(grid.x),fwidth(grid.y)));
      float face=1.0-smoothstep(.10,.65,vBluePosition.x);
      blue*=1.0-scales*face*readable*.24;
      blue+=vec3(.025,.045,.04)*sin(vBluePosition.x*7.0+vBluePosition.y*2.0)*face;
      diffuseColor.rgb=mix(blue,vec3(.43,.72,.72),belly*.80);
    `);
  };
  skin.customProgramCacheKey=()=>'blue-reef-skin-v2';
  if(clown) {
    skin.onBeforeCompile=s=>{
      s.vertexShader='varying vec3 vClown;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvClown=position;');
      s.fragmentShader='varying vec3 vClown;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float x=vClown.x+sin(vClown.y*3.0)*.045;
        float band=min(abs(x-.54)-.125,min(abs(x+.30)-.18,abs(x+1.12)-.085));
        float aa=max(fwidth(x),.009);
        vec3 orange=mix(vec3(.94,.20,.018),vec3(1.0,.43,.055),1.0-smoothstep(-.65,.75,vClown.y));
        vec3 color=mix(orange,vec3(.025,.032,.035),1.0-smoothstep(.028,.028+aa,band));
        color=mix(color,vec3(.98,.96,.86),1.0-smoothstep(-aa,aa,band));
        diffuseColor.rgb=color;
      `);
    };
    skin.customProgramCacheKey=()=>'clownfish-bands-v1';
  }
  const mat=(color,roughness=.6)=>new THREE.MeshStandardMaterial({color,roughness});
  const cheekMat=mat(0x55acbc),lipMat=mat(0x6ebcc5),finMat=mat(0x286b80);
  if(clown){cheekMat.color.setHex(0xf79637);lipMat.color.setHex(0xffac52);finMat.color.setHex(0xf07821);}
  addFinDetail(finMat);
  if(clown){
    const hook=finMat.onBeforeCompile;
    finMat.onBeforeCompile=s=>{
      hook(s);
      s.vertexShader='varying float vClownRim;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvClownRim=1.0-abs(normal.z);');
      s.fragmentShader='varying float vClownRim;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.025,.03,.035),smoothstep(.12,.7,vClownRim));');
    };
    finMat.customProgramCacheKey=()=>'clown-fin-rays-rim-v1';
  }
  const white=mat(0xfff4df,.3),pupilMat=mat(0x092937,.17),mouthMat=mat(0x153d49),browMat=mat(0x327488);
  if(clown)browMat.color.setHex(0x9b491f);
  const dorsal=fin([[-1,.44],[-.95,1.02],[-.48,1.53],[-.20,1.30],[-.04,1.19],[.12,1.05],[.32,.91],[.03,.64],[-.55,.46],[-1,.44]]);
  const tail=clown?fin([[0,.10],[-.3,.23],[-.62,.61],[-.82,.40],[-.99,.21],[-.99,-.21],[-.82,-.40],[-.62,-.61],[-.3,-.23],[0,-.10],[.04,-.05],[.04,.05],[0,.10]]):fin([[0,.09],[-.30,.22],[-.75,.75],[-.85,.64],[-.94,.39],[-.57,.14],[-.65,0],[-.57,-.14],[-.94,-.39],[-.85,-.64],[-.75,-.75],[-.30,-.22],[0,-.09],[.06,-.04],[.06,.04],[0,.09]]);
  const pectoral=fin([[0,.10],[-.22,.29],[-.55,.23],[-.63,-.02],[-.65,-.25],[-.40,-.40],[-.18,-.25],[-.06,-.18],[.04,-.04],[0,.10]]);
  const anal=fin([[-.97,-.46],[-.70,-1.14],[-.28,-1.25],[-.16,-.95],[-.19,-.78],[-.64,-.54],[-.97,-.46]]);
  const smile=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(.73,-.20,.435),new THREE.Vector3(.92,-.29,.38),
    new THREE.Vector3(1.15,-.29,.28),new THREE.Vector3(1.30,-.22,.11),
  ]),20,.022,6,false);
  const browGeometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(.48,.78,.39),new THREE.Vector3(.64,.88,.40),new THREE.Vector3(.84,.85,.37),
  ]),12,.043,6,false);
  const members=new Map(); let disposed=false;
  function attach(fish) {
    if(disposed) throw new Error('Blue reef library disposed');
    if(members.has(fish)) return members.get(fish);
    const basic=new THREE.Group(); basic.name='Original blue fish';
    for(const c of [...fish.children]) basic.add(c);
    fish.add(basic);
    const detailed=new THREE.Group(); detailed.name=clown?'Clownvis':'Blauwe karaktervis'; fish.add(detailed);
    const mesh=(geometry,material,name,position=[0,0,0],scale=[1,1,1])=>{
      const m=new THREE.Mesh(geometry,material); m.name=name;
      m.position.set(...position);m.scale.set(...scale);detailed.add(m);return m;
    };
    const body=mesh(near,skin,'Rounded body');
    mesh(dorsal,finMat,'Dorsal fin'); mesh(tail,finMat,'Fan tail',[-1.40,0,0]);
    mesh(anal,finMat,'Ventral fin');
    const details=[];
    for(const side of [-1,1]) {
      // Cheeks sit inside the body silhouette; the eye whites project from both sides.
      details.push(mesh(sphere,cheekMat,'Cheek',[.83,-.15,side*.26],[.46,.32,.21]));
      details.push(mesh(sphere,white,'Eye white',[.75,.42,side*.405],[.31,.34,.18]));
      details.push(mesh(sphere,pupilMat,'Pupil',[.86,.43,side*.552],[.14,.175,.065]));
      details.push(mesh(sphere,white,'Eye glint',[.89,.49,side*.603],[.035,.041,.016]));
      const brow=mesh(browGeometry,browMat,'Brow'); brow.scale.z=side; details.push(brow);
      const smileSide=mesh(smile,mouthMat,'Smile'); smileSide.scale.z=side;
      const p=mesh(pectoral,finMat,'Pectoral fin',[.03,-.09,side*.48]); p.rotation.y=-side*.45;
      if(clown&&side===1)p.scale.setScalar(.62);
    }
    // Dark inset framed by upper/lower lips: a real silhouette, not a painted smile.
    mesh(sphere,mouthMat,'Mouth opening',[1.235,-.265,0],[.12,.10,.26]);
    mesh(sphere,lipMat,'Upper lip',[1.25,-.18,0],[.145,.075,.29]);
    mesh(sphere,lipMat,'Lower lip',[1.22,-.355,0],[.14,.07,.265]);
    fish.userData.visualSpecies=clown?'Clownvis':'Blauwe karaktervis';
    const motion=createCharacterMotion(detailed,fish,{clown});
    const m={basic,detailed,body,details,motion};members.set(fish,m);basic.visible=false;return m;
  }
  function update(camera,quality,enabled=true,time=0) {
    const distance=quality==='low'?14:quality==='high'?38:24;
    for(const [fish,m] of members) {
      if(!fish.parent) {m.motion.dispose();members.delete(fish);continue;}
      m.basic.visible=!enabled;m.detailed.visible=enabled;
      if(!enabled||!fish.visible||fish.userData.dead) continue;
      const close=fish.position.distanceToSquared(camera.position)<distance*distance;
      m.body.geometry=close?near:far;
      m.motion.update(time,close);
      // Eyes and lips remain readable at distance; only fine facial details disappear.
      for(const d of m.details) d.visible=close||d.name==='Eye white'||d.name==='Pupil';
    }
  }
  function dispose() {
    if(disposed)return;disposed=true;
    for(const [fish,m] of members) {
      m.motion.dispose();
      fish.remove(m.detailed);
      for(const child of [...m.basic.children])fish.add(child);
      fish.remove(m.basic);delete fish.userData.visualSpecies;
    }
    members.clear();
    for(const g of [near,far,sphere,dorsal,tail,pectoral,anal,smile,browGeometry])g.dispose();
    for(const m of [skin,cheekMat,lipMat,finMat,white,pupilMat,mouthMat,browMat])m.dispose();
  }
  return {attach,update,dispose,get size(){return members.size;}};
}
