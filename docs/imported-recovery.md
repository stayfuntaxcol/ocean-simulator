# Imported fish recovery and complete landscape travel

Connected terrain now uses the same offset and depth bounds as the editor.
The old connected-world sampler clipped offsets to -12/+10, which flattened
deep canyons even when the saved terrain data was intact.

Before leaving an owned world, travel commits the entire world record to an
IndexedDB draft keyed by user and world. Terrain, object layers, sculpture,
formation transforms/skins, currents and other world fields stay together.
The destination is activated only after this transaction succeeds. Returning
restores the owner draft; reopening an owned cloud world also checks its draft.
Successful online saving removes the corresponding local draft. This is local
protection on the same browser/device, not automatic Firebase publishing.
Imported fish remain session animals, as before; this does not introduce animal
persistence or cross-device draft synchronization.

An imported fish with rock contact or a blocked connection to nearby school
members, and less than 0.75 m of progress, receives a recovery attempt after
three seconds. The second attempt is ten seconds later. Each attempt uses the
same panic state as clicking a fish, with a collision-checked escape direction,
and affects only that fish. If it remains stuck ten seconds after the second
attempt, local unobstructed groups become separate schools and receive fresh
local targets. Cohesion/alignment are suspended for twenty seconds; a thirty
second cooldown prevents repeated release cycles. Useful unobstructed movement
clears the attempt sequence.

Recovery is disabled throughout the imported night phase (21:00–05:45), while
sleeping or settling, for dying fish, and at critical health. Automatic panic
is cancelled when night starts. The existing sleep-seeking target and resting
motion remain in place. Distant imported fish use sculpt collision too and
receive the same recovery sequence without requiring visible animation.

Detached groups below eight members may rejoin their original lineage after
thirty seconds, only when nearby fish have an unobstructed connection. Groups
of eight or more establish their own school. Existing reproduction and the
automatic 16 → 8 + 8 split remain unchanged; birth credit and fish identity
are preserved when groups separate or reunite.

Validation: `npm test` and `npm run test:recovery-browser`. The browser test
serves local modules through Playwright, mocks Firebase, executes production
world travel and fish movement/recovery, verifies two timed kicks on both sides
of a wall nearby and at distance, checks nighttime resting, tests free escape,
and confirms the complete terrain draft survives a reload. Forced-jam cases
hold fish positions between frames to make repeated blockage reproducible.
