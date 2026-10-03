# Sculpt chunks: audit, architecture and validation

The audited baseline is `300cd8936eb523bd1cfc4329c03240ba27e506de`.

The editor used one unculled Icosahedron detail-1 InstancedMesh: 80 triangles per
stored cell, including internal cells. Runtime generated a single exposed-cube
surface. Shape 5 subdivided every triangle fourfold. The mesh was unculled and
also registered for triangle raycasts. Imported navigation additionally enclosed
this entire mesh in a Box3, which blocked open tunnels independently of raycasts.

## Implemented phases

1. `SculptChunkManager`: sparse authoritative density, 4-cell logical sectors,
   8-cell render chunks, floor ownership for negative coordinates, neighbor dirty
   flags. Editor geometry is shared Icosahedron detail 0, 20 triangles per exposed
   cell. Per-chunk instance keys retain Cell Edit. Brush changes flush at the
   existing 80 ms preview cadence and on stroke completion; Undo/Clear/load flush
   immediately. GPU buffers for unaffected chunks retain identity. Loading now
   also preserves non-default sculpt resolutions, and brush additions enforce the
   cell cap during mutation rather than only before the stroke.
2. Each logical formation contains independently built render chunks. Only nearby
   runtime geometry is generated. Distance/frustum selection runs at 200 ms with
   the existing 30/48/60 m thresholds. Inactive geometry beyond 84 m is released
   after five seconds; density remains available. Skins, locks, transforms,
   selection and the saved v1 density/descriptor format retain their existing APIs.
3. Sculpt DDA collision walks local grid cells and their body-radius neighbors,
   using density occupancy. It never raycasts render triangles. Conservative
   per-cell swept volumes retain open water between rocks, tunnels and overhangs.
   Rotation and nonuniform scale are handled in formation-local coordinates.
   Ordinary rock collision remains unchanged. Imported navigation composes this
   density route with its ordinary per-stone boxes, excluding sculpt render meshes
   from those boxes. Detours use the hit cell's bounds instead of the entire formation.
4. Shape 1 retains the legacy block surface; shapes 2–5 use Surface Nets, with
   interpolation from actual density and no subdivision. A small dense halo makes
   sampling inexpensive. Edge ownership includes otherwise empty boundary chunks;
   shared dual vertices and density-gradient normals match across chunk borders.
   Sub-threshold density samples are retained for interpolation and normals.

## LOD and budgets

LOD0 uses the original 3 m samples (or the loaded legacy cell size). LOD1 and LOD2
use conservative edge collapse with targets of 75% and 30% of LOD0 triangles.
These targets are best effort: topology and shared borders take priority. The
manifold link condition and face-orientation checks prevent collapsing tunnels
or flipping surfaces. Shared-border vertices remain fixed, including with nonzero
formation centers. Each LOD is cached; transforms and skin changes retain it.

Coarsening the density grid to 6/12 m was deliberately avoided: it could remove
small passages and would require transition meshes between different grids.
LOD switching uses three-meter hysteresis and does not regenerate per frame.

Budgets are 150,000 visible sculpt triangles for desktop and 70,000 for coarse
pointer devices. Closest chunks receive priority. Over-budget chunks try LOD2;
remaining distant chunks are omitted and reported as budget-cull. Per-chunk high
budget is 12,000; a fixed eight-cell chunk's possible face count stays below this.
Low-detail 3,000 is a target, not permission to destroy a complex passage.

The HUD reports visible/loaded/total chunks, visible sculpt triangles, LOD counts,
collision queries per second, last mesh build duration, preview triangles, dirty
chunks and budget culls. It does not attribute all FPS cost to sculpting.

Existing materials, shader microdetail and DoubleSide are retained. Legacy
26-neighbor grouping and IDs remain the default for saved-world compatibility;
`connectivity: 'faces'` is available as an explicit grouping option.

## Validation

Run `npm test`, `npm run test:sculpt-browser`, and `npm run benchmark:sculpt`.
The browser harness uses Playwright and supports `PLAYWRIGHT_MODULE`,
`CHROMIUM_PATH`, and `SCULPT_SCREENSHOT`. It stubs Firebase to avoid external
writes and exercises the actual show-as-rock UI handler, camera/fish collision
routing, skin changes, transforms, save/restore and chunk streaming. Screenshot
mode preserves the test framebuffer; production renderer settings are unchanged.

A solid 12,000-cell benchmark gives deterministic geometry counts:

| Geometry | Previous | New |
| --- | ---: | ---: |
| Editor preview | 960,000 | 58,560 |
| Maximum-roundness runtime surface, all chunks | 25,600 | 6,400 |
| LOD1, all chunks | — | 5,300 |
| LOD2, all chunks | — | 4,184 |

On this execution environment, five-run median pure surface build time was
30.3 ms for the previous shape-5 mesher and 24.9 ms for all new LOD0 chunks.
These timings exclude GPU upload/material coloring and are not desktop/mobile
FPS measurements. Real scenes may have much more exposed surface than this solid
benchmark. Browser QA verifies an actual rendered frame and round-trips a carved
formation with transforms and skin, with no page/shader errors.

Baseline `npm test` already failed four species-behavior harness tests with
`ReferenceError: applyCurrentToFish is not defined`. The same four remain; the
new sculpt tests pass. The existing ecosystem browser test also fails its
ordinary-rock overlap assertion on both the baseline and changed code; its
scenario is random and overlap counts vary. These are recorded rather than
claimed to be successful regression checks.

## Limits and follow-up

- Collision is conservative voxel collision, not an exact analytic isosurface
  swept-sphere test. Fish can keep extra clearance around rounded corners; narrow
  passages must fit the entire fish body. Triangle count does not affect it.
- Sculpt geometry generation is synchronous per chunk; a worker/build queue can
  be added if real-world profiling shows significant first-load stalls.
- Runtime mesh rebuilding after explicit shape/sculpt conversion invalidates that
  formation's cache; only the editor currently retains dirty-only GPU updates.
- Surface Nets on undersampled or ambiguous scalar fields cannot guarantee every
  topology. Seam/topology tests cover closed solids and carved tunnels; more
  pathological AI inputs should be validated before accepting arbitrary recipes.
- AI prompt/image recipe rasterization is intentionally deferred. The authoritative
  density grid is ready for a future `ocean-rock-recipe-v1` producer.
- Frame rate on the user's computer, mobile GPU behavior and live multiplayer
  world travel remain additional real-device acceptance checks.

Surface Nets was selected for one dual vertex per crossed grid cube and compact
quads, without the lookup-table/subdivision cost of the former surface.
Primary reference: https://github.com/mikolalysenko/isosurface
