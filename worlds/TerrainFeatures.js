const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};

export function segmentMetrics(point,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
  if(len2<1e-8)return {t:0,distance:Math.hypot(point.x-a.x,point.z-a.z)};
  const t=clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/len2);
  const x=a.x+dx*t,z=a.z+dz*t;
  return {t,distance:Math.hypot(point.x-x,point.z-z)};
}

export function terrainFeatureCells(a,b,{cellSize=12,width=36,contains=()=>true}={}){
  const half=Math.max(cellSize,width/2),margin=half+cellSize;
  const minX=Math.floor((Math.min(a.x,b.x)-margin)/cellSize),maxX=Math.ceil((Math.max(a.x,b.x)+margin)/cellSize);
  const minZ=Math.floor((Math.min(a.z,b.z)-margin)/cellSize),maxZ=Math.ceil((Math.max(a.z,b.z)+margin)/cellSize);
  const cells=[];
  for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++){
    const point={x:ix*cellSize+cellSize/2,z:iz*cellSize+cellSize/2};
    if(!contains(point.x,point.z))continue;
    const metrics=segmentMetrics(point,a,b);
    if(metrics.distance>half)continue;
    const lateral=smooth(1-metrics.distance/half);
    cells.push({ix,iz,...point,...metrics,lateral});
  }
  return cells;
}

export function canyonWorldY(currentY,{targetY=-60,lateral=1}={}){
  const influence=smooth(lateral);
  return Math.min(currentY,currentY+(targetY-currentY)*influence);
}

export function dropoffWorldY(currentY,{targetY=-60,t=.5,lateral=1}={}){
  // Drag start is the shallow shelf; the second half rapidly becomes the deep side.
  const along=smooth(clamp((t-.22)/.48));
  const influence=along*smooth(lateral);
  return Math.min(currentY,currentY+(targetY-currentY)*influence);
}
