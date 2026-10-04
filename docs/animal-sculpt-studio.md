# Orka Sculpt Studio

Open **Menu → Design → Animal Design Studio → Sculpt · Skin · Skeleton**. The first complete anatomical template is the orca. An octopus is the next target, not yet an available species.

## Working stages

1. **Sculpt:** body proportions, add/remove/smooth brushes, mirrored edits, clay view, undo/redo. Drag on the body to sculpt; Alt + drag or right drag rotates the camera. Geometry regenerates in a Web Worker during a stroke. The immutable anatomical base plus editable strokes are saved, not a baked triangle soup.
2. **Skin:** black/white/saddle markings, fine pores, subtle healed scars, roughness and eye-patch size. Paint local mirrored spots or upload a detailed skin atlas. A skin texture can be AI generated through the gateway. It is capped at 2048 pixels on the longest edge and stored as JPEG in the design (up to approximately 1 MB binary). The cylindrical UV layout runs tail → head horizontally, belly in the vertical center, back on the wrapping top/bottom edges. Fin junctions use the same mapping and can need visual correction.
3. **Rig & swimming:** 20 named bones, a seven-bone tail chain, three bones per pectoral fin, independent flukes, neck/head, jaw and dorsal. Continuous procedural swim controls and editable per-bone rotation keyframes. Paint and sculpt operate in a neutral rest pose; the rig preview can play, scrub and save poses. Jaw and eyes are anatomical attachments; the sculpt brushes edit the principal body/fin surface.
4. **Reference & AI:** upload views and a browser-supported video. Select one swim cycle and extract twelve labeled frames. AI can interpret those frames into skeleton keyframes; this is not calibrated 3D motion capture. All proposals preview separately and require “Use this proposal” before replacing the current editable draft.

**Apply in ocean** uses the existing world/session/owner checks. Local world saves and online world saves carry the complete validated design in `animals.settings.orca.design`. Reopening or visiting a world recreates its rigged model. Applying requires opening the studio from the ocean. Existing non-sculpted species and their behavior controls remain available.

## Detail and runtime

Designing at a larger apparent scale does not itself create more detail. The studio uses independent object-local sampling (.65 / .4 / .28 design units), independent of the final ocean length (6–14 meters). The fine template is about 16k triangles, extra fine about 32k; edits change these counts. Surface Nets vertices are welded across chunks. Ocean instances share the generated surface source in a bounded six-entry cache and use .65 sampling to limit scene cost; finer geometry remains available in the editor. The saved strokes regenerate at either resolution. The mesher rejects more than 110k triangles.

The volume brushes, density field and smooth Surface Nets are reused from the rock editor. World terrain limits/resolution are not changed. Edits are capped at 500 brush stamps, 64 mirrored paint stamps, 120 motion keys; these are validated at import and in AI output. Detailed painting beyond local stamps uses a texture atlas. Sculpted additions enlarge the collision envelope. Surface breathing uses the designed blowhole height.

Drafts save in IndexedDB per world and species; references stay in memory and are not part of world saves. Export/import JSON provides a portable checkpoint. Undo keeps the last 24 edit checkpoints for the current session. AI plans preserve an existing texture unless a new skin is explicitly proposed.

## AI gateway

No paid API was called during development, and no API key or backend has been configured/deployed for the live GitHub Pages app. Buttons explain the missing connection; offline sculpting, painting, rigging, export and the chat bridge work independently.

For a developer/operator, the supplied localhost gateway serves the studio and calls the OpenAI Responses API with actual reference-image inputs and a strict design schema. Set **OPENAI_API_KEY** and **ANIMAL_AI_MODEL** in the server environment, then run:

```sh
npm run studio:ai
```

Open `http://127.0.0.1:8787/animal-studio/workbench.html`. Choose a model available to the configured API project that supports image input, Structured Outputs, and (for the skin button) the image-generation tool. There is deliberately no hardcoded model or subscription assumption. The model can be changed without changing the editor. The image generation request asks for a detailed neutral skin-detail atlas; the runtime supplies the orca markings on top.

The gateway binds to loopback and permits its own two origins. Additional exact origins can be configured with **ANIMAL_AI_ALLOWED_ORIGINS** (comma separated). Public hosting needs a separately authenticated backend, not just exposing this local server. Secrets never enter the browser, world files or GitHub Pages; private/server files are not served. One AI request runs at a time. Requests time out, oversized references are rejected, and responses are normalized before use.

