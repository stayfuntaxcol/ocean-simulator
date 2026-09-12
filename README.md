# 5 Broden & 2 Vissen — 3D Oceaan Simulator

Interactieve oceaansimulator gebouwd met Three.js.

## Grafische upgrade: water en licht

Deze branch bevat de eerste grafische stap: een bewegend wateroppervlak, dieptemist,
lichtpatronen op het rif en zwevende deeltjes. Kies bij **Water & licht** een
kwaliteitsstand of vergelijk met het oorspronkelijke beeld.

Open `http://localhost:8000/?scene=reference` na het starten van de webserver voor
de vaste demonstratiescène. Deze opent met 40 vissen en een gepauzeerde camera-opstelling.
De [testinstructies en vervolgstappen](docs/visual-upgrade.md) beschrijven de vergelijking.
Visuele browsercontrole en apparaatmetingen staan nog open.

Ontwikkelaars kunnen de zes automatische controles uitvoeren met `npm ci && npm test`.

## Huidige functies

- 3D-onderwaterwereld met bestuurbare camera
- scholen met visgedrag en habitatkeuze
- terrein- en biodiversiteitseditor
- minimap en teleportatie
- GLB-vismodellen importeren
- wereld opslaan en laden als JSON
- lava en gezondheidseffecten
- Fish Skin Studio met zes soorten, eigen patronen en GLB-export

## Openen

Open `index.html` via een lokale webserver of gebruik GitHub Pages.

Bijvoorbeeld met Python:

```bash
python -m http.server 8000
```

Open daarna `http://localhost:8000`.

## Versies

De oorspronkelijke v20-versie staat ongewijzigd in `legacy/`.
De Fish Skin Studio staat in `studio/index.html` en is vanuit de simulator te openen.

## Volgende ontwikkelfase

1. De monolithische HTML opsplitsen in modules.
2. Performance meten en verbeteren.
3. Geanimeerde orka toevoegen.
4. Fish Studio en uitgebreid ecosysteem bouwen.

## Firebase instellen

De simulator gebruikt Firebase Authentication en Realtime Database voor online werelden.

1. Open Firebase Console → Authentication → Sign-in method.
2. Activeer `Anonymous`.
3. Open Realtime Database → Rules.
4. Neem de inhoud van `database.rules.json` over en klik op Publish.
5. Publiceer de website via GitHub Pages of Firebase Hosting.

Een opgeslagen wereld krijgt een deelbare URL met `?world=WORLD_ID`. De eigenaar kan
de wereld aanpassen; vrienden en familie met de link krijgen alleen-lezen toegang.
