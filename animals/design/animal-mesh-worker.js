import {buildAnimalSurface} from './AnimalSculpt.js';
self.onmessage=({data})=>{try{const surface=buildAnimalSurface(data.design);self.postMessage({id:data.id,surface},[surface.positions.buffer,surface.normals.buffer,surface.indices.buffer]);}catch(error){self.postMessage({id:data.id,error:error.message});}};
