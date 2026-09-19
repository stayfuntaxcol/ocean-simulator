import { installCaustics } from './UnderwaterAtmosphere.js';

// World-space detail stays the same size when the terrain or a rock is scaled.
// No downloaded textures and no additional draw calls.
export function installSeabedMaterial(material, caustics, detail, kind = 'sand') {
  if (!['sand', 'limestone', 'basalt'].includes(kind)) throw new Error('Unknown seabed material');
  installCaustics(material, caustics);
  const lightCompile = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    lightCompile(shader);
    shader.uniforms.seabedDetail = detail;
    shader.fragmentShader = `
      uniform float seabedDetail;
      float seabedHash(vec3 p) {
        p = fract(p * .1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float seabedNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(seabedHash(i), seabedHash(i+vec3(1,0,0)), f.x),
                       mix(seabedHash(i+vec3(0,1,0)), seabedHash(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(seabedHash(i+vec3(0,0,1)), seabedHash(i+vec3(1,0,1)), f.x),
                       mix(seabedHash(i+vec3(0,1,1)), seabedHash(i+vec3(1,1,1)), f.x), f.y), f.z);
      }
    ` + shader.fragmentShader;
    const surface = kind === 'sand' ? `
      vec2 sand = vOceanWorld.xz;
      float broad = seabedNoise(vec3(sand*.065, 2.0));
      float phase = sand.x*9.0 + sin(sand.y*.52)*1.7 + sin(sand.x*.35+sand.y*.31)*1.1;
      float rippleFilter = 1.0 - smoothstep(.4, 2.5, fwidth(phase));
      float ripple = sin(phase) * rippleFilter;
      float grainFilter = 1.0 - smoothstep(.35, 1.2, length(fwidth(sand*65.0)));
      float grain = (seabedNoise(vec3(sand*65.0, 8.0))-.5) * grainFilter;
      vec3 bedColor = mix(vec3(.34,.30,.21), vec3(.64,.57,.41), broad);
      bedColor *= 1.0 + ripple*.045 + grain*.15;
      float bedHeight = ripple*.025 + grain*.003;
    ` : `
      vec3 stone = vOceanWorld;
      float broad = seabedNoise(stone*.55);
      float fine = seabedNoise(stone*6.0);
      float nearDetail = 1.0-smoothstep(15.0,45.0,length(vViewPosition));
      float pores = smoothstep(.62,.83,fine)*nearDetail;
      ${kind === 'limestone' ? `
        float phase = stone.y*6.5 + sin(stone.x*.8)*.6 + broad*2.4;
        float bands = sin(phase)*(1.0-smoothstep(.5,2.5,fwidth(phase)));
        vec3 bedColor = mix(vec3(.24,.23,.17),vec3(.57,.53,.39),broad);
        bedColor *= 1.0 + bands*.10 - pores*.22;
        float bedHeight = broad*.055 + bands*.012 - pores*.012;
      ` : `
        float seams = 1.0-smoothstep(.02,.11,abs(broad-.48));
        vec3 bedColor = mix(vec3(.075,.095,.10),vec3(.24,.28,.28),broad);
        bedColor *= 1.0 - seams*.25 - pores*.18;
        float bedHeight = broad*.07 - seams*.014 - pores*.009;
      `}
      // Patchy olive biofilm helps the rocks sit naturally in the reef.
      float growth = smoothstep(.53,.76,seabedNoise(stone*.9+vec3(12.0)));
      bedColor = mix(bedColor,bedColor*vec3(.65,.86,.47),growth*.45);
    `;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      ${surface}
      diffuseColor.rgb = mix(diffuseColor.rgb, bedColor, seabedDetail);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      // Derivative bump mapping: change lighting, never collision/terrain heights.
      vec3 bedDx = dFdx(-vViewPosition), bedDy = dFdy(-vViewPosition);
      vec3 bedR1 = cross(bedDy,normal), bedR2 = cross(normal,bedDx);
      float bedDet = dot(bedDx,bedR1);
      vec3 bedGradient = sign(bedDet)*(dFdx(bedHeight)*bedR1+dFdy(bedHeight)*bedR2);
      normal = normalize(normal - bedGradient/max(abs(bedDet),.000001)*seabedDetail);
    `);
  };
  material.customProgramCacheKey = () => `ocean-seabed-v1-${kind}`;
  return material;
}
