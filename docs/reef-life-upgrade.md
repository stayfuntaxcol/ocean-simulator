# Stap 4 — koraal, spons en bewegende plant

Na akkoord op de gedetailleerde vis is het bestaande rif opgewaardeerd. De vaste
11 rifvakken, 40 vissen en camera blijven beschikbaar. Deze stap verandert het
uiterlijk van bestaande begroeiing; de JSON-types en wereldopslag zijn gelijk gebleven.

## Bekijken in Codespaces

1. Stop `npx serve .` met Ctrl+C.
2. Voer `git pull --ff-only origin feature/visual-water-light` uit.
3. Start `npx serve .`, open dezelfde URL met `?scene=reference` en ververs met Ctrl+Shift+R.
4. Kies **Nieuwe onderwatersfeer**. Zet **Levend rifdetail** uit en aan om alleen
   deze stap te vergelijken. **Herstel camera** keert terug naar de vaste rifcamera.
5. Klik **Animatie starten**: het zeegras beweegt en waaierkoraal wiegt licht mee.
   Vertakt koraal, platen en sponzen bewegen niet als planten.
6. Zwem langs het rif. Let op de vertakkingen, golvende plaatranden, het open
   waaiernetwerk en de holle openingen van de spons. Controleer ook FPS en
   detailovergangen bij Licht, Gebalanceerd en Hoog.
7. Plaats in de editor koraal, sponzen en zeegras. Controleer stapelen, verwijderen,
   bewaren en opnieuw laden. Tijdens de landschapseditor en terreininspectie staat
   de stromingsanimatie stil.

In de referentiescène worden drie bestaande vertakte kolonies verbeterde takkoralen
en twee bestaande kolonies waaierkoraal. De bestaande plaatkoralen worden allemaal
gelaagde platen. Sponzenvakken en gemengde vakken krijgen de nieuwe buisspons;
zeegras wordt vervangen door gebogen bladgroepen. Anemonen en zeesterren blijven hun
bestaande uiterlijk houden. Door begroeiing, kijkrichting en mist zie je niet alles
tegelijk vanuit de vaste camera.

## Vormen en materiaal

- Vertakt koraal: gebogen hoofdtakken, fijnere uitlopers en afgeronde uiteinden.
- Plaatkoraal: drie dunne, golvende schijven, een rand met dikte en een dragende steel.
- Waaierkoraal: open netwerk van spaken en dwarsverbindingen, met lichte stromingsbeweging.
- Buisspons: vijf onregelmatige buizen met een binnenwand en verdiept midden.
- Zeegras: negen gebogen, versmallende bladeren; de wortels blijven verankerd.

Kolonies behouden hun bestaande kleuren, met kleine oppervlaktevlekken, porieaccenten
en lichtere uiteinden. De bestaande lichtpatronen blijven op de nieuwe vormen werken.
Het gaat om procedurele visuele ontwerpen, geen nieuwe simulatie van koraalgroei.

## Prestaties en controle

Elke nieuwe kolonie gebruikt één mesh en één materiaal. Er zijn maximaal drie
gedeelde varianten per type, elk met twee detailniveaus. De wisselafstand is
18 / 30 / 45 meter bij Licht / Gebalanceerd / Hoog. Shaderbeweging gebruikt een
gedeelde klok met faseverschillen op basis van positie.

| Vorm | Driehoeken dichtbij | Driehoeken verder weg |
| --- | ---: | ---: |
| Vertakt koraal | 2.240 | 1.040 |
| Plaatkoraal | 4.936 | 1.320 |
| Waaierkoraal | 2.676 | 576 |
| Buisspons | 1.600 | 800 |
| Zeegras | 252 | 108 |

De oude vormen blijven beschikbaar voor vergelijken. Het opruimen bij streaming
verwijdert hun eigen geometrieën en bewaart gedeelde nieuwe geometrieën. Raycasts
slaan de verborgen vorm over en gebruiken voor de nieuwe kolonies de vaste geometrie
met veel detail, zodat plaatsingshoogtes niet afhankelijk zijn van kijkafstand.
De kleine shaderbeweging is niet onderdeel van deze plaatsingsgeometrie.

Twintig lokale tests slagen: onder andere vormbudgetten, herhaalbare geometrie,
omhoog gerichte koraalplaten, plaatsen op zichtbaar koraal, vergelijken, opruimen
en gedeelde/pauzeerbare beweging. Syntaxis en `git diff --check` zijn gecontroleerd.

Visuele browser-/GPU-controle en apparaatmetingen van deze stap staan nog open.
Minder tekenopdrachten betekent niet automatisch meer FPS: geometrie en
materiaalberekeningen zijn uitgebreider. Vergelijk bij gelijke camera en kwaliteit.
Wereldopslag en Firebase zijn in deze stap niet opnieuw getest of uitgerold.

Na beoordeling volgt stap 5: de beweging en interactie van de scholen natuurlijker maken.
