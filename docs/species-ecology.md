# Soortgedrag: bodemgroepjes, clownparen en blauwe scholen

## Wat verandert

- Groene platvissen leven in afzonderlijke groepjes van twee of drie. Ze kiezen
  korte routes langs de bodem, zwemmen langzamer en volgen lokale bodemhoogte.
  Bij steile stukken wordt vooruitbewegen afgeremd in plaats van door de bodem
  te bewegen. Bestaande rotsnavigatie en botsingscontrole blijven actief.
- Clownvissen vormen paren: een volwassen exemplaar (schaal .52) en een kleinere
  (.31). De kleine volgt achter de volwassen vis en versnelt bij achterstand;
  de volwassen vis remt bij grote afstand. Samen kiezen ze een koraal-/gemengde
  rifplek als thuisgebied en maken korte uitstapjes. Vluchtige versnellingen
  worden afgewisseld met glijden, met een bijpassend variërende staartslag.
- Blauwe scholen bevatten maximaal twaalf vissen en zoeken vooral gemengde
  rifplekken of zeegras met rotsen. Ze blijven langer bij een leefplek, met
  incidentele verkenning van een andere plek. Schoolleden variëren in tempo.
- Sommige vertakte koraalobjecten worden compacte, deinende anemonen. Dit is
  onderdeel van de koraalhabitat; er is nog geen afzonderlijke anemoon-editorlaag
  of exacte binding van elk clownpaar aan één specifieke anemoon.
- De orka is 65% groter: ongeveer elf wereldmeters lang. Vrijstand rond bodem,
  rotsen en wereldranden en de kijkafstand groeien mee. Andere karaktervissen
  hebben kleinere en consistentere afmetingen, zodat het contrast duidelijk is.
- Vissen draaien vloeiender naar hun zwemrichting en karaktervissen hellen licht
  mee in bochten. Hun staartslag wisselt in ritme; versnellen is geen abrupte posewissel.

Het totale aantal vissen blijft gelijk. In de vaste scène: twee clownparen,
een blauwe school van zes, groene groepjes van drie en twee. De overige soorten
behouden hun bestaande gedrag. Sterfte kan een paar of groep natuurlijk kleiner
maken; er worden niet automatisch nieuwe partners aangemaakt.

## Testen in Codespaces

Stop de server met Ctrl+C en voer uit:

```sh
git pull --ff-only origin feature/visual-water-light
npx serve .
```

Open dezelfde pagina met `?scene=reference`, ververs met Ctrl+Shift+R en klik
**Animatie starten**. Gebruik de kijkknoppen en **Volg school**.

1. Groen: volg minimaal een minuut. Bekijk lage zwemhoogte, groepgrootte en
   gedrag bij hellingen en rotsen. Test vervolgens een eigen landschap met geulen.
2. Clownvis: controleer het volwassen-klein paar, korte versnellingen en het
   terugkeren naar de leefplek. Klik op een vis voor de bestaande schrikreactie;
   bekijk daarna het hergroeperen. Beide leden mogen in die reactie uiteenwijken.
3. Blauw: bekijk een grotere, los bewegende school bij begroeiing.
4. Orka: verwijder een eerder geplaatste orka en plaats hem opnieuw in open
   water. Zijn grotere lichaam kan op een oude opgeslagen plek te weinig ruimte
   hebben. De orka vermijdt nauwe gebieden conservatief.
5. Vergelijk FPS bij dezelfde camera en kwaliteitsinstelling.

## Validatie en grenzen

42 lokale tests slagen. Nieuwe controles toetsen populatiebehoud, groepgroottes,
habitatvoorkeuren, snelheidspulsen, orka-afmetingen/vrijstand en de daadwerkelijke
updateFish-functie: 24 seconden bodemvolgen op een helling en hereniging van een
uit elkaar geraakt paar. De bestaande geometrie-, animatie- en opslagrecordtests
blijven slagen. De hoofdpagina is op syntaxis gecontroleerd.

Deze tests vervangen geen browser-/GPU-beoordeling. In complexe overhangen of
zeer steile geulen kan de bestaande navigator nog vastlopen. Buiten zicht pauzeren
de drie nieuwe soortgroepen om niet door ongeladen rotsen te bewegen. Op een lege
wereld gebruiken ze een lokale plek totdat geschikte habitat beschikbaar is.
Het is een gedragsbasis voor een levendige wereld; verhaallijnen, missies en
interactieve avonturen zijn nog niet toegevoegd. Firebase-regels zijn ongewijzigd.
