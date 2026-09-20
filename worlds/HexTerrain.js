import * as THREE from 'three';
import { HEX, apothem, axialPosition, containsHex, closestInHex } from './HexWorld.js';

export function terrainFromRecord(record) {
  const offsets=new Map((record.world.terrain??[]).map(t=>[String(t.key),Math.max(-12,Math.min(10,t.offset))]));
  return (x,z)=>{
    const gx=x/12,gz=z/12,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz;
    const at=(i,j)=>offsets.get(`${i},${j}`)??0;
    const a=at(ix,iz)*(1-fx)+at(ix+1,iz)*fx,b=at(ix,iz+1)*(1-fx)+at(ix+1,iz+1)*fx;
    return -18+Math.sin(x*.035)+Math.cos(z*.028)*1.3+Math.sin((x-z)*.017)*.9+a*(1-fz)+b*fz;
  };
}

// Both sides sample the same global blend, including three-world junctions.
// Weights approach infinity at an inner build boundary: the owner's terrain is
// preserved exactly inside the inner 90%, while neutral bands meet continuously.
export function createTerrainBlend(worlds) {
  const items=worlds.map(w=>({...w,center:axialPosition(w.hexQ,w.hexR)})).sort((a,b)=>a.id.localeCompare(b.id));
  const inner=HEX.radius*HEX.innerScale,range=apothem(HEX.radius)*(1-HEX.innerScale)*3;
  function globalHeight(x,z) {
    let sum=0,total=0,nearest=null;
    for(const w of items){
      const p={x:x-w.center.x,z:z-w.center.z};
      if(containsHex(p,inner))return w.height(p.x,p.z);
      const c=closestInHex(p,inner),distance=Math.hypot(p.x-c.x,p.z-c.z);
      if(!nearest||distance<nearest.distance)nearest={w,p,distance};
      const weight=Math.max(0,1-distance/range)**2/Math.max(1e-10,distance*distance);
      sum+=w.height(p.x,p.z)*weight;total+=weight;
    }
    return total>0?sum/total:nearest.w.height(nearest.p.x,nearest.p.z);
  }
  return (id,x,z)=>{const w=items.find(w=>w.id===id);if(!w)throw Error('Wereld ontbreekt in de overgang.');return globalHeight(x+w.center.x,z+w.center.z);};
}

// Hexagonal triangles keep exact common edge vertices. Denser rings resolve
// the narrow transition band without increasing the entire square ocean mesh.
export function createHexTerrainGeometry(sample) {
  const positions=[0,sample(0,0),0],indices=[],colors=[.19,.35,.31],sideSteps=36,stride=sideSteps*6;
  const radii=Array.from({length:24},(_,i)=>HEX.radius*HEX.innerScale*(i+1)/24);
  for(let i=1;i<=6;i++)radii.push(HEX.radius*(HEX.innerScale+(1-HEX.innerScale)*i/6));
  for(const r of radii)for(let side=0;side<6;side++)for(let j=0;j<sideSteps;j++){
    const a=side*Math.PI/3,b=(side+1)*Math.PI/3,t=j/sideSteps;
    const x=r*(Math.cos(a)*(1-t)+Math.cos(b)*t),z=r*(Math.sin(a)*(1-t)+Math.sin(b)*t);
    positions.push(x,sample(x,z),z);colors.push(.19,.35,.31);
  }
  for(let j=0;j<stride;j++)indices.push(0,1+(j+1)%stride,1+j);
  for(let row=1;row<radii.length;row++)for(let j=0;j<stride;j++){
    const a=1+(row-1)*stride+j,b=1+(row-1)*stride+(j+1)%stride,c=1+row*stride+j,d=1+row*stride+(j+1)%stride;
    indices.push(a,b,c,b,d,c);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
