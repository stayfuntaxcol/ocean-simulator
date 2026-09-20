# Leefbaarheid en draagkracht

De oceaan begint zonder natuurlijke vissen. De simulator berekent de leefbaarheid
steeds opnieuw uit de lagen die al in de wereld zijn opgeslagen. Er wordt dus geen
extra ecosysteemrecord naar Firebase geschreven.

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

## Geïmporteerde vissen

Alleen handgemaakte, geïmporteerde vissen hebben health. Ze gebruiken eerst de
vrije draagkracht. Als de totale belasting hoger wordt dan de draagkracht, daalt
hun health geleidelijk. Onder 30% zijn ze kritiek. In een gezonde oceaan herstelt
health langzaam. Een lavabron dichtbij veroorzaakt veel snellere schade.

Orka en walvis tellen als zware belasting van respectievelijk 18 en 30
visequivalenten. Hun eigen health wordt niet in de kritieke importvismeting
opgenomen.

## Firebase-verbruik

- Habitatwaarden, score, draagkracht en natuurlijke populaties worden lokaal berekend.
- Natuurlijke vissen worden niet afzonderlijk opgeslagen.
- Er zijn geen realtime listeners of extra databasevelden toegevoegd.
- Alleen de bestaande wereldlagen, terrein, lavabronnen, orka en walvis blijven
  onderdeel van het bestaande wereldrecord.
- De lokale visbibliotheek blijft IndexedDB gebruiken en schrijft niet naar Firebase.

