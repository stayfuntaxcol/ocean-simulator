# Microleven-update toevoegen aan je bestaande project

Pak `Ocean-Microleven-Update.zip` uit. De mapindeling is gelijk aan je GitHub-project.
Plaats de bestanden in de bestaande mappen; upload geen extra omhullende zip-map.

## Deze bestanden in `graphics/` zijn nodig

| Bestandsnaam | Actie |
|---|---|
| MicroLife.js | Bestaand bestand vervangen |
| MicroLifeGeometry.js | Bestaand bestand vervangen |
| micro-life-review.html | Bestaand bestand vervangen |
| MicroLifeAnatomy.js | Toevoegen |
| MicroLifeMaterials.js | Toevoegen |
| MicroLifeSystem.js | Toevoegen |
| MicroLifeBehavior.js | Toevoegen; gedrag van krabben en garnalen |
| MicroLifeClassic.js | Toevoegen; nodig voor de vergelijking |
| MicroLifeGeometryClassic.js | Toevoegen; nodig voor de vergelijking |
| micro-life-review.js | Toevoegen |

De nieuwe `MicroLife.js` behoudt de bestaande functieaanroep. Voor schuilplekken
en de reactie op de echte oceaanvissen zijn de twee kleine koppelingen hieronder
nodig in je huidige `index.html`. Vervang dus niet je hele indexbestand.
Zo blijven nieuwere wijzigingen aan menu, wereldgrenzen en hexagons behouden.
De bestaande modules `UnderwaterAtmosphere.js`, `FishSurfaceDetail.js` en
`ReefLife.js` worden hergebruikt; die staan al in het project.

Voeg de meegeleverde `tests/`- en `docs/`-bestanden in hun gelijknamige mappen toe.
`tests/micro-life.test.js` vervangt de niet-uitgevoerde test met de verkeerde naam
`tests/tests/smicro-life.test.j`; die oude test is niet meer nodig.

## Schuilplekken en grote vissen koppelen

1. Zoek bovenaan `index.html` de bestaande import uit
   `./graphics/FishInteractions.js`. Voeg daar `fishExtent` aan toe:

```js
import { constrainWater, waterLimit, createFishNeighborhood, avoidFish, resolveFishContacts, fishExtent } from './graphics/FishInteractions.js';
```

2. Zoek `const microLife=createMicroLife({`. Voeg binnen die aanroep, vóór
   `getObstacles`, deze twee eigenschappen toe. Laat de bestaande eigenschappen staan:

```js
  getShelters:()=>reef.children.filter(r=>r.userData.orcaRock)
    .map(r=>new THREE.Box3().setFromObject(r)),
  getThreats:()=>fishes.filter(f=>f.parent&&f.visible&&!f.userData.dead)
    .map(f=>({position:f.position,radius:Math.max(...fishExtent(f).toArray())}))
    .filter(f=>f.radius>.8),
```

Rotsen dienen als schuilplek; lavaventilatie blijft alleen een obstakel.
Zonder `getShelters` verschijnen geen krabben. Zonder `getThreats` zwemmen
garnalen wel, maar reageren ze niet op de vissen in de oceaan.

3. De bodemdierenteller telt zwemmende garnalen voortaan afzonderlijk.
   Wil je die tonen, zoek de regel die `microLifeStatus` bijwerkt en voeg
   `${micro.shrimp} garnalen` aan de bestaande tekst toe. Dit is alleen de teller;
   het gedrag werkt al na stap 2.

## Controleren

1. Laat je bestaande projectserver draaien en vernieuw de oceaanpagina.
2. Laat Microleven, Kleine scholen en Plankton aangevinkt.
3. Open via de bestaande link de vernieuwde microlevenproef, of ga naar
   `/graphics/micro-life-review.html` op dezelfde server.
4. Zwem in de oceaan laag langs open zandplekken naast het rif.
5. Gebruik `npm test` om de projecttests uit te voeren.
6. Kies in de proef **Garnalenzwerm en vlucht** en klik op
   **Laat een grote vis naderen**. Bij pauze eerst **Verder bewegen** kiezen.
7. Kies **Krabben tussen rotsen**. Kijk minstens een halve minuut: ze blijven
   lang bij hun schuilplek en maken korte, afzonderlijke uitstapjes.

Het losse bestand `Ocean-Microleven-Proef.html` kun je direct downloaden en
openen; dat vereist geen server en is bedoeld voor visuele beoordeling.

Voor ontwikkelaars is `scripts/build-micro-review.mjs` toegevoegd. Het maakt het
zelfstandige HTML-bestand met esbuild, zoals de eerdere rifproef. Als esbuild al
als ontwikkelafhankelijkheid in je project staat, werkt
`node scripts/build-micro-review.mjs`. Er hoeft geen `package.json` te worden
vervangen om de microlevenmodules in de oceaan te gebruiken.
