const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const smoothstep = (edge0, edge1, value) => {
  const span = Math.max(1e-6, edge1 - edge0);
  const x = clamp((value - edge0) / span);
  return x * x * (3 - 2 * x);
};
const circularDistance = (a, b) => {
  const d = Math.abs(a - b) % 24;
  return Math.min(d, 24 - d);
};
const bell = (hour, center, width) => {
  const d = circularDistance(hour, center) / Math.max(.01, width);
  return Math.exp(-d * d);
};

export const WEATHER_PRESETS = Object.freeze({
  sunny: Object.freeze({
    id: 'sunny', name: 'Zonnig', cloudCover: .06, cloudDensity: .22, wind: .26,
    waveHeight: .50, waveSpeed: .80, waveChoppiness: .20, caustics: 1,
    visibility: 1, fishDepthBias: 0, storminess: 0, lightning: false,
  }),
  cloudy: Object.freeze({
    id: 'cloudy', name: 'Bewolkt', cloudCover: .76, cloudDensity: .70, wind: .46,
    waveHeight: .72, waveSpeed: .96, waveChoppiness: .42, caustics: .50,
    visibility: .80, fishDepthBias: 1.25, storminess: .20, lightning: false,
  }),
  calm: Object.freeze({
    id: 'calm', name: 'Windstil', cloudCover: .12, cloudDensity: .28, wind: .035,
    waveHeight: .13, waveSpeed: .24, waveChoppiness: .04, caustics: .92,
    visibility: 1, fishDepthBias: 0, storminess: 0, lightning: false,
  }),
  storm: Object.freeze({
    id: 'storm', name: 'Stormachtig', cloudCover: .97, cloudDensity: .94, wind: 1,
    waveHeight: 1.70, waveSpeed: 1.62, waveChoppiness: .92, caustics: .20,
    visibility: .55, fishDepthBias: 4.0, storminess: .90, lightning: false,
  }),
  thunder: Object.freeze({
    id: 'thunder', name: 'Onweer met bliksem', cloudCover: 1, cloudDensity: 1, wind: 1.16,
    waveHeight: 2.05, waveSpeed: 1.92, waveChoppiness: 1, caustics: .11,
    visibility: .44, fishDepthBias: 5.5, storminess: 1, lightning: true,
  }),
});

const NUMERIC_WEATHER_KEYS = Object.freeze([
  'cloudCover', 'cloudDensity', 'wind', 'waveHeight', 'waveSpeed', 'waveChoppiness',
  'caustics', 'visibility', 'fishDepthBias', 'storminess',
]);

export function weatherPreset(id = 'sunny', intensity = 1) {
  const preset = WEATHER_PRESETS[id] || WEATHER_PRESETS.sunny;
  const amount = clamp(Number(intensity) || 1, .25, 1.5);
  const neutral = WEATHER_PRESETS.sunny;
  const scale = key => mix(neutral[key], preset[key], amount);
  return {
    ...preset,
    intensity: amount,
    cloudCover: clamp(scale('cloudCover')),
    cloudDensity: clamp(scale('cloudDensity')),
    wind: clamp(scale('wind'), 0, 1.35),
    waveHeight: clamp(scale('waveHeight'), .08, 2.35),
    waveSpeed: clamp(scale('waveSpeed'), .16, 2.2),
    waveChoppiness: clamp(scale('waveChoppiness'), 0, 1.15),
    caustics: clamp(scale('caustics'), .05, 1.15),
    visibility: clamp(scale('visibility'), .32, 1),
    fishDepthBias: clamp(scale('fishDepthBias'), 0, 7),
    storminess: clamp(scale('storminess')),
  };
}

function blendWeather(from, to, amount) {
  const t = smoothstep(0, 1, amount);
  const result = { ...to };
  for (const key of NUMERIC_WEATHER_KEYS) result[key] = mix(from[key], to[key], t);
  result.lightning = to.lightning && t > .55;
  return result;
}

export function daylightState(hour = 12) {
  const time = ((Number(hour) || 0) % 24 + 24) % 24;
  const angle = (time - 6) / 24 * Math.PI * 2;
  const elevation = Math.sin(angle);

  // Direct daylight dies away decisively after sunset so midnight can become truly dark.
  const daylight = smoothstep(-.055, .165, elevation);
  const twilight = smoothstep(-.22, .025, elevation) * (1 - smoothstep(.04, .42, elevation));
  const sunriseWarmth = bell(time, 6.15, 1.18) * smoothstep(-.18, .16, elevation);
  const sunsetWarmth = bell(time, 18.10, 1.32) * smoothstep(-.18, .16, elevation);
  const horizonGlow = clamp(Math.max(sunriseWarmth, sunsetWarmth) + twilight * .42);
  const nightFactor = 1 - daylight;

  // A full moon remains visible but contributes only a trace of underwater light.
  const moonlight = nightFactor * (.010 + .008 * Math.max(0, -elevation));
  const sunX = Math.cos(angle);
  const sunY = elevation;
  const moonX = -sunX;
  const moonY = -elevation;

  const phase = time < 4.75 ? 'Nacht'
    : time < 5.75 ? 'Dageraad'
    : time < 7.25 ? 'Zonsopgang'
    : time < 11.5 ? 'Ochtend'
    : time < 15.75 ? 'Middag'
    : time < 18.75 ? 'Zonsondergang'
    : time < 20 ? 'Schemering' : 'Nacht';

  return {
    hour: time, phase, elevation, daylight, moonlight, twilight,
    sunriseWarmth, sunsetWarmth, horizonGlow, nightFactor,
    sunX, sunY, moonX, moonY,
  };
}

