import * as THREE from 'three';
import {addSurfaceRelief} from './FishSurfaceDetail.js';
import {hydrofoil,geometryLease} from './AnimalForms.js';
import {DEFAULT_ANIMAL_SETTINGS,turtleLife} from '../animals/AnimalSettings.js';
export function createSeaTurtle(settings=DEFAULT_ANIMAL_SETTINGS.turtle,age=settings.age){
 const lease=geometryLease(),root=new THREE.Group();root.name='Zeeschildpad';root.userData={isFishRoot:true,isReefVisitor:true,visitorKind:'turtle',visualSpecies:'Zeeschildpad',health:100,velocity:new THREE.Vector3(.5,0,0)};
 const life=turtleLife(age,settings),shellMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:settings.roughness}),flesh=new THREE.MeshStandardMaterial({color:new THREE.Color().lerpColors(new THREE.Color('#99b76a'),new THREE.Color('#424b30'),life.maturity*.8+life.old*.2),roughness:settings.roughness}),belly=new THREE.MeshStandardMaterial({color:0xcfc198,roughness:.7}),eyeMat=new THREE.MeshStandardMaterial({color:0x070e0b,roughness:.12});
 shellMat.onBeforeCompile=s=>{s.uniforms.turtleAge={value:life.maturity+life.old};s.vertexShader='varying vec3 vShell;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvShell=position;');s.fragmentShader='varying vec3 vShell;uniform float turtleAge;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 q=vShell.xz*vec2(5.0,6.5);q.x+=mod(floor(q.y),2.0)*.5;vec2 c=fract(q)-.5;
 float seam=smoothstep(.38,.47,max(abs(c.y),abs(c.x)*.82+abs(c.y)*.35));
 float rings=.5+.5*sin(length(c)*72.0+sin(q.x*5.0)*.7);
 float grain=sin(q.x*59.0)*sin(q.y*73.0);float scar=pow(max(0.0,sin(q.x*2.3+q.y*1.8)),36.0)*step(.65,sin(q.y*4.0))*clamp(turtleAge-1.0,0.0,1.0);
 vec3 coat=mix(vec3(.42,.50,.22),vec3(.20,.24,.12),clamp(turtleAge*.5,0.0,1.0));coat*=.86+rings*.14+grain*.045*turtleAge;
 diffuseColor.rgb=mix(coat,vec3(.095,.13,.06),seam*.85);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.48,.43,.29),scar*.7);
 `);addSurfaceRelief(s,'(sin(vShell.x*43.0)*sin(vShell.z*51.0))*.22*turtleAge','(sin(vShell.x*43.0)*sin(vShell.z*51.0))*.13*turtleAge',.003);};shellMat.customProgramCacheKey=()=>'turtle-shell-v2';
 flesh.onBeforeCompile=s=>{s.vertexShader='varying vec3 vTurtleSkin;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTurtleSkin=position;');s.fragmentShader='varying vec3 vTurtleSkin;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec2 tp=fract(vTurtleSkin.xz*12.0)-.5;float scaleEdge=smoothstep(.32,.48,length(tp));diffuseColor.rgb*=.82+.18*scaleEdge;');};flesh.customProgramCacheKey=()=>"turtle-scaled-skin-v1";
 const sphere=lease.get('turtle-sphere',()=>new THREE.SphereGeometry(1,24,16));function ellipsoid(parent,mat,pos,scale,name){const m=new THREE.Mesh(sphere,mat);m.position.set(...pos);m.scale.set(...scale);m.name=name;parent.add(m);return m;}
 ellipsoid(root,flesh,[0,-.06,0],[1.05,.25,.69],'Streamlined body');ellipsoid(root,belly,[-.08,-.17,0],[1.12,.17,.79],'Plastron');
 // Full closed, low shell with scalloped rim; no separate scute draw calls.
 const shellGeometry=(rings,sides)=>lease.get(`turtle-shell-${rings}-${sides}-${life.maturity}-${settings.shellHeight}`,()=>{
 const g=new THREE.SphereGeometry(1,rings,sides),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rim=1-.02*Math.cos(Math.atan2(z,x)*26)*Math.exp(-y*y*55);p.setXYZ(i,x*rim,y>0?y*(.40+.09*life.maturity)*settings.shellHeight:y*.1,z*rim);}g.computeVertexNormals();return g;});
 const near=shellGeometry(48,28),far=shellGeometry(24,14);
 const shell=new THREE.Mesh(near,shellMat);shell.name='Rigid shell';shell.position.set(-.13,.05,0);shell.scale.set(1.2,1,.85);root.add(shell);
 const head=new THREE.Group();head.name='Articulated neck';head.position.set(.82,-.02,0);root.add(head);const baby=1-life.maturity;
 ellipsoid(head,flesh,[.18,0,0],[.41,.17,.21],'Neck');ellipsoid(head,flesh,[.60,.03,0],[.31+baby*.06,.23+baby*.035,.25+baby*.03],'Head');ellipsoid(head,belly,[.82,-.04,0],[.14,.1,.22],'Rounded beak');
 for(const side of [-1,1]){ellipsoid(head,belly,[.67,.105,side*.23],[.065+baby*.037,.06+baby*.032,.04],'Eye rim');ellipsoid(head,eyeMat,[.70,.115,side*.265],[.045+baby*.038,.05+baby*.04,.025],'Turtle eye');ellipsoid(head,belly,[.714,.14,side*.29],[.012,.012,.007],'Eye glint');ellipsoid(head,eyeMat,[.88,.075,side*.07],[.017,.012,.012],'Nostril');}
 const fin=lease.get('turtle-flipper',()=>hydrofoil(1.5,.34,.075)),flippers=[];
 for(const side of [-1,1])for(const front of [true,false]){const pivot=new THREE.Group();pivot.position.set(front?.58:-.88,-.1,side*(front?.55:.47));root.add(pivot);const mesh=new THREE.Mesh(fin,flesh);mesh.name='Curved flipper';mesh.scale.set(front?settings.flippers:.52,1,side*(front?settings.flippers:.46));pivot.add(mesh);flippers.push({pivot,side,front});}
 ellipsoid(root,flesh,[-1.27,-.04,0],[.24,.055,.065],'Short tail');root.scale.setScalar(life.scale);
 let phase=0,disposed=false;return {root,setStyle(style){shellMat.roughness=style==='cartoon'?.75:settings.roughness;},animate(dt,time,quality='medium',distance=0){if(dt<=0||disposed)return;phase+=dt*life.beat;shell.geometry=distance>35||quality==='low'?far:near;for(const {pivot,side,front} of flippers){pivot.rotation.x=side*(front?.16+Math.sin(phase)*.55:.1+Math.sin(phase*.6)*.10);pivot.rotation.y=side*(front?Math.cos(phase)*.15:Math.sin(phase*.5)*.1);pivot.rotation.z=front?Math.cos(phase)*.10:0;}head.rotation.z=Math.sin(time*.7)*.025;head.rotation.y=Math.sin(time*.4)*.04;},dispose(){if(disposed)return;disposed=true;lease.dispose(root);}};
}