Without a gateway, choose **Copy assignment for ChatGPT**, attach the reference images/video in the chat, and import the returned `ocean-animal-design-v1` JSON. Uploaded references are sent externally only when the user explicitly starts an AI operation. An AI design response is data; it cannot execute JavaScript.

Official implementation references:
- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/image-generation

## Next anatomical template: octopus

The portable design/brush/skin/keyframe pipeline and named-bone playback are reusable. An octopus needs a new anatomical volume generator, eight long chains with root/tip weighting, a mantle motion system, sucker attachments, and arm/contact controls. The current orca weight assignment is anatomy-specific and must be replaced; it does not pretend to automatically rig any mesh. Adding arbitrary anatomy to the schema is a future stage.

## Validation

- Unit tests cover editable design roundtrips, legacy settings, mirrored brushes, watertight welded geometry, normalized weights, cyclic animation, provider request/response data, and configured/unconfigured gateway handling.
- Browser tests cover sculpt/undo/redo, fine geometry, skin and real image upload, bone animation, video decoding and twelve actual frame samples, AI proposal preview/accept/reject with a simulated provider, IndexedDB reload, phone width, and absent gateway messaging.
- Ocean integration checks apply, save/reload of skinned models and texture data, and read-only rejection.
- Provider tests use a simulated Responses service. Live vision accuracy, generated texture quality and inferred movement accuracy remain unverified until a real API service and actual animal references are supplied.

### Gratis modellen importeren (GLB / glTF 2.0)

Open **5 · Model importeren** in de workbench. Selecteer één `.glb`, of één
`.gltf` samen met alle `.bin`-bestanden en textures. Je kunt ook een volledige
uitgepakte map selecteren. ZIP-bestanden eerst uitpakken. Ontbrekende of dubbelzinnige
bestanden worden gemeld; een mislukte import vervangt het huidige ontwerp niet.

- Model en textures samen maximaal 100 MB; maximaal 300.000 driehoeken en 5.000 nodes.
- Materialen, textures, skeletten, morph targets en ingebouwde clips worden geladen.
  Draco en Meshopt worden ondersteund; KTX2/Basis-textures en onbekende verplichte
  extensies vragen een gewone GLB-export met PNG/JPEG-textures.
- Richt de kop naar +X en de rug naar +Y met de drie rotatieschuiven. Lengte wordt
  langs X gemeten. Selecteer een clip, stel het tempo in en gebruik **Test zwemmen**.
  Zonder meegeleverde clips blijft de lichaamsvorm statisch.
- Vul maker, licentie en bron in. Deze velden reizen met het ontwerp en de wereld mee;
  de studio bepaalt niet automatisch of een download gratis of herbruikbaar is.
- Concepten staan in IndexedDB. JSON-export bevat het volledige model inclusief
  lokale buffers/textures: opnieuw importeren vereist de oorspronkelijke map niet.
- **Toepassen in oceaan** gebruikt de bestaande orka-gedragslogica, inclusief groepen
  en jongen. Andere diersoorten hebben nog geen eigen importslot. Alleen lichaamsclips
  worden overgenomen; route-, voedsel- en migratiegedrag komt uit AnimalSystem.
  Een bek- of ademanimatie wordt niet automatisch aan een willekeurig skelet gekoppeld.
- Na toepassen de wereld lokaal of online bewaren. Grote modellen kunnen de
  localStorage-cache vullen; bij een geopende oceaansessie kan BroadcastChannel het
  ontwerp rechtstreeks overdragen. Het IndexedDB-concept en de JSON-export blijven
  beschikbaar. Sla geen zeer zware assets in iedere wereld op zonder rekening te
  houden met de omvang van wereldbestanden en online opslag.
- Sculpt, huidverf en AI-voorstellen blijven beperkt tot eigen volumemodellen. Gebruik
  **Terug naar eigen sculptuur** om daarmee verder te werken; het originele sculptontwerp
  is bewaard. Ongedaan maken kan de modelimport herstellen.

Verificatie: `npm test`, `npm run test:animal-import-browser` en
`npm run test:animal-sculpt-browser`. De importtest gebruikt een echte GLB met een
skelet en clip, plus een glTF met losse buffer en PNG; er is nog geen benchmark
van acht zware externe dieren tegelijk.
