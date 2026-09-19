# Organisch proefrif — eerste beoordelingsversie

Dit document beschrijft de eerdere rifproef. De gebruiker heeft deze weergave
inmiddels goedgekeurd. De modellen worden met de microlevenupdate gepubliceerd
en blijven in de hoofdoceaan beschikbaar via `?reef=organic`.

Deze wijziging betreft uitsluitend takkoraal, plaatkoraal, sponzen en anemonen.
Microleven, vissen, gras, rotsen, wereldrechten, hoofdinterface en hexagonstructuur
zijn niet opnieuw ontworpen. Dit is een eerste visuele proef, geen claim dat het
uiteindelijke filmniveau al is bereikt.

## Bekijken

- `graphics/reef-quality-review.html`: vaste camera's, bestaand/nieuw, dichtbij/veraf,
  hoge/lage geometrie, pauze en herstel van dezelfde animatietijd.
- `?scene=reference&reef=organic`: dezelfde modellen in de bestaande oceaan.
- `?scene=reference`: de bestaande weergave blijft standaard behouden.
- In een eigen wereld: voeg `reef=organic` toe aan de bestaande URL-parameters.
  De bestaande knop **Levend rifdetail** blijft beschikbaar.
- `npm ci && npm run build:reef-review` maakt `dist/Ocean-Rif-Proef.html`.
  Download/open dit ene bestand in een WebGL2-browser; geen installatie, server,
  CDN, account of netwerk nodig. Het is een modelvergelijking, niet de hele wereld.

## Wat is aangepast?

1. Takkoraal: gebogen verbonden vertakkingen, afgeronde groeipunten en vaste voet.
2. Plaatkoraal: asymmetrische golfranden, dikte, onderzijde en zachte groeikleur.
3. Sponzen: onregelmatige vaten met wanddikte, afgeronde opening, binnenwand en
   verdiept bodemvlak. Gedempt poriënreliëf reageert op de bestaande belichting.
4. Anemonen: 42 tentakels met afgeronde toppen, afzonderlijke fasen, gedeelde
   stroming en verankerde bases. Ook echte `addAnemone`-objecten gebruiken nu de
   nieuwe module wanneer de proefschakelaar aan staat.
5. Geometrie/materialen worden gedeeld; een eenvoudiger afstandsmodel verlaagt
   de geometriekosten. Harde koralen en sponzen vervormen niet.

`createReefLife(uniforms, {style:'organic'})` kiest de nieuwe modellen; de standaard
blijft `existing`. Oorspronkelijke geometrie blijft beschikbaar. De wereldgenerator
verbruikt geen extra willekeurige getallen. De opslagstructuur verandert niet.

## Controles

- `npm test`: 100 geslaagde tests (92 bestaande plus 8 nieuwe).
- Nieuwe tests: reproduceerbare geometrie, begrensde detailniveaus, binnenwanden,
  tentakelfasen, ankergegevens, shaderopbouw, materialen, raycasts, cachebeheer,
  oorspronkelijke weergave, plaatsingsroots en de echte anemoonfactory.
- Chromium/WebGL: vergelijkingspagina op desktop en mobiel gecontroleerd;
  beide stijlen, alle close-ups, hoog/laag detail, pauzeren en hervatten.
- Zelfstandig HTML-bestand gecontroleerd met uitgeschakeld netwerk.
- De echte referentiescène gecontroleerd in beide modi, inclusief de bestaande
  detail- en kwaliteitsknoppen. Firebase-initialisatie is alleen in deze test
  vervangen door een testdubbel; cloudopslag of authenticatie zijn niet getest.
- Schermafbeeldingen in `docs/reef-review/` komen uit de echte renderer, niet uit
  een beeldgenerator. De vergelijkingspagina heeft een eigen vaste lichtopstelling
  en zachte contactvlakken; die zijn niet als nieuwe lichtlaag in de app gezet.

De controles zijn uitgevoerd met softwarematige WebGL-rendering. Hun fps-cijfers
zijn geen voorspelling voor de werkcomputer. Meet daar eerst een representatief
druk rif voordat de nieuwe weergave standaard wordt ingeschakeld.

## Eerst visueel goedkeuren

Beoordeel de vier soorten van dichtbij, op middellange afstand en in de echte
wereld. Let op organische silhouetten, zachte aansluitingen, zichtbare holtes,
voldoende subtiele poriën en rustige tentakelbeweging zonder loskomende voeten.
De takovergangen, anemoonmond/kleurnuances en lichtverstrooiing kunnen verder
worden verfijnd. Echt subsurface scattering en een nieuwe schaduwpipeline zijn
niet toegevoegd. Ook de omschakeling tussen detailniveaus blijft zonder crossfade.

Pas na goedkeuring verder met microleven. Hoofdinterface en hexagonstructuur blijven
daarna pas aan de beurt. Dit was de afbakening van de oorspronkelijke proef.
