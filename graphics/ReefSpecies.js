import * as THREE from 'three';
import {createFinMembrane,createRayFinMaterial,addSurfaceRelief} from './FishSurfaceDetail.js';
import {createClosedReefBody,animateReefMaterial,createReefAnimator,reefUniforms} from './RealisticReefSupport.js';

// Keep the old palette IDs: existing school identities and world data stay valid.
// These are original designs inspired by A. coeruleus, P. kauderni and Chromis.
export const REEF_SPECIES=Object.freeze({
  reef_3:{name:'Doktersvis',kind:'tang',finColor:0x3868d4,eye:[.92,.21,.176],eyeSize:.071,
    profile:[[-1.42,.065,.045],[-1.12,.23,.12],[-.76,.61,.24],[-.22,.82,.32],[.34,.76,.31],[.76,.46,.23],[1.04,.23,.14],[1.25,.075,.065],[1.32,.045,.045]]},
  reef_5:{name:'Kardinaalvis',kind:'cardinal',finColor:0xbcbdb0,eye:[.88,.16,.219],eyeSize:.112,
    profile:[[-1.32,.055,.045],[-1.04,.15,.11],[-.67,.41,.23],[-.17,.58,.30],[.29,.53,.29],[.73,.36,.26],[1.02,.21,.185],[1.25,.11,.085],[1.30,.065,.05]]},
  reef_7:{name:'Rifbaars',kind:'chromis',finColor:0x7ccfc0,eye:[.81,.14,.192],eyeSize:.083,
    profile:[[-1.33,.055,.045],[-1.02,.15,.115],[-.70,.32,.20],[-.26,.48,.27],[.27,.47,.28],[.67,.31,.24],[.95,.17,.155],[1.16,.075,.07],[1.22,.05,.045]]},
});

export function createReefSpeciesBody(id,low=false){
  const spec=REEF_SPECIES[id];if(!spec)throw Error('Unknown reef species: '+id);
  return createClosedReefBody(spec.profile,low?24:52,low?16:32);
}

