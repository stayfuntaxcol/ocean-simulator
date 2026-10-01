import test from 'node:test';
import assert from 'node:assert/strict';
import { createOceanWeather, daylightState, weatherPreset } from '../graphics/OceanWeather.js';

test('daylight follows sunrise, noon, sunset and night', () => {
  assert.equal(daylightState(2).phase, 'Nacht');
  assert.equal(daylightState(6.5).phase, 'Zonsopgang');
  assert.ok(daylightState(12).daylight > .99);
  assert.ok(daylightState(18).sunsetWarmth > .4);
  assert.ok(daylightState(0).moonlight > 0);
  assert.ok(daylightState(0).moonlight < .03);
  assert.ok(daylightState(0).nightFactor > .95);
  assert.ok(daylightState(6.4).sunriseWarmth > .7);
  assert.ok(daylightState(18.1).sunsetWarmth > .5);
  assert.ok(daylightState(12).nightFactor < .01);
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


test('weather model exposes choppiness and cloud density for the atmosphere', () => {
  const calm = weatherPreset('calm');
  const storm = weatherPreset('storm');
  assert.ok(calm.waveChoppiness < .1);
  assert.ok(storm.waveChoppiness > .8);
  assert.ok(storm.cloudDensity > calm.cloudDensity);
});

test('manual weather changes interpolate and dynamic settings serialize', () => {
  const weather = createOceanWeather({ weather: 'sunny', transitionSeconds: 10 });
  weather.setWeather('storm');
  const start = weather.snapshot();
  assert.ok(start.transitionProgress < .01);
  const half = weather.update(5);
  assert.ok(half.transitionProgress > .45 && half.transitionProgress < .55);
  assert.ok(half.waveHeight > weatherPreset('sunny').waveHeight);
  assert.ok(half.waveHeight < weatherPreset('storm').waveHeight);
  weather.setDynamicWeather(true);
  weather.setWeatherDurationMinutes(5);
  const saved = weather.serialize();
  assert.equal(saved.dynamicWeather, true);
  assert.equal(saved.weatherDurationMinutes, 5);
});
