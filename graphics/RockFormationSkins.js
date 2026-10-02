import * as THREE from 'three';

export const ROCK_SKINS=Object.freeze({
  tropical_limestone:{
    name:'Tropical Limestone',roughness:.92,
    dark:0x81745d,base:0xb7a889,light:0xd9ccb0,accent:0x9fa47b
  },
  grey_reef:{
    name:'Grey Reef Stone',roughness:.94,
    // Tuned toward the existing limestone/basalt families in ReefRocks/SeabedMaterials.
    dark:0x485351,base:0x6c7973,light:0x9aa39a,accent:0x758764
  },
  dark_lava:{
    name:'Dark Lava Basalt',roughness:.98,
    dark:0x15191b,base:0x30383a,light:0x555d5d,accent:0x634f42
  },
  layered_sandstone:{
    name:'Layered Sandstone',roughness:.93,
    dark:0x765238,base:0xae8057,light:0xd7ad78,accent:0x8f6548
  },
  algae_reef:{
    name:'Algae Reef Rock',roughness:.96,
    dark:0x46504a,base:0x6e7970,light:0x9aa397,accent:0x4d7850
  },
  deep_blue:{
    name:'Deep Blue Reef Rock',roughness:.95,
    dark:0x283942,base:0x49606a,light:0x718993,accent:0x3f7477
  }
});

export const ROCK_SKIN_IDS=Object.freeze(Object.keys(ROCK_SKINS));

function saturate(v){return Math.max(0,Math.min(1,v));}
function noise3(x,y,z){
  const a=Math.sin(x*.43+y*.31+z*.37);
  const b=Math.sin(x*1.13-y*.71+z*.83);
  const c=Math.cos(x*.19+y*.27-z*.23);
  return saturate(.5+a*.23+b*.16+c*.11);
}
function broadNoise(x,y,z){
  return noise3(x*.34,y*.28,z*.34);
}
function fineNoise(x,y,z){
  return noise3(x*1.75,y*1.55,z*1.68);
}
function waveNoise(x,y,z){
  return .5+.5*Math.sin(x*.18+z*.23+Math.sin(y*.09)*1.65+noise3(x*.18,y*.12,z*.18)*1.5);
}
function ridgeNoise(x,y,z){
  return 1-Math.abs(noise3(x,y,z)*2-1);
}

export function createRockSkinMaterial(skinId){
  const id=ROCK_SKINS[skinId]?skinId:'grey_reef';
  const skin=ROCK_SKINS[id];
  const material=new THREE.MeshStandardMaterial({
    color:0xffffff,
    roughness:skin.roughness,
    metalness:0,
    side:THREE.DoubleSide,
    vertexColors:true,
    flatShading:false
  });
  material.userData.rockSkin=id;
  material.name='Sculpt rock skin · '+skin.name;
  return material;
}

export function applyRockSkinToGeometry(geometry,skinId,center={x:0,y:0,z:0}){
  const id=ROCK_SKINS[skinId]?skinId:'grey_reef',skin=ROCK_SKINS[id];
  const position=geometry.getAttribute('position');
  const normal=geometry.getAttribute('normal');
  if(!position)return false;

  const dark=new THREE.Color(skin.dark);
  const base=new THREE.Color(skin.base);
  const light=new THREE.Color(skin.light);
  const accent=new THREE.Color(skin.accent);
  const out=new THREE.Color();
  const colors=new Float32Array(position.count*3);

  for(let i=0;i<position.count;i++){
    const x=position.getX(i)+center.x;
    const y=position.getY(i)+center.y;
    const z=position.getZ(i)+center.z;
    const up=normal?saturate(normal.getY(i)*.5+.5):.5;
    const broad=broadNoise(x,y,z);
    const fine=fineNoise(x,y,z);

    if(id==='grey_reef'){
      // Match the existing rock family: cool basalt-grey body + limestone-like soft waves
      // and patchy olive reef biofilm.
      const wave=waveNoise(x,y,z);
      const limestoneBand=.5+.5*Math.sin(y*.33+Math.sin(x*.17)*.65+broad*2.0);
      out.copy(dark).lerp(base,.38+broad*.46);
      out.lerp(light,saturate((wave-.54)*1.35)*.28);
      out.lerp(light,saturate((limestoneBand-.66)*1.8)*.16);
      const bio=saturate((noise3(x*.72,y*.48,z*.72)-.60)*1.8)*(.40+.60*up);
      out.lerp(accent,bio*.32);
      if(fine<.22)out.lerp(dark,.16);
    }else if(id==='tropical_limestone'){
      const band=.5+.5*Math.sin(y*.48+Math.sin(x*.22)*.55+broad*1.8);
      const pore=saturate((fine-.69)*2.8);
      out.copy(dark).lerp(base,.54+broad*.28);
      out.lerp(light,saturate((band-.50)*1.20)*.34);
      out.lerp(light,saturate((waveNoise(x*.7,y,z*.7)-.68)*2.0)*.18);
      out.multiplyScalar(1-pore*.10);
      const faintGrowth=saturate((noise3(x*.55,y*.35,z*.55)-.72)*2.0)*up;
      out.lerp(accent,faintGrowth*.14);
    }else if(id==='dark_lava'){
      const coarse=ridgeNoise(x*.62,y*.58,z*.62);
      const fissure=ridgeNoise(x*1.95,y*1.72,z*1.86);
      out.copy(dark).lerp(base,.22+broad*.36);
      out.lerp(light,saturate((coarse-.70)*2.2)*.18);
      if(fissure<.20)out.lerp(dark,.58);
      const iron=saturate((noise3(x*.91,y*.63,z*.87)-.74)*2.6);
      out.lerp(accent,iron*.20);
    }else if(id==='layered_sandstone'){
      const warpedY=y+Math.sin(x*.12)*.55+Math.sin(z*.15)*.40;
      const band=.5+.5*Math.sin(warpedY*.80+broad*1.15);
      const thin=.5+.5*Math.sin(warpedY*2.35+fine*.7);
      out.copy(dark).lerp(base,.40+broad*.30);
      out.lerp(light,saturate((band-.42)*1.15)*.44);
      out.lerp(accent,saturate((.46-thin)*2.3)*.24);
    }else if(id==='algae_reef'){
      const stoneWave=waveNoise(x,y,z);
      out.copy(dark).lerp(base,.40+broad*.38);
      out.lerp(light,saturate((stoneWave-.62)*1.8)*.20);
      const patch=noise3(x*.58,y*.36,z*.58);
      const growth=saturate((patch-.48)*1.60)*(.28+.72*up);
      out.lerp(accent,Math.min(.72,growth));
      if(fine<.20)out.lerp(dark,.12);
    }else if(id==='deep_blue'){
      const depth=saturate((20-y)/260);
      const coolWave=waveNoise(x*.82,y*.74,z*.82);
      out.copy(dark).lerp(base,.38+broad*.36);
      out.lerp(light,saturate((coolWave-.63)*1.8)*.18);
      out.lerp(accent,.12+depth*.34);
      if(fine<.18)out.lerp(dark,.16);
    }

    colors[i*3]=out.r;
    colors[i*3+1]=out.g;
    colors[i*3+2]=out.b;
  }

  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.getAttribute('color').needsUpdate=true;
  return true;
}

export function createRockSkinLibrary(){
  const cache=new Map();
  return {
    get(id){
      const key=ROCK_SKINS[id]?id:'grey_reef';
      if(!cache.has(key))cache.set(key,createRockSkinMaterial(key));
      return cache.get(key);
    },
    dispose(){for(const material of cache.values())material.dispose();cache.clear();}
  };
}
