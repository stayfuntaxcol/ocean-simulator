import * as THREE from 'three';

// A fin is a curved, ribbed membrane in the longitudinal XY plane, not a solid
// flattened primitive. UV.x runs from attachment to the free edge; UV.y is ray.
export function createFinMembrane(inner, outer, segments=24, spans=6, rays=15) {
  const a=new THREE.CatmullRomCurve3(inner.map(p=>new THREE.Vector3(...p)));
  const b=new THREE.CatmullRomCurve3(outer.map(p=>new THREE.Vector3(...p)));
  const positions=[],uvs=[],indices=[];
  for(let i=0;i<=segments;i++) {
    const u=i/segments,start=a.getPoint(u),end=b.getPoint(u);
    for(let j=0;j<=spans;j++) {
      const v=j/spans,p=start.clone().lerp(end,v);
      p.z+=Math.sin(v*Math.PI)*.012+Math.sin(u*Math.PI*2*rays)*v*.004;
      positions.push(...p.toArray());uvs.push(v,u);
    }
  }
  for(let i=0;i<segments;i++)for(let j=0;j<spans;j++) {
    const k=i*(spans+1)+j,n=k+spans+1;
    indices.push(k,k+1,n,k+1,n+1,n);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

export const SURFACE_GLSL=`
  float fishHash(vec3 p) {
    p=fract(p*vec3(.1031,.1030,.0973));
    p+=dot(p,p.yxz+33.33);
    return fract((p.x+p.y)*p.z);
  }
  float fishNoise(vec3 p) {
    vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(fishHash(i),fishHash(i+vec3(1,0,0)),f.x),
                   mix(fishHash(i+vec3(0,1,0)),fishHash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(fishHash(i+vec3(0,0,1)),fishHash(i+vec3(1,0,1)),f.x),
                   mix(fishHash(i+vec3(0,1,1)),fishHash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  // Derivative-based bump mapped into view space, retaining Three's lights,
  // normal matrices and face orientation. The epsilon protects edge-on fins.
  vec3 fishMicroNormal(vec3 n,float height,vec3 viewPosition) {
    vec3 sx=dFdx(viewPosition),sy=dFdy(viewPosition);
    vec3 r1=cross(sy,n),r2=cross(n,sx);
    float det=dot(sx,r1);
    vec3 gradient=sign(det)*(dFdx(height)*r1+dFdy(height)*r2);
    return normalize(max(abs(det),1e-8)*n-gradient);
  }
`;

export function addSurfaceRelief(shader,height,roughness,strength=.001) {
  shader.fragmentShader=SURFACE_GLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
    `#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(${roughness}),.16,.92);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',
    `#include <normal_fragment_maps>\nnormal=fishMicroNormal(normal,(${height})*${strength.toFixed(6)},-vViewPosition);`);
}

export function createRayFinMaterial(color=0xc6b783) {
  const material=new THREE.MeshStandardMaterial({color,roughness:.46,
    transparent:true,opacity:.86,depthWrite:false,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vRayUV;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvRayUV=uv;');
    shader.fragmentShader='varying vec2 vRayUV;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float rayPhase=vRayUV.y*94.2478;
      float rayAA=1.0-smoothstep(.45,2.0,fwidth(rayPhase));
      float ray=pow(.5+.5*cos(rayPhase),18.0)*rayAA;
      float branch=pow(.5+.5*cos(rayPhase*2.0+vRayUV.x*3.0),24.0)*smoothstep(.45,.95,vRayUV.x)*rayAA;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.47,.38,.21),ray*.38+branch*.10);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.89,.86,.68),smoothstep(.91,1.0,vRayUV.x)*.65);
      diffuseColor.a*=mix(.96,.38,vRayUV.x)*(1.0-ray*.12);
    `);
    addSurfaceRelief(shader,'cos(vRayUV.y*94.2478)*(1.0-smoothstep(.45,2.0,fwidth(vRayUV.y*94.2478)))','-.10*vRayUV.x',.0004);
  };
  material.customProgramCacheKey=()=>'fish-ray-membrane-v2';
  return material;
}
