import * as THREE from 'three';
// Curved, tapered hydrofoil: closed upper/lower surfaces with a rounded rim.
export function hydrofoil(length=1.7,width=.8,thickness=.12,segments=28){
 const p=[],ix=[],rings=10;
 for(let side=0;side<2;side++)for(let i=0;i<=segments;i++)for(let j=0;j<=rings;j++){
  const u=i/segments,v=j/rings*2-1,w=width*(.24+.76*Math.sin(Math.PI*u)**.7);
  p.push(-length*u*.52+w*v*.35,(side===0?1:-1)*thickness*Math.sin(Math.PI*u)**.7*Math.sqrt(Math.max(0,1-v*v))-.12*u*u,length*u);
 }
 const count=(segments+1)*(rings+1);
 for(let side=0;side<2;side++)for(let i=0;i<segments;i++)for(let j=0;j<rings;j++){const a=side*count+i*(rings+1)+j,c=a+rings+1;if(side===0)ix.push(a,c,a+1,a+1,c,c+1);else ix.push(a,a+1,c,a+1,c+1,c);}
 for(let i=0;i<segments;i++)for(const j of [0,rings]){const a=i*(rings+1)+j,c=a+rings+1;ix.push(a,a+count,c,c,c+count,a+count);}
 for(const i of [0,segments])for(let j=0;j<rings;j++){const a=i*(rings+1)+j;ix.push(a,a+1,a+count,a+1,a+count+1,a+count);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function disposeModel(root,extra=[]){const gs=new Set(extra),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of [].concat(o.material))ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
const geometryPool=new Map();
export function geometryLease(){const leases=new Set();return {get(key,build){if(leases.has(key))return geometryPool.get(key).geometry;let entry=geometryPool.get(key);if(!entry){entry={geometry:build(),refs:0};geometryPool.set(key,entry);}entry.refs++;leases.add(key);return entry.geometry;},dispose(root){const gs=new Set(),ms=new Set(),shared=new Set([...leases].map(key=>geometryPool.get(key)?.geometry));root.traverse(o=>{if(o.geometry&&!shared.has(o.geometry))gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());for(const key of leases){const entry=geometryPool.get(key);if(entry&&--entry.refs===0){entry.geometry.dispose();geometryPool.delete(key);}}leases.clear();}};}
