# 5 Broden & 2 Vissen — 3D Oceaan Simulator

Interactieve oceaansimulator gebouwd met Three.js.

## Nieuw: Mijn visbibliotheek

Bewaar handgemaakte vissen met een naam, maker en voorbeeld. Open **Mijn
visbibliotheek** in de studio of oceaan om te zoeken, favorieten te bewaren,
verder te ontwerpen of 1, 8, 20 of 50 vissen te plaatsen. Voeg oude GLB-bestanden
eenmalig toe, ook meerdere tegelijk. Deel een gedownload GLB-bestand met andere
gebruikers; nieuwe ontwerpen bewaren daarin ook de verflagen.

De bibliotheek blijft lokaal in deze browser bewaard en gebruikt geen Firebase.
Zie [gebruik en beperkingen](docs/fish-library.md).

## Nieuw: natuurlijk microleven

Krabben leven solitair bij rotsen, maken korte zijwaartse voedseltochten en keren
terug naar hun eigen schuilplek. Er zijn maximaal twintig actieve krabben.
Garnalen zwemmen in losse zwermen en vluchten bij een naderende grote vis
achteruit, met een snel gevouwen achterlijf. De beweging is gekoppeld aan de
poten en staart; pauze en de bestaande kwaliteitsinstellingen blijven werken.

Bekijk [de microlevenproef](graphics/micro-life-review.html) en klik op
**Laat een grote vis naderen**. De module is ook aangesloten in de hoofdoceaan.
De nieuwste wereldkaart en hexagoncorrectie blijven behouden. De goedgekeurde
organische rifmodellen zijn beschikbaar via `?reef=organic`.

De volledige suite bevat 120 tests. Browsercontrole omvat de proef en de echte
referentiescène, inclusief de vluchtreactie op een oceaanvis. Zie
[gedrag en beperkingen](docs/micro-life.md).

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

### Soortgedrag en verhoudingen

Groene vissen volgen de bodem in groepjes van 2–3; clownvissen vormen een
volwassen-klein paar bij het rif; blauwe scholen zoeken begroeide rotsen.
Versnellen, glijden, bochten en staartslag hebben meer variatie. Sommige
koraalobjecten zijn nu anemonen. De orka is 65% groter (ongeveer 11 meter).
42 lokale tests slagen. Zie [testinstructies en grenzen](docs/species-ecology.md).
Dit vervangt de eerdere beschrijving van generiek schoolgedrag voor deze soorten.

### Rust, clownvisgezinnen en contact

Platvissen slapen nu 2–4 minuten met gesloten ogen tussen verkenningen.
Clownvissen leven in gezinnen met twee ouders en wisselende aantallen kinderen.
De karakteranimatie volgt de echte verplaatsing. Vissen blijven onder het water
oppervlak en ontwijken ook andere soorten; contact wordt zonder stuiteren opgelost.
48 lokale tests slagen. Zie [testinstructies en grenzen](docs/families-rest-and-contact.md).

### Grote walvis en vollere orka-onderkaak

De orka heeft een afgeronde onderkaak met meer volume. Via **Plaats walvis**
voeg je een blauwgrijze walvis van circa 27 meter toe, met keelplooien, lange
borstvinnen en een rustige staartslag. Volgen, verwijderen en een optioneel
walvisrecord in wereldopslag zijn aangesloten. 53 lokale tests slagen.
Zie [testinstructies en beperkingen](docs/whale-and-orca-jaw.md).

### Kogelvis met opblaasreactie

Klik op een kogelvis om hem op te blazen. Ook een nabije orka activeert de reactie.
Na twee minuten zonder nieuwe dreiging loopt hij in dertig seconden leeg.
Gebruik **Bekijk kogelvis**; start de animatie in de referentiescène.
57 lokale tests slagen. Zie [testinstructies](docs/puffer-fish.md).
# Twee visstijlen — gefaseerde uitrol

Bij **Visstijl** kun je kiezen tussen cartoon en **Realistisch · in ontwikkeling**. Astra 6 heeft nu ook de groene platvis en clownvis uitgewerkt met het huid- en vindetail van de gele koraalvis als maatstaf. Kogelvis en koraalvis zijn de vorige batch; de blauwe vis heeft de eerdere realistische vormstudie. Orka en walvis hebben nu dezelfde verbeterde huid- en vinweergave. Houd **Nieuwe onderwatersfeer** en de gewenste visdetails aan. Positie, zwemgedrag, gezondheid en interactiestatus blijven behouden tijdens wisselen.

Koraalvlindervissen zwemmen als paar dicht bij koraal; kogelvissen zwemmen veel langzamer, meestal alleen laag bij het rif. Hoogte volgt de werkelijke habitat, niet meer een vaste band ver boven het rif. Klik- en orka-gestuurd opblazen werkt in beide stijlen. De vinnen kunnen stilhangen ondersteunen, terwijl de staartslag de verplaatsing volgt.

Open [de vergelijkingspagina](graphics/fish-review.html) om beide soorten in beide stijlen te draaien, pauzeren en te bekijken zonder de rest van de oceaan. Visuele acceptatie in de browser blijft nodig; de codewijziging is geen garantie op filmkwaliteit.

Nieuw: [platvis en clownvis vergelijken met de gele koraalvis](graphics/fish-review-batch-two.html). Bekijk cartoon en realistisch naast de maatstaf onder dezelfde belichting; test ook stilhangen, slapen en lagere detaillering. Bodemroutes, slaaptimers en clownvisgezinnen blijven werken tijdens wisselen.

Orka en walvis maken af en toe een oppervlaktebezoek met een korte mistpluim bij het blaasgat. De orka blijft aanklikbaar voor zijn mondbeweging; de walvis behoudt zijn grote, rustige route door open water.

Zie [het uitrolplan](docs/fish-style-rollout.md) voor alle zeven soorten en de beoordelingsmomenten.

## Nieuwe rifvissen

De drie eenvoudige roze, paarse en oranje standaardvissen zijn vervangen door een **doktersvis, kardinaalvis en kleine rifbaars**. Ze hebben eigen lichaamsvormen, huidpatronen, fijne vinnen, cartoon-/realistische weergave en verschillende zwemritmes. Het totale aantal dieren blijft gelijk.

Gebruik hun nieuwe **Bekijk**-knoppen of open [de vergelijking met de gele koraalvis](graphics/reef-species-review.html). Zie [ontwerp, gedrag en testinstructies](docs/new-reef-species.md). Deze batch brengt het totaal op 92 automatische tests; visuele controle in je browser blijft nodig.


### Microleven en plankton — eerste versie (inmiddels uitgebreid)

Rond de rifvakken verschijnen nu gedeelde, herkenbare modellen voor garnalen, zeesterren,
zee-egels, schelpen en krabben. Kleine minnow-schooltjes blijven op afstand boven het
rif en zwevende planktondeeltjes worden in lokale waterlagen gestreamd. Garnalen en
krabben maken korte bodembewegingen; zeesterren, zee-egels en schelpen blijven op hun
plek. In Water & licht kun je het microleven, de verre scholen en de planktonlagen
afzonderlijk aan- en uitzetten. Open [microleven van dichtbij](graphics/micro-life-review.html)
voor de losse modellen. Deze batch brengt het totaal op 100 automatische tests.
