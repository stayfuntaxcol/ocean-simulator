# Leefbaarheid en draagkracht

De oceaan begint zonder natuurlijke vissen. De simulator berekent de leefbaarheid
steeds opnieuw uit de lagen die al in de wereld zijn opgeslagen. De wereld is
verdeeld in lokale voedselzones van 36 bij 36 meter (drie bestaande bouwvakken).
Grenzen lopen zacht in elkaar over, zodat een vis niet door één stap over een
onzichtbare lijn plotseling zonder voedsel zit. Er wordt geen extra
ecosysteemrecord naar Firebase geschreven.

## Waarde van bouwelementen

| Onderdeel | Voedsel | Schuilruimte | Kraamgebied | Filtering | Biodiversiteit |
|---|---:|---:|---:|---:|---:|
| Rotsen | 0,15 | 3,5 | 0,5 | 0,3 | 0,6 |
| Koraal | 3,6 | 3,0 | 2,5 | 0,8 | 3,0 |
| Zeegras | 4,2 | 1,8 | 3,8 | 2,6 | 2,4 |
| Spons en anemoon | 2,0 | 2,1 | 1,6 | 4,0 | 2,8 |
| Gemengde biodiversiteit | 5,8 | 4,8 | 5,0 | 4,2 | 5,2 |

Rotsen zijn belangrijke beschutting, maar leveren zelfstandig geen voedselweb.
Lavabronnen verlagen de waterkwaliteit en daarmee de draagkracht. Een gevarieerd
rif scoort beter dan een groot veld van slechts één type.

## Natuurlijke groei

1. **Lege oceaan:** geen voedselweb en geen natuurlijke vissen.
2. **Pionierleven:** plankton en klein bodemleven kunnen verschijnen.
3. **Jong rif:** kleine rifbaarzen en kardinaalvissen.
4. **Groeiend rif:** blauwe scholen en groene platvissen.
5. **Bloeiend rif:** clownvisgezinnen en koraalvlindervissen.
6. **Rijk ecosysteem:** doktersvissen en kogelvissen vullen de biodiversiteit aan.

Natuurlijke vissen hebben geen healthbalk. Bij verlies van habitat vertrekken
scholen geleidelijk; bij herstel komen passende soorten terug. De computer hoeft
daardoor geen toestand van honderden individuele natuurlijke vissen te bewaren.

Het natuurlijke populatiedoel wordt alleen door habitat, waterkwaliteit en de
zware belasting van orka of walvis bepaald. Geïmporteerde vissen verlagen dit doel
niet. Alle scholen wisselen wel verplicht van voedselzone. Afhankelijk van de
soort gebeurt dat ongeveer iedere 1,5 tot 5,5 minuut wanneer meerdere geschikte
zones beschikbaar zijn. Een clownvisgezin blijft langer bij een geschikt rif dan
een losse rifbaars; ook een handgemaakte school verkent regelmatig een nieuwe
zone. De laatste drie zones worden tijdelijk vermeden om heen-en-weer zwemmen te
beperken.

## Lokale voedselvoorraad en biomassa

Elke zone berekent zelfstandig voedsel, beschutting, kraamruimte, filtering en
draagkracht. Vissen die bij een zonegrens zwemmen, belasten de omliggende zones
naar verhouding van hun afstand. Natuurlijke vissen tellen standaard als één
visequivalent. Bij geïmporteerde modellen telt ook de begrenzende grootte mee,
met een veilige onder- en bovengrens. Orka en walvis tellen als 18 en 30
visequivalenten.

Een zone heeft naast productie ook een tijdelijke voedselvoorraad. Een korte
drukte veroorzaakt daardoor niet meteen healthschade. Als de vraag langdurig
hoger blijft dan de lokale capaciteit, raakt de zonevoorraad leeg en zoeken
scholen voedselrijkere, minder drukke zones op.

## Geïmporteerde vissen

Alleen handgemaakte, geïmporteerde vissen hebben individuele health. Iedere vis
heeft daarnaast een eigen voedselreserve van drie tot zes minuten. Bij lokaal
tekort wordt eerst die reserve aangesproken; daarna geldt nog een korte
overgangstijd voordat health afneemt. In een gezonde voedselzone vullen reserve
en health langzaam aan. Een lavabron dichtbij veroorzaakt rechtstreeks en veel
sneller schade.

- Boven 20% zwemt een importvis normaal; tussen 30% en 20% wordt de overgang
  naar de kritieke toestand zichtbaar.
