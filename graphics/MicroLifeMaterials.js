import * as THREE from 'three';
import { installCaustics } from './UnderwaterAtmosphere.js';
import { addSurfaceRelief } from './FishSurfaceDetail.js';

// One inexpensive batch of soft contact patches grounds the tiny animals.
// These are not dynamic light-source shadows; they follow the local seabed plane.
export function createMicroContactMesh(capacity=240) {
  const geometry=new THREE.CircleGeometry(1,24);geometry.rotateX(-Math.PI/2);
  const material=new THREE.MeshBasicMaterial({color:0x24473e,transparent:true,opacity:.36,depthWrite:false});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vContactUv; varying float vContactRange;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvContactUv=uv;');
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 contactWorld=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        contactWorld=instanceMatrix*contactWorld;
      #endif
      vContactRange=distance(cameraPosition,(modelMatrix*contactWorld).xyz);
    `);
    shader.fragmentShader='varying vec2 vContactUv; varying float vContactRange;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float radius=length((vContactUv-.5)*2.0);
      diffuseColor.a*=pow(1.0-smoothstep(.08,1.0,radius),1.0)*(1.0-smoothstep(26.0,34.0,vContactRange));
    `);
  };
  material.customProgramCacheKey=()=>'micro-contact-v1';
  const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name='Bodemcontact';mesh.count=0;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.raycast=()=>{};return mesh;
}

export function createMicroMaterial(type,clock,caustics={oceanTime:{value:0},oceanStrength:{value:0}},rangeFade=true,{classic=false}={}) {
  const roughness={shrimp:.57,starfish:.93,urchin:.86,shell:.73,crab:.77,minnow:.39};
  const material=installCaustics(new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:roughness[type],metalness:0,side:THREE.DoubleSide}),caustics);
  const lighting=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    lighting(shader);shader.uniforms.microTime=clock;
    shader.vertexShader='attribute float microFlex; uniform float microTime; varying vec3 vMicroLocal; varying float vMicroRange;\n'+shader.vertexShader;
    if(classic) {
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed.z+=sin(microTime*2.1+position.x*11.0)*microFlex*.008;
        vMicroLocal=position;
      `);
    } else {
      shader.vertexShader=`
        attribute vec4 microJoint;
        attribute vec4 microAxis;
        #ifdef USE_INSTANCING
          attribute vec4 microState;
        #endif
        vec3 microRotate(vec3 p,float angle) {
          vec3 axis=normalize(microAxis.xyz);
          float c=cos(angle),s=sin(angle);
          return p*c+cross(axis,p)*s+axis*dot(axis,p)*(1.0-c);
        }
      `+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
        vec4 state=vec4(0.0,.55,0.0,0.0);
        #ifdef USE_INSTANCING
          state=microState;
        #endif
        float phase=microTime*${type==='minnow'?'7.5':type==='shell'?'.34':type==='urchin'?'.47':'2.8'}+microAxis.w+state.x;
        if(microFlex<1.5&&state.w>.5)phase=state.x+microAxis.w;
        float activity=microFlex<1.5?state.y:1.0;
        float motionWave=microFlex<1.5?max(0.0,sin(phase)):${type==='shell'?'(.5+.5*sin(phase))':'sin(phase)'};
        float microAngle=motionWave*microJoint.w*activity;
        if(microFlex>2.5)microAngle+=state.z*1.25;
        objectNormal=microRotate(objectNormal,microAngle);
      `);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed=microJoint.xyz+microRotate(position-microJoint.xyz,microAngle);
        vMicroLocal=position;
      `);
    }
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 microWorld=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        microWorld=instanceMatrix*microWorld;
      #endif
      vMicroRange=distance(cameraPosition,(modelMatrix*microWorld).xyz);
    `);
    shader.fragmentShader='varying vec3 vMicroLocal; varying float vMicroRange;\n'+shader.fragmentShader;
    if(rangeFade)shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
      float visibility=${type==='minnow'?'smoothstep(1.2,3.2,vMicroRange)*(1.0-smoothstep(42.0,56.0,vMicroRange))':'1.0-smoothstep(26.0,34.0,vMicroRange)'};
      if(visibility<fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453))discard;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float microAA=1.0-smoothstep(.3,1.5,length(fwidth(vMicroLocal*65.0)));
      float surfaceNoise=(fishNoise(vMicroLocal*65.0)-.5)*microAA;
      diffuseColor.rgb*=1.0+surfaceNoise*${type==='crab'?'.18':'.08'};
    `);
    addSurfaceRelief(shader,'surfaceNoise*.18','surfaceNoise*.06',type==='starfish'?.001:type==='minnow'?.0001:.00035);
  };
  material.customProgramCacheKey=()=>`micro-life-v3-${type}-${rangeFade}-${classic}`;
  return material;
}
