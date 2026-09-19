# Stap 2 — zand en rotsen

Stap 1 (water en licht) is door de gebruiker bekeken en goedgekeurd om op verder
te bouwen. Stap 2 blijft op `feature/visual-water-light`, zodat dezelfde Codespace
en test-URL kunnen worden gebruikt. De hoofdbranch wordt niet automatisch samengevoegd.

## Bekijken in je bestaande Codespace

1. Ga naar de terminal waarin `npx serve .` draait en druk op Ctrl+C.
2. Voer `git pull --ff-only origin feature/visual-water-light` uit.
3. Start opnieuw met `npx serve .` en open de browser zoals eerder.
4. Open `/?scene=reference` en ververs met Ctrl+Shift+R.
5. Laat **Nieuwe onderwatersfeer** aan. Zet **Zand & rotsdetail** uit en aan om
   alleen deze stap te vergelijken, met identieke camera en belichting.
6. Kijk naar ribbels op het zand, lichte rotslagen en donkere verweerde basaltvlakken.
   Zwem ook naar een rots toe en er weer vandaan. Controleer botsingen en de FPS-teller.
7. Test de landschapseditor: terrein verhogen/verlagen, rotsen plaatsen en verwijderen,
   begroeiing erbovenop plaatsen, bewaren en opnieuw laden. Controleer terreininspectie.

Als Git meldt dat lokale wijzigingen een update blokkeren: bewaar die wijzigingen
en deel de melding; gebruik geen reset om ze te wissen.

De vaste rifvakken en vissen zijn hetzelfde als in stap 1. De gewijzigde rotsvormen
kunnen de stapelhoogte van begroeiing iets veranderen. Herlaad de scène voor een
vergelijking vanuit de vaste uitgangssituatie. De oorspronkelijke beeldstand schakelt
ook het nieuwe zand en de nieuwe rotsen uit.

## Wat is veranderd

- Zand: wereldwijde schaal voor fijne ribbels, korrelvariatie en lichte kleurvlekken.
  Kleine details vervagen op afstand om trillende patronen te beperken.
- Kalksteen: afgeronde onregelmatige vorm, laagjes, poriën en olijfgroene aanslag.
- Basalt: donkere verweerde vlakken, groeven en fijne poriën.
- Detailniveau: 320 driehoeken per rots dichtbij, 80 verder weg. De kwaliteitsstand
  bepaalt de omschakelafstand (20 / 34 / 48 meter). De botsingsvorm blijft gelijk.
- Hergebruik: twee families, elk vier vormvarianten en twee detailniveaus worden gedeeld.
  Geen extra netwerkdownloads, textures of draw calls voor deze stap.

De bodemhoogtes en het JSON-wereldformaat zijn niet veranderd. Het zichtbare kleine
reliëf is materiaalbelichting, geen verandering van het terrein. Instellingen voor
de vergelijking zijn alleen voor de huidige sessie. De bestaande streaming kan
clusters nog steeds anders samenstellen na opnieuw laden; alleen het vormtype is
op positie gebaseerd. Volledig reproduceerbare wereldgeneratie valt buiten deze stap.

## Controle

Tien lokale tests slagen, waaronder gesloten rotsgeometrie, herhaalbare vormen,
gelijke raycast-afstanden bij beide detailniveaus, herstel van de oude materialen,
opruimen na streaming en samenstelling van het materiaal met de bestaande lichtshader.
JavaScript-syntaxis en `git diff --check` zijn gecontroleerd.

De tests compileren geen shaders op een GPU. Beeldkwaliteit, schakelen tussen
detailniveaus en snelheid van deze stap moeten nog in de browser worden beoordeeld.
De shader gebruikt meer berekeningen per pixel en botsingen gebruiken meer
driehoeken dan bij stap 1; vergelijk daarom de FPS bij hetzelfde beeld en dezelfde
kwaliteitsstand. Firebase is in deze grafische stap niet opnieuw getest.

Volgende stap na beoordeling: één hoogwaardige vis, met huiddetail, ogen, vinnen
en een betere zwemanimatie.
