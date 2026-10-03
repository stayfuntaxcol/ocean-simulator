# Animal Design Studio

Open **Menu → Design → Animal Design Studio** vanuit de oceaan. De studio opent in een apart tabblad en gebruikt dezelfde modellen, navigatie en gedragsregels als de simulator. Er is geen modelleerprogramma nodig: de dieren worden uit bewerkbare geometrie opgebouwd.

## Experimenteren

1. Kies Orka, Walvis, Zeeschildpad of Stingray.
2. Verander de schuiven, getallen en opties onder Model, Beweging en de overige blokken. Het model verandert meteen.
3. Draai de camera met de muis en zoom met het wiel. Kies **Alleen dit model** voor anatomie of bekijk de hele groep. **Volg dier** houdt het bewegende dier in beeld.
4. Test voeding, migratie of schildpadleeftijd. Pauze en Herstart proef maken vergelijking mogelijk.
5. Gebruik **Toepassen in mijn oceaan** om de ontwerpinstellingen naar het bijbehorende geopende oceaantabblad te sturen. Bewaar vervolgens met Save Local of Save Online.

Een proef mag tijdelijk de simulatie versnellen, de leeftijd veranderen of voeding inschakelen. Die proefwaarden worden niet in de ontwerpinstellingen opgenomen. De knop Maak orka’s hongerig verandert alleen de proef. Een ontwerpwijziging aan Startleeftijd verandert bewust de leeftijd van de aanwezige schildpadden; normale veroudering komt uitsluitend van grensoversteken.

Instellingen worden als concept lokaal onthouden. Exporteren en importeren gebruikt JSON met `format: ocean-animal-studio-v1`. Het JSON-bestand bevat instellingen, geen uitgevoerde proef. Toepassen werkt alleen in het oceaantabblad waarmee de studio is geopend, voor de huidige wereld, als die wereld bewerkbaar is. Zonder geopend oceaantabblad blijven ontwerpen en exporteren beschikbaar.

## Dieren

| Dier | Instelbaar | Standaardgedrag |
| --- | --- | --- |
| Orka | Grootte, kleinere rugvin, gevormde zijvinnen, staartbreedte, huidruwheid, kruis- en jachtsnelheid, draaien, staartslag, aantallen, voeding, honger, voedingswaarde, zoekafstand, jong, gezinsafstand, ademen | 1/3/8 volwassenen. Voeding voegt één jong toe; de moeder telt mee in het aantal volwassenen. Zij blijft bij haar jong en deelt voedingsreserve. |
| Walvis | Grootte, vinnen, staartbreedte, huidruwheid, snelheid, draaien, staartslag, 1/2/3 dieren, groepsafstand, ademritme, migratie en verblijfsduur | Groot, langzaam draaiend dier met krachtige staartslag, gevormde vinnen en een ademcyclus. Groepen vertrekken na 300 actieve simulatieseconden richting een grens. De zwemreis zelf kost extra tijd. |
| Zeeschildpad | Volwassen grootte, schildhoogte, flippers, huidruwheid, startleeftijd, volwassen/solistische leeftijd, babymaat, jonge/volwassen snelheid, flipperslag, draaien, groepsafstand, migratie, verblijf en terugkeer | 20 jongen in een stoet. Groei verloopt over vele oversteken. Volwassenen zwemmen sneller met tragere slagen. Kleur, ogen, schildruwheid en beschadigingen veranderen met leeftijd. Groepen splitsen; oude dieren reizen alleen. |
| Stingray | Grootte, huidruwheid, snelheid, golfbeweging, draaien, 1/3/8 dieren | Bestaande vorm behouden, standaard 20% groter. |

Orka’s eten uitsluitend **dode, nog zinkende importvissen**. Levende, stervende maar nog levende, en al begraven importvissen zijn geen voedsel. Eén vis kan slechts eenmaal gegeten worden. Jonge schildpadden zijn een afzonderlijke optionele voedselbron; bereikbare dode importvissen krijgen voorrang. De jachtopties staan standaard uit. In de oceaan verschijnen de meters Honger, Reserve en Voedsel tijdens het volgen van een orka met voeding ingeschakeld. Vissen reageren op nabije orka’s; hun bestaande nachtelijke rust blijft behouden.

