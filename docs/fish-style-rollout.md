# Twee visstijlen: gefaseerde uitrol

Doel: dezelfde oceaan kunnen beleven met cartoonvissen of met hyperrealistische dieren. Elke fase levert een afzonderlijk testbare wijziging op. Geen vervanging van werelddata, scholen, gezondheid of interacties bij een stijlwissel.

## Eerdere proef — blauwe vis

- Visstijl-keuze met cartoon als standaard.
- Blauwe vis als eerste realistische vormstudie: natuurlijker profiel, kleinere ogen, kieuwlijnen, fijne schubben en slanke vinnen.
- Kies Nieuwe onderwatersfeer, schakel Blauwe vis detail in, klik Bekijk blauwe vis en vergelijk beide visstijlen. Gebruik ook `?scene=reference` om dezelfde scène te vergelijken.
- Dit is een eerste procedureel model, nog geen afgerond hyperrealistisch resultaat. Het mist onder meer hoogwaardige huid-normalmaps en verfijnde vinmembranen.
- Wisselen werkt tijdens zwemmen en pauze. De stijlkeuze geldt voor deze sessie; opslaan van de wereld verandert niet.

## Ronde 1 — Astra 6: kogelvis en koraalvlindervis (gepubliceerd)

- Kogelvis: aparte realistische lichaamsvorm met kleine natuurlijke ogen, bekplaten, 192 fijne stekels, gevlekte huid en een bleke buik. Opblazen door klikken of een nabije orka blijft in beide stijlen identiek werken.
- Beide realistische modellen krijgen in deze Astra-ronde extra huidreliëf en variatie in oppervlakteruwheid. Kogelvis krijgt vinmembranen en kieuwdetails; koraalvis krijgt verfijnde ogen, vinnen en huid. De cartoonvariant blijft apart beschikbaar.
- Koraalvlindervissen blijven per paar dicht bij het koraal, vertragen bij een aankomstpunt en wisselen rustiger zwemmen af met korte versnellingen.
- Kogelvissen zwemmen meestal afzonderlijk, veel langzamer en laag bij het rif. Hun kleine vinnen blijven bij stilhangen bewegen; de staartslag volgt echte verplaatsing.
- Diepte volgt nu de plaatselijke bodem en het rif. De vorige smalle dieptebanden konden vissen tientallen meters boven hun leefgebied laten zweven. Nominale banden (koraalvis 2–35 m, kogelvis 3–40 m) zijn zachte simulatievoorkeuren; nabijheid van habitat en waterveiligheid gaan voor.
- De stijlen delen één gedragstoestand. Wisselen verandert geen positie, snelheid, school, gezondheid of opblaastimer.

Test beide stijlen met **Bekijk kogelvis** en **Bekijk koraalvlindervis**. Klik daarna op de kogelvis, wissel tijdens het opblazen van stijl en controleer of de toestand doorloopt.

Open daarnaast [de modelvergelijking](../graphics/fish-review.html): vier modellen onder dezelfde belichting, met draaien, pauze en gezamenlijk opblazen. Dit is echte realtime code, geen gegenereerde impressie. De testpagina houdt dieren op vaste presentatieplekken; de oceaan gebruikt hun navigatie.

## Ronde 2 — Astra 6: groene platvis en clownvis (nu)

Realistische vormen, huid en vinnen per soort. Clownvis behoudt ouder/kind-verhoudingen en sprintgedrag. Platvis behoudt bodemgedrag, rustplaatsen en gesloten ogen tijdens slapen. Test alle gezinsgroottes en slapende/stilstaande dieren bij wisselen.

Deze batch bouwt op dezelfde huid- en vinweergave als de gele koraalvlindervis: MeshStandard-verlichting, fijn reliëf in de oppervlaktenormaal, variërende ruwheid en dunne membranen met vinstralen. De realistische modellen zijn aparte vormen; de cartoonmodellen blijven behouden.

- Groene platvis: laag profiel, kleine ogen aan de bovenzijde, gemarmerde olijf-/zandkleurige bovenkant, lichte onderkant en lange vinranden. De gesloten ogen tijdens slapen blijven een gekozen spelanimatie.
- Clownvis: compact lichaam, natuurlijke kleine ogen, drie witte banden met donkere randen en symmetrische dunne vinnen. De kleinere cartoonvin verandert niet. Gezinsrollen en de schalen van ouders en kinderen blijven identiek in beide stijlen.
- De stijlkeuze wordt doorgegeven aan beide libraries. Realistische modellen worden pas bij eerste gebruik per vis aangemaakt. Herhaald wisselen gebruikt dezelfde modellen, geometrieën en animatiestatus opnieuw.
- Animatie leest echte verplaatsingssnelheid en de bestaande slagfase. Een eigen vinklok laat actieve vissen stilhangen; rust/slaap en pauze houden de klok stil. De bestaande snelheden, bodemroutes, gezinsvorming en rusttimers blijven gehandhaafd.

Test in de oceaan met **Realistisch · in ontwikkeling**, **Clownvis** en **Groene platvis** aan. Gebruik daarnaast [batch 2 vergelijken](../graphics/fish-review-batch-two.html). Elke rij toont cartoon, realistisch en de gele koraalvis onder dezelfde belichting en camera. Draai en kantel om ook de buik en de bovenzijde te zien; zet snelheid op nul, pauzeer, wissel detail en laat de platvis rusten. De presentatiepagina houdt de dieren op vaste plekken; de oceaan koppelt hun zwemslag aan echte verplaatsing.

