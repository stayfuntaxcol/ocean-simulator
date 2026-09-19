# Stap 6 — plaatsbare orka

Op verzoek gaat de ontwikkeling na stap 4 rechtstreeks verder met stap 6. Stap 5
(verdere verfijning van schoolgedrag) blijft openstaan. Deze stap voegt één orka
per wereld toe en gebruikt dezelfde GitHub-testbranch en Codespace.

## Testen

1. Stop de server met Ctrl+C en voer `git pull --ff-only origin feature/visual-water-light` uit.
2. Start `npx serve .`, open dezelfde URL met `?scene=reference` en ververs met Ctrl+Shift+R.
3. Klik **Plaats orka**. Er wordt in nabijgelegen open water een plek gezocht;
   de volgcamera nadert de orka van opzij. De knop verandert daarna in **Volg orka**.
4. Klik op zijn lichaam: de onderkaak opent, boven- en ondertanden worden zichtbaar
   en de bek sluit na enkele seconden weer. Dit werkt ook in de gepauzeerde demo.
5. Klik **Animatie starten** voor de zwemroute, rompbuiging, op-en-neergaande
   staartslag en borstvinbeweging. Gebruik A/D, W/S en Q/E zoals bij andere vissen.
6. Bekijk kop, oogvlekken, zadelvlek, witte buik, rugvin en beide zijden. Kijk of
   de bek goed aansluit en of de staart horizontaal ligt. Controleer op shaderfouten.
7. Test zwemmen bij rotsen, de bodem en het wateroppervlak. In een krap gebied
   hoort de orka te stoppen of een andere richting te kiezen.
8. Bewaar de wereld lokaal of exporteer JSON. Verwijder de orka met **Verwijder orka**
   en laad het bestand terug. De orka hoort op zijn opgeslagen positie terug te komen.
9. Vergelijk FPS bij Licht, Gebalanceerd en Hoog, met en zonder orka.

Als geen ruime plek beschikbaar is, toont de simulator dat en kun je naar opener
water zwemmen. Tijdens het bouwen zijn plaatsen/volgen geblokkeerd en blijft de
orka uit beeld. De editor kan later wel rotsen over een bestaande orkapositie
plaatsen; verplaats zo nodig het landschap of verwijder en plaats de orka opnieuw.

## Model en interactie

- Eigen orkamodel van circa 6,7 wereldmeters lang, met zwarte huid, witte buik,
  witte oogvlekken en een grijze zadelvlek.
- Aparte rugvin, twee bewegende borstvinnen en horizontale staartvinnen.
- De achterste romp buigt verticaal mee met de staartslag.
- Scharnierende onderkaak, mondinterieur en twee gebundelde rijen van elk 18 tanden.
- Eén orka per wereld. Hij jaagt in deze stap niet op de andere vissen.

Er zijn twee resoluties van de romp. De totale geometrie dichtbij telt ongeveer
6.136 driehoeken, verdeeld over maximaal twaalf meshes, inclusief beide tandrijen.
De tanden zijn alleen zichtbaar tijdens het openen van de bek. De oorspronkelijke
beeldschakelaar laat deze nieuw geplaatste soort staan; verwijderen heeft een eigen knop.

## Bewegingsruimte en opslag

De orka heeft een eigen rustige routeplanner. Een conservatieve marge van vier meter
rond zijn centrum houdt afstand tot rotsgroepen, bodem en wereldranden. Ook rotsen
in gemengde rifvakken tellen mee. Deze benadering gebruikt de begrenzingsdozen van
rotsgroepen en vermijdt daarom ook sommige open overhangen. Het is geen exacte
botsingsberekening per lichaamsdeel.

Beweging wordt alleen berekend binnen circa veertig meter van de camera, waar
het landschap geladen is. Buiten die afstand pauzeert de route. De routeplanner
kiest korte vrije stukken en stopt als alle richtingen geblokkeerd zijn; hij is
geen volledige padzoeker voor doolhoven. Het bestaande gezondheids-/lavasysteem
geldt ook voor de orka.

Het wereldobject bevat een optioneel veld `orca` met positie, zwemrichting en gezondheid.
Oude wereldbestanden zonder dit veld blijven bruikbaar. Lokale opslag, JSON en de
bestaande cloud-payload gebruiken ditzelfde object; live Firebase-opslag is in deze
stap niet getest of gewijzigd. Een gestorven orka wordt niet opnieuw opgeslagen.
Het model wordt bij openen opnieuw opgebouwd; er worden geen binaire assets bewaard.

## Controle en resterende beoordeling

27 lokale tests slagen, inclusief gesloten lichaamsgeometrie, bek openen/sluiten,
horizontale staartvinnen, romp-/staartaansluiting, shaderopbouw, afstandsdetail,
conservatieve routevrijheid, stoppen bij blokkades, pauzeren en JSON-recordvalidatie.
JavaScript-syntaxis en `git diff --check` zijn gecontroleerd.

De tests compileren geen GLSL op een GPU. Het orka-uiterlijk, aanklikken via de
browser, volledig opslaan/laden via de UI en prestaties moeten nog worden beoordeeld.
De eerdere studio-/opslagintegratie blijft een afzonderlijk onafgerond werkpakket.
Deze orka is nog geen bewerkbaar Fish Studio-sjabloon of exporteerbare GLB-animatie.