export function createOceanWeather(initial = {}, { random = Math.random } = {}) {
  let cycleEnabled = initial.cycleEnabled !== false;
  let hour = Number.isFinite(Number(initial.hour)) ? Number(initial.hour) : 9.5;
  let dayLengthMinutes = clamp(Number(initial.dayLengthMinutes) || 20, 1, 240);
  let weather = Object.hasOwn(WEATHER_PRESETS, initial.weather) ? initial.weather : 'sunny';
  let intensity = clamp(Number(initial.intensity) || 1, .25, 1.5);

  let dynamicWeather = Boolean(initial.dynamicWeather);
  let weatherDurationMinutes = clamp(Number(initial.weatherDurationMinutes) || 3, .5, 30);
  let transitionSeconds = clamp(Number(initial.transitionSeconds) || 18, 0, 120);
  let weatherCountdown = weatherDurationMinutes * 60;

  let transitionFrom = weatherPreset(weather, intensity);
  let transitionTo = transitionFrom;
  let transitionElapsed = transitionSeconds;

  let lightningFlash = 0;
  let lightningIn = 2.5 + random() * 5;
  let secondaryFlashIn = -1;

  function transitionAmount() {
    return transitionSeconds <= 0 ? 1 : clamp(transitionElapsed / transitionSeconds);
  }

  function blendedPreset() {
    return blendWeather(transitionFrom, transitionTo, transitionAmount());
  }

  function chooseNextWeather() {
    const ids = Object.keys(WEATHER_PRESETS);
    // Favour believable adjacent changes rather than jumping from calm to thunder every time.
    const neighbors = {
      sunny: ['calm', 'cloudy', 'cloudy'],
      calm: ['sunny', 'sunny', 'cloudy'],
      cloudy: ['sunny', 'calm', 'storm', 'cloudy'],
      storm: ['cloudy', 'cloudy', 'thunder'],
      thunder: ['storm', 'cloudy'],
    };
    const pool = neighbors[weather] || ids.filter(id => id !== weather);
    return pool[Math.floor(random() * pool.length)] || 'sunny';
  }

  function snapshot() {
    const preset = blendedPreset();
    return {
      ...daylightState(hour),
      ...preset,
      id: weather,
      name: WEATHER_PRESETS[weather].name,
      intensity,
      cycleEnabled,
      dayLengthMinutes,
      dynamicWeather,
      weatherDurationMinutes,
      transitionSeconds,
      transitionProgress: transitionAmount(),
      lightningFlash,
    };
  }

  function beginWeatherTransition(value, immediate = false) {
    const next = Object.hasOwn(WEATHER_PRESETS, value) ? value : 'sunny';
    const current = blendedPreset();
    weather = next;
    transitionFrom = current;
    transitionTo = weatherPreset(next, intensity);
    transitionElapsed = immediate ? transitionSeconds : 0;
    weatherCountdown = weatherDurationMinutes * 60;
    lightningFlash = 0;
    secondaryFlashIn = -1;
  }

  function update(dt = 0) {
    const seconds = Math.max(0, Number(dt) || 0);
    if (cycleEnabled) hour = (hour + seconds * 24 / (dayLengthMinutes * 60)) % 24;

    if (transitionElapsed < transitionSeconds) transitionElapsed = Math.min(transitionSeconds, transitionElapsed + seconds);

    if (dynamicWeather && seconds > 0) {
      weatherCountdown -= seconds;
      if (weatherCountdown <= 0) beginWeatherTransition(chooseNextWeather(), false);
    }

    const state = blendedPreset();
    if (state.lightning) {
      if (secondaryFlashIn >= 0) {
        secondaryFlashIn -= seconds;
        if (secondaryFlashIn <= 0) {
          lightningFlash = .72;
          secondaryFlashIn = -1;
        }
      }
      lightningIn -= seconds;
      if (lightningIn <= 0) {
        lightningFlash = 1;
        secondaryFlashIn = .10 + random() * .16;
        lightningIn = 3.0 + random() * 8.5;
      } else {
        lightningFlash = Math.max(0, lightningFlash - seconds * 5.6);
      }
    } else {
      lightningFlash = 0;
      secondaryFlashIn = -1;
    }

    return snapshot();
  }

  return {
    update,
    snapshot,
    setCycleEnabled(value) { cycleEnabled = Boolean(value); },
    setHour(value) { hour = ((Number(value) || 0) % 24 + 24) % 24; },
    setDayLengthMinutes(value) { dayLengthMinutes = clamp(Number(value) || 20, 1, 240); },
    setWeather(value, immediate = false) { beginWeatherTransition(value, immediate); },
    setIntensity(value) {
      intensity = clamp(Number(value) || 1, .25, 1.5);
      const current = blendedPreset();
      transitionFrom = current;
      transitionTo = weatherPreset(weather, intensity);
      transitionElapsed = Math.min(transitionElapsed, transitionSeconds);
    },
    setDynamicWeather(value) {
      dynamicWeather = Boolean(value);
      weatherCountdown = weatherDurationMinutes * 60;
    },
    setWeatherDurationMinutes(value) {
      weatherDurationMinutes = clamp(Number(value) || 3, .5, 30);
      weatherCountdown = weatherDurationMinutes * 60;
    },
    setTransitionSeconds(value) {
      transitionSeconds = clamp(Number(value) || 0, 0, 120);
      transitionElapsed = Math.min(transitionElapsed, transitionSeconds);
    },
    serialize() {
      return {
        cycleEnabled, hour, dayLengthMinutes, weather, intensity,
        dynamicWeather, weatherDurationMinutes, transitionSeconds,
      };
    },
  };
}
