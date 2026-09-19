# Microleven, verre scholen en plankton

Deze stap voegt kleine biodiversiteit toe zonder de bestaande vis- en riflogica te
vervangen.

## Wat je ziet

| Onderdeel | Plaats en gedrag |
|---|---|
| Garnalen | Op de bodem rond rifhabitats; maken korte, lage bewegingen. |
| Zeesterren | Vijfarmig model op vlakke bodem; blijft op zijn plaats. |
| Zee-egels | Stekelig bolmodel op de bodem; blijft op zijn plaats. |
| Schelpen | Geribbeld schelpmodel op de bodem; blijft op zijn plaats. |
| Krabben | Zijwaarts model met poten en scharen; maakt korte bewegingen. |
| Kleine scholen | Minnow-achtige vissen boven rifvakken, op afstand van de camera. |
| Planktonlagen | Zwevende deeltjes in drie lokale dieptelagen rond de camera. |

De plaatsing gebruikt dezelfde habitatankers en terreinhoogte als het rif. Objecten
worden niet op steile bodem, in rotsen, in lavavents of boven de waterspiegel geplaatst.
De verre schooltjes blijven onder het oppervlak en worden niet als extra grote school
bij de speler gespawned.

## Bediening

Onder **Water & licht** staan drie schakelaars:

- **Microleven**: alle bodemdieren, schooltjes en plankton in één keer.
- **Kleine scholen in de verte**: alleen de minnow-schooltjes.
- **Planktonlagen**: alleen de zwevende deeltjes.

In editor- en inspectiemodus wordt microleven tijdelijk verborgen, zodat plaatsing en
raycasts niet worden gehinderd. De statusregel toont de actuele aantallen.

## Detail en prestaties

De kwaliteitsschakelaar gebruikt gedeelde geometrie. Op lage kwaliteit worden goedkopere
vormen en minder patches, schoolvissen en plankton gebruikt. De objecten zijn decoratief:
hun raycast is uitgeschakeld zodat klikken op vissen, terreinbewerking en editorplaatsing
blijven werken. De planktonlagen gebruiken tile-lokale zaden, waardoor dezelfde laag
stabiel blijft wanneer de camera een aangrenzende wereldtegel binnenloopt.

## Testen

Voer uit:

```bash
npm test
```

De microleven-batch voegt acht controles toe: eindige geometrie, terrein- en
obstakelplaatsing, determinisme, pauzeren, terreinwijzigingen, onderwatergrenzen,
tegellagen, kwaliteitsreductie, opruimen en shader-/app-integratie. Het project heeft
na deze stap 100 geslaagde automatische tests.

Voor een losse visuele controle open je:

```text
/graphics/micro-life-review.html
```

Controleer in de simulator ook dat bodemdieren niet zweven, schooltjes op afstand
blijven en de drie schakelaars onafhankelijk werken.
