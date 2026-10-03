import * as THREE from 'three';
import { sculptKey } from './VolumeSculpt.js';
import { SCULPT_DENSITY_THRESHOLD } from './SculptChunkManager.js';

// Swept conservative voxel collision, independent of render triangles/visibility.
// DDA follows only the path's cells; neighboring occupied cells cover body radius.
export class SculptCollision {
  constructor(manager,{center={x:0,y:0,z:0},shapeLevel=3}={}){
    this.manager=manager;this.center=new THREE.Vector3(center.x,center.y,center.z);this.shapeLevel=shapeLevel;
    this.queries=0;this.visited=0;
    this.inverse=new THREE.Matrix4();this.start=new THREE.Vector3();this.end=new THREE.Vector3();
    this.box=new THREE.Box3();this.bounds=new THREE.Box3();this.scale=new THREE.Vector3();this.seen=new Set();
    for(const key of manager.cells.keys())this.bounds.expandByPoint(new THREE.Vector3(...key.split(',').map(n=>Number(n)*manager.cellSize)).sub(this.center));
    this.bounds.expandByScalar(manager.cellSize);
  }
  segment(root,from,to,radius=0){
    this.queries++;root.updateWorldMatrix(true,false);this.inverse.copy(root.matrixWorld).invert();
    this.start.copy(from).applyMatrix4(this.inverse).add(this.center);this.end.copy(to).applyMatrix4(this.inverse).add(this.center);
    root.getWorldScale(this.scale);const localRadius=radius/Math.max(.001,Math.min(Math.abs(this.scale.x),Math.abs(this.scale.y),Math.abs(this.scale.z)));
    const s=this.manager.cellSize,half=s*(this.shapeLevel===1?.5:.82);
    const a=[this.start.x,this.start.y,this.start.z],d=[this.end.x-a[0],this.end.y-a[1],this.end.z-a[2]];
    // Reject the complete formation before walking its grid; bounds are derived from DATA.
    this.box.copy(this.bounds).translate(this.center).expandByScalar(localRadius);
    const clip=(box)=>{
      let lo=0,hi=1;
      for(let axis=0;axis<3;axis++){
        const name=['x','y','z'][axis];
        if(Math.abs(d[axis])<1e-12){if(a[axis]<box.min[name]||a[axis]>box.max[name])return null;continue;}
        let p=(box.min[name]-a[axis])/d[axis],q=(box.max[name]-a[axis])/d[axis];if(p>q)[p,q]=[q,p];
        lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>hi)return null;
      }return lo;
    };
    if(clip(this.box)==null)return null;
    const cell=a.map(n=>Math.floor(n/s+.5)),step=d.map(Math.sign);
    const delta=d.map(n=>n?Math.abs(s/n):Infinity);
    const next=cell.map((n,i)=>d[i]?((n+(step[i]>0?.5:-.5))*s-a[i])/d[i]:Infinity);
    const reach=Math.ceil((localRadius+half)/s),limit=3+Math.ceil((Math.abs(d[0])+Math.abs(d[1])+Math.abs(d[2]))/s);
    this.seen.clear();let nearest=Infinity,hitCell=null;
    for(let iteration=0;iteration<limit;iteration++){
      for(let dx=-reach;dx<=reach;dx++)for(let dy=-reach;dy<=reach;dy++)for(let dz=-reach;dz<=reach;dz++){
        const ix=cell[0]+dx,iy=cell[1]+dy,iz=cell[2]+dz,key=sculptKey(ix,iy,iz);
        if(this.seen.has(key))continue;this.seen.add(key);this.visited++;
        const density=this.manager.cells.get(key)||0;if(density<SCULPT_DENSITY_THRESHOLD)continue;
        // Surface Nets interpolates toward an empty sample. This envelope is
        // deliberately conservative; narrow passages need room for the whole fish.
        const h=(this.shapeLevel===1?s*.5:s*Math.max(.0001,1-SCULPT_DENSITY_THRESHOLD/density))+localRadius;
        this.box.min.set(ix*s-h,iy*s-h,iz*s-h);this.box.max.set(ix*s+h,iy*s+h,iz*s+h);
        const t=clip(this.box);if(t!=null&&t<nearest){nearest=t;hitCell=[ix,iy,iz,h];}
      }
      const t=Math.min(...next);if(t>1||t>nearest)break;
      for(let axis=0;axis<3;axis++)if(next[axis]<=t+1e-12){cell[axis]+=step[axis];next[axis]+=delta[axis];}
    }
    if(!hitCell)return null;
    const point=from.clone().lerp(to,nearest),local=this.start.clone().lerp(this.end,nearest),normal=new THREE.Vector3();
    let closest=Infinity;
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const name=['x','y','z'][axis],distance=Math.abs(local[name]-(hitCell[axis]*s+sign*hitCell[3]));
      if(distance<closest){closest=distance;normal.set(0,0,0);normal[name]=sign;}
    }
    normal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(root.matrixWorld)).normalize();
    this.box.min.set(hitCell[0]*s-hitCell[3],hitCell[1]*s-hitCell[3],hitCell[2]*s-hitCell[3]).sub(this.center);
    this.box.max.set(hitCell[0]*s+hitCell[3],hitCell[1]*s+hitCell[3],hitCell[2]*s+hitCell[3]).sub(this.center);
    return {point,distance:from.distanceTo(point),normal,object:root,solidRoot:root,sculpt:true,colliderBounds:this.box.clone().applyMatrix4(root.matrixWorld)};
  }
}
