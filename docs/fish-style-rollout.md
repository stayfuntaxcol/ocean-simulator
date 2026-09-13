# Twee visstijlen: gefaseerde uitrol

Doel: dezelfde oceaan kunnen beleven met cartoonvissen of met hyperrealistische dieren. Elke fase levert een afzonderlijk testbare wijziging op. Geen vervanging van werelddata, scholen, gezondheid of interacties bij een stijlwissel.

## Fase 1 — eerste vergelijking (nu)

- Visstijl-keuze met cartoon als standaard.
- Blauwe vis als eerste realistische vormstudie: natuurlijker profiel, kleinere ogen, kieuwlijnen, fijne schubben en slanke vinnen.
- Kies Nieuwe onderwatersfeer, schakel Blauwe vis detail in, klik Bekijk blauwe vis en vergelijk beide visstijlen. Gebruik ook `?scene=reference` om dezelfde scène te vergelijken.
- De overige soorten blijven voorlopig cartoon. Dit is een eerste procedureel model, nog geen afgerond hyperrealistisch resultaat. Het mist onder meer hoogwaardige huid-normalmaps en verfijnde vinmembranen.
- Wisselen werkt tijdens zwemmen en pauze. De stijlkeuze geldt voor deze sessie; opslaan van de wereld verandert niet.

## Fase 2 — blauwe vis op eindkwaliteit

Beoordeel zij-, voor- en achteraanzicht en een bewegende opname op hetzelfde apparaat. Verfijn anatomie, huidreliëf, reflecties, vinstralen en de overgang van lijf naar staart. Indien het procedurele model onvoldoende kwaliteit oplevert: een gericht gemaakt GLB-model met eigen PBR-texturen en animatierig inzetten. Eerst deze kwaliteitsstandaard vastleggen, daarna andere soorten uitwerken.

## Fase 3 — clownvis en groene platvis

Realistische vormen, huid en vinnen per soort. Clownvis behoudt ouder/kind-verhoudingen en sprintgedrag. Platvis behoudt bodemgedrag, rustplaatsen en gesloten ogen tijdens slapen. Test alle gezinsgroottes en slapende/stilstaande dieren bij wisselen.

## Fase 4 — vlindervis en kogelvis

Vlindervis: dun profiel en nauwkeurige kleurpatronen. Kogelvis: gedetailleerde huid en stekels in beide toestanden. Klik, orka-nabijheid, twee minuten opgeblazen blijven en langzaam leeglopen moeten ook bij tussentijds wisselen doorlopen.

## Fase 5 — orka en walvis

Grote dieren krijgen passende anatomie, natuurlijke ogen, huidnuance, mond en vinnen. Behoud schaal, orka-kaakinteractie en walvisbeweging. Controleer staartaanhechting en belichting op korte afstand; test watergrens en botsingsruimte opnieuw als de buitenvorm verandert.

## Fase 6 — complete stijlen en prestaties

Alle zeven ontwikkelde soorten ondersteunen beide stijlen. Controleer ook nieuwe dieren, laden/opslaan en verwijderen. Zelf geïmporteerde GLB-vissen blijven hun eigen model gebruiken; automatische omzetting van imports valt buiten deze reeks. Overige eenvoudige paletvissen vragen daarna eigen ontwerpen.

Per fase: één beperkte commit, automatische gedragstests en een visuele beoordeling in de browser. Vergelijk dezelfde camera, scène, verlichting en kwaliteit. Streef naar 60 fps op de afgesproken desktop en minstens 30 fps bij de lagere kwaliteit; meet dit eerst voordat het als garantie wordt gegeven. Controleer geheugen bij herhaald wisselen. Bij verslechtering van vorm of prestaties blijft cartoon direct beschikbaar.

## Validatie van fase 1

Automatische tests controleren wisselen zonder simulatiestatus te verliezen, detailniveaus, materiaalopruiming en behoud van cartoon/clown-gedrag. De uiteindelijke beeldkwaliteit en GPU-shadercompilatie moeten nog in de browser worden beoordeeld. Een cijfer 8–10 is een visueel acceptatiedoel, geen reeds gemeten resultaat.
