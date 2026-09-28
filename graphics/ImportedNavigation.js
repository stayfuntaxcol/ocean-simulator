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

// Route around a rock that cannot be cleared below the water surface.
// Two waypoints keep the school outside the rock on both approach and exit.
export function planSurfaceRockDetour(from,to,obstacles,radius,{maxY=18,minY=-40,terrain=()=>minY,preferredSide=1}={}){
  const start=from.clone(),end=to.clone();
  start.y=Math.min(start.y,maxY);end.y=Math.min(end.y,maxY);
  const flat=end.clone().sub(start);flat.y=0;
  if(flat.lengthSq()<1)return null;
  const direction=flat.normalize(),ray=new THREE.Ray(start,direction),hit=new THREE.Vector3();
  let rock=null,nearest=Infinity;
  for(const box of obstacles){
    const expanded=box.clone().expandByScalar(radius+.1);
    if(box.max.y+radius+1<maxY||!ray.intersectBox(expanded,hit))continue;
    const distance=hit.distanceTo(start);
    if(distance<nearest&&distance<=start.distanceTo(end)+radius){rock=box;nearest=distance;}
  }
  if(!rock)return null;
  const xAxis=Math.abs(direction.x)>=Math.abs(direction.z);
  const approach=xAxis?(direction.x>0?rock.min.x:rock.max.x):(direction.z>0?rock.min.z:rock.max.z);
  const leave=xAxis?(direction.x>0?rock.max.x:rock.min.x):(direction.z>0?rock.max.z:rock.min.z);
  const choices=[];
  for(const clearance of [radius+2,radius+5,radius+9,radius+14])for(const side of [preferredSide,-preferredSide]){
    const lateral=(xAxis?(side>0?rock.max.z:rock.min.z):(side>0?rock.max.x:rock.min.x))+side*clearance;
    const offset=(direction[xAxis?'x':'z']>0?-1:1)*clearance;
    const y=Math.min(maxY-1,Math.max(minY+radius,start.y-1));
    const near=xAxis?new THREE.Vector3(approach+offset,y,lateral):new THREE.Vector3(lateral,y,approach+offset);
    const far=xAxis?new THREE.Vector3(leave-offset,y,lateral):new THREE.Vector3(lateral,y,leave-offset);
    const legs=[start,near,far];
    const safe=legs.slice(1).every((p,i)=>{
      const a=legs[i],floor=Math.max(terrain(a.x,a.z),terrain(p.x,p.z))+radius;
      return p.y>=floor&&a.y>=floor&&moveImportedFish(a,p,obstacles,radius,{minY:floor,maxY}).blocked===false;
    });
    if(safe)choices.push({waypoints:[near,far],length:start.distanceTo(near)+near.distanceTo(far)+far.distanceTo(end),side});
  }
  choices.sort((a,b)=>a.length-b.length);
  return choices[0]||null;
}
