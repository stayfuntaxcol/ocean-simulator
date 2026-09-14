# Drie nieuwe rifsoorten

De drie laatste eenvoudige paletvissen zijn vervangen door eigen herkenbare ontwerpen. De bestaande IDs blijven staan; het totale aantal vissen blijft gelijk. In de vaste referentiescène zijn alle drie aanwezig.

| Bestaande plek | Nieuw ontwerp | Uiterlijk | Simulatiegedrag |
|---|---|---|---|
| `reef_3`, roze | Doktersvis | Breed blauw lijf, doorlopende rug-/aarsvin, sikkelstaart, gele stekel bij de staart | Rustige kleine groepen van maximaal 3, bij begroeide rotsen en rif |
| `reef_5`, paars | Kardinaalvis | Zilverachtige huid, zwarte banden, witte stipjes, twee rugvinnen en lange gevorkte staart | Groepjes van maximaal 4, veel stilhangen en korte verplaatsingen bij beschutting |
| `reef_7`, oranje | Kleine rifbaars | Slank blauwgroen lijf, fijne schubben, donkere borstvinbasis en gevorkte staart | Compacte schooltjes van maximaal 10 boven koraal, met snellere korte zwemslagen |

De doktersvis is groter dan de kardinaalvis en rifbaars. Deze dieren zijn net als de andere vissen vergroot voor de simulator; schaal, kruissnelheid en diepte zijn spelinstellingen, geen gevalideerde veldmetingen. Er is geen apart nacht-, voedsel- of voortplantingssysteem toegevoegd.

## Grafiek en animatie

- De nieuwe modellen zijn zichtbaar in zowel cartoon als realistisch, ook bij lage kwaliteit en de oorspronkelijke verlichting. De oude bol-en-kegelvormen worden niet meer getoond voor deze drie soorten.
- Beide stijlen hebben dezelfde herkenbare anatomie en patronen. Cartoon heeft grotere, lichte ogen en een iets voller profiel; realistisch heeft kleine donkere ogen en sterker fijn huidreliëf.
- De materialen gebruiken dezelfde `FishSurfaceDetail`-basis als de gele koraalvis: schubreliëf dat de verlichting beïnvloedt, variatie in oppervlakteruwheid en dunne vinmembranen met stralen.
- Staart- en lichaamsbuiging lezen de werkelijk gemeten snelheid en slagfase. Borstvinnen kunnen bij stilhangen doorbewegen. De geïntegreerde klok houdt de pose vast tijdens pauze; stijlwisselen reset geen gezondheid, positie of school.
- Geometrieën worden per soort gedeeld. Lichaam én vinnen hebben een lager detailniveau op afstand. Materialen per vis worden bij verwijderen opgeruimd; gedeelde geometrie wordt pas met de library opgeruimd.

## Testen

1. Open de simulator, vernieuw de pagina en klik op **Bekijk doktersvis**, **Bekijk kardinaalvis** of **Bekijk rifbaars**.
2. Wissel **Visstijl** tijdens het volgen. In de vaste referentiescène moet je eerst **Animatie starten** kiezen om beweging te zien.
3. Open [de vergelijkingspagina](../graphics/reef-species-review.html). De drie werkelijke modellen staan hier naast de gele koraalvis onder dezelfde verlichting. Draai tot de andere zijde, kantel, zet snelheid op nul en controleer de vinnen. Wissel stijl en detail tijdens pauze.
4. Bekijk ze ook in de oceaan tussen koraal en rotsen. Let op vin-aanhechting, de schaal van de kleine schooltjes en de rustige kardinaalvis.

De acht nieuwe tests controleren gesloten lichamen, uitwendige vinnen, vormbehoud bij lagere detaillering, shaderopbouw, behoud van toestand, opruiming, populatietotalen en het daadwerkelijke `updateFish`-gedrag. Het project heeft met deze batch 92 geslaagde automatische tests. Een werkende grafische browser ontbreekt in de ontwikkelomgeving; GPU-compilatie, waargenomen beeldkwaliteit en framesnelheid moeten nog in de browser worden gecontroleerd. Gedeelde materiaaltechniek is geen bewijs dat het resultaat al fotorealistisch is.

## Anatomische referenties

Dit zijn eigen ontwerpen geïnspireerd op deze soorten; geen exacte wetenschappelijke reconstructies:

- [Florida Museum — Blue Tang, Acanthurus coeruleus](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/blue-tang/): ronde blauwe doktersvis met een stekel bij de staart.
- [NOAA — Banggai Cardinalfish](https://www.fisheries.noaa.gov/species/banggai-cardinalfish): contrasterende banden, zilveren huid met lichte stippen, twee rugvinnen en een diep gevorkte staart.
- [Australian Museum — Blackaxil Puller, Chromis atripectoralis](https://australian.museum/learn/animals/fishes/blackaxil-puller-chromis-atripectoralis/): blauwgroene kleine rifvis met donkere borstvinbasis.