De gele koraalvis is de kwaliteitsmaatstaf. De gedeelde rendering en automatische controles ondersteunen die vergelijking, maar gelijke waargenomen beeldkwaliteit moet nog visueel in de browser worden beoordeeld. Hier ontbreekt een werkende browserinstallatie; shaders zijn niet op een GPU gecompileerd of gefotografeerd.

Automatische validatie van deze batch: 82 tests, waaronder gesloten lichaamsgeometrie, symmetrische realistische clownvinnen, slaaphouding, gedeelde materialen, detailwissels en behoud van simulatiestatus. De vergelijkingspagina gebruikt de daadwerkelijke modellen uit de oceaan.

## Ronde 3 — orka en walvis (laatste dierenbatch, nu)

Grote dieren krijgen passende anatomie, natuurlijke ogen, huidnuance, mond en vinnen. Behoud schaal, orka-kaakinteractie en walvisbeweging. Controleer staartaanhechting en belichting op korte afstand; test watergrens en botsingsruimte opnieuw als de buitenvorm verandert.

De orka en walvis krijgen nu dezelfde materiaalbasis als de gele koraalvis: MeshStandard-verlichting, fijn reliëf in de normaal en plaatselijke ruwheidsvariatie. De orka krijgt subtiele huidnuances in het zwart/witte patroon; de walvis krijgt huidmotteling, keelplooien, kleinere natuurlijke ogen en reliëf op de lange vinnen. De bestaande gesloten lichamen, mondinteractie en detailniveaus blijven behouden.

Beide zoogdieren maken af en toe een rustige oppervlaktebeweging. Alleen het gebied rond het blaasgat komt aan de waterspiegel; daarna verschijnt een korte, doorschijnende mistpluim en zakt het dier weer terug. Orka en walvis hebben verschillende cycli. Gewone vissen blijven volledig onder water.

Controleer in de browser vooral of de pluim precies bij de kop begint en of een opstijgend dier niet door rotsen of de bodem beweegt. De automatische tests bewaken geometrie, detailniveaus, mond, routes en de shaderopbouw; een grafische browsercontrole blijft nodig.

## Afronding — complete stijlen en prestaties

Alle zeven ontwikkelde soorten ondersteunen beide stijlen. Controleer ook nieuwe dieren, laden/opslaan en verwijderen. Zelf geïmporteerde GLB-vissen blijven hun eigen model gebruiken; automatische omzetting van imports valt buiten deze reeks. Overige eenvoudige paletvissen vragen daarna eigen ontwerpen.

Per fase: één beperkte commit, automatische gedragstests en een visuele beoordeling in de browser. Vergelijk dezelfde camera, scène, verlichting en kwaliteit. Streef naar 60 fps op de afgesproken desktop en minstens 30 fps bij de lagere kwaliteit; meet dit eerst voordat het als garantie wordt gegeven. Controleer geheugen bij herhaald wisselen. Bij verslechtering van vorm of prestaties blijft cartoon direct beschikbaar.

## Onderbouwing en bewuste simulatiekeuzes

- [Florida Museum: balloonfish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/balloonfish/) beschrijft langzaam zwemmen met kleine vinnen dicht bij de bodem, rif/zeegras, een snavelbek en opblazen met water. De stekelige vis is daarom een op Diodon geïnspireerd ontwerp, geen exacte reconstructie van alle kogelvissoorten.
- [University of Michigan: Chaetodon auriga](https://animaldiversity.org/accounts/Chaetodon_auriga/) beschrijft rifhabitat en duurzame paren. De bestaande koraalvis is een eigen vlindervisontwerp; niet elk patroon hoort exact bij deze soort.
- [NOAA: whale blow](https://www.fisheries.noaa.gov/feature-story/whale-week-celebrating-wonder-whales) benoemt de pluim als adem; uitwerking volgt in ronde 3.
- Snelheden, dieptevoorkeuren en draaigedrag zijn afgesteld op deze wereld en de bestaande vergrote dierschalen, geen gevalideerde veldmetingen. De 120/30-seconden-opblaastimer en orka-trigger blijven de gewenste spelinteractie. Volledig nachtgedrag en voedselketens vallen nog buiten deze batch.

## Validatie van ronde 1

Automatische tests controleren wisselen zonder simulatiestatus te verliezen, detailniveaus, materiaalopruiming, opblazen en de nieuwe soortgroepen. De uiteindelijke beeldkwaliteit en GPU-shadercompilatie moeten nog in de browser worden beoordeeld. Een cijfer 8–10 is een visueel acceptatiedoel, geen reeds gemeten resultaat.

Na de vergelijking: beoordeel silhouet, oogpositie, vin-aanhechting en huid van dichtbij en op afstand, in beide stijlen. Controleer opgeblazen en normale kogelvis. Bij onvoldoende realisme vervolgen we met gerichte model- en textuurverbeteringen (eventueel GLB met PBR-texturen); een etiket 'hyperrealistisch' is geen kwaliteitsbewijs. De eerdere blauwe vormstudie krijgt bij de eindcontrole dezelfde kwaliteitslat.
