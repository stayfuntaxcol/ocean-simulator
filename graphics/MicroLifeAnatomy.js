import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const MICRO_TYPES = Object.freeze(['shrimp','starfish','urchin','shell','crab']);

// One indexed mesh per animal/LOD. Appendages rotate about their attachment,
// with their normals, instead of sliding loose from the body.
export function createMicroGeometry(type, low = false) {
  if (![...MICRO_TYPES,'minnow'].includes(type)) throw Error('Unknown micro species: '+type);
  const parts = [], detail = low ? 8 : 16;
  const hinge = (at, axis, amplitude, phase = 0, mode = 2) => ({at,axis,amplitude,phase,mode});
  function part(g, color, motion, shade) {
    if (!g.index) g.setIndex(Array.from({length:g.attributes.position.count}, (_,i)=>i));
    g.deleteAttribute('uv');
    const p=g.attributes.position, n=p.count, c=new THREE.Color(color);
    const colors=new Float32Array(n*3), flex=new Float32Array(n), joints=new Float32Array(n*4), axes=new Float32Array(n*4);
    for (let i=0;i<n;i++) {
      const tint=shade ? shade(p.getX(i),p.getY(i),p.getZ(i)) : 1;
      colors.set([c.r*tint,c.g*tint,c.b*tint],i*3);
      flex[i]=motion?.mode??0;
      joints.set([...(motion?.at??[0,0,0]),motion?.amplitude??0],i*4);
      axes.set([...(motion?.axis??[0,1,0]),motion?.phase??0],i*4);
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    g.setAttribute('microFlex',new THREE.BufferAttribute(flex,1));
    g.setAttribute('microJoint',new THREE.BufferAttribute(joints,4));
    g.setAttribute('microAxis',new THREE.BufferAttribute(axes,4));
    parts.push(g);
  }
  function ellipsoid(p,s,color,motion,segments=detail) {
    const g=new THREE.SphereGeometry(1,segments,low?5:9);g.scale(...s);g.translate(...p);
    part(g,color,motion,(_,y)=>.85+.18*THREE.MathUtils.clamp((y-p[1]+s[1])/(2*s[1]),0,1));
  }
  function rod(a,b,r1,r2,color,motion) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);
    const g=new THREE.CylinderGeometry(r2,r1,d.length(),low?4:7,1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));
    g.translate(...start.lerp(end,.5).toArray());part(g,color,motion);
  }
  function thread(points,r,color,motion,taper=true) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const steps=low?4:9,sides=low?3:6,g=new THREE.TubeGeometry(curve,steps,r,sides,false),p=g.attributes.position;
    if(taper)for(let i=0;i<=steps;i++){
      const center=curve.getPointAt(i/steps);
      for(let j=0;j<=sides;j++){
        const k=i*(sides+1)+j,q=new THREE.Vector3().fromBufferAttribute(p,k).sub(center).multiplyScalar(1-i/steps*.72).add(center);
        p.setXYZ(k,q.x,q.y,q.z);
      }
    }
    g.computeVertexNormals();part(g,color,motion);
  }
  function eyes(x,y,z,r,motion) {
    for(const side of [-1,1]){
      ellipsoid([x,y,side*z],[r,r,r],0x0b2025,motion,low?6:10);
      if(!low)ellipsoid([x+r*.42,y+r*.45,side*(z+r*.65)],[r*.27,r*.27,r*.15],0xf9f5db,motion,6);
    }
  }

  if(type==='shrimp') {
    ellipsoid([.08,.19,0],[.18,.082,.076],0xd34e3d);
    ellipsoid([.09,.246,0],[.16,.022,.025],0xffe4b4);
    const tail=hinge([-.055,.17,0],[0,0,1],.055,1.3,3);
    for(let i=0;i<6;i++){
      const x=-.055-i*.049,y=.17-.075*(i/5)**2;
      ellipsoid([x,y,0],[.055,.069-i*.006,.070-i*.006],i%2?0xe2a184:0xc85242,tail);
      if(!low)ellipsoid([x,y+.054-i*.005,0],[.038,.016,.023],0xffe6bf,tail,10);
    }
    for(const side of [-1,1]){
      for(let i=0;i<5;i++){
        const at=[.14-i*.045,.15,side*.045],joint=hinge(at,[1,0,0],-side*.16,i*1.5+side,1);
        thread([at,[.11-i*.048,.086,side*.105],[.16-i*.054,.024,side*.155]],.0075,0xf4c9a0,joint);
      }
      const at=[.20,.228,side*.030],antenna=hinge(at,[0,1,0],.085,side*1.4);
      thread([at,[.37,.35,side*.06],[.61,.33,side*.17],[.79,.25,side*.28]],.006,0xfff2d2,antenna);
      thread([at,[.35,.24,side*.13],[.52,.20,side*.27]],.005,0xe8947d,antenna);
      rod([.20,.22,side*.04],[.25,.272,side*.070],.012,.010,0xf2c59b);
      const g=new THREE.SphereGeometry(1,detail,low?5:8);g.scale(.080,.013,.050);g.rotateY(side*.4);g.translate(-.35,.078,side*.047);part(g,0xeb9e77,tail);
    }
    eyes(.25,.277,.073,.024);
    rod([.20,.235,0],[.35,.272,0],.019,.001,0xf3b593);
  } else if(type==='starfish') {
    const segments=low?40:100,rings=low?4:8,positions=[],indices=[],stride=segments+1,half=(rings+1)*stride;
    for(let side=0;side<2;side++)for(let i=0;i<=rings;i++)for(let j=0;j<=segments;j++){
      const u=i/rings,a=j/segments*Math.PI*2;
      const edge=.20+.255*Math.pow(.5+.5*Math.cos(a*5),2.4),r=u*edge;
      positions.push(Math.cos(a)*r,side?.011:.028+.072*(1-u*u)+.014*Math.cos(a*5)*u,Math.sin(a)*r);
    }
    for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
      const k=i*stride+j,b=k+half;
      indices.push(k,k+1,k+stride,k+1,k+stride+1,k+stride,b,b+stride,b+1,b+1,b+stride,b+stride+1);
    }
    for(let j=0;j<segments;j++){const k=rings*stride+j,b=k+half;indices.push(k,k+1,b,k+1,b+1,b);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    part(g,0xde794c,null,(x,_,z)=>.88+.14*Math.cos(Math.hypot(x,z)*7));
    if(!low)for(let arm=0;arm<5;arm++)for(let i=0;i<6;i++){
      const a=arm*Math.PI*2/5,r=.07+i*.060,u=r/.455;
      const bump=new THREE.IcosahedronGeometry(.012-i*.0005,0);bump.scale(1,.65,1);bump.translate(Math.cos(a)*r,.028+.072*(1-u*u)+.014*u,Math.sin(a)*r);part(bump,0xf9c88a);
    }
  } else if(type==='urchin') {
    ellipsoid([0,.16,0],[.205,.16,.205],0x574260);
    const n=low?38:116;
    for(let i=0;i<n;i++){
      const y=.08+.92*(i+.5)/n,a=i*2.39996,r=Math.sqrt(1-y*y),direction=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
      const start=direction.clone().multiplyScalar(.17).add(new THREE.Vector3(0,.13,0));
      const end=direction.clone().multiplyScalar(.36+.07*Math.sin(i*3.3)).add(new THREE.Vector3(0,.13,0));
      const axis=new THREE.Vector3(direction.z,0,-direction.x).normalize();
      rod(start.toArray(),end.toArray(),.012,.0014,i%5?0x675273:0xc2a6a2,hinge(start.toArray(),axis.toArray(),.027,i*.71));
    }
  } else if(type==='shell') {
    const rows=low?5:10,cols=low?18:48,stride=cols+1,half=(rows+1)*stride;
    for(const upper of [false,true]){
      const positions=[],indices=[];
      for(let side=0;side<2;side++)for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
        const u=i/rows,a=-1.23+j/cols*2.46,rib=(.5+.5*Math.cos(a*21))*.014*u;
        const x=Math.cos(a)*u*.50-.19,z=Math.sin(a)*u*.34;
        const y=(upper?.050:.026)+Math.sin(u*Math.PI)*(upper?.10:.025)+rib*(upper?1:.3)-side*.011;
        positions.push(x,y,z);
      }
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
        const k=i*stride+j,b=k+half;
        indices.push(k,k+1,k+stride,k+1,k+stride+1,k+stride,b,b+stride,b+1,b+1,b+stride,b+stride+1);
      }
      const boundary=[];for(let j=0;j<=cols;j++)boundary.push(rows*stride+j);
      for(let i=rows-1;i>=0;i--)boundary.push(i*stride+cols);
      for(let i=0;i<rows;i++)boundary.push(i*stride);
      for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];indices.push(a,b,a+half,b,b+half,a+half);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      part(g,upper?0xf1c6aa:0xbc907a,upper?hinge([-.19,.042,0],[0,0,1],.05,2.2):null,(x,_,z)=>.86+.13*Math.cos(Math.atan2(z,(x+.19)*.68)*21));
    }
  } else if(type==='crab') {
    ellipsoid([0,.205,0],[.22,.112,.27],0xbb684b);
    ellipsoid([-.015,.28,0],[.18,.050,.22],0xdd9870);
    for(const side of [-1,1]){
      for(let i=0;i<4;i++){
        const x=.11-i*.086,at=[x,.19,side*.20],joint=[x-.055,.14,side*(.355+i*.014)],foot=[x-.12,.02,side*(.465+i*.010)];
        const motion=hinge(at,[1,0,0],-side*.32,i*Math.PI+side*Math.PI/2,1);
        rod(at,joint,.026,.018,0xc48261,motion);rod(joint,foot,.018,.005,0xefb98c,motion);
        if(!low)ellipsoid(joint,[.022,.023,.022],0xd59973,motion,8);
      }
      const palm=[.34,.225,side*.295],clawScale=side===1?1.16:1;
      rod([.14,.20,side*.17],[.25,.15,side*.31],.038,.030,0xc07553);
      rod([.25,.15,side*.31],palm,.032,.049,0xce8158);
      ellipsoid(palm,[.10*clawScale,.066*clawScale,.069],0xe19a68);
      thread([[.37,.22,side*.34],[.47,.225,side*.355],[.50,.225,side*.295]],.028,0xf3cc98);
      const moving=hinge([.37,.22,side*.25],[0,1,0],side*.16,side*1.3);
      thread([[.37,.22,side*.25],[.46,.22,side*.235],[.50,.22,side*.283]],.022,0xf0b889,moving);
      rod([.15,.28,side*.10],[.21,.36,side*.125],.013,.011,0xdeab82);
    }
    eyes(.21,.362,.125,.029);
    if(!low)for(let i=0;i<12;i++){
      const a=i*2.4,r=.06+(i%3)*.04;ellipsoid([Math.cos(a)*r,.326-Math.pow(r,2)*.6,Math.sin(a)*r],[.011,.005,.012],0xefbb8b,null,6);
    }
  } else {
    ellipsoid([0,0,0],[.235,.075,.043],0xc5dbd8);
    ellipsoid([-.005,.030,0],[.19,.043,.040],0x548a9b);
    eyes(.163,.016,.034,.012);
    const tail=hinge([-.17,0,0],[0,1,0],.32,0);
    const positions=[-.17,0,0,-.37,.108,0,-.285,0,0,-.17,0,0,-.285,0,0,-.37,-.108,0];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();part(g,0x9dbebe,tail);
    for(const side of [-1,1]){
      const fin=new THREE.BufferGeometry();fin.setAttribute('position',new THREE.Float32BufferAttribute([.035,-.02,side*.03,-.07,-.08,side*.10,-.09,-.025,side*.035],3));fin.computeVertexNormals();part(fin,0xb6ccc6,hinge([.035,-.02,side*.03],[1,0,0],.12,side));
    }
  }
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.09;
  geometry.userData={microSpecies:type,low,jointed:true};return geometry;
}
