import {createOrca} from '../graphics/Orca.js';
import {createWhale} from '../graphics/Whale.js';
import {createStingray,createSeaTurtle} from '../graphics/ReefVisitors.js';
export function createAnimalModel(kind,settings,age=0,role='adult'){
 const model=({orca:createOrca,whale:createWhale,stingray:createStingray,turtle:createSeaTurtle}[kind])(settings,age);
 if(role==='calf'){model.root.scale.multiplyScalar(settings.calfSize);model.root.name='Orkajong';}
 return model;
}
