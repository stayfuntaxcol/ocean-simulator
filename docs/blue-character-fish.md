# Blauwe karaktervis — modelstudie 1

Eerste werkpakket van de nieuwe collectie, geïnspireerd op de ronde, expressieve
animatie-uitstraling van de aangeleverde Tiddler-referenties. Dit is een eigen
ontwerp, met een bol voorhoofd, gevormde wangen, grote ogen, lippen rond een donkere
mondopening en afgeronde rug-, buik-, borst- en staartvinnen.

## Bekijken in Codespaces

1. Stop de server met Ctrl+C.
2. Voer `git pull --ff-only origin feature/visual-water-light` uit.
3. Start `npx serve .` en open de bestaande doorgestuurde poort.
4. Open `?scene=reference` en ververs met Ctrl+Shift+R.
5. Kies Nieuwe onderwatersfeer en klik **Bekijk blauwe voorbeeldvis**.
6. Vergelijk met het selectievak **Blauwe karaktervis**.
7. Bekijk voorhoofd, ogen, lippen en vinnen van opzij en van voren met de
   bestaande volgcamera. Herstel camera brengt je terug naar het overzicht.

De vaste scène bevat vijf blauwe voorbeeldvissen binnen de bestaande veertig
vissen. De turquoise school krijgt het nieuwe uiterlijk; er worden geen extra
vissen aan de populatie toegevoegd. Wereldopslag en schoolgedrag blijven dezelfde
visroots gebruiken. De knop voor de koraalvlindervis selecteert nu specifiek die
soort, zodat de nieuwe blauwe vis en orka daar niet tussen komen.

## Afbakening

Dit werkpakket behandelt lichaamsvorm en basismateriaal. De vissen zwemmen mee
met de bestaande school, maar de nieuwe vinnen staan nog in een vaste pose.
Schubbenreliëf, vinstralen, ademhaling, oogbewegingen en buigende romp/staart zijn
volgende werkpakketten na beoordeling van deze vorm. De mond is nog niet interactief.
De studio en GLB-export worden hier nog niet gekoppeld.

Geometrieën en materialen worden gedeeld. De romp heeft twee detailniveaus;
fijne gezichtsdetails verdwijnen op afstand, ogen en mond blijven herkenbaar.

## Controle

30 lokale tests slagen: bestaande controles plus gesloten lichaamsgeometrie,
uitwaartse normalen, eindige vin-geometrie, een begrensd geometriebudget,
behoud van vis-/schoolidentiteit, gedeelde assets, afstandsdetail en opruimen.
De hoofdpagina en module zijn syntactisch gecontroleerd. Dit is geen GPU- of
browserbeoordeling; uiterlijk, camerabediening en FPS moeten nog in Codespaces
worden bekeken. Vergelijk op dezelfde computer dezelfde scène en kwaliteit.