- Op 20% neemt snelheid en staartfrequentie sterk af.
- Op 5% stopt de vis volledig, zakt langzaam naar de echte lokale zeebodem en
  kan niet meer herstellen.
- Op 0% verdwijnt de vis in ongeveer 5,5 seconde in het zand, met een kleine
  zandwolk. Alleen deze geplaatste instantie verdwijnt; het ontwerp blijft in de
  lokale visbibliotheek beschikbaar om opnieuw te importeren.

De statistiek **Kritieke importvis** telt vissen vanaf 20% en lager. In het
volgscherm zijn per vis health, eigen reserve, lokaal voedselaanbod en toestand
zichtbaar.

## Firebase-verbruik

- Habitatwaarden, voedselzones, zonevoorraad, biomassa, migratie, health en
  natuurlijke populaties worden lokaal berekend.
- Natuurlijke vissen worden niet afzonderlijk opgeslagen.
- Individuele health, voedselreserve en migratiegeschiedenis worden niet opgeslagen.
- Er zijn geen realtime listeners toegevoegd. Alleen twee kleine vlaggen onder
  `megafaunaDisabled` bewaren bij normaal opslaan of de eigenaar een orka of
  walvis bewust heeft verwijderd.
- Alleen de bestaande wereldlagen, terrein, lavabronnen, orka en walvis blijven
  onderdeel van het bestaande wereldrecord.
- De lokale visbibliotheek blijft IndexedDB gebruiken en schrijft niet naar Firebase.

## Populatiegroei en tijd (27 september 2026)

Onder **Menu → Leefbaarheid → Populatiegroei en tijd** kan de gebruiker groei
van importvissen inschakelen. Standaard staat deze uit. Instellingen gelden voor
deze lokale sessie; er komen geen databasewrites voor dieren, health of groei bij.

- Draagkracht per sector is de oude berekening gedeeld door tien. Bij een
  gezamenlijk totaal boven 1.000 schalen alle zones proportioneel terug, inclusief
  hun voedselvoorraad. De weergave rondt naar beneden af: 7.775 wordt circa 777.
- Factor 1 geeft maximaal één jong per tien gezonde volwassen vissen per
  simulatieminuut. Factor 0–10 past dit aan. Er zijn minimaal twee gezonde
  volwassenen in dezelfde importschool nodig, met minstens halve voedselreserve.
- Naarmate de lokale voedselruimte kleiner wordt, vertraagt de groei. Geen
  voedselruimte of een halve/leeggelopen zonevoorraad betekent geen nieuwe vissen.
- Een jong verschijnt op 35% van de volwassen schaal in de bestaande school en
  groeit met voldoende voedsel in tien simulatieminuten op. Het deelt de gewone
  schoolbesturing, botsingsafhandeling en migratie. Alleen volwassenen planten zich voort.
- Ecologische tijd: pauze, 0,5×, 1×, 2×, 4× of 8×. Voedsel, reserves, health en
  groei lopen samen; camera, zwemmen, animatie en netwerktimers blijven realtime.
  De berekening gebruikt stappen van maximaal 0,25 seconde en haalt geen tijd in
  na een inactief tabblad. Bouwen en wereldladen pauzeren deze berekeningen.
- Zowel geboorte als handmatige import respecteert de grens van 1.000 gewone
  visinstanties, inclusief grote dieren. Kleine instanced rifscholen en microleven
  behouden hun eigen bestaande limieten. Zware geïmporteerde modellen kunnen ook
  onder deze grens veel GPU/CPU vragen; dit is geen garantie voor een framerate.
- Overbevolking verdwijnt niet direct: importvissen gebruiken eerst hun reserves,
  verliezen vervolgens health en doorlopen het bestaande zinken/begraven.

Orka en walvis blijven bewegen buiten het camerabereik. Hun routes controleren
ook niet-gerenderde rotscellen via conservatieve volumes. Ontbrekende dieren
verschijnen opnieuw wanneer de draagkracht minstens 60 is en er een veilige
zwemroute is, maximaal één van elk. Bewust verwijderde dieren blijven weg.
Ook bezoekers mogen bestaande dieren via **Volg orka / Volg walvis** terugvinden.
Grote dieren gebruiken geen importvis-health; oude opgeslagen nul-health wordt
bij het laden hersteld. Bewegings-, groeistatus en nieuwe nakomelingen worden niet
permanent opgeslagen; importontwerpen blijven in de bestaande visbibliotheek.
