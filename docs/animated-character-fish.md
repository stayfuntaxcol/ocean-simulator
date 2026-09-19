# Bewegende karaktervissen en clownvis

Deze update vervangt de vaste poses van de blauwe en groene karaktervis door
procedurale zwemanimaties. De blauwe vis buigt zijn achterste romp zijwaarts;
de groene platvis golft verticaal en beweegt zijn brede zijvinnen. De staartpositie
en -hoek sluiten aan op de rompbuiging. Borstvinnen slaan afzonderlijk, en de
vinoppervlakken buigen subtiel mee. Fijne vinstralen geven meer oppervlaktedetail.

Kleine pupilbewegingen, bewegende wenkbrauwen (blauw/clown), een licht bewegende
onderlip en ademende wangen geven expressie. Dit zijn subtiele, herhalende animaties,
geen reacties op de camera of emotionele AI. Iedere vis heeft een eigen fase.
De groene vis gebruikt nog steeds zijn bestaande schoolroute, geen bodem-AI.

## Clownvis

De bestaande oranje school reef_0 krijgt een clownvis geïnspireerd op Finding Nemo:
een compacter lichaam, oranje huid, drie witte banden met donkere randen, afgeronde
staart, donkere vinranden, grote ogen en één kleinere borstvin. Het is een in code
gebouwd model; er worden geen filmassets geladen. De clownvis heeft een sneller
bewegingsritme dan de blauwe vis. In de referentiescène zijn vijf exemplaren van
elk van de drie soorten te zien binnen de bestaande veertig vissen.

## Testen in Codespaces

Stop de server met Ctrl+C, haal de branch op en start opnieuw:

```sh
git pull --ff-only origin feature/visual-water-light
npx serve .
```

1. Open dezelfde pagina met `?scene=reference` en ververs met Ctrl+Shift+R.
2. Kies Nieuwe onderwatersfeer en klik **Animatie starten**.
3. Gebruik **Bekijk blauwe voorbeeldvis**, **Bekijk groene platvis** en
   **Bekijk clownvis**. De groene camera begint iets hoger.
4. Bekijk de staartaanzet, beide zijvinnen, ogen en mond van dichtbij.
5. Pauzeer de scène: lichaam, vinnen en gezicht moeten helemaal stilstaan.
6. Vergelijk met de afzonderlijke soortschakelaars en bekijk FPS bij dezelfde
   camerastand en kwaliteit. Op afstand stopt het fijne gezichtsbewegingswerk;
   romp en staart blijven bewegen met een eenvoudiger lichaamsgeometrie.

## Validatie en grenzen

37 lokale tests slagen: bestaande regressies plus onafhankelijke poses,
reproduceerbare pauze, aansluiting van staartpositie op rompbuiging, stilstaand
hoofd, stoppen bij sterfte, shadercompositie en opruimen van animatiematerialen.
Geometrie blijft gedeeld; bewegende onderdelen hebben eigen materialen/uniforms
per vis, zodat scholen niet synchroon zwemmen. Dit kost meer materiaalobjecten.

De tests compileren geen GLSL op een GPU. De uiteindelijke uitstraling, aansluitingen
in het gerenderde beeld en FPS moeten nog in Codespaces worden beoordeeld.
De animaties zijn niet gekoppeld aan Fish Studio of GLB-export. Wereldformaat,
Firebase-regels en schoolnavigatie zijn in deze update niet gewijzigd.
