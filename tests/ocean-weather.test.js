import test from 'node:test';
import assert from 'node:assert/strict';
import { createOceanWeather, daylightState, weatherPreset } from '../graphics/OceanWeather.js';

test('daylight follows sunrise, noon, sunset and night', () => {
  assert.equal(daylightState(2).phase, 'Nacht');
  assert.equal(daylightState(6.5).phase, 'Zonsopgang');
  assert.ok(daylightState(12).daylight > .99);
  assert.ok(daylightState(18).sunsetWarmth > .4);
  assert.ok(daylightState(0).moonlight > 0);
});

test('the sun travels from east at sunrise to west at sunset', () => {
  assert.ok(daylightState(6).sunX > .9);
  assert.ok(daylightState(18).sunX < -.9);
});

test('weather presets change clouds, waves and fish depth coherently', () => {
  const calm = weatherPreset('calm');
  const storm = weatherPreset('storm');
  const thunder = weatherPreset('thunder');
  assert.ok(calm.waveHeight < storm.waveHeight);
  assert.ok(storm.cloudCover > weatherPreset('sunny').cloudCover);
  assert.ok(thunder.fishDepthBias > storm.fishDepthBias);
  assert.ok(thunder.caustics < calm.caustics);
});

test('automatic time advances at the configured speed and can pause', () => {
  const weather = createOceanWeather({ hour: 12, dayLengthMinutes: 24 });
  assert.equal(weather.update(60).hour, 13);
  weather.setCycleEnabled(false);
  assert.equal(weather.update(120).hour, 13);
});

test('only thunder weather creates a short lightning flash', () => {
  const weather = createOceanWeather({ weather: 'thunder' }, { random: () => 0 });
  assert.equal(weather.update(2).lightningFlash, 0);
  assert.equal(weather.update(.6).lightningFlash, 1);
  assert.ok(weather.update(.1).lightningFlash < 1);
  weather.setWeather('sunny');
  assert.equal(weather.update(30).lightningFlash, 0);
});