function speciesSkin(kind,cartoon){
  const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:cartoon?.56:.43,metalness:0});
  const pattern=kind==='tang'?`
    vec3 coat=mix(vec3(.023,.080,.36),vec3(.045,.31,.73),smoothstep(-.1,.8,-p.y));
    float contour=sin(p.x*19.0+p.y*7.0+sin(p.y*9.0)*.38);
    coat*=1.0+contour*.045*(1.0-smoothstep(.45,1.0,p.x));
    float lip=1.0-smoothstep(1.18,1.27,p.x);
    coat=mix(vec3(.26,.30,.40),coat,lip);
    float spine=exp(-pow((p.x+1.19)*20.0,2.0)-pow(p.y*30.0,2.0));
    coat=mix(coat,vec3(.98,.76,.065),spine*.95);
  `:kind==='cardinal'?`
    vec3 coat=mix(vec3(.50,.54,.50),vec3(.83,.82,.67),.5+.5*sin(p.y*2.0));
    float bars=min(abs(p.x-.82+p.y*.18)-.090,min(abs(p.x-.02-p.y*.08)-.15,abs(p.x+.73+p.y*.20)-.095));
    float aa=max(.004,fwidth(bars));
    coat=mix(coat,vec3(.013,.022,.026),1.0-smoothstep(-aa,aa,bars));
    vec2 dots=p.xy*vec2(15.0,16.0);dots.x+=mod(floor(dots.y),2.0)*.5;
    float speck=1.0-smoothstep(.075,.12+length(fwidth(dots))*.35,length(fract(dots)-.5));
    speck*=smoothstep(-.05,.02,bars)*(1.0-smoothstep(.35,1.2,length(fwidth(dots))));
    coat=mix(coat,vec3(.94,.95,.86),speck*.85);
  `:`
    float flank=1.0-smoothstep(.02,.47,abs(p.y));
    vec3 coat=mix(vec3(.065,.24,.25),vec3(.11,.62,.57),flank);
    coat=mix(coat,vec3(.46,.77,.64),smoothstep(.05,.44,-p.y)*.8);
    float blueLine=exp(-pow((p.y-.10-p.x*.035)*30.0,2.0));
    coat=mix(coat,vec3(.12,.42,.84),blueLine*.45);
    float axil=exp(-pow((p.x-.36)*13.0,2.0)-pow((p.y+.025)*16.0,2.0));
    coat=mix(coat,vec3(.018,.07,.075),axil*.8);
  `;
  m.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vSpeciesSkin;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSpeciesSkin=position;');
    s.fragmentShader=`varying vec3 vSpeciesSkin;
      float speciesScales(vec3 p){
        vec2 grid=p.xy*vec2(49.0,57.0);grid.x+=mod(floor(grid.y),2.0)*.5;
        vec2 cell=fract(grid)-.5;
        float arc=abs(length(vec2(cell.x*.86,cell.y+.32))-.47);
        float aa=max(fwidth(arc),.02);
        return (1.0-smoothstep(.02,.02+aa,arc))*(1.0-smoothstep(.35,1.2,length(fwidth(grid))))*(1.0-smoothstep(.55,1.03,p.x));
      }
    `+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=vSpeciesSkin;
      ${pattern}
      coat*=1.0-speciesScales(p)*${cartoon?'.055':'.12'};
      coat*=.97+.06*fishNoise(p*95.0);
      diffuseColor.rgb=coat${cartoon?'*1.15':''};
    `);
    addSurfaceRelief(s,'-speciesScales(vSpeciesSkin)',
      'speciesScales(vSpeciesSkin)*.08+(fishNoise(vSpeciesSkin*95.0)-.5)*.05',cartoon?.00035:.0012);
  };
  m.customProgramCacheKey=()=>`reef-species-${kind}-${cartoon?'cartoon':'realistic'}-v1`;return m;
}

function speciesFin(spec){
  const m=createRayFinMaterial(spec.finColor),hook=m.onBeforeCompile.bind(m);
  m.onBeforeCompile=s=>{
    hook(s);
    s.vertexShader='varying vec3 vSpeciesFin;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSpeciesFin=position;');
    s.fragmentShader='varying vec3 vSpeciesFin;\n'+s.fragmentShader;
    const edge=spec.kind==='cardinal'?`
      float stripe=1.0-smoothstep(.075,.105,abs(vRayUV.x-.70));
      stripe=max(stripe,smoothstep(.90,.96,vRayUV.x));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.018,.028,.035),stripe*.95);
      vec2 dots=vec2(vRayUV.x*9.0,vRayUV.y*23.0);
      float pearl=(1.0-smoothstep(.10,.18+length(fwidth(dots))*.25,length(fract(dots)-.5)))*(1.0-smoothstep(.4,1.3,length(fwidth(dots))));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.95,.87),pearl*.8);
    `:spec.kind==='tang'?`
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.10,.56,.93),smoothstep(.85,.94,vRayUV.x)*.8);
      diffuseColor.rgb*=1.0-smoothstep(.95,1.0,vRayUV.x)*.5;
    `:`
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.31,.76,.67),smoothstep(.5,1.0,vRayUV.x)*.5);
      diffuseColor.a*=.82;
    `;
    s.fragmentShader=s.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\n'+edge);
  };
  m.customProgramCacheKey=()=>`reef-species-fin-${spec.kind}-v1`;return m;
}

function createAssets(id){
  const spec=REEF_SPECIES[id],geometries=[],materials=[],instances=new Set();let disposed=false;
  const own=g=>{g.computeBoundingSphere();g.boundingSphere.radius+=.17;geometries.push(g);return g;};
  const mat=(color,roughness)=>{const m=new THREE.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
  const near=own(createReefSpeciesBody(id)),far=own(createReefSpeciesBody(id,true));
  const sphere=own(new THREE.SphereGeometry(1,18,12));
  const skins=[speciesSkin(spec.kind,true),speciesSkin(spec.kind,false)],fin=speciesFin(spec);materials.push(...skins,fin);
  const white=mat(0xe5e9db,.32),orbit=mat(spec.kind==='cardinal'?0x35423b:0x123f55,.46),iris=mat(spec.kind==='cardinal'?0xa39968:0x729997,.29),pupil=mat(0x02090d,.12);
  iris.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vReefIris;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvReefIris=position;');
    s.fragmentShader='varying vec3 vReefIris;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float a=atan(vReefIris.y,vReefIris.x)*41.0;
      float rays=(.5+.5*sin(a+length(vReefIris.xy)*9.0))*(1.0-smoothstep(.6,2.0,fwidth(a)));
      diffuseColor.rgb*=.62+.38*rays;`);
  };
  iris.customProgramCacheKey=()=>`reef-species-iris-${id}-v1`;
  function membrane(name,inner,outer){
    const shapes={name,near:own(createFinMembrane(inner,outer,28,6,17)),far:own(createFinMembrane(inner,outer,12,3,17))};
    return shapes;
  }
  const bodyFins=[];
  if(spec.kind==='tang'){
    bodyFins.push(membrane('Continuous dorsal membrane',[[-1.17,.21,0],[-.75,.60,0],[-.20,.82,0],[.35,.75,0],[.83,.38,0]],
      [[-1.22,.29,0],[-.82,.92,0],[-.21,1.12,0],[.41,1.01,0],[.84,.39,0]]));
    bodyFins.push(membrane('Continuous anal membrane',[[-1.16,-.21,0],[-.73,-.60,0],[-.20,-.82,0],[.33,-.75,0]],
      [[-1.25,-.31,0],[-.90,-.85,0],[-.32,-1.05,0],[.35,-.75,0]]));
    bodyFins.push(membrane('Crescent caudal membrane',[[-1.4,.06,0],[-1.45,0,0],[-1.4,-.06,0]],
      [[-2.17,.63,0],[-1.94,.38,0],[-1.80,0,0],[-1.94,-.38,0],[-2.17,-.63,0]]));
  }else if(spec.kind==='cardinal'){
    bodyFins.push(membrane('First dorsal membrane',[[.44,.49,0],[.10,.56,0],[-.18,.58,0]],
      [[.44,.50,0],[.16,1.28,0],[-.19,.70,0]]));
    bodyFins.push(membrane('Second dorsal membrane',[[-.22,.57,0],[-.64,.43,0],[-1.05,.14,0]],
      [[-.23,.61,0],[-.57,1.16,0],[-1.40,.45,0]]));
    bodyFins.push(membrane('Long anal membrane',[[.01,-.57,0],[-.50,-.47,0],[-1.10,-.12,0]],
      [[.01,-.58,0],[-.54,-1.07,0],[-1.42,-.36,0]]));
    bodyFins.push(membrane('Forked caudal membrane',[[-1.29,.055,0],[-1.33,0,0],[-1.29,-.055,0]],
      [[-2.21,.73,0],[-1.98,.40,0],[-1.60,0,0],[-1.98,-.40,0],[-2.21,-.73,0]]));
  }else{
    bodyFins.push(membrane('Low dorsal membrane',[[.44,.40,0],[.04,.48,0],[-.43,.43,0],[-1.01,.14,0]],
      [[.44,.41,0],[.02,.72,0],[-.64,.70,0],[-1.12,.17,0]]));
    bodyFins.push(membrane('Anal membrane',[[-.10,-.48,0],[-.61,-.38,0],[-1.04,-.13,0]],
      [[-.10,-.48,0],[-.73,-.65,0],[-1.12,-.17,0]]));
    bodyFins.push(membrane('Forked caudal membrane',[[-1.30,.055,0],[-1.34,0,0],[-1.30,-.055,0]],
      [[-2.06,.53,0],[-1.88,.33,0],[-1.60,0,0],[-1.88,-.33,0],[-2.06,-.53,0]]));
  }
  const pectoral=membrane('Pectoral membrane',[[0,.035,0],[0,0,0],[0,-.035,0]],
    [[-.15,.13,.035],[-.44,-.04,.075],[-.36,-.29,.04],[-.13,-.20,0]]);
  const pelvic=membrane('Pelvic membrane',[[.20,-.37,0],[.03,-.47,0],[-.08,-.47,0]],
    [[.21,-.39,0],[-.10,spec.kind==='cardinal'?-.98:-.70,.04],[-.31,-.58,0]]);
  const seamMat=mat(spec.kind==='cardinal'?0x394744:0x183d51,.56);
  const curve=(points,radius)=>own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,5,false));
  const nose=spec.profile.at(-1)[0];
  const mouth=curve([[nose-.06,-.035,-.06],[nose+.006,-.036,0],[nose-.06,-.035,.06]],.006);
  const outline=new THREE.CatmullRomCurve3(spec.profile.map(p=>new THREE.Vector3(...p)));
  const gillPoints=[[.64,.67],[.52,.40],[.46,0],[.50,-.40],[.59,-.65]].map(([x,height])=>{
    let low=0,high=1;
    for(let i=0;i<24;i++){const u=(low+high)/2;if(outline.getPoint(u).x<x)low=u;else high=u;}
    const p=outline.getPoint((low+high)/2);
    return [x,p.y*height,p.z*Math.sqrt(1-height*height)+.004];
  });
  const gill=curve(gillPoints,.005);
  const scalpel=spec.kind==='tang'?own(new THREE.ConeGeometry(.018,.15,7)):null;
  const yellow=spec.kind==='tang'?mat(0xffd44a,.39):null;

  function create(fish){
    if(disposed)throw Error('Species assets disposed');
    const group=new THREE.Group();group.name=spec.name;fish.add(group);
    const uniforms=reefUniforms();
    const bodyMaterials=skins.map(s=>animateReefMaterial(s,uniforms));
    const finMaterial=animateReefMaterial(fin,uniforms,{fin:true});
    const mesh=(geo,material,name,pos=[0,0,0],scale=[1,1,1])=>{
      const o=new THREE.Mesh(geo,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);group.add(o);return o;
    };
    const body=mesh(near,bodyMaterials[0],'Body'),fins=[],details=[],eyes=[],pectorals=[];
    const addFin=(shapes,pos,scale)=>{const m=mesh(shapes.near,finMaterial,shapes.name,pos,scale);fins.push({mesh:m,shapes});return m;};
    bodyFins.forEach(f=>addFin(f));mesh(mouth,seamMat,'Mouth seam');
    for(const side of [-1,1]){
      const [x,y,z]=spec.eye,r=spec.eyeSize;
      const surround=mesh(sphere,orbit,'Eye rim',[x,y,side*z],[r*1.20,r*1.14,r*.5]);
      const sclera=mesh(sphere,white,'Cartoon eye white',[x,y,side*(z+r*.20)],[r*1.8,r*1.9,r*.60]);
      const ring=mesh(sphere,iris,'Iris',[x+.014,y,side*(z+r*.48)],[r*.86,r*.86,r*.22]);
      const dark=mesh(sphere,pupil,'Pupil',[x+.025,y,side*(z+r*.69)],[r*.54,r*.61,r*.14]);
      eyes.push({surround,sclera,ring,dark,side,x,y,z,r});
      const cover=mesh(gill,seamMat,'Gill cover');cover.scale.z=side;details.push(cover);
      const p=addFin(pectoral,[.38,-.055,side*.245],[1,1,side]);p.rotation.y=side*.65;pectorals.push(p);
      const v=addFin(pelvic,[0,spec.kind==='tang'?-.25:0,side*.09],[1,1,side]);v.rotation.x=side*.15;
      if(scalpel){const spine=mesh(scalpel,yellow,'Caudal scalpel',[-1.18,0,side*.11]);spine.rotation.z=Math.PI/2;details.push(spine);}
    }
    const animation=createReefAnimator(fish,group,body,near,far,{uniforms,pectorals,details,materials:[...bodyMaterials,finMaterial]});
    let lastStyle=null;
    function update(time,close,style='cartoon'){
      const cartoon=style!=='realistic';
      if(cartoon!==lastStyle){
        group.scale.y=cartoon?1.06:1;
        for(const e of eyes){
          e.sclera.visible=cartoon;e.surround.visible=!cartoon;
          const stretch=cartoon?1.35:1;
          e.ring.scale.set(e.r*.86*stretch,e.r*.86*stretch,e.r*.22);
          e.dark.scale.set(e.r*.54*stretch,e.r*.61*stretch,e.r*.14);
          e.ring.position.z=e.side*(e.z+e.r*(cartoon?.70:.48));
          e.dark.position.z=e.side*(e.z+e.r*(cartoon?.91:.69));
        }
        lastStyle=cartoon;
      }
      animation.update(time,close);body.material=bodyMaterials[cartoon?0:1];
      for(const f of fins)f.mesh.geometry=close?f.shapes.near:f.shapes.far;
    }
    let released=false;
    const instance={group,body,uniforms,update,dispose(){if(released)return;released=true;animation.dispose();instances.delete(instance);}};
    instances.add(instance);update(0,true);return instance;
  }
  return {create,dispose(){if(disposed)return;disposed=true;for(const i of [...instances])i.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}

// All three replace their legacy shapes even in low quality / original lighting.
export function createReefSpeciesLibrary(){
  const assets=new Map(),members=new Map();let disposed=false;
  function attach(fish,id){
    if(disposed)throw Error('Reef species library disposed');
    if(!REEF_SPECIES[id])throw Error('Unknown reef species: '+id);
    if(members.has(fish))return members.get(fish);
    const basic=new THREE.Group();basic.name='Legacy palette fish';basic.visible=false;
    for(const c of [...fish.children])basic.add(c);fish.add(basic);
    if(!assets.has(id))assets.set(id,createAssets(id));
    const visual=assets.get(id).create(fish),previousName=fish.userData.visualSpecies;
    fish.userData.visualSpecies=REEF_SPECIES[id].name;
    const m={...visual,basic,previousName};members.set(fish,m);return m;
  }
  function update(time,camera,quality='medium',style='cartoon'){
    const limit=quality==='low'?14:quality==='high'?38:26;
    for(const [fish,m] of members){
      if(!fish.parent){m.dispose();for(const c of [...m.basic.children])fish.add(c);fish.remove(m.basic);if(m.previousName===undefined)delete fish.userData.visualSpecies;else fish.userData.visualSpecies=m.previousName;members.delete(fish);continue;}
      if(!fish.visible||fish.userData.dead)continue;
      m.update(time,fish.position.distanceToSquared(camera.position)<limit*limit,style);
    }
  }
  function dispose(){
    if(disposed)return;disposed=true;
    for(const [fish,m] of members){m.dispose();for(const c of [...m.basic.children])fish.add(c);fish.remove(m.basic);if(m.previousName===undefined)delete fish.userData.visualSpecies;else fish.userData.visualSpecies=m.previousName;}
    members.clear();assets.forEach(a=>a.dispose());assets.clear();
  }
  return {attach,update,dispose,get size(){return members.size;}};
}
