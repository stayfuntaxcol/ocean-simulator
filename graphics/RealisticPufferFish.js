import * as THREE from 'three';

export function createRealisticPufferAssets(){
  const geometries=[],materials=[];
  const own=g=>(geometries.push(g),g);
  const near=own(new THREE.SphereGeometry(1,48,32)),far=own(new THREE.SphereGeometry(1,20,14));
  const sphere=own(new THREE.SphereGeometry(1,20,14));
  const fin=own(new THREE.SphereGeometry(1,18,10));
  const spine=own(new THREE.ConeGeometry(.022,.18,6));spine.translate(0,.09,0);
  const beak=own(new THREE.SphereGeometry(1,16,10));
  const mat=(color,roughness=.58)=>{const m=new THREE.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
  const skin=mat(0xffffff,.62),finMat=mat(0xa89d67,.68),eyeWhite=mat(0xc9c6a5,.35),iris=mat(0x8e9a53,.27),pupil=mat(0x090d0b,.12),beakMat=mat(0xc7b890,.52),spineMat=mat(0xd7cfad,.66);
  skin.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vRealPuffer;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRealPuffer=position;');
    s.fragmentShader='varying vec3 vRealPuffer;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=vRealPuffer;
      float belly=1.0-smoothstep(-.46,.12,p.y);
      float n=sin(p.x*31.0+sin(p.z*13.0))*sin(p.y*37.0-p.z*19.0);
      float spots=smoothstep(.72,.92,sin(p.x*11.0+p.z*5.0)*sin(p.y*13.0-p.z*9.0));
      spots*=1.0-smoothstep(.45,1.4,length(fwidth(p*18.0)));
      vec3 back=mix(vec3(.34,.36,.20),vec3(.49,.47,.25),n*.5+.5);
      back=mix(back,vec3(.075,.095,.055),spots*.78);
      diffuseColor.rgb=mix(back,vec3(.82,.79,.61),belly*.92);
    `);
  };
  skin.customProgramCacheKey=()=>'realistic-puffer-skin-v1';
  function create(fish){
    const group=new THREE.Group();group.name='Realistische kogelvis';group.visible=false;fish.add(group);
    const mesh=(g,m,name,p=[0,0,0],sc=[1,1,1])=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...p);o.scale.set(...sc);group.add(o);return o;};
    const body=mesh(near,skin,'Real puffer body',[0,0,0],[1.20,.66,.61]);
    const face=[],fins=[];
    for(const side of [-1,1]){
      face.push(mesh(sphere,eyeWhite,'Real puffer eye',[.73,.24,side*.475],[.155,.17,.085]));
      face.push(mesh(sphere,iris,'Real puffer iris',[.79,.245,side*.545],[.09,.105,.041]));
      face.push(mesh(sphere,pupil,'Real puffer pupil',[.81,.245,side*.577],[.045,.062,.018]));
      fins.push(mesh(fin,finMat,'Real puffer pectoral',[-.07,-.04,side*.59],[.25,.21,.025]));
    }
    face.push(mesh(beak,beakMat,'Puffer beak upper',[1.17,-.045,0],[.12,.055,.12]));
    face.push(mesh(beak,beakMat,'Puffer beak lower',[1.16,-.13,0],[.11,.045,.115]));
    const tail=mesh(fin,finMat,'Real puffer tail',[-1.39,-.01,0],[.38,.31,.028]);
    const dorsal=mesh(fin,finMat,'Real puffer dorsal',[-.52,.52,0],[.24,.20,.025]);
    const spines=new THREE.InstancedMesh(spine,spineMat,96);spines.name='Real puffer spines';spines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(spines);
    const directions=[];
    for(let i=0;i<96;i++){const y=1-2*(i+.5)/96,a=i*2.399963,r=Math.sqrt(1-y*y),n=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);if(n.x>.62)n.x=-n.x;directions.push(n.normalize());}
    const rest=new Map([...face,...fins,tail,dorsal].map(o=>[o,o.position.clone()]));
    return {group,body,face,fins,tail,dorsal,spines,directions,rest};
  }
  let disposed=false;
  return {near,far,create,dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
