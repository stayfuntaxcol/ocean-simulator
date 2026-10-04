import * as THREE from 'three';
// Oriented body envelopes include fins and tail clearance. Shared by placement,
// steering and the final contact solver, including members of the same group.
export function bodyContact(a,b,margin=0){
 const delta=b.position.clone().sub(a.position);if(delta.lengthSq()>(a.extent.length()+b.extent.length()+margin)**2)return null;const ha=a.heading||0,hb=b.heading||0;
 const axes=[new THREE.Vector3(Math.cos(ha),0,Math.sin(ha)),new THREE.Vector3(-Math.sin(ha),0,Math.cos(ha)),new THREE.Vector3(Math.cos(hb),0,Math.sin(hb)),new THREE.Vector3(-Math.sin(hb),0,Math.cos(hb)),new THREE.Vector3(0,1,0)];
 const extent=(body,axis)=>Math.abs(axis.x*Math.cos(body.heading||0)+axis.z*Math.sin(body.heading||0))*body.extent.x+Math.abs(-axis.x*Math.sin(body.heading||0)+axis.z*Math.cos(body.heading||0))*body.extent.z+Math.abs(axis.y)*body.extent.y;
 let depth=Infinity,normal;
 for(const axis of axes){const distance=delta.dot(axis),overlap=extent(a,axis)+extent(b,axis)+margin-Math.abs(distance);if(overlap<=0)return null;if(overlap<depth){depth=overlap;normal=axis.clone().multiplyScalar(distance<0?-1:1);}}
 return {depth,normal};
}
export function sweptBodiesClear(body,to,other,margin=0){
 const radius=body.extent.length()+other.extent.length()+margin,segment=new THREE.Line3(body.position,to),near=segment.closestPointToPoint(other.position,true,new THREE.Vector3());
 if(near.distanceToSquared(other.position)>radius*radius)return true;
 const steps=Math.min(32,Math.max(1,Math.ceil(body.position.distanceTo(to)/Math.max(.05,Math.min(body.extent.x,body.extent.z,other.extent.x,other.extent.z)*.5))));
 for(let i=1;i<=steps;i++)if(bodyContact({...body,position:body.position.clone().lerp(to,i/steps)},other,margin))return false;
 return true;
}
export function groupOffset(index,mode,distance,time,wander=0){
 if(mode==='school')return new THREE.Vector3(-distance*(1+Math.floor((index-1)/2)),Math.sin(index*2.1)*distance*.08,(index%2?1:-1)*distance*.55);
 const angle=index*2.399963229728653,spread=distance*Math.sqrt(index),sway=Math.sin(time*.25+index*1.7)*wander*distance*.3;
 return new THREE.Vector3(Math.cos(angle)*spread+sway,Math.sin(index*1.9+time*.17)*distance*(mode==='swarm'?.3:.12),Math.sin(angle)*spread+sway*.7);
}
