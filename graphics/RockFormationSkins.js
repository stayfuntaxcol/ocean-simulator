import * as THREE from 'three';
import { installCaustics } from './UnderwaterAtmosphere.js';

export const ROCK_SKINS=Object.freeze({
  tropical_limestone:{name:'Tropical Limestone',roughness:.94,baseA:[.30,.28,.20],baseB:[.66,.60,.44],cavity:[.16,.17,.15],edge:[.82,.76,.58],growth:[.28,.43,.20],macro:.48,detail:5.8,bands:1.0,seams:.10,growthAmount:.28,depthTint:.12},
  grey_reef:{name:'Grey Reef Stone',roughness:.95,baseA:[.16,.18,.18],baseB:[.46,.49,.46],cavity:[.09,.11,.12],edge:[.66,.69,.65],growth:[.27,.42,.22],macro:.54,detail:6.4,bands:.28,seams:.18,growthAmount:.25,depthTint:.16},
  dark_lava:{name:'Dark Lava Basalt',roughness:.97,baseA:[.045,.055,.060],baseB:[.20,.23,.23],cavity:[.018,.022,.025],edge:[.34,.37,.36],growth:[.18,.25,.15],macro:.68,detail:7.8,bands:.06,seams:.78,growthAmount:.08,depthTint:.20},
  layered_sandstone:{name:'Layered Sandstone',roughness:.93,baseA:[.32,.22,.12],baseB:[.70,.52,.31],cavity:[.17,.12,.08],edge:[.86,.68,.42],growth:[.32,.38,.18],macro:.40,detail:5.2,bands:1.35,seams:.16,growthAmount:.12,depthTint:.10},
  algae_reef:{name:'Algae Reef Rock',roughness:.96,baseA:[.14,.18,.13],baseB:[.42,.43,.29],cavity:[.07,.10,.08],edge:[.58,.58,.42],growth:[.20,.47,.16],macro:.58,detail:6.2,bands:.22,seams:.22,growthAmount:.62,depthTint:.15},
  deep_blue:{name:'Deep Blue Reef Rock',roughness:.96,baseA:[.065,.095,.13],baseB:[.25,.32,.36],cavity:[.025,.045,.065],edge:[.40,.50,.54],growth:[.16,.27,.18],macro:.52,detail:6.0,bands:.18,seams:.24,growthAmount:.14,depthTint:.48}
});
export const ROCK_SKIN_IDS=Object.freeze(Object.keys(ROCK_SKINS));
const v3=a=>'vec3('+a.map(v=>Number(v).toFixed(4)).join(',')+')';

export function createRockSkinMaterial(skinId,caustics){
  const id=ROCK_SKINS[skinId]?skinId:'grey_reef',skin=ROCK_SKINS[id];
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:skin.roughness,metalness:0,side:THREE.DoubleSide});
  installCaustics(material,caustics);
  const lightCompile=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    lightCompile(shader);
    shader.fragmentShader=
      'float rockHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}\n'+
      'float rockNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(rockHash(i),rockHash(i+vec3(1,0,0)),f.x),mix(rockHash(i+vec3(0,1,0)),rockHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(rockHash(i+vec3(0,0,1)),rockHash(i+vec3(1,0,1)),f.x),mix(rockHash(i+vec3(0,1,1)),rockHash(i+vec3(1,1,1)),f.x),f.y),f.z);}\n'+
      shader.fragmentShader;
    const colorCode=
      '#include <color_fragment>\n'+
      'vec3 rp=vOceanWorld;\n'+
      'float macroN=rockNoise(rp*'+skin.macro.toFixed(4)+');\n'+
      'float fineN=rockNoise(rp*'+skin.detail.toFixed(4)+');\n'+
      'float bands=sin(rp.y*'+(2.6*skin.bands).toFixed(4)+'+macroN*2.8);\n'+
      'float seam=1.0-smoothstep(.035,.16,abs(macroN-.48));\n'+
      'float cavity=smoothstep(.58,.88,1.0-fineN);\n'+
      'float edgeLit=pow(clamp(dot(normalize(normal),normalize(mat3(viewMatrix)*vec3(0.0,1.0,0.0)))*.5+.5,0.0,1.0),1.6);\n'+
      'vec3 rockColor=mix('+v3(skin.baseA)+','+v3(skin.baseB)+',macroN);\n'+
      'rockColor=mix(rockColor,'+v3(skin.cavity)+',cavity*.38+seam*'+skin.seams.toFixed(4)+');\n'+
      'rockColor=mix(rockColor,'+v3(skin.edge)+',edgeLit*.18);\n'+
      'rockColor*=1.0+bands*'+(.055*skin.bands).toFixed(4)+';\n'+
      'float growth=smoothstep(.50,.78,rockNoise(rp*.82+vec3(13.0,2.0,7.0)));\n'+
      'growth*=smoothstep(-.2,.75,normal.y)*'+skin.growthAmount.toFixed(4)+';\n'+
      'rockColor=mix(rockColor,'+v3(skin.growth)+',growth);\n'+
      'float rockDepth=max(0.0,20.0-rp.y);\n'+
      'rockColor=mix(rockColor,rockColor*vec3(.62,.80,.94),clamp(rockDepth/300.0,0.0,1.0)*'+skin.depthTint.toFixed(4)+');\n'+
      'diffuseColor.rgb=rockColor;';
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',colorCode);
    const normalCode=
      '#include <normal_fragment_maps>\n'+
      'vec3 rockDx=dFdx(-vViewPosition),rockDy=dFdy(-vViewPosition);\n'+
      'vec3 rockR1=cross(rockDy,normal),rockR2=cross(normal,rockDx);\n'+
      'float rockDet=dot(rockDx,rockR1);\n'+
      'float rockHeight=(macroN-.5)*.08+(fineN-.5)*.022+bands*.006;\n'+
      'vec3 rockGradient=sign(rockDet)*(dFdx(rockHeight)*rockR1+dFdy(rockHeight)*rockR2);\n'+
      'normal=normalize(normal-rockGradient/max(abs(rockDet),.000001));';
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',normalCode);
  };
  material.customProgramCacheKey=()=> 'formation-rock-skin-v1-'+id;
  material.userData.rockSkin=id;
  return material;
}

export function createRockSkinLibrary(caustics){
  const cache=new Map();
  return {
    get(id){
      const key=ROCK_SKINS[id]?id:'grey_reef';
      if(!cache.has(key))cache.set(key,createRockSkinMaterial(key,caustics));
      return cache.get(key);
    },
    dispose(){for(const m of cache.values())m.dispose();cache.clear();}
  };
}
