import { HEX } from './HexWorld.js';

// Simulation coordinates keep the established water surface near Y=20.
// Builders and AI see that same plane as logical depth 0 m.
export const SEA_LEVEL_Y=20;
export const DEPTH_LAYER_HEIGHT=HEX.radius*2; // 288 m: matches the horizontal vertex-to-vertex diameter.
export const MIN_DEPTH_LAYER=-1;              // First release: one complete hex volume below layer 0.
export const MAX_DEPTH_LAYER=0;
export const TERRAIN_OFFSET_MIN=-540;
export const TERRAIN_OFFSET_MAX=16;

export function depthFromWorldY(y){return Math.max(0,SEA_LEVEL_Y-(Number(y)||0));}
export function worldYFromDepth(depth){return SEA_LEVEL_Y-Math.max(0,Number(depth)||0);}
export function layerTopY(layer=0){return SEA_LEVEL_Y+Number(layer||0)*DEPTH_LAYER_HEIGHT;}
export function layerBottomY(layer=0){return layerTopY(layer)-DEPTH_LAYER_HEIGHT;}
export const WORLD_MIN_Y=layerBottomY(MIN_DEPTH_LAYER);

export function depthLayerForY(y){
  const depth=depthFromWorldY(y);
  const layer=-Math.floor(depth/DEPTH_LAYER_HEIGHT);
  return Math.max(MIN_DEPTH_LAYER,Math.min(MAX_DEPTH_LAYER,layer));
}
export function depthLayerRange(layer=0){
  const top=layerTopY(layer),bottom=layerBottomY(layer);
  return {layer,top,bottom,topDepth:depthFromWorldY(top),bottomDepth:depthFromWorldY(bottom)};
}
export function activeDepthLayersForMinY(minY){
  const deepest=depthLayerForY(minY);
  const out=[];
  for(let layer=MAX_DEPTH_LAYER;layer>=deepest;layer--)out.push(depthLayerRange(layer));
  return out;
}
export function formatDepth(y){return `${Math.round(depthFromWorldY(y))} m`;}
