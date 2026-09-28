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
  const normal=new THREE.Vector3();
  if(blocking){
    const contact=start.clone().addScaledVector(ray.direction,distance);
    let nearest=Infinity;
    for(const axis of ['x','y','z'])for(const edge of ['min','max']){
      const d=Math.abs(contact[axis]-blocking[edge][axis]);
      if(d<nearest){nearest=d;normal.set(0,0,0);normal[axis]=edge==='min'?-1:1;}
    }
  }
  return {position:free(safe)?safe:start,blocked:true,normal};
}

// Route around a rock that cannot be cleared below the water surface.
// Two waypoints keep the school outside the rock on both approach and exit.
export function planSurfaceRockDetour(from,to,obstacles,radius,{maxY=18,minY=-40,terrain=()=>minY,preferredSide=1,surfaceOnly=true}={}){
  const start=from.clone(),end=to.clone();
  start.y=Math.min(start.y,maxY);end.y=Math.min(end.y,maxY);
  const flat=end.clone().sub(start);flat.y=0;
  if(flat.lengthSq()<1)return null;
  const direction=flat.normalize(),ray=new THREE.Ray(start,direction),hit=new THREE.Vector3();
  let rock=null,nearest=Infinity;
  for(const box of obstacles){
    const expanded=box.clone().expandByScalar(radius+.1);
    if((surfaceOnly&&box.max.y+radius+1<maxY)||!ray.intersectBox(expanded,hit))continue;
    const distance=hit.distanceTo(start);
    if(distance<nearest&&distance<=start.distanceTo(end)+radius){rock=box;nearest=distance;}
  }
  if(!rock)return null;
  const xAxis=Math.abs(direction.x)>=Math.abs(direction.z);
  const approach=xAxis?(direction.x>0?rock.min.x:rock.max.x):(direction.z>0?rock.min.z:rock.max.z);
  const leave=xAxis?(direction.x>0?rock.max.x:rock.min.x):(direction.z>0?rock.max.z:rock.min.z);
  const choices=[];
  for(const clearance of [radius+.65,radius+2,radius+5,radius+9,radius+14])for(const side of [preferredSide,-preferredSide]){
    const lateral=(xAxis?(side>0?rock.max.z:rock.min.z):(side>0?rock.max.x:rock.min.x))+side*clearance;
    const offset=(direction[xAxis?'x':'z']>0?-1:1)*clearance;
    const y=Math.min(maxY-.15,Math.max(minY+radius,start.y-(surfaceOnly?1:0)));
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

// Fixed X/Z buckets: queried only near a fish, never against the entire reef.
export function createRockIndex(boxes,cellSize=24){
  const cells=new Map();
  for(const box of boxes){
    for(let x=Math.floor(box.min.x/cellSize);x<=Math.floor(box.max.x/cellSize);x++)
      for(let z=Math.floor(box.min.z/cellSize);z<=Math.floor(box.max.z/cellSize);z++){
        const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(box);
      }
  }
  return (point,reach)=>{
    const nearby=new Set();
    for(let x=Math.floor((point.x-reach)/cellSize);x<=Math.floor((point.x+reach)/cellSize);x++)
      for(let z=Math.floor((point.z-reach)/cellSize);z<=Math.floor((point.z+reach)/cellSize);z++)
        for(const box of cells.get(x+','+z)||[])if(box.distanceToPoint(point)<=reach)nearby.add(box);
    return [...nearby];
  };
}

// A small remembered route wins over cohesion near stone. Only the look-ahead
// runs at 5 Hz; the swept body collision is still applied on every movement.
export function steerImportedFish(position,desired,goal,obstacles,radius,state,dt,bounds={}){
  state.clock=(state.clock||0)+dt;
  if(state.goal&&state.goal.distanceToSquared(goal)>64){state.route=null;state.nextSense=0;}
  state.goal=goal.clone();
  if(state.route?.length&&position.distanceTo(state.route[0])<.45+radius*.2)state.route.shift();
  if(state.clock>=(state.nextSense||0)){
    state.nextSense=state.clock+.2;
    if(!state.progressAt||state.clock-state.progressAt>=4){
      state.stalled=Boolean(state.route?.length&&state.progressPosition&&position.distanceTo(state.progressPosition)<.35);
      state.progressPosition=position.clone();state.progressAt=state.clock;
      if(state.stalled){state.route=null;state.tangent=null;}
    }
    const direction=desired.clone().normalize();
    const ahead=position.clone().addScaledVector(direction,Math.max(2.5,radius+1.5));
    const hit=moveImportedFish(position,ahead,obstacles,radius,bounds);
    state.nearRock=obstacles.some(b=>b.distanceToPoint(position)<radius+1.2);
    if(!state.route?.length&&hit.blocked){
      const route=planSurfaceRockDetour(position,goal,obstacles,radius,{...bounds,surfaceOnly:false,preferredSide:state.side||1});
      if(route){state.route=route.waypoints;state.side=route.side;state.tangent=null;}
      else if(hit.normal?.lengthSq()){
        // Follow this face when a full corner pair is temporarily unavailable.
        const tangent=new THREE.Vector3(-hit.normal.z,0,hit.normal.x);
        if(!tangent.lengthSq())tangent.copy(goal).sub(position).setY(0).normalize();
        if(!state.side)state.side=tangent.dot(goal.clone().sub(position))>=0?1:-1;
        state.tangent=tangent.multiplyScalar(state.side).addScaledVector(hit.normal,.12).normalize();
      }
    }else if(!hit.blocked&&!state.route?.length)state.tangent=null;
  }
  const out=state.route?.length?state.route[0].clone().sub(position).normalize():state.tangent?.clone()||desired.clone();
  const grazing=state.nearRock&&!state.route?.length&&position.distanceTo(goal)<3;
  state.mode=state.route?.length||state.tangent?'passing':grazing?'grazing':'travel';
  // Slow, bounded feeding passes; the school still owns residence/migration time.
  return {direction:out,pace:grazing?.4:state.mode==='passing'?.72:1};
}
