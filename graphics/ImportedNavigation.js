import * as THREE from 'three';

// Conservative per-stone volumes retain gaps between separate rocks.
// Only imported fish use this safeguard; editor and camera collision stay unchanged.
export function moveImportedFish(from,to,obstacles,radius,{minY=-40,maxY=18}={}){
  const padding=radius+.04,reach=from.distanceTo(to)+padding+4;
  const boxes=obstacles.filter(b=>b.distanceToPoint(from)<=reach).map(b=>b.clone().expandByScalar(padding));
  const free=p=>p.y>=minY&&p.y<=maxY&&!obstacles.some(b=>p.x>=b.min.x-padding&&p.x<=b.max.x+padding&&p.y>=b.min.y-padding&&p.y<=b.max.y+padding&&p.z>=b.min.z-padding&&p.z<=b.max.z+padding);
  let start=from.clone();
  if(minY<=maxY)start.y=THREE.MathUtils.clamp(start.y,minY,maxY);
  if(!free(start)){
    const candidates=[];
    for(const box of boxes)for(const axis of ['x','y','z'])for(const edge of ['min','max']){
      const p=start.clone();p[axis]=box[edge][axis]+(edge==='min'?-.01:.01);
      if(free(p))candidates.push(p);
    }
    candidates.sort((a,b)=>a.distanceToSquared(start)-b.distanceToSquared(start));
    if(!candidates.length)return {position:start,blocked:true};
    return {position:candidates[0],blocked:true};
  }
  const delta=to.clone().sub(start),length=delta.length();
  if(!length)return {position:start,blocked:false};
  const ray=new THREE.Ray(start,delta.clone().normalize()),hit=new THREE.Vector3();
  let distance=length,blocking=null;
  for(const box of boxes)if(ray.intersectBox(box,hit)){
    const d=hit.distanceTo(start);if(d<=distance){distance=d;blocking=box;}
  }
  if(!blocking&&free(to))return {position:to.clone(),blocked:false};
  // Keep a safe contact point, then slide along an open face instead of pushing inward.
  const safe=start.clone().addScaledVector(ray.direction,Math.max(0,distance-.015));
  for(const axis of ['y','x','z']){
    const p=safe.clone();p[axis]=to[axis];
    const slide=p.clone().sub(safe),slideLength=slide.length();
    const slideRay=new THREE.Ray(safe,slide.normalize()),intersection=new THREE.Vector3();
    if(free(p)&&!boxes.some(b=>slideLength>0&&slideRay.intersectBox(b,intersection)&&intersection.distanceTo(safe)<=slideLength))safe.copy(p);
  }
  return {position:free(safe)?safe:start,blocked:true};
}
