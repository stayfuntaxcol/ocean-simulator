import test from 'node:test';
import assert from 'node:assert/strict';
import {readGlb,labelGlb,fishMetadata,validateProject,MAX_FISH_BYTES,fileNameFor} from '../library/FishFormat.js';

function glb(json,bin=new Uint8Array([9,8,7,6])) {
  const text=new TextEncoder().encode(JSON.stringify(json)),length=Math.ceil(text.length/4)*4;
  const buffer=new ArrayBuffer(28+length+bin.length),view=new DataView(buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,buffer.byteLength,true);
  view.setUint32(12,length,true);view.setUint32(16,0x4e4f534a,true);
  new Uint8Array(buffer,20,length).fill(32);new Uint8Array(buffer,20,text.length).set(text);
  view.setUint32(20+length,bin.length,true);view.setUint32(24+length,0x004e4942,true);new Uint8Array(buffer,28+length).set(bin);return buffer;
}
const picture='data:image/png;base64,AAAA';
const project={version:1,species:'clown',pattern:'classic',storybook:true,palette:['#ffffff','#000000','#abcdef','#123456'],storyBluePalette:['#ffffff','#000000','#abcdef','#123456'],flatGreenPalette:['#ffffff','#000000','#abcdef','#123456'],orangeStoryPalette:['#ffffff','#000000','#abcdef','#123456'],layers:{body:{base:picture,paint:picture},tail:{base:picture,paint:picture}}};

test('sharing a renamed fish preserves exact geometry, texture bytes and editable design',()=>{
  const binary=new Uint8Array([255,88,0,43,18,11,11,11]);
  const original=glb({asset:{version:'2.0'},nodes:[{extras:{fishStudio:project,fishLibrary:{name:'Oud',author:'Anne'}}}]},binary);
  const shared=labelGlb(original,{name:'Regenboogvis',author:'Stephan'});
  assert.deepEqual(readGlb(shared).chunks[1].bytes,binary);
  assert.deepEqual(fishMetadata(shared),{name:'Regenboogvis',author:'Stephan',species:'clown',project});
  assert.equal(fishMetadata(original).name,'Oud','labeling does not mutate the original');
});
test('old GLBs are still importable but never falsely marked editable',()=>{
  const original=glb({asset:{version:'2.0'},nodes:[{extras:{species:'clown'}}]});
  assert.deepEqual(fishMetadata(original,'mijn-vis.glb'),{name:'mijn-vis',author:'',species:'',project:null});
});
test('broken, oversized and externally linked files fail before loading models',()=>{
  assert.throws(()=>readGlb(new ArrayBuffer(10)));
  assert.throws(()=>readGlb(new ArrayBuffer(MAX_FISH_BYTES+1)),/25 MB/);
  const truncated=glb({asset:{version:'2.0'}}).slice(0,-4);assert.throws(()=>readGlb(truncated));
  for(const uri of ['https://example.com/texture.png','../local.bin','javascript:alert(1)']) {
    assert.throws(()=>readGlb(glb({asset:{version:'2.0'},images:[{uri}]})),/externe/);
  }
  assert.doesNotThrow(()=>readGlb(glb({asset:{version:'2.0'},images:[{uri:picture}]})));
});
test('project validation rejects malformed layers, invalid palettes and unsupported versions',()=>{
  assert.deepEqual(validateProject(project),project);
  for(const bad of [{...project,version:2},{...project,species:'__proto__'},{...project,palette:['red']},{...project,layers:{body:{base:'https://example.com',paint:picture},tail:project.layers.tail}}])assert.equal(validateProject(bad),null);
  const copy=validateProject(project);copy.palette[0]='#999999';assert.equal(project.palette[0],'#ffffff');
  assert.equal(fileNameFor('../Mijn vis?💧'),'Mijn-vis.glb');
});
