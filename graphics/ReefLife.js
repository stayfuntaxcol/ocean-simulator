import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { installCaustics, seededRandom } from './UnderwaterAtmosphere.js';

export const REEF_TYPES = ['branch','plate','fan','sponge','grass'];
const point = (x,y,z=0) => new THREE.Vector3(x,y,z);

function tube(points,radius,steps,sides) {
  const curve=new THREE.CatmullRomCurve3(points);
  const geometry=new THREE.TubeGeometry(curve,steps,radius,sides,false);
  const positions=geometry.attributes.position, p=new THREE.Vector3();
  for(let i=0;i<=steps;i++) {
    const center=curve.getPointAt(i/steps), taper=1-i/steps*.62;
    for(let j=0;j<=sides;j++) {
      const k=i*(sides+1)+j;
      p.fromBufferAttribute(positions,k).sub(center).multiplyScalar(taper).add(center);
      positions.setXYZ(k,p.x,p.y,p.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Each colony is a single mesh. Finite, reusable variants avoid one draw per twig.
export function makeReefGeometry(type,variant=0,low=false) {
  if(!REEF_TYPES.includes(type)) throw new Error('Unknown reef type');
  const random=seededRandom(914+variant*61), parts=[];
  const sides=low?4:6, steps=low?3:6;
  if(type==='branch') {
    parts.push(tube([point(0,0),point(.08,1),point(-.05,2.2)],.17,steps,sides));
    const crown=new THREE.IcosahedronGeometry(.07,1); crown.translate(-.05,2.2,0); parts.push(crown);
    for(let i=0;i<6;i++) {
      const angle=i*Math.PI*2/6+random()*.4, height=.55+i*.22;
      const origin=point(0,height), end=point(Math.cos(angle)*(.65+random()*.3),height+.85,Math.sin(angle)*.8);
      parts.push(tube([origin,origin.clone().lerp(end,.5).add(point(0,.14)),end],.10,steps,sides));
      for(let j=0;j<3;j++) {
        const tip=end.clone().add(point(Math.cos(angle+j-.9)*.4,.45+random()*.45,Math.sin(angle+j-.9)*.4));
        parts.push(tube([end,end.clone().lerp(tip,.5),tip],.06,steps,sides));
        const cap=new THREE.IcosahedronGeometry(.027,0); cap.translate(tip.x,tip.y,tip.z); parts.push(cap);
      }
    }
  } else if(type==='plate') {
    const angles=low?24:48, rings=low?4:8;
    for(let layer=0;layer<3;layer++) {
      const r=.65+layer*.45, y=.2+layer*.46, positions=[],indices=[];
      for(let side=0;side<2;side++) for(let i=0;i<=rings;i++) for(let j=0;j<=angles;j++) {
        const u=i/rings, a=j/angles*Math.PI*2;
        const radius=r*u*(1+.06*Math.sin(a*5+layer+variant));
        const wave=Math.sin(a*7+layer)*.055*u*u;
        positions.push(Math.cos(a)*radius,y+u*u*.20+wave-side*.055,Math.sin(a)*radius);
      }
      const stride=angles+1, half=(rings+1)*stride;
      for(let i=0;i<rings;i++) for(let j=0;j<angles;j++) {
        const k=i*stride+j;
        indices.push(k,k+1,k+stride,k+1,k+stride+1,k+stride);
        const b=k+half; indices.push(b,b+stride,b+1,b+1,b+stride,b+stride+1);
      }
      for(let j=0;j<angles;j++) {
        const a=rings*stride+j,b=a+half;
        indices.push(a,a+1,b,a+1,b+1,b);
      }
      const plate=new THREE.BufferGeometry();
      plate.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      plate.setIndex(indices); plate.computeVertexNormals(); parts.push(plate);
    }
    const stem=new THREE.CylinderGeometry(.09,.17,1.2,low?6:10); stem.translate(0,.6,0); parts.push(stem);
  } else if(type==='fan') {
    const rays=low?9:17;
    parts.push(tube([point(0,0),point(0,.3),point(0,.65)],.09,steps,sides));
    for(let i=0;i<rays;i++) {
      const a=-1.05+i/(rays-1)*2.1, points=[];
      for(let j=0;j<=5;j++) {
        const t=j/5;
        points.push(point(Math.sin(a)*t*1.6,.5+Math.cos(a)*t*2.2,Math.sin(t*3+a)*.06));
      }
      parts.push(tube(points,.035,low?5:9,sides));
    }
    for(let row=1;row<=(low?3:6);row++) {
      const t=row/(low?3:6), arc=[];
      for(let j=0;j<=12;j++) {
        const a=-1.05+j/12*2.1;
        arc.push(point(Math.sin(a)*t*1.6,.5+Math.cos(a)*t*2.2,Math.sin(t*3+a)*.06));
      }
      parts.push(tube(arc,.017,low?8:16,4));
    }
  } else if(type==='sponge') {
    for(let i=0;i<5;i++) {
      const height=.8+random()*1.1;
      const profile=[[0,0],[.21,0],[.25,.2],[.20,1],[.27,1.7],[.21,1.78],[.16,1.7],[.12,.25],[0,.25]];
      const geometry=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y*height)),low?10:20);
      geometry.rotateZ((random()-.5)*.24);
      geometry.translate(Math.cos(i*2.4)*.45,.03,Math.sin(i*2.4)*.45); parts.push(geometry);
    }
  } else {
    const segments=low?6:14;
    for(let i=0;i<9;i++) {
      const angle=i*2.4, h=1.7+random()*2.0, positions=[],indices=[];
      for(let j=0;j<=segments;j++) {
        const t=j/segments, width=.025+.12*Math.sin(t*Math.PI);
        for(const side of [-1,1]) {
          const reach=.12+t*t*(.35+Math.sin(i)*.12);
          positions.push(Math.cos(angle)*reach+Math.cos(angle+.8)*width*side*(1-t),
            t*h,Math.sin(angle)*reach+Math.sin(angle+.8)*width*side*(1-t));
        }
      }
      for(let j=0;j<segments;j++) { const k=j*2; indices.push(k,k+1,k+2,k+1,k+3,k+2); }
      const leaf=new THREE.BufferGeometry();
      leaf.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      leaf.setIndex(indices); leaf.computeVertexNormals(); parts.push(leaf);
    }
  }
  const normalized=parts.map(part=>{
    const flat=part.index?part.toNonIndexed():part.clone();
    for(const name of Object.keys(flat.attributes)) if(!['position','normal'].includes(name)) flat.deleteAttribute(name);
    return flat;
  });
  const result=mergeGeometries(normalized);
  for(const geometry of [...parts,...normalized]) geometry.dispose();
  result.computeBoundingBox();
  const box=result.boundingBox.clone(), size=box.getSize(new THREE.Vector3());
  result.translate(-box.min.x,-box.min.y,-box.min.z);
  result.scale(1/Math.max(size.x,.001),1/Math.max(size.y,.001),1/Math.max(size.z,.001));
  result.computeBoundingBox(); result.computeBoundingSphere();
  result.boundingSphere.radius+=.16;
  return result;
}

function reefMaterial(type,color,uniforms) {
  const material=installCaustics(new THREE.MeshStandardMaterial({color,roughness:type==='grass'?.72:.89,
    side:type==='grass'?THREE.DoubleSide:THREE.FrontSide}),uniforms);
  const lightCompile=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    lightCompile(shader);
    shader.vertexShader='varying vec3 vReefLocal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vReefLocal=position;
    `);
    if(type==='grass'||type==='fan') {
      shader.vertexShader=`uniform float reefTime; uniform float reefMotion;
        float reefSway(float y) {
          float phase=reefTime*.8+modelMatrix[3].x*.23+modelMatrix[3].z*.17;
          return y*y*sin(phase+y*2.3)*${type==='grass'?'.11':'.035'}*reefMotion;
        }
      `+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`
        #include <beginnormal_vertex>
        objectNormal.y-=(reefSway(position.y+.001)-reefSway(position.y-.001))/.002*objectNormal.x;
      `).replace('#include <begin_vertex>',`
        #include <begin_vertex>
        transformed.x+=reefSway(position.y);
      `);
    }
    shader.fragmentShader='varying vec3 vReefLocal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 reefP=vOceanWorld*${type==='sponge'?'20.0':'13.0'};
      float reefFilter=1.0-smoothstep(.4,1.8,length(fwidth(reefP)));
      float pores=pow(max(0.0,sin(reefP.x)*sin(reefP.y)*sin(reefP.z)),5.0)*reefFilter;
      float softVariation=sin(vOceanWorld.x*2.1+sin(vOceanWorld.z*2.6))*.07;
      diffuseColor.rgb*=.80+vReefLocal.y*.28+softVariation-pores*${type==='sponge'?'.45':'.19'};
      ${type==='grass' ? 'diffuseColor.rgb*=mix(vec3(.48,.62,.35),vec3(.9,1.0,.62),vReefLocal.y);' :
        'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.85,.79,.65),smoothstep(.88,1.0,vReefLocal.y)*.24);'}
    `);
  };
  material.customProgramCacheKey=()=>`reef-life-v1-${type}`;
  return material;
}

