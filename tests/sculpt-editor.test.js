import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVolumeSculptEditor} from '../graphics/VolumeSculptEditor.js';

test('sculpt editor supports clay cells ghost views and fixed-distance brush points',()=>{
  const scene=new THREE.Scene();
  const editor=createVolumeSculptEditor({scene,worldHalf:50,minY:-60,maxY:20,terrain:()=>-18,contains:()=>true,maxCells:1000});
  editor.setVisible(true);
  editor.setViewMode('cells');assert.equal(editor.viewMode,'cells');
  editor.setViewMode('ghost');assert.equal(editor.viewMode,'ghost');
  editor.setViewMode('clay');assert.equal(editor.viewMode,'clay');
  const p=editor.pointAtDistance(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-1),10);
  assert.ok(p);assert.ok(Math.abs(p.z+10)<1e-9);
  editor.dispose();
});

test('cell edit removes exactly one rendered sculpt cell and remains undoable',()=>{
  const scene=new THREE.Scene();
  const editor=createVolumeSculptEditor({scene,worldHalf:50,minY:-60,maxY:20,terrain:()=>-18,contains:()=>true,maxCells:1000});
  editor.setVisible(true);editor.setBrushRadius(6);editor.setStrength(1);
  editor.beginStroke();editor.apply(new THREE.Vector3(0,-10,0),'add');editor.endStroke();
  const before=editor.count;assert.ok(before>1);
  assert.equal(editor.removeInstance(0),true);
  assert.equal(editor.count,before-1);
  assert.equal(editor.undo(),true);
  assert.equal(editor.count,before);
  editor.dispose();
});


test('sculpt revision changes only when sculpt data changes',()=>{
  const scene=new THREE.Scene();
  const editor=createVolumeSculptEditor({scene,worldHalf:50,minY:-60,maxY:20,terrain:()=>-18,contains:()=>true,maxCells:1000});
  const start=editor.revision;
  editor.setViewMode('ghost');editor.setBrushRadius(9);editor.setStrength(.5);
  assert.equal(editor.revision,start);
  editor.beginStroke();editor.apply(new THREE.Vector3(0,-10,0),'add');editor.endStroke();
  assert.ok(editor.revision>start);
  const after=editor.revision;
  editor.setViewMode('clay');assert.equal(editor.revision,after);
  editor.dispose();
});

test('preview hides internal cells, keeps full save data and updates only nearby chunks',()=>{
  const editor=createVolumeSculptEditor({scene:new THREE.Scene(),minY:-100,maxY:30,terrain:()=>-100});
  const cells=[];
  for(let ix=0;ix<5;ix++)for(let iy=-5;iy<0;iy++)for(let iz=0;iz<5;iz++)cells.push({ix,iy,iz,density:1});
  cells.push({ix:30,iy:-3,iz:0,density:1});
  editor.load({format:'ocean-volume-sculpt-v1',cellSize:3,cells});editor.setVisible(true);
  assert.equal(editor.count,126);assert.equal(editor.serialize().cells.length,126);
  assert.equal(editor.meshes.reduce((n,m)=>n+m.count,0),99);
  const distant=editor.meshes.find(m=>m.userData.instanceKeys.includes('30,-3,0'));
  editor.setBrushRadius(3);editor.beginStroke();editor.apply(new THREE.Vector3(0,-15,0),'remove');editor.endStroke();
  assert.ok(editor.meshes.includes(distant),'unchanged chunk retains its GPU instance buffer');
  editor.updateVisibility({position:new THREE.Vector3(0,-10,0)},{cullRadius:60});assert.equal(distant.visible,false);
  const saved=editor.serialize();editor.clear();assert.equal(editor.meshes.length,0);
  editor.undo();assert.deepEqual(editor.serialize(),saved);editor.dispose();
});

test('loaded sculpt resolution is preserved when editing and undoing',()=>{
  const editor=createVolumeSculptEditor({scene:new THREE.Scene(),minY:-100,maxY:30,terrain:()=>-100});
  editor.load({format:'ocean-volume-sculpt-v1',cellSize:6,cells:[{ix:0,iy:-2,iz:0,density:1}]});
  assert.equal(editor.cellSize,6);assert.equal(editor.serialize().cellSize,6);
  editor.removeInstance(0);editor.undo();assert.equal(editor.cellSize,6);editor.dispose();
});

test('one large brush cannot exceed the cell budget and can still strengthen existing cells',()=>{
  const editor=createVolumeSculptEditor({scene:new THREE.Scene(),minY:-100,maxY:30,terrain:()=>-100,maxCells:3});
  editor.setBrushRadius(15);editor.setStrength(.25);editor.beginStroke();editor.apply(new THREE.Vector3(0,-10,0));editor.endStroke();
  assert.equal(editor.count,3);const before=editor.serialize().cells.reduce((n,c)=>n+c.density,0);
  editor.beginStroke();editor.apply(new THREE.Vector3(0,-10,0));editor.endStroke();
  assert.equal(editor.count,3);assert.ok(editor.serialize().cells.reduce((n,c)=>n+c.density,0)>before);editor.dispose();
});
