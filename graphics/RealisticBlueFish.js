import * as THREE from 'three';
import {createCharacterMotion,addFinDetail} from './CharacterMotion.js';

// First realism study: a separate silhouette, shared assets, same simulation root.
export function createRealisticBlueAssets(fin) {
  const geometry=[],materials=[];
  const own=g=>(geometry.push(g),g);
  function body(segments) {
    const profile=new THREE.SplineCurve([
      [0,-1.42],[.09,-1.30],[.30,-.95],[.57,-.45],[.69,.05],
      [.62,.49],[.42,.86],[.19,1.13],[.07,1.27],[0,1.30],
    ].map(p=>new THREE.Vector2(...p)));
    const g=own(new THREE.LatheGeometry(profile.getPoints(40),segments));
    g.rotateZ(-Math.PI/2);g.scale(1,1,.53);g.computeVertexNormals();return g;
  }
  const near=body(32),far=body(12),sphere=own(new THREE.SphereGeometry(1,16,12));
  const mat=(color,roughness=.45)=>{const m=new THREE.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
  const skin=mat(0xffffff,.38),finMat=mat(0x245b88,.52),iris=mat(0x8a985e,.28),eye=mat(0x030b13,.12),crease=mat(0x143c57,.58);
  addFinDetail(finMat);
  skin.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vRealBlue;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRealBlue=position;');
    s.fragmentShader='varying vec3 vRealBlue;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float belly=1.0-smoothstep(-.55,-.08,vRealBlue.y);
      float back=smoothstep(.05,.65,vRealBlue.y);
      vec3 skinColor=mix(vec3(.035,.29,.53),vec3(.014,.09,.20),back);
      skinColor=mix(skinColor,vec3(.47,.65,.69),belly*.88);
      vec2 grid=vRealBlue.xy*26.0;
      grid.x+=mod(floor(grid.y),2.0)*.5;
      vec2 cell=fract(grid)-.5;
      float arc=abs(length(vec2(cell.x,cell.y+.35))-.48);
      float aa=max(fwidth(arc),.025);
      float detail=(1.0-smoothstep(.025,.025+aa,arc))*(1.0-smoothstep(.25,.90,vRealBlue.x));
      detail*=1.0-smoothstep(.4,1.2,max(fwidth(grid.x),fwidth(grid.y)));
      skinColor*=1.0-detail*.19;
      skinColor+=vec3(.01,.025,.03)*sin(vRealBlue.x*17.0+vRealBlue.y*9.0);
      diffuseColor.rgb=skinColor;
    `);
  };
  skin.customProgramCacheKey=()=>'realistic-blue-study-v1';
  const dorsal=own(fin([[-1.15,.18],[-.9,.56],[-.5,.92],[.12,.76],[.34,.71],[.40,.64],[.44,.57],[.05,.40],[-.7,.22],[-1.15,.18]],.012));
  const ventral=own(dorsal.clone());ventral.scale(1,-.72,1);
  const tail=own(fin([[0,.08],[-.3,.17],[-.67,.66],[-.83,.61],[-.72,.30],[-.48,.08],[-.46,0],[-.48,-.08],[-.72,-.30],[-.83,-.61],[-.67,-.66],[-.3,-.17],[0,-.08],[.03,-.03],[.03,.03],[0,.08]],.012));
  const pectoral=own(fin([[0,.07],[-.22,.07],[-.56,-.12],[-.50,-.29],[-.37,-.37],[-.10,-.18],[0,.07]],.01));
  const gill=own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(.61,.33,.24),new THREE.Vector3(.46,.14,.32),new THREE.Vector3(.47,-.14,.32),new THREE.Vector3(.62,-.30,.24),
  ]),18,.009,5,false));
  const mouth=own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.12,-.08,-.08),new THREE.Vector3(1.285,-.045,0),new THREE.Vector3(1.12,-.08,.08),
  ]),12,.009,5,false));
  function create(fish) {
    const group=new THREE.Group();group.name='Realistische blauwe vis (proef)';group.visible=false;fish.add(group);
    const mesh=(g,m,name,p=[0,0,0],scale=[1,1,1])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...p);o.scale.set(...scale);group.add(o);return o;};
    const bodyMesh=mesh(near,skin,'Rounded body');
    mesh(dorsal,finMat,'Dorsal fin');mesh(ventral,finMat,'Ventral fin');mesh(tail,finMat,'Fan tail',[-1.40,0,0]);mesh(mouth,crease,'Mouth seam');
    const details=[];
    for(const side of [-1,1]) {
      mesh(sphere,iris,'Iris',[.87,.17,side*.192],[.094,.10,.048]);
      mesh(sphere,eye,'Natural eye',[.881,.174,side*.227],[.064,.071,.025]);
      const g=mesh(gill,crease,'Gill cover');g.scale.z=side;details.push(g);
      const p=mesh(pectoral,finMat,'Pectoral fin',[.36,-.13,side*.31]);p.rotation.y=-side*.35;
    }
    const motion=createCharacterMotion(group,fish);
    return {group,body:bodyMesh,motion,update(time,close){bodyMesh.geometry=close?near:far;motion.update(time,close);for(const d of details)d.visible=close;},dispose(){motion.dispose();fish.remove(group);}};
  }
  let disposed=false;
  return {create,dispose(){if(disposed)return;disposed=true;geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