export function createReefLife(caustics) {
  const uniforms={...caustics,reefTime:{value:0},reefMotion:{value:1}};
  const geometryCache=new Map(),materials=new Map(),members=new Map();
  const worldPosition=new THREE.Vector3();
  let enabled=true;
  function attach(root,type,color=0x68a578,variant=0) {
    const key=`${type}-${variant%3}`;
    if(!geometryCache.has(key)) geometryCache.set(key,{near:makeReefGeometry(type,variant%3),far:makeReefGeometry(type,variant%3,true)});
    const shapes=geometryCache.get(key),materialKey=`${type}-${color}`;
    if(!materials.has(materialKey)) materials.set(materialKey,reefMaterial(type,color,uniforms));
    root.updateMatrixWorld(true);
    const inverse=root.matrixWorld.clone().invert(),box=new THREE.Box3();
    root.traverse(object=>{
      if(!object.isMesh) return;
      object.geometry.computeBoundingBox();
      box.union(object.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld)));
    });
    const size=box.getSize(new THREE.Vector3()),basic=new THREE.Group();
    for(const child of [...root.children]) basic.add(child);
    const detailed=new THREE.Mesh(shapes.near,materials.get(materialKey));
    detailed.name=`Detailed ${type}`; detailed.scale.copy(size); detailed.position.copy(box.min);
    if(type==='fan') { detailed.scale.z*=.16; detailed.position.z+=size.z*.42; }
    root.add(basic,detailed);
    // Three raycasts hidden meshes too. Only the displayed appearance supports new layers.
    basic.traverse(mesh=>{
      if(!mesh.isMesh) return;
      const cast=mesh.raycast;
      mesh.raycast=function(ray,hits){if(basic.visible) cast.call(this,ray,hits);};
    });
    const cast=detailed.raycast;
    detailed.raycast=function(ray,hits){
      if(!this.visible) return;
      const visibleGeometry=this.geometry;
      this.geometry=shapes.near;
      try{cast.call(this,ray,hits);}finally{this.geometry=visibleGeometry;}
    };
    basic.visible=!enabled; detailed.visible=enabled;
    root.userData.reefDesign=type;
    members.set(root,{basic,detailed,shapes});
  }
  function setTime(time,editor=false) { uniforms.reefTime.value=time; uniforms.reefMotion.value=editor?0:1; }
  function update(camera,quality,active=true) {
    enabled=active;
    const range=quality==='low'?18:quality==='high'?45:30;
    for(const [root,m] of members) {
      root.getWorldPosition(worldPosition);
      m.basic.visible=!active; m.detailed.visible=active;
      m.detailed.geometry=worldPosition.distanceToSquared(camera.position)<range*range?m.shapes.near:m.shapes.far;
    }
  }
  function release(root) {
    const m=members.get(root); if(!m) return;
    m.basic.traverse(mesh=>{if(mesh.geometry)mesh.geometry.dispose();});
    members.delete(root);
  }
  return {attach,setTime,update,release,get size(){return members.size;}};
}
