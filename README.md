# 5 Broden & 2 Vissen — 3D Oceaan Simulator

Interactieve oceaansimulator gebouwd met Three.js.

## Grafische upgrade: water, rif en eerste gedetailleerde vis

Deze branch bevat water en licht (stap 1), plus geribbeld zand en verweerde
kalksteen-/basaltrotsen (stap 2). Kies bij **Water & licht** een kwaliteitsstand.
Met **Zand & rotsdetail** vergelijk je de nieuwe bodem met stap 1.
Stap 3 geeft de gele school een eigen koraalvlindervis, met een bewegende romp,
huidpatroon, ogen en dunne vinnen. Klik **Bekijk nieuwe vis** om hem van dichtbij te
volgen. Gebruik **Gedetailleerde koraalvis** voor de vergelijking met de oude vorm.

Open `http://localhost:8000/?scene=reference` na het starten van de webserver voor
de vaste demonstratiescène. Deze opent met 40 vissen en een gepauzeerde camera-opstelling.
De [testinstructies en vervolgstappen](docs/visual-upgrade.md) beschrijven de vergelijking.
Visuele browsercontrole en apparaatmetingen staan nog open.

Ontwikkelaars kunnen de 27 automatische controles uitvoeren met `npm ci && npm test`.
Gebruik je Codespaces? Zie [stap 2 testen](docs/seabed-upgrade.md).
De [instructies voor stap 3](docs/fish-upgrade.md) beschrijven de nieuwe vis.
Stap 4 voegt vertakt koraal, plaatkoraal, compact struikkoraal, holle buissponzen en bewegend
zeegras toe aan de bestaande rifvakken. Gebruik **Levend rifdetail** voor de vergelijking.
Zie [stap 4 testen](docs/reef-life-upgrade.md).
Stap 6 voegt één plaatsbare orka toe: **Plaats orka** zoekt ruimte in de buurt en
start de volgcamera. Klik op zijn lichaam om de bek te openen. De orka wordt met
de wereld opgeslagen. Zie [stap 6 testen](docs/orca-upgrade.md). Stap 5 is overgeslagen
op verzoek van de gebruiker en blijft openstaan.

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

### Blauwe karaktervis — eerste modelstudie

De turquoise school heeft een nieuw, rond en expressief vismodel. Gebruik
**Bekijk blauwe voorbeeldvis** en **Blauwe karaktervis** in de vaste
vergelijkingsscène. Dit werkpakket bevat vorm en basismateriaal; fijne huiddetails
en lichaamsanimatie volgen apart. Er slagen nu 30 lokale tests.
Zie [bekijken en beoordelen](docs/blue-character-fish.md).

### Patroon, expressie en groene platvis

De blauwe vis heeft nu schubbenlijnen en een vriendelijker gezicht. De groene
school heeft een breed, plat olijfgroen model met vlekjes en ogen bovenop.
Beide modellen hebben een eigen kijkknop en vergelijkingsschakelaar.
Er slagen nu 32 lokale tests. Zie [testinstructies en afbakening](docs/character-fish-patterns.md).

### Zwemanimatie en clownvis

Blauwe en groene karaktervissen bewegen nu met een buigende romp, gekoppelde
staartslag, afzonderlijke vinbeweging, vinstralen en subtiele gezichtsanimatie.
De oranje school heeft een expressieve clownvis met drie witte banden en één
kleinere borstvin. Klik **Animatie starten** in de referentiescène.
De eerdere beschrijving van vaste poses is hiermee achterhaald.
37 lokale tests slagen; [testinstructies en grenzen](docs/animated-character-fish.md).
