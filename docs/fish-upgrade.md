# Stap 3 — één gedetailleerde koraalvis

Na beoordeling van zand en rotsen is één oorspronkelijke visvorm toegevoegd,
geïnspireerd op vlindervissen. Het is een visueel ontwerp, geen exacte reconstructie
van een biologische soort. De bestaande gele school (`reef_2`) gebruikt de nieuwe
vorm. De schoolleden, startposities en het schoolgedrag blijven behouden.

## Bekijken

1. Stop de server in de bestaande Codespace met Ctrl+C.
2. Voer `git pull --ff-only origin feature/visual-water-light` uit.
3. Start `npx serve .` en open de bestaande test-URL met `?scene=reference`.
4. Ververs met Ctrl+Shift+R. Kies **Nieuwe onderwatersfeer**.
5. Klik **Bekijk nieuwe vis**. De camera nadert via de bestaande volgcamera een
   levende vis uit de gele school, tot circa 4,8 meter aan de zijkant. Rotsen kunnen
   de camera dwingen meer afstand te houden of een andere route te nemen.
6. Zet **Gedetailleerde koraalvis** uit en aan om oud en nieuw te vergelijken.
7. Klik **Animatie starten**: let op rompbuiging, staartslag en borstvinnen.
   Gebruik A/D om eromheen te bewegen en W/S of scroll om afstand aan te passen.
8. Bekijk beide zijden, snuit en rug. Controleer op open naden, losse vinnen,
   flikkeringen of zwarte materialen. Test de kwaliteitsstanden en noteer de FPS.
9. **Herstel camera** keert terug naar de referentiecamera; herladen herstelt ook
   de oorspronkelijke visposities en gepauzeerde tijd.

De scène bevat nog steeds 40 vissen, waarvan vijf de nieuwe gele visvorm hebben.
In de gewone simulator is het eveneens één bestaande kleur/soortgroep. De studio,
eigen GLB-imports en overige vissoorten gebruiken hun bestaande modellen.

## Model en animatie

- Gesloten, afgeplat lichaam met ronde rug, smalle staartaanzet en verlengde snuit.
- Geel-crèmekleurige huid met fijne lijnen, oogband, flankvlek en kieuwmarkering.
- Glanzende pupillen, goudkleurige iris en een klein mondrandje.
- Dunne staart-, rug-, anaal- en borstvinnen, met doorschijnende randen en vinstralen.
- Shaderbuiging van romp en de aangehechte rug-/anaalvinnen; de staartpositie volgt
  dezelfde buiging. De borstvinnen slaan afzonderlijk. Snelheid beïnvloedt de
  uitslag, zonder de animatiefase te laten springen.

Geometrieën worden hergebruikt. Elke vis heeft eigen animatie-uniforms. Dichtbij telt
de romp 1.968 driehoeken, verder weg 504. Kleine ogen, mond en borstvinnen verdwijnen
op afstand (14 / 24 / 38 meter voor Licht / Gebalanceerd / Hoog). De overige vinnen
blijven zichtbaar. Het volledige model kost dichtbij maximaal 11 draw calls, verder
weg 4. Dat is meer dan de oude vis; beoordeel daarom snelheid én beeldkwaliteit.

## Controle en grenzen

Vijftien lokale tests slagen. Nieuwe controles dekken gesloten geometrie en naar
buiten gerichte normalen, behoud van de schoolstructuur, herhaalbare gepauzeerde
poses, aansluiting van de staart, onafhankelijke animatie-uniforms, afstandsdetail,
materiaalopruiming en shadercompositie. JavaScript-syntaxis is gecontroleerd.

Deze tests compileren de shaders niet op een GPU. Visuele beoordeling, doorschijnende
vinnen, overgangen in detail en prestaties moeten nog in de browser worden gecontroleerd.
De bestaande vereenvoudigde botsingsmarges van vissen blijven van toepassing; de
buiging van de huid is een render-effect en geen nieuwe botsingssimulatie.

De vis is in deze stap een ingebouwde simulatorsoort. Bewerken in Fish Studio en
exporteren van deze shaderanimatie naar GLB zijn nog niet gekoppeld. De eerdere
afzonderlijke studio-/opslagintegratie blijft een ander, onafgerond werkpakket.

Volgende afgebakende grafische stap na beoordeling: drie koraalvormen, een spons
en een bewegende plant.