## Migratie, opslag en grenzen

Dieren hebben eigen IDs, leeftijd, groepen, honger en reistoestand. Een succesvolle oversteek verplaatst een hele migratiegroep en verhoogt een schildpadleeftijd eenmaal met één jaar. In een verbonden buurwereld verschijnen dezelfde dieren. Bij volgen van een migrerende walvis of schildpad reist de speler mee via de bestaande wereldreis en wordt hetzelfde dier daarna opnieuw gevolgd. Een mislukte wereldreis verplaatst of overschrijft het landschap niet.

Zonder buurwereld verdwijnen reizigers buiten beeld en keren dezelfde dieren later terug. Dieren in andere werelden hebben geen rendergeometrie; hun verblijf en terugreis worden licht bijgehouden zolang deze sessie actief is. De reizigersadministratie zit in het wereldbestand en blijft bij reizen en lokale/online opslag behouden. Lokale en online wereldidentiteiten worden bij import omgezet zonder dier-IDs te vernieuwen.

Dit is een simulatie per browsersessie, met opslag via het bestaande wereldsysteem. Er is geen centrale, gelijktijdige dierensimulatie tussen verschillende spelers en geen leeftijdsontwikkeling terwijl de simulator gesloten is. Reizen schrijft nooit zelfstandig naar de wereld van een andere eigenaar. Oude wereldbestanden met losse orka-, walvis- en bezoekersvelden blijven leesbaar.

Beweging controleert lichaam, vinnen, bodem, rotsen en sculptvolumes. Ademen gebruikt gecontroleerde navigatie naar het oppervlak; modelanimatie verplaatst de root niet. Als een dier niet veilig past, zoekt het een vrije plek en blijft anders tijdelijk zonder mesh wachten. Een plek wordt periodiek opnieuw geprobeerd. Gedeelde schildpadgeometrie blijft beschikbaar totdat de laatste instantie wordt verwijderd.

## Onderhoud en controle

- `animals/AnimalSettings.js`: schema, defaults, grenzen, presets en leeftijdscurve.
- `animals/AnimalSystem.js`: individuele toestand, voeding, groepen, migratie en opslag.
- `animals/AnimalCollision.js`: swept lichaams- en vincontrole, inclusief sculpt.
- `animals/AnimalModels.js` en `graphics/`: de gedeelde modellen.
- `animal-studio/`: studio en verbinding met het geopende oceaantabblad.

Controle: `npm test`, `npm run test:animal-browser`, `npm run test:menu-browser`, `npm run test:community-browser` en `npm run test:recovery-browser`. Browsertests kunnen `CHROMIUM_PATH` of `CHROMIUM_EXECUTABLE` en `PLAYWRIGHT_MODULE` gebruiken voor een lokaal geïnstalleerde browser. De dierentest meet ook de updatekosten van een scenario met 40 dieren; deze headless meting is geen FPS-garantie op een spelerscomputer.

## Validatie op 3 oktober 2026

280 unitcontroles slagen. De browsercontroles voor Animal Studio, de menu’s, verbonden werelden en importherstel slagen zonder browserfouten. Deze controles dekken live instellingen, presets, de aantallen, opslag, een alleen-lezen wereld, mobiele indeling, hervatten van volgen na diermigratie, normale wereldbezoeken met behoud van bewoners, nachtelijke rust en diepe landschappen.

In het headless scenario met 40 dieren kostte de dierupdate mediaan 0,5 ms en op het 95e percentiel 0,9 ms. De gemeten camera zag 93 draw calls en 123.030 triangles. Dit beschrijft één lokale scène en camera, geen zwaar volledig rif of garantie voor een andere computer.

De bestaande brede `test:ecosystem-browser` faalt nog bij `splitSchool.currentFoodSector` (`null`), dezelfde fout als op de eerdere `main`. De streaming-, rots- en dieptecontroles vóór die assertion slagen. Deze bestaande importschoolfout is niet gewijzigd in deze dierenupgrade.
