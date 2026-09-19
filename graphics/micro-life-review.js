import * as THREE from 'three';
import { createMicroGeometry, MICRO_TYPES } from './MicroLifeGeometry.js';
import { createMicroGeometry as createClassicGeometry } from './MicroLifeGeometryClassic.js';
import { createMicroLife, createMicroMaterial } from './MicroLife.js';
import { createMicroLife as createClassicLife, createMicroMaterial as createClassicMaterial } from './MicroLifeClassic.js';
import { createReefLife } from './ReefLife.js';
import { installCaustics } from './UnderwaterAtmosphere.js';
import { createMicroContactMesh } from './MicroLifeMaterials.js';

const stage=document.getElementById('stage'),status=document.getElementById('status');
const notes={
  habitat:'Rifbodem · kleine dieren op de bodem, scholen in het open water.',
  shoal:'Garnalenzwerm · losse samenhang, eigen zwemrichtingen en afstand tot buren. Laat een grote vis naderen om de achterwaartse vlucht te bekijken.',
  shelters:'Krabben bij de rotsen · eigen schuilplekken, lange rust en korte zijwaartse voedseltochten. Bekijk dit beeld minstens een halve minuut.',
  shrimp:'Garnaal · geleed achterlijf, lichte rugstreep, antennes en afwisselende pootbeweging.',
  starfish:'Zeester · doorlopende, afgeronde armen en kleine huidknobbeltjes. Blijft rustig liggen.',
  urchin:'Zee-egel · dichte stekelkrans met subtiele, afzonderlijke stekelbeweging.',
  shell:'Schelp · twee geribbelde kleppen met wanddikte en een langzaam bewegend scharnier.',
  crab:'Krab · acht looppoten, ogen op steeltjes en afzonderlijk bewegende scharen.',
  minnow:'Schoolvis · zilveren flank, gevorkte staart en kleine borstvinnen.',
  schools:'Scholen · samen draaien in de zwemrichting; de dieren blijven zichtbaar wanneer je nadert.',
  plankton:'Plankton · zachte deeltjes met verschillende groottes, kleuren en drijfsnelheden.',
};
try {
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;stage.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x174d59);scene.fog=new THREE.FogExp2(0x174d59,.022);
  scene.add(new THREE.HemisphereLight(0xcce9e6,0x6e7765,2.1));
  const key=new THREE.DirectionalLight(0xffe4bb,3.0);key.position.set(-4,8,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x94d8e5,1.2);rim.position.set(4,4,-5);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(39,1,.03,130),clock={value:12},light={oceanTime:clock,oceanStrength:{value:.17}};
  const terrain=(x,z)=>.12*x+.06*Math.sin(x*.45)*Math.cos(z*.3);
  const world=new THREE.Group(),macro=new THREE.Group();scene.add(world,macro);
  const groundGeometry=new THREE.PlaneGeometry(110,110,100,100);groundGeometry.rotateX(-Math.PI/2);
  const p=groundGeometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,terrain(p.getX(i),p.getZ(i))-.014);groundGeometry.computeVertexNormals();
  const sand=installCaustics(new THREE.MeshStandardMaterial({color:0xb7b296,roughness:.98}),light);
  const ground=new THREE.Mesh(groundGeometry,sand);world.add(ground);
  const macroGround=new THREE.Mesh(new THREE.CircleGeometry(8,64),sand);macroGround.rotation.x=-Math.PI/2;macroGround.position.y=-.008;macro.add(macroGround);
  const macroContact=createMicroContactMesh(1);macro.add(macroContact);
  const contactPose=new THREE.Object3D();contactPose.position.y=-.004;
  const rocks=[],rockMaterial=new THREE.MeshStandardMaterial({color:0x6b8279,roughness:.97});
  for(const [x,z,sx,sy,sz] of [[-3,-5,1.4,.65,1.15],[4,-7,1.65,.95,1.4],[-8,-13,2.2,1.2,1.7]]) {
    const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),rockMaterial);rock.scale.set(sx,sy,sz);rock.position.set(x,terrain(x,z)+sy*.55,z);world.add(rock);rocks.push(rock);
  }
  const reef=createReefLife(light,{style:'organic'}),envelopes=[];
  for(const [type,x,z,color,sx,sy,sz] of [['plate',-4,-4,0xc89bb5,2.4,1.3,2.0],['sponge',4,-5,0xd4b36a,1.5,1.8,1.4],['anemone',-2,-2,0x85baa2,1.7,2,1.6]]) {
    const root=new THREE.Group();root.position.set(x,terrain(x,z),z);world.add(root);
    const envelope=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial());envelope.position.y=sy/2;root.add(envelope);envelopes.push(envelope);
    reef.attach(root,type,color,1);
  }
  world.updateMatrixWorld(true);
  const habitats=()=>[[-4,-3],[3,-4],[0,-12],[-12,-16],[12,-16]].map(([x,z])=>({x,z}));
  const obstacles=()=>rocks.map(r=>new THREE.Box3().setFromObject(r));
  const predator=new THREE.Mesh(createMicroGeometry('minnow'),createMicroMaterial('minnow',clock,light,false));
  predator.scale.setScalar(4.2);predator.visible=false;world.add(predator);let encounter=0;
  const threats=()=>encounter>0?[{position:predator.position,radius:.85}]:[];
  const versions=new Map();
  for(const style of ['detailed','classic']) {
    const factory=style==='detailed'?createMicroLife:createClassicLife;
    const life=factory({scene:world,terrain,getHabitats:habitats,getObstacles:obstacles,getShelters:obstacles,getThreats:threats,boundary:50,caustics:light});
    const models=new Map();
    for(const type of [...MICRO_TYPES,'minnow']) {
      const geometryFactory=style==='detailed'?createMicroGeometry:createClassicGeometry;
      const near=geometryFactory(type),far=geometryFactory(type,true);
      const material=(style==='detailed'?createMicroMaterial:createClassicMaterial)(type,clock,light,false);
      const mesh=new THREE.Mesh(near,material);macro.add(mesh);models.set(type,{near,far,material,mesh});
    }
    versions.set(style,{life,models});
  }
  const species=document.getElementById('species'),quality=document.getElementById('quality'),angle=document.getElementById('angle');
  species.add(new Option('Garnalenzwerm en vlucht','shoal'),1);species.add(new Option('Krabben tussen rotsen','shelters'),2);
  let style='detailed',paused=false,time=12,last=performance.now(),frameId,stopped=false;
  let aimSchool=false,aimShoal=false;
  function placeCamera() {
    const view=species.value,narrow=Math.max(1,1.25/camera.aspect);
    const close=[...MICRO_TYPES,'minnow'].includes(view);
    if(close){camera.position.set(.9*narrow,.94*narrow,1.6*narrow);camera.lookAt(.03,.15,0);}
    else if(view==='plankton'){camera.position.set(0,7,8*narrow);camera.lookAt(0,7,-5);}
    else if(view==='shelters'){camera.position.set(1.5*narrow,4.2*narrow,2*narrow);camera.lookAt(-3,.2,-5);}
    else {camera.position.set(2.2*narrow,2.7*narrow,7.5*narrow);camera.lookAt(0,.3,-2);}
    aimSchool=view==='schools';aimShoal=view==='shoal';angle.disabled=!close;
    document.getElementById('caption').textContent=notes[view];
  }
  function resize(){renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();placeCamera();}
  addEventListener('resize',resize);resize();species.onchange=placeCamera;
  for(const button of ['detailed','classic'])document.getElementById(button).onclick=()=>{
    style=button;for(const id of ['detailed','classic'])document.getElementById(id).setAttribute('aria-pressed',String(id===style));
    if(species.value==='schools')aimSchool=true;
  };
  document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Verder bewegen':'Pauzeren';e.target.setAttribute('aria-pressed',String(paused));};
  document.getElementById('encounter').onclick=()=>{
    document.getElementById('detailed').click();species.value='shoal';placeCamera();
    const a=versions.get('detailed').life.snapshot().find(a=>a.type==='shrimp'&&a.state==='SWIM');
    if(a){predator.position.fromArray(a.position).add(new THREE.Vector3(1.5,.15,0));predator.rotation.y=Math.PI;encounter=4;}
  };
  function frame(now) {
    if(stopped)return;const dt=paused?0:Math.max(0,Math.min(.05,(now-last)/1000));last=now;time+=dt;clock.value=time;
    encounter=Math.max(0,encounter-dt);predator.visible=encounter>0&&style==='detailed';if(encounter>0)predator.position.x-=dt*.22;
    const close=[...MICRO_TYPES,'minnow'].includes(species.value);world.visible=!close;macro.visible=close;
    macroContact.count=close&&species.value!=='minnow'&&style==='detailed'?1:0;
    contactPose.scale.setScalar(species.value==='crab'?.52:species.value==='starfish'?.40:.34);contactPose.updateMatrix();macroContact.setMatrixAt(0,contactPose.matrix);macroContact.instanceMatrix.needsUpdate=true;
    for(const [version,entry] of versions) {
      entry.life.update(dt,camera,{enabled:version===style&&!close,quality:quality.value,paused,showSchools:species.value!=='plankton',showPlankton:document.getElementById('particles').checked});
      for(const [type,m] of entry.models){m.mesh.visible=close&&version===style&&type===species.value;m.mesh.geometry=quality.value==='low'?m.far:m.near;m.mesh.rotation.y=Number(angle.value)*Math.PI/180;m.mesh.position.y=type==='minnow'?.22:0;}
    }
    if(aimSchool) {
      const life=versions.get(style).life,meshes=life.root.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('minnow')&&m.count);
      if(meshes.length){const matrix=new THREE.Matrix4();meshes[0].getMatrixAt(0,matrix);const target=new THREE.Vector3().setFromMatrixPosition(matrix);camera.position.copy(target).add(new THREE.Vector3(1.2,1.7,style==='classic'?15:9));camera.lookAt(target);aimSchool=false;}
    }
    if(aimShoal&&style==='detailed') {
      const a=versions.get(style).life.snapshot().find(a=>a.type==='shrimp');
      if(a){const target=new THREE.Vector3().fromArray(a.home);camera.position.copy(target).add(new THREE.Vector3(3,2.4,6));camera.lookAt(target);aimShoal=false;}
    }
    reef.setTime(time);reef.update(camera,quality.value,true);
    renderer.render(scene,camera);
    const stats=versions.get(style).life.stats;
    status.textContent=close?`${style==='detailed'?'Verbeterde anatomie':'Eerdere versie'} · ${renderer.info.render.triangles.toLocaleString('nl-NL')} driehoeken in beeld`:
      `${stats.bottom} bodemdieren · ${stats.shrimp??stats.species?.shrimp??0} garnalen · ${stats.hiddenCrabs??0}/${stats.crabs??0} krabben bij hun schuilplek · ${stats.escaping??0} garnalen vluchten · ${stats.fish} schoolvissen`;
    stage.dataset.ready='true';stage.dataset.time=String(time);stage.dataset.bottom=String(stats.bottom);stage.dataset.fish=String(stats.fish);stage.dataset.style=style;
    stage.dataset.escaping=String(stats.escaping??0);stage.dataset.crabs=String(stats.crabs??0);
    frameId=requestAnimationFrame(frame);
  }
  frameId=requestAnimationFrame(frame);
  addEventListener('pagehide',()=>{
    stopped=true;cancelAnimationFrame(frameId);removeEventListener('resize',resize);
    versions.forEach(v=>{v.life.dispose();v.models.forEach(m=>{m.near.dispose();m.far.dispose();m.material.dispose();});});
    reef.dispose();envelopes.forEach(m=>m.material.dispose());rocks.forEach(r=>r.geometry.dispose());rockMaterial.dispose();
    groundGeometry.dispose();macroGround.geometry.dispose();sand.dispose();renderer.dispose();
    macroContact.dispose();macroContact.geometry.dispose();macroContact.material.dispose();
    predator.geometry.dispose();predator.material.dispose();
  },{once:true});
} catch(error) { status.textContent='Microlevenproef kon niet starten: '+error.message;console.error(error); }
