const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};

export const WEATHER_PRESETS = Object.freeze({
  sunny: Object.freeze({ id: 'sunny', name: 'Zonnig', cloudCover: .08, wind: .30,
    waveHeight: .55, waveSpeed: .82, caustics: 1, visibility: 1, fishDepthBias: 0, storminess: 0, lightning: false }),
  cloudy: Object.freeze({ id: 'cloudy', name: 'Bewolkt', cloudCover: .72, wind: .48,
    waveHeight: .72, waveSpeed: .94, caustics: .56, visibility: .82, fishDepthBias: 1.2, storminess: .18, lightning: false }),
  calm: Object.freeze({ id: 'calm', name: 'Windstil', cloudCover: .16, wind: .04,
    waveHeight: .16, waveSpeed: .28, caustics: .88, visibility: 1, fishDepthBias: 0, storminess: 0, lightning: false }),
  storm: Object.freeze({ id: 'storm', name: 'Stormachtig', cloudCover: .96, wind: 1,
    waveHeight: 1.62, waveSpeed: 1.55, caustics: .24, visibility: .58, fishDepthBias: 3.8, storminess: .88, lightning: false }),
  thunder: Object.freeze({ id: 'thunder', name: 'Onweer met bliksem', cloudCover: 1, wind: 1.14,
    waveHeight: 1.90, waveSpeed: 1.82, caustics: .16, visibility: .48, fishDepthBias: 5.2, storminess: 1, lightning: true }),
});

export function weatherPreset(id = 'sunny', intensity = 1) {
  const preset = WEATHER_PRESETS[id] || WEATHER_PRESETS.sunny;
  const amount = clamp(Number(intensity) || 1, .25, 1.5);
  const neutral = WEATHER_PRESETS.sunny;
  const scale = key => mix(neutral[key], preset[key], amount);
  return {
    ...preset,
    intensity: amount,
    cloudCover: clamp(scale('cloudCover')),
    wind: clamp(scale('wind'), 0, 1.35),
    waveHeight: clamp(scale('waveHeight'), .12, 2.25),
    waveSpeed: clamp(scale('waveSpeed'), .2, 2.1),
    caustics: clamp(scale('caustics'), .08, 1.15),
    visibility: clamp(scale('visibility'), .35, 1),
    fishDepthBias: clamp(scale('fishDepthBias'), 0, 7),
    storminess: clamp(scale('storminess')),
  };
}

export function daylightState(hour = 12) {
  const time = ((Number(hour) || 0) % 24 + 24) % 24;
  const angle = (time - 6) / 24 * Math.PI * 2;
  const elevation = Math.sin(angle);
  const daylight = smoothstep(-.10, .18, elevation);
  const moonlight = (1 - daylight) * (.20 + .12 * Math.max(0, -elevation));
  const horizon = 1 - smoothstep(.04, .52, Math.abs(elevation));
  const twilight = horizon * smoothstep(-.20, .03, elevation);
  const sunsetWarmth = twilight * (.45 + .55 * daylight);
  const sunX = Math.cos(angle); // +x at sunrise (east), -x at sunset (west)
  const phase = time < 4.75 ? 'Nacht'
    : time < 5.75 ? 'Dageraad'
    : time < 7.25 ? 'Zonsopgang'
    : time < 11.5 ? 'Ochtend'
    : time < 15.75 ? 'Middag'
    : time < 18.75 ? 'Zonsondergang'
    : time < 20 ? 'Schemering' : 'Nacht';
  return { hour: time, phase, elevation, daylight, moonlight, twilight, sunsetWarmth, sunX };
}

export function createOceanWeather(initial = {}, { random = Math.random } = {}) {
  let cycleEnabled = initial.cycleEnabled !== false;
  let hour = Number.isFinite(Number(initial.hour)) ? Number(initial.hour) : 9.5;
  let dayLengthMinutes = clamp(Number(initial.dayLengthMinutes) || 20, 1, 240);
  let weather = Object.hasOwn(WEATHER_PRESETS, initial.weather) ? initial.weather : 'sunny';
  let intensity = clamp(Number(initial.intensity) || 1, .25, 1.5);
  let lightningFlash = 0;
  let lightningIn = 2.5 + random() * 5;

  function snapshot() {
    return { ...daylightState(hour), ...weatherPreset(weather, intensity), cycleEnabled,
      dayLengthMinutes, lightningFlash };
  }
  function update(dt = 0) {
    const seconds = Math.max(0, Number(dt) || 0);
    if (cycleEnabled) hour = (hour + seconds * 24 / (dayLengthMinutes * 60)) % 24;
    if (WEATHER_PRESETS[weather].lightning) {
      lightningIn -= seconds;
      if (lightningIn <= 0) {
        lightningFlash = 1;
        lightningIn = 2.5 + random() * 7;
      } else lightningFlash = Math.max(0, lightningFlash - seconds * 4.5);
    } else lightningFlash = 0;
    return snapshot();
  }
  return {
    update, snapshot,
    setCycleEnabled(value) { cycleEnabled = Boolean(value); },
    setHour(value) { hour = ((Number(value) || 0) % 24 + 24) % 24; },
    setDayLengthMinutes(value) { dayLengthMinutes = clamp(Number(value) || 20, 1, 240); },
    setWeather(value) { weather = Object.hasOwn(WEATHER_PRESETS, value) ? value : 'sunny'; lightningFlash = 0; },
    setIntensity(value) { intensity = clamp(Number(value) || 1, .25, 1.5); },
    serialize() { return { cycleEnabled, hour, dayLengthMinutes, weather, intensity }; },
  };
}
