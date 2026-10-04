import test from 'node:test';import assert from 'node:assert/strict';
import {ASSET_MAX_BYTES,importAnimalFiles,normalizeImportedAsset,validateGltf,gltfDocument} from '../animals/design/ImportedAsset.js';
import {normalizeAnimalDesign,parseAnimalDesign} from '../animals/design/AnimalDesign.js';
import {normalizeAnimalSettings} from '../animals/AnimalSettings.js';
import {animalExtent} from '../animals/AnimalSystem.js';
const file=(name,body)=>Object.assign(new Blob([body]),{name});
test('glTF embeds local buffers and preserves credits through design/world roundtrips',async()=>{
 const doc={asset:{version:'2.0'},buffers:[{uri:'mesh.bin',byteLength:4}]};const asset=await importAnimalFiles([file('orca.gltf',JSON.stringify(doc)),file('mesh.bin',new Uint8Array([1,2,3,4]))]);assert.match(JSON.parse(asset.data).buffers[0].uri,/^data:application\/octet-stream;base64,/);
 const d=normalizeAnimalDesign({worldLength:3,asset:{...asset,author:'Artist',license:'CC BY',rotation:[0,Math.PI/2,0],bounds:[.5,.2,.3]}});assert.deepEqual(parseAnimalDesign(JSON.stringify(d)),d);assert.deepEqual(normalizeAnimalSettings({orca:{design:d}}).orca.design,d);assert.equal(d.worldLength,3);
 const extent=animalExtent('orca',{design:d,size:1.25,calfSize:.48});assert.deepEqual(extent.toArray(),[1.5,.6000000000000001,.8999999999999999]);
});
test('missing, ambiguous, remote, corrupt or overly complex models fail clearly',async()=>{
 const doc={asset:{version:'2.0'},images:[{uri:'skin.png'}]};await assert.rejects(importAnimalFiles([file('orca.gltf',JSON.stringify(doc))]),/ontbreekt/);await assert.rejects(importAnimalFiles([file('orca.gltf',JSON.stringify(doc)),file('skin.png','a'),file('skin.png','b')]),/dubbel/);
 await assert.rejects(importAnimalFiles([file('orca.gltf',JSON.stringify({...doc,images:[{uri:'https://untrusted.example/skin.png'}]}))]),/externe links/);
 assert.throws(()=>normalizeImportedAsset({kind:'gltf',data:JSON.stringify(doc)}),/lokale/);assert.throws(()=>gltfDocument(new Uint8Array([1,2]).buffer),/GLB/);assert.throws(()=>validateGltf({asset:{version:'1.0'}}),/2.0/);assert.throws(()=>validateGltf({asset:{version:'2.0'},accessors:[{count:1000001}]}),/complex/);
 assert.throws(()=>validateGltf({asset:{version:'2.0'},extensionsRequired:['KHR_texture_basisu']}),/PNG\/JPEG/);
});

test('large imports pass the former 12 MB limit and irrelevant folder files do not count',async()=>{
 const bytes=new Uint8Array(13*1024*1024),doc={asset:{version:'2.0'},buffers:[{uri:'mesh.bin',byteLength:bytes.length}]};
 const asset=await importAnimalFiles([file('large.gltf',JSON.stringify(doc)),file('mesh.bin',bytes),{name:'unused.fbx',size:200*1024*1024}]);
 assert(asset.data.length>12*1024*1024);assert.deepEqual(parseAnimalDesign(JSON.stringify(normalizeAnimalDesign({asset}))).asset,asset);
 await assert.rejects(importAnimalFiles([{name:'too-large.glb',size:ASSET_MAX_BYTES+1}]),/100 MB/);
});
