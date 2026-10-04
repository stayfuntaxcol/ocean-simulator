import {createSquid} from '../graphics/Squid.js';
import {createImportedAnimal} from '../graphics/ImportedAnimal.js';
import {createDesignedOrca} from '../graphics/DesignedAnimal.js';
import {createOrca} from '../graphics/Orca.js';
import {createWhale} from '../graphics/Whale.js';
import {createStingray,createSeaTurtle} from '../graphics/ReefVisitors.js';
export function createAnimalModel(kind,settings,age=0,role='adult'){
 const model=settings.design?.asset?createImportedAnimal(settings.design,{settings,age}):kind==='orca'&&settings.design?createDesignedOrca(settings.design,{settings}):({orca:createOrca,whale:createWhale,stingray:createStingray,turtle:createSeaTurtle,squid:createSquid}[kind])(settings,age);
 if(role==='calf'){model.root.scale.multiplyScalar(settings.calfSize);model.root.name='Orkajong';}
 return model;
}
