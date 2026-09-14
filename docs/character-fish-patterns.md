# Blauwe en groene karaktervissen

De blauwe vis heeft nu een verspringend patroon van gebogen schubbenlijnen,
subtiele kleurbanden, grotere pupillen, afgeronde opgetrokken wenkbrauwen en
mondhoeken die omhoog lopen. Het gezicht blijft glad zodat de expressie leesbaar is.
Het patroon vervaagt als details kleiner worden dan een beeldpunt.

De groene platvis is een eigen ontwerp gebaseerd op de eerder aangeleverde
groene referentie: breed en laag, olijfgroen met onregelmatige groenblauwe
vlekjes, een lichtere buik, ogen bovenop, brede zijvinnen en een brede glimlach.
Hij vervangt de bestaande groene school (reef_6). In de vaste scène zijn vijf
blauwe en vijf groene vissen aanwezig binnen dezelfde populatie van veertig.

## Testen

Stop de Codespaces-server met Ctrl+C en voer uit:

```sh
git pull --ff-only origin feature/visual-water-light
npx serve .
```

Open dezelfde pagina met `?scene=reference`, ververs met Ctrl+Shift+R en kies
Nieuwe onderwatersfeer. Klik **Bekijk blauwe voorbeeldvis** of **Bekijk groene
platvis**. De groene volgcamera begint iets hoger zodat de ogen en rug zichtbaar
zijn. Vergelijk elk model met zijn eigen selectievak. Bekijk kop, beide zijkanten
en bovenkant en vergelijk FPS bij dezelfde kwaliteit en camera.

Dit is een grafische update. Beide modellen gebruiken nog een vaste vinstand en
het bestaande schoolgedrag. De groene vis is dus nog geen bodemgebonden soort;
hij zwemt voorlopig mee met zijn school. Er is geen nieuwe mondinteractie of
studio-/GLB-koppeling. De referentiebeelden zijn niet als spelassets opgenomen.

## Validatie

32 lokale tests slagen, inclusief de bestaande regressiecontroles, gesloten
platte lichaamsgeometrie, eindige modelonderdelen, positie van de ogen,
behoud van schoolidentiteit, gedeelde materialen, afstandsdetail en opruimen.
De hoofdpagina wordt op JavaScript-syntaxis gecontroleerd. De materiaaltests
controleren shaderopbouw maar compileren geen GLSL op een GPU. De uiteindelijke
uitstraling en prestaties moeten nog in de browser worden beoordeeld.
