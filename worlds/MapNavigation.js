// Shared orientation: north = -Z, east = +X. Canvas/SVG Y grows downwards.
export function mapBounds(boundary,zoom,position){
  const half=boundary/zoom;
  const center=value=>Math.max(-boundary+half,Math.min(boundary-half,value));
  const x=zoom>1?center(position.x):0,z=zoom>1?center(position.z):0;
  return {minX:x-half,maxX:x+half,minZ:z-half,maxZ:z+half};
}

export function mapPoint({x,z},bounds,width,height){
  return {x:(x-bounds.minX)/(bounds.maxX-bounds.minX)*width,
    y:(z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*height};
}

export function worldPoint({x,y},bounds,width,height){
  return {x:bounds.minX+x/width*(bounds.maxX-bounds.minX),
    z:bounds.minZ+y/height*(bounds.maxZ-bounds.minZ)};
}

// The player arrow is drawn pointing up before this clockwise canvas rotation.
export const mapHeading=forward=>Math.atan2(forward.x,-forward.z);
