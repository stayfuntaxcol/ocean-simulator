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
