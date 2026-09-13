import * as THREE from 'three';

export function createCartoonCoralAssets(){
  const geometries=[],materials=[];
  const own=g=>(geometries.push(g),g),sphere=own(new THREE.SphereGeometry(1,20,14));
  const body=own(new THREE.SphereGeometry(1,32,22));
  const fin=own(new THREE.CircleGeometry(1,24));
  const mat=(color,roughness=.48)=>{const m=new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});materials.push(m);return m;};
  const yellow=mat(0xf3bd22),dark=mat(0x152c35),white=mat(0xfff8e7,.25),iris=mat(0x30271c,.18),lip=mat(0xe9982c);
  function create(fish){
    const group=new THREE.Group();group.name='Cartoon koraalvis';group.visible=false;fish.add(group);
    const mesh=(g,m,name,p=[0,0,0],sc=[1,1,1])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...p);o.scale.set(...sc);group.add(o);return o;};
    const bodyMesh=mesh(body,yellow,'Cartoon coral body',[0,0,0],[1.18,.92,.35]);
    const tail=mesh(fin,yellow,'Cartoon coral tail',[-1.25,0,0],[.58,.70,1]);tail.rotation.y=Math.PI/2;
    const dorsal=mesh(fin,dark,'Cartoon coral dorsal',[-.20,.84,0],[.62,.42,1]);dorsal.rotation.x=Math.PI/2;
    const pectorals=[];
    for(const side of [-1,1]){
      mesh(sphere,white,'Cartoon eye',[.72,.31,side*.31],[.25,.28,.13]);
      mesh(sphere,iris,'Cartoon pupil',[.80,.30,side*.408],[.105,.14,.045]);
      const p=mesh(fin,yellow,'Cartoon coral pectoral',[.18,-.12,side*.35],[.32,.40,1]);p.rotation.y=Math.PI/2;p.rotation.z=side*.25;pectorals.push(p);
    }
    mesh(sphere,dark,'Cartoon face band',[.56,.05,0],[.11,.78,.37]);
    mesh(sphere,lip,'Cartoon mouth',[1.15,-.16,0],[.15,.075,.16]);
    return {group,body:bodyMesh,tail,dorsal,pectorals};
  }
  let disposed=false;
  return {create,dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
