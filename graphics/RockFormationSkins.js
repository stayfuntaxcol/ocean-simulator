import * as THREE from 'three';

export const ROCK_SKINS=Object.freeze({
  tropical_limestone:{
    name:'Tropical Limestone',
    color:0xb3a783,
    roughness:.94
  },
  grey_reef:{
    name:'Grey Reef Stone',
    color:0x69716c,
    roughness:.95
  },
  dark_lava:{
    name:'Dark Lava Basalt',
    color:0x30383a,
    roughness:.98
  },
  layered_sandstone:{
    name:'Layered Sandstone',
    color:0xa78359,
    roughness:.94
  },
  algae_reef:{
    name:'Algae Reef Rock',
    color:0x687158,
    roughness:.97
  },
  deep_blue:{
    name:'Deep Blue Reef Rock',
    color:0x41535f,
    roughness:.96
  }
});

export const ROCK_SKIN_IDS=Object.freeze(Object.keys(ROCK_SKINS));

export function createRockSkinMaterial(skinId){
  const id=ROCK_SKINS[skinId]?skinId:'grey_reef';
  const skin=ROCK_SKINS[id];
  const material=new THREE.MeshStandardMaterial({
    color:skin.color,
    roughness:skin.roughness,
    metalness:0,
    side:THREE.DoubleSide,
    flatShading:true
  });
  material.userData.rockSkin=id;
  material.name='Sculpt rock skin · '+skin.name;
  return material;
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
