# Grafische upgrade — stap 1: water en licht

Deze branch bouwt op GitHub-main `c078cc6`. De afzonderlijke, nog onafgeronde
integratie van Fish Studio en wereldopslag zit niet in deze wijziging.

## Wat je kunt bekijken

- Bewegend wateroppervlak op 20 meter, met golfrimpels en lichtreflecties.
- Waterkleur en mist die veranderen met de cameradiepte.
- Warm zonlicht, een koelere onderwateromgeving en filmische kleurweergave.
- Bewegende lichtpatronen op de bestaande bodem en rifmaterialen.
- Zachte lichtbundels en kleine zwevende deeltjes.
- Oorspronkelijk/nieuw beeld, drie kwaliteitsstanden en een FPS-teller.

De lichtbundels zijn transparante vlakken en de waterreflecties zijn berekende
lichtaccenten. Dit is geen fysische watersimulatie of volledige volumetrische
belichting. Nieuwe vismodellen, rotsdetails en koraalvormen volgen later.

## Zelf vergelijken

1. Check deze branch uit en start `python -m http.server 8000` vanuit de repository.
2. Open `http://localhost:8000/?scene=reference`.
3. De demo begint gepauzeerd, op tijdstip 12, met vaste camera, 40 vissen en 11 rifvakken.
4. Wissel bij **Water & licht → Beeld** tussen oorspronkelijk en nieuw. Houd
   camera, venstergrootte en kwaliteit gelijk. Maak van beide een schermafbeelding.
5. Kies **Animatie starten** om water, deeltjes en vissen in beweging te bekijken.
6. Test Licht, Gebalanceerd en Hoog. Wacht per stand ten minste 10 seconden en noteer
   FPS, draw calls, driehoeken, apparaat, browser en venstergrootte.
7. Open de landschapseditor en terreininspectie. De sfeerlaag hoort daar uit te staan;
   na terugkeren komt de gekozen onderwatersfeer weer terug.

Directe vergelijkings-URL voor de oorspronkelijke beeldinstelling:
`http://localhost:8000/?scene=reference&visual=original`.
Herlaad de demo voor de oorspronkelijke visposities en tijd; **Herstel camera**
herstelt alleen de camera. De FPS-teller meet de renderlus, geen afzonderlijke GPU-tijd.

De demo opent apart, start geen Firebase-login en gebruikt een eigen lokale
opslagsleutel. Een gewone simulator-URL blijft de bestaande lokale opslag gebruiken.
De demo gebruikt vaste willekeurige getallen bij het starten. Bewerkingen en opnieuw
streamen na rondzwemmen zijn geen onveranderlijke benchmark; herlaad voor vergelijken.

## Technische grens van deze stap

| Stand | Maximale pixelratio | Deeltjes | Lichtbundels |
| --- | ---: | ---: | ---: |
| Licht | 1 | 120 | 3 |
| Gebalanceerd | 1,5 | 280 | 6 |
| Hoog | 2 | 520 | 9 |

Het nieuwe oppervlak, de bundels en de deeltjes gebruiken samen maximaal drie
extra draw calls. Bodemlicht wordt in de bestaande materialen berekend. De oude
18 lichtkegels zijn alleen actief in de oorspronkelijke beeldstand. De instellingen
beperken alleen de nieuwe sfeerlaag; zware bestaande landschappen kunnen nog steeds
veel tijd kosten. Kwaliteit wordt handmatig gekozen en nog niet automatisch aangepast.

De nieuwe bestanden staan in `graphics/`; de bestaande simulator blijft een statische
HTML-app met dezelfde Three.js-versie (0.179.1). Er zijn geen extra runtime-CDN's.
`package.json` dient uitsluitend voor de lokale controles; een bundelstap is niet nodig.

## Uitgevoerde controles

`npm ci && npm test`: zes tests voor kwaliteitsgrenzen, herstel van oorspronkelijk
licht/mist, editorisolatie, materiaalshader-injectie, reproduceerbaarheid en JavaScript-syntaxis.
`git diff --check`: geslaagd.

Deze controles compileren de GLSL niet op een GPU. Er zijn voor deze branch nog geen
browserbeelden, gemeten apparaatprestaties of volledige kliktests beschikbaar. De
browserpreview was eerder in deze werkomgeving geblokkeerd; deze stap blijft daarom
een conceptvoorstel totdat bovenstaande visuele controle is gedaan. Firebase en
delen zijn in deze stap niet opnieuw getest of uitgerold.

Acceptatie: zichtbaar betere diepte en lichtwerking, geen storende vlakken of
flikkeringen, geen shaderfouten in de browserconsole en bruikbare snelheid op het
doelapparaat. Richtwaarde: 50–60 FPS op de gekozen desktop en minstens 30 FPS op het
gekozen mobiele apparaat; dit zijn doelen, geen gemeten resultaten.

## Vervolg in kleine sessies

| Stap | Afgebakend resultaat |
| --- | --- |
| 1 — deze branch | Referentiescène, water, licht, vergelijken en prestatiemeter |
| 2 | Eén zandmateriaal en twee hoogwaardige rotstypen |
| 3 | Eén hoogwaardige vis met huiddetail, ogen, vinnen en zwemanimatie |
| 4 | Drie koraalvormen, één spons en één bewegende plant |
| 5 | Natuurlijker schoolgedrag en beweging rond het rif |
| 6 | Eén geanimeerde orka, met passende bewegingsruimte |
| 7 | Afwerking, afstandsdetail en prestaties op desktop en mobiel |
| 8 | Tweede leefomgeving met dezelfde kwaliteitslat |

Per sessie: één stap, dezelfde vergelijkingsscène, gerichte controle en een aparte
commit of pull request. Leg aan het eind vast wat zichtbaar af is en wat nog openstaat.
Splits een stap als die meer dan de afgesproken modellen of systemen vraagt. Er is
geen betrouwbare garantie hoeveel gebruikerslimiet een sessie verbruikt.
