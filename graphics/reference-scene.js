// A small, reproducible composition. Loading this URL does not load a saved world.
export const REFERENCE = Object.freeze({
  seed: 611,
  time: 12,
  camera: [7, -7, 29],
  target: [0, -12, -5],
  fishCount: 40,
  cells: [
    [-2, -2, 'mixed'], [-1, -2, 'coral'], [0, -2, 'sponge'], [1, -2, 'mixed'],
    [-2, -1, 'rocks'], [-1, -1, 'mixed'], [1, -1, 'coral'], [2, -1, 'rocks'],
    [-2, 0, 'seagrass'], [-1, 0, 'sponge'], [1, 0, 'seagrass'],
  ],
});
