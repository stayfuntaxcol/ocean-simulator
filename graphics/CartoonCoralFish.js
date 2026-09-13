import * as THREE from 'three';
import {createFinMembrane} from './FishSurfaceDetail.js';

export function createCartoonCoralAssets(){
  const geometries=[],materials=[];
  const own=g=>(geometries.push(g),g),sphere=own(new THREE.SphereGeometry(1,20,14));
  const body=own(new THREE.SphereGeometry(1,32,22));
  const fin=own(new THREE.CircleGeometry(1,24));
  const tailGeometry=own(createFinMembrane([[0,.10,0],[0,0,0],[0,-.10,0]],
    [[-.45,.52,0],[-.65,.40,0],[-.58,0,0],[-.65,-.40,0],[-.45,-.52,0]],18,4));
  const dorsalGeometry=own(createFinMembrane([[-.85,.57,0],[-.3,.85,0],[.35,.80,0]],
    [[-1.02,.72,0],[-.46,1.17,0],[.35,.80,0]],18,4));
  const mat=(color,roughness=.48)=>{const m=new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});materials.push(m);return m;};
  const yellow=mat(0xf3bd22),dark=mat(0x152c35),white=mat(0xfff8e7,.25),iris=mat(0x30271c,.18),lip=mat(0xe9982c);
  function create(fish){
    const group=new THREE.Group();group.name='Cartoon koraalvis';group.visible=false;fish.add(group);
    const mesh=(g,m,name,p=[0,0,0],sc=[1,1,1])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...p);o.scale.set(...sc);group.add(o);return o;};
    const bodyMesh=mesh(body,yellow,'Cartoon coral body',[0,0,0],[1.18,.92,.35]);
    const tail=mesh(tailGeometry,yellow,'Cartoon coral tail',[-1.08,0,0]);
    const dorsal=mesh(dorsalGeometry,dark,'Cartoon coral dorsal');
    const pectorals=[];
    for(const side of [-1,1]){
      mesh(sphere,white,'Cartoon eye',[.72,.31,side*.31],[.25,.28,.13]);
      mesh(sphere,iris,'Cartoon pupil',[.80,.30,side*.408],[.105,.14,.045]);
      mesh(sphere,white,'Cartoon eye catchlight',[.835,.365,side*.445],[.025,.032,.012]);
      const p=mesh(fin,yellow,'Cartoon coral pectoral',[-.02,-.12,side*.35],[.32,.28,1]);p.rotation.y=side*.35;pectorals.push(p);
    }
    mesh(sphere,dark,'Cartoon face band',[.56,.05,0],[.11,.78,.37]);
    mesh(sphere,lip,'Cartoon mouth',[1.15,-.16,0],[.15,.075,.13]);
    mesh(sphere,dark,'Cartoon mouth opening',[1.281,-.16,0],[.016,.027,.068]);
    return {group,body:bodyMesh,tail,dorsal,pectorals};
  }
  let disposed=false;
  return {create,dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
