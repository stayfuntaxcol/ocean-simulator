# Microleven — natuurlijke beweging van krabben en garnalen

Deze update bouwt voort op de goedgekeurde anatomie en rifvormgeving.
De vaste heen-en-weerbeweging is vervangen door individueel gedrag.

## Zelf bekijken

Open `dist/Ocean-Microleven-Proef.html` rechtstreeks in een WebGL2-browser.
Het bestand werkt offline, zonder installatie. De proef gebruikt dezelfde
modellen, materialen en gedragsmodule als de echte oceaan.

- **Garnalenzwerm en vlucht:** losse zwerm bij het rif. Klik op **Laat een grote
  vis naderen** om de reactie te zien. Bij pauze eerst verder laten bewegen.
- **Krabben tussen rotsen:** kijk minstens een halve minuut. De dieren blijven
  lang bij hun schuilplek en gaan op verschillende momenten op zoek naar voedsel.
- De close-ups, vergelijking met de eerdere versie, pauze en detailinstellingen
  blijven beschikbaar. Close-ups tonen de anatomie; de gedragsbeelden tonen de AI.

De projectversie staat op `graphics/micro-life-review.html`.
`npm run build:micro-review` bouwt het zelfstandige HTML-bestand.

## Krabben

- Maximaal **20 solitaire bodemkrabben in de hele actieve simulatie**, ongeacht
  camerastand of detailniveau. Bij voldoende geschikte rotsruimte ligt de
  beoogde populatie tussen 5 en 20. Onvoldoende veilige plekken betekent minder
  dieren; de generator dwingt geen dieren in rotsen of ongeschikt terrein.
- Elke krab krijgt een vaste plek aan een rotsrand en een eigen territorium.
  Schuilplekken liggen minimaal 3,3 scène-eenheden uit elkaar.
- Lang verblijf bij de schuilplek, korte zijwaartse tocht, voedsel zoeken en
  terugkeer. De timing verschilt per dier. In de duurtest verbleven ze meer dan
  60% van de tijd in hun schuiltoestand.
- De dieren blijven werkelijk in de scène: de rotsgeometrie bepaalt of je ze
  vanuit jouw kijkhoek ziet. De schuiltoestand schakelt hun zichtbaarheid niet uit.
- Bij een grote vis keren ze terug naar hun eigen plek. Poten stoppen wanneer
  de krab stilstaat of een obstakel tegenkomt.

## Garnalen

- Maximaal **48 individueel geanimeerde garnalen**. Lokale buren beïnvloeden
  afstand, richting en samenhang via Boids. Uitlijning is zwak; er ontstaat geen
  strakke vissenschool. Individuele variatie en binding aan het rif blijven actief.
- **SWIM:** rustig zwemmen met zwempootjes die reageren op afgelegde afstand.
- **EVADE:** een grote vis dichtbij onderbreekt het zwemmen. Het dier richt zijn
  kop naar het gevaar en schiet in een rechte lijn achteruit, van de vis af.
  Het achterlijf vouwt snel onder het lichaam; de zwempootjes stoppen.
- De vlucht duurt ongeveer één seconde en remt af. Daarna volgt **RECOVER**,
  ongeveer 0,65 seconde, en hervat het normale gedrag. Een korte wachttijd
  voorkomt voortdurend opnieuw starten van dezelfde reflex.
- Komt een rots, bodem of waterspiegel in de vluchtbaan, dan stopt de beweging
  eerder. De volledige verplaatsing wordt in kleine stappen op vrije ruimte
  gecontroleerd, ook tijdens de snelle achterwaartse beweging.

Dit is een gestileerd gedragsmodel voor de simulator. Het is geen biologische
simulatie van iedere garnalensoort. De massavariant met duizenden krilldeeltjes
is niet nodig voor deze populatie en is niet toegevoegd. Plankton blijft een
afzonderlijk deeltjesstelsel.

## Koppeling en behoud van bestaande functies

`MicroLifeBehavior.js` beheert toestand, positie en snelheid. `MicroLifeSystem.js`
verbindt dit met terrein, obstakels, instancing en detailniveaus. De geometrie en
materialen gebruiken dezelfde per-dierfase voor pootbeweging en een aparte
waarde voor de staartreflex. Belichtingsnormalen bewegen mee met het oppervlak.

`getShelters` levert alleen rotsen. `getThreats` levert levende, zichtbare grote
vissen met hun positie en een conservatieve lichaamsstraal. Die straal geeft een
benadering van nabijheid; het is geen botsingsmodel van individuele visoppervlakken.
De twee callbacks zijn gekoppeld in de lokale oceaanversie; zie
`docs/microleven-installatie.md` voor het toevoegen aan een nieuwere index.

Camera- en kwaliteitswissels behouden de toestand, positie en snelheid van de
dieren. Het detailniveau verandert hun geometrie. Editor, inspectie, uitzetten en
pauzeren bevriezen de simulatie. Terrein- en rotsbewerkingen worden opnieuw op
geldige leefruimte gecontroleerd; dieren kunnen verdwijnen als hun habitat vervalt.

Zeesterren, zee-egels, schelpen, kleine visscholen, plankton en de goedgekeurde
rifgeometrie blijven werken. Het opslagformaat is ongewijzigd. De update bevat
geen nieuwe hoofdinterface of hexagonlogica. Bij integratie zijn de bestaande
wereldkaart en hexagoncorrectie behouden. Publicatie verloopt via GitHub Pages
na samenvoegen met `main`.

## Controle

De volledige projectsuite bevat **120 geslaagde tests**, waaronder controles op:

- de globale limiet, territoriumafstand en schuilduur van krabben;
- werkelijk zijwaartse beweging en stoppen van de poten bij stilstand;
- zwermspreiding, afstand tot buren en watergrenzen gedurende twee minuten;
- richting, snelheid, staartreflex, pauze en herstel van de vluchtreactie;
- stoppen vóór obstakels, bodem en waterspiegel;
- behoud van dieridentiteit en toestand bij camera-, detail- en revisiewissels;
- bestaande rif-, vis-, editor- en opslagfuncties.

De proef is in Chromium/WebGL gecontroleerd op alle beelden, oud/nieuw, detail,
pauze, hervatten, vluchtreactie en mobiel formaat. Het offline bestand maakt
geen externe netwerkverzoeken. Browserbeelden zijn lokaal bij de proef opgeslagen.
De opstarttijd is begrensd op nul om een negatieve eerste animatiestap en een
onterechte ontmoeting met de voorbeeldvis te voorkomen.

De echte referentiescène is eveneens getest, met dezelfde opgeslagen werelddata
voor en na het vervangen van de microlevenmodule. Een echte oceaanvis activeert
via de nieuwe koppeling de vluchtreactie van de garnalen. Firebase is tijdens deze
controle vervangen door een testdubbel; er zijn geen cloudacties uitgevoerd.
Softwarematige WebGL-controle geeft geen FPS-garantie voor de werkcomputer.
