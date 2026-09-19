import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const MICRO_TYPES=['shrimp','starfish','urchin','shell','crab'];

// One coloured geometry per species; hundreds of limbs do not mean hundreds
// of draw calls. Flex marks only antennae, legs and the distant fishes' tails.
export function createMicroGeometry(type,low=false){
  if(![...MICRO_TYPES,'minnow'].includes(type))throw Error('Unknown micro species: '+type);
  const parts=[],up=new THREE.Vector3(0,1,0),detail=low?8:12;
  function part(g,color,flex=0){
    const flat=g.index?g.toNonIndexed():g.clone();g.dispose();
    for(const name of Object.keys(flat.attributes))if(!['position','normal'].includes(name))flat.deleteAttribute(name);
    const n=flat.attributes.position.count,c=new THREE.Color(color),colors=new Float32Array(n*3),motion=new Float32Array(n);
    for(let i=0;i<n;i++){c.toArray(colors,i*3);motion[i]=flex;}
    flat.setAttribute('color',new THREE.BufferAttribute(colors,3));flat.setAttribute('microFlex',new THREE.BufferAttribute(motion,1));parts.push(flat);
  }
  function ellipsoid(p,s,c,flex=0){const g=new THREE.SphereGeometry(1,detail,low?5:8);g.scale(...s);g.translate(...p);part(g,c,flex);}
  function rod(a,b,r1,r2,c,flex=0){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.sub(from);
    const g=new THREE.CylinderGeometry(r2,r1,d.length(),low?4:6,1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,d.clone().normalize()));g.translate(...from.addScaledVector(d,.5).toArray());part(g,c,flex);
  }
  function thread(points,r,c,flex=0){
    part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),low?5:10,r,low?3:4,false),c,flex);
  }
  if(type==='starfish'){
    // Five tapered rounded arms radiate into a low central disc.
    ellipsoid([0,.065,0],[.13,.07,.13],0xd97643);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5,c=Math.cos(a),s=Math.sin(a);
      const g=new THREE.SphereGeometry(1,detail,low?5:8);g.scale(.24,.052,.078);g.rotateY(-a);g.translate(c*.18,.052,s*.18);part(g,0xe99152);
      if(!low)for(let j=0;j<5;j++){const r=.08+j*.066;ellipsoid([c*r,.092-j*.007,s*r],[.015,.012,.015],0xf5c58a);}
    }
  }else if(type==='urchin'){
    ellipsoid([0,.17,0],[.20,.17,.20],0x312d42);
    const n=low?28:64;
    for(let i=0;i<n;i++){
      const y=.12+.88*(i+.5)/n,a=i*2.39996,r=Math.sqrt(1-y*y),v=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
      const start=v.clone().multiplyScalar(.16).add(new THREE.Vector3(0,.14,0));
      const end=v.clone().multiplyScalar(.37+.065*Math.sin(i*3.3)).add(new THREE.Vector3(0,.14,0));
      rod(start.toArray(),end.toArray(),.013,.001,i%4?0x49384f:0xa58a77);
    }
  }else if(type==='shell'){
    const positions=[],indices=[],rows=low?5:10,cols=low?14:28;
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
      const r=i/rows,a=-1.18+j/cols*2.36,rib=Math.cos(a*27)*.006*r;
      positions.push(Math.cos(a)*r*.48-.14,.016+Math.sin(r*Math.PI)*.075+rib,Math.sin(a)*r*.30);
    }
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const k=i*(cols+1)+j;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();part(g,0xe0c39b);
    ellipsoid([-.11,.025,0],[.11,.024,.09],0xb48d73);
  }else if(type==='crab'){
    ellipsoid([0,.18,0],[.20,.105,.25],0xa86346);
    ellipsoid([.06,.23,0],[.12,.054,.20],0xca8861);
    for(const side of [-1,1]){
      for(let i=0;i<4;i++){
        const x=.10-i*.09,joint=[x-.06,.15,side*(.34+i*.018)],foot=[x-.16,.03,side*(.43+i*.014)];
        rod([x,.17,side*.17],joint,.024,.017,0xb17351,.35);rod(joint,foot,.017,.006,0xe0a37c,.65);
      }
      rod([.14,.18,side*.17],[.31,.19,side*.30],.037,.048,0xaf6747,.12);
      ellipsoid([.34,.20,side*.28],[.105,.07,.065],0xd58856,.15);
      rod([.37,.22,side*.30],[.49,.22,side*.27],.031,.006,0xebaf76,.25);
      rod([.37,.18,side*.25],[.47,.18,side*.25],.021,.005,0xd8976b,.25);
      rod([.13,.25,side*.09],[.18,.32,side*.095],.012,.012,0xc38c66);
      ellipsoid([.18,.32,side*.095],[.023,.024,.023],0x0a1720);
    }
  }else if(type==='shrimp'){
    ellipsoid([.09,.17,0],[.18,.076,.085],0xcf7658);
    for(let i=0;i<6;i++){
      const x=-.04-i*.050,y=.16-.055*(i/5)**2;
      ellipsoid([x,y,0],[.057,.071-i*.006,.079-i*.007],i%2?0xf3d8bd:0xc97052);
    }
    for(const side of [-1,1]){
      for(let i=0;i<5;i++)thread([[.12-i*.055,.14,side*.045],[.10-i*.055,.075,side*.09],[.16-i*.065,.025,side*.14]],.006,0xebc7a5,.65);
      thread([[.20,.20,side*.025],[.40,.31,side*.09],[.59,.28,side*.19],[.68,.23,side*.29]],.005,0xf0d6b2,1);
      rod([.20,.20,side*.045],[.25,.245,side*.062],.009,.008,0xf2c99a);
      ellipsoid([.25,.245,side*.062],[.020,.022,.020],0x09151c);
      ellipsoid([-.35,.08,side*.048],[.075,.018,.062],0xe3a988,.3);
    }
    rod([.19,.20,0],[.35,.245,0],.023,.002,0xf1c6a3);
  }else{
    ellipsoid([0,0,0],[.23,.066,.038],0xa9cfd2);
    ellipsoid([.04,.015,0],[.17,.029,.039],0x548ea9);
    for(const side of [-1,1]){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.18,0,0,-.36,side*.10,0,-.30,0,0],3));g.computeVertexNormals();part(g,0x8ab6c0,1);
    }
  }
  const result=mergeGeometries(parts);parts.forEach(g=>g.dispose());result.computeBoundingBox();result.computeBoundingSphere();result.boundingSphere.radius+=.04;return result;
}
