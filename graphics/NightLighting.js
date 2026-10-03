import * as THREE from 'three';

export const FLASHLIGHT_STYLES=Object.freeze({
  fluorescent:{name:'Fluorescent',color:0x79ffbd,intensity:104},
  turquoise:{name:'Turquoise',color:0x45ffe6,intensity:112},
  ethereal:{name:'Ethereal',color:0xa9c8ff,intensity:96},
});

export function createNightFlashlight({scene,camera}={}){
  // Double the projected cone area; preserve illumination across the wider beam.
  const beamAngle=Math.atan(Math.SQRT2*Math.tan(Math.PI*.105));
  const light=new THREE.SpotLight(0x45ffe6,112,58,beamAngle,.64,1.25);
  light.name='Night exploration flashlight';
  const target=new THREE.Object3D();target.name='Flashlight target';
  scene.add(light,target);
  let enabled=false,style='turquoise';
  const direction=new THREE.Vector3();

  function applyStyle(id){
    style=Object.hasOwn(FLASHLIGHT_STYLES,id)?id:'turquoise';
    const preset=FLASHLIGHT_STYLES[style];
    light.color.setHex(preset.color);light.intensity=enabled?preset.intensity:0;
  }
  function update({nightFactor=0}={}){
    camera.getWorldDirection(direction);
    light.position.copy(camera.position).addScaledVector(direction,.25);
    target.position.copy(camera.position).addScaledVector(direction,24);
    light.target=target;
    const preset=FLASHLIGHT_STYLES[style];
    light.intensity=enabled?preset.intensity*(.55+.45*Math.max(.15,nightFactor)):0;
  }
  applyStyle(style);
  return {
    light,target,update,applyStyle,
    setEnabled(value){enabled=Boolean(value);applyStyle(style);},
    toggle(){enabled=!enabled;applyStyle(style);return enabled;},
    get enabled(){return enabled;},
    get style(){return style;},
    dispose(){scene.remove(light,target);light.dispose?.();}
  };
}
