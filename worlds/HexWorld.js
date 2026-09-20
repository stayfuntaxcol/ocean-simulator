// A single fixed footprint. q/r belong to the atlas; terrain stays world-local.
export const HEX=Object.freeze({radius:144,innerScale:Math.sqrt(.9),orientation:'flat-top'});
export const SIDES=Object.freeze([
  {name:'noord',q:0,r:-1,nx:0,nz:-1},
  {name:'noordoost',q:1,r:-1,nx:Math.sqrt(3)/2,nz:-.5},
  {name:'zuidoost',q:1,r:0,nx:Math.sqrt(3)/2,nz:.5},
  {name:'zuid',q:0,r:1,nx:0,nz:1},
  {name:'zuidwest',q:-1,r:1,nx:-Math.sqrt(3)/2,nz:.5},
  {name:'noordwest',q:-1,r:0,nx:-Math.sqrt(3)/2,nz:-.5},
]);
export const apothem=radius=>radius*Math.sqrt(3)/2;
export function axialPosition(q,r,radius=HEX.radius){return {x:radius*1.5*q,z:radius*Math.sqrt(3)*(r+q/2)};}
export function fixedHexMeta(meta={}) {
  meta=meta??{};
  return {version:1,hexQ:Number.isSafeInteger(meta.hexQ)?meta.hexQ:0,hexR:Number.isSafeInteger(meta.hexR)?meta.hexR:0,
    outerRadius:HEX.radius,innerScale:HEX.innerScale,orientation:HEX.orientation,buildAreaRatio:.9,transitionAreaRatio:.1};
}
export function edgeDistances(p,radius=HEX.radius){return SIDES.map((s,side)=>({side,distance:apothem(radius)-s.nx*p.x-s.nz*p.z}));}
export function containsHex(p,radius=HEX.radius){return Number.isFinite(p.x)&&Number.isFinite(p.z)&&edgeDistances(p,radius).every(e=>e.distance>=-1e-8);}
export function closestInHex(p,radius=HEX.radius) {
  if(containsHex(p,radius))return {...p};
  let best=null,distance=Infinity;
  for(let i=0;i<6;i++){
    const a={x:radius*Math.cos(i*Math.PI/3),z:radius*Math.sin(i*Math.PI/3)};
    const b={x:radius*Math.cos((i+1)*Math.PI/3),z:radius*Math.sin((i+1)*Math.PI/3)};
    const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
    const x=a.x+t*dx,z=a.z+t*dz,d=(p.x-x)**2+(p.z-z)**2;
    if(d<distance){best={...p,x,z};distance=d;}
  }
  return best;
}
export function neighborSide(a,b){return SIDES.findIndex(s=>a.hexQ+s.q===b.hexQ&&a.hexR+s.r===b.hexR);}
export function exitSide(previous,next) {
  let first=Infinity,side=-1;
  const before=edgeDistances(previous),after=edgeDistances(next);
  for(let i=0;i<6;i++)if(after[i].distance<0){
    const t=before[i].distance/(before[i].distance-after[i].distance);
    if(t<first){first=t;side=i;}
  }
  return side;
}
export function arrivalPosition(a,b,p,margin=.65) {
  if(neighborSide(a,b)<0)throw Error('Deze werelden grenzen niet aan elkaar.');
  const from=axialPosition(a.hexQ,a.hexR),to=axialPosition(b.hexQ,b.hexR);
  return closestInHex({...p,x:p.x+from.x-to.x,z:p.z+from.z-to.z},HEX.radius-margin);
}
export function connectionKey(a,b){return [a,b].sort().map(encodeURIComponent).join('~');}
export function connectionSeed(a,b,revision=1){let n=2166136261;for(const c of `${connectionKey(a,b)}:${revision}`)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function parseWorldId(value) {
  let id=String(value??'').trim();
  if(id.includes('://')){try{id=new URL(id).searchParams.get('world')??'';}catch{id='';}}
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(id)||id==='local-world')throw Error('Plak een geldige wereldlink of wereld-ID.');
  return id;
}
