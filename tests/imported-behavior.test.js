import test from 'node:test';
import assert from 'node:assert/strict';
import {
  importedCollisionRadius,
  importedDayPhase,
  importedExploreRadius,
  importedReserveMode,
  importedRetargetSeconds
} from '../graphics/ImportedBehavior.js';

test('import fish sleep from late evening until sunrise', () => {
  assert.equal(importedDayPhase(22).sleeping,true);
  assert.equal(importedDayPhase(2).sleeping,true);
  assert.equal(importedDayPhase(5.5).sleeping,true);
  assert.equal(importedDayPhase(6).sleeping,false);
  assert.equal(importedDayPhase(12).sleeping,false);
});

test('healthy import fish explore before food becomes urgent', () => {
  assert.equal(importedReserveMode(.9),'explore');
  assert.equal(importedReserveMode(.64),'seek');
  assert.equal(importedReserveMode(.39),'forage');
  assert.equal(importedReserveMode(.19),'urgent');
});

test('collision radius follows body cross-section rather than fish length', () => {
  const longFish=importedCollisionRadius({x:5.2,y:.9,z:.65});
  const compactFish=importedCollisionRadius({x:1.4,y:1.2,z:1.0});
  assert.ok(longFish<.55);
  assert.ok(compactFish>=longFish);
  assert.ok(longFish>=.30);
});

test('open fish get a larger exploration radius and more frequent target refresh', () => {
  assert.ok(importedExploreRadius(.35)>importedExploreRadius(.05));
  assert.ok(importedRetargetSeconds(.35,.5)<importedRetargetSeconds(.05,.5));
});
