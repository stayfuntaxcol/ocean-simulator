import * as THREE from 'three';

export const ROCK_SKINS=Object.freeze({
  tropical_limestone:{
    name:'Tropical Limestone',roughness:.94,
    dark:0x746b55,base:0xb3a783,light:0xd6c8a0,accent:0x73815c
  },
  grey_reef:{
    name:'Grey Reef Stone',roughness:.95,
    dark:0x444c49,base:0x69716c,light:0x949a91,accent:0x66765b
  },
  dark_lava:{
    name:'Dark Lava Basalt',roughness:.98,
    dark:0x171c1d,base:0x30383a,light:0x555d5d,accent:0x413a35
  },
  layered_sandstone:{
    name:'Layered Sandstone',roughness:.94,
    dark:0x6f5136,base:0xa78359,light:0xd0af7a,accent:0x8b6541
  },
  algae_reef:{
    name:'Algae Reef Rock',roughness:.97,
    dark:0x3f4737,base:0x687158,light:0x8b9270,accent:0x47704a
  },
  deep_blue:{
    name:'Deep Blue Reef Rock',roughness:.96,
    dark:0x293943,base:0x41535f,light:0x697985,accent:0x3b5e62
  }
});

export const ROCK_SKIN_IDS=Object.freeze(Object.keys(ROCK_SKINS));
const colorA=new THREE.Color(),colorB=new THREE.Color(),colorC=new THREE.Color();

function noise3(x,y,z){
  const a=Math.sin(x*.43+y*.31+z*.37);
  const b=Math.sin(x*1.13-y*.71+z*.83);
  return Math.max(0,Math.min(1,.5+a*.27+b*.16));
}

export function createRockSkinMaterial(skinId){
  const id=ROCK_SKINS[skinId]?skinId:'grey_reef';
  const skin=ROCK_SKINS[id];
  const material=new THREE.MeshStandardMaterial({
    color:0xffffff,
    roughness:skin.roughness,
    metalness:0,
    side:THREE.DoubleSide,
    vertexColors:true
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
  const colors=new Float32Array(position.count*3);
  colorA.setHex(skin.dark);colorB.setHex(skin.base);colorC.setHex(skin.light);
  const accent=new THREE.Color(skin.accent);
  const out=new THREE.Color();

  for(let i=0;i<position.count;i++){
    const x=position.getX(i)+center.x,y=position.getY(i)+center.y,z=position.getZ(i)+center.z;
    const n=noise3(x,y,z);
    out.copy(colorA).lerp(colorB,Math.min(1,n*1.45));
    if(n>.62)out.lerp(colorC,(n-.62)/.38*.58);

    if(id==='layered_sandstone'){
      const band=.5+.5*Math.sin(y*.72+noise3(x*.4,0,z*.4)*1.4);
      out.lerp(band>.53?colorC:colorA,.18);
    }else if(id==='dark_lava'){
      const crack=noise3(x*1.9,y*1.7,z*1.8);
      if(crack<.28)out.lerp(colorA,.55);
    }else if(id==='algae_reef'){
      const up=normal?Math.max(0,normal.getY(i)):0;
      const growth=Math.max(0,(noise3(x*.55,y*.3,z*.55)-.48)*1.5)*(.45+.55*up);
      out.lerp(accent,Math.min(.58,growth));
    }else if(id==='tropical_limestone'){
      const warm=.5+.5*Math.sin((x+z)*.12+y*.05);
      out.lerp(colorC,warm*.12);
    }else if(id==='deep_blue'){
      const depth=Math.max(0,Math.min(1,(20-y)/260));
      out.lerp(accent,depth*.24);
    }else{
      const growth=Math.max(0,noise3(x*.45,y*.35,z*.45)-.68);
      out.lerp(accent,growth*.45);
    }

    colors[i*3]=out.r;colors[i*3+1]=out.g;colors[i*3+2]=out.b;
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
