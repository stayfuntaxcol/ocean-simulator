# Vollere orka-onderkaak en grote walvis

De platte ellipsoïde onderkaak van de orka is vervangen door een gesloten,
afgerond volume. Hij is achteraan breder en dieper, met een oplopende, taps
uitlopende kin. De bestaande kaakscharnier, mondholte en tanden blijven samen
bewegen wanneer je de orka aanklikt.

De nieuwe walvis is een eigen, gestileerd model op basis van de aangeleverde
referentie: een brede blauwgrijze kop, een lichtere keel met plooien, een gebogen
mondlijn, kleine ogen, knobbeltjes op de snuit, lange borstvinnen, een kleine
rugvin en brede horizontale staartlobben. Hij is ongeveer 27 meter lang: ruim
2,3 keer zo lang als de huidige orka van circa 11 meter.

## Toevoegen en bekijken

Stop de Codespaces-server met Ctrl+C en voer uit:

```sh
git pull --ff-only origin feature/visual-water-light
npx serve .
```

Ververs de simulator met Ctrl+Shift+R.

1. Plaats of volg de orka en bekijk zijn onderkaak van opzij en van voren.
   Klik op de orka om het openen, de tanden en het sluiten te controleren.
2. Klik **Plaats walvis**. De simulator zoekt een ruime plek nabij de camera.
   Er kan één walvis per wereld geplaatst worden. Bij te weinig ruimte toont
   de simulator een melding: zwem dan naar opener water en probeer opnieuw.
3. De volgcamera begint op 27 meter afstand, iets boven de walvis. De knop wordt
   **Volg walvis**. Je kunt dezelfde bestaande volgcamera bedienen.
4. In `?scene=reference`: klik **Animatie starten** om romp, borstvinnen en staart
   te zien bewegen. Pauzeren houdt de pose vast.
5. Test **Verwijder walvis**, opnieuw plaatsen en de wereld lokaal als JSON
   bewaren/terugladen. Positie, richting en gezondheid worden meegenomen.
6. Vergelijk de grootte met de orka en bekijk FPS bij dezelfde kwaliteit.

## Beweging en veiligheid

De walvis heeft een eigen langzame routeplanner. Hij kan alleen bewegen wanneer
zijn lichaam binnen het geladen landschap past. Conservatieve controles testen
rotsen, bodemhoogten onder de brede draaicirkel, wereldgrenzen en wateroppervlak.
Hij stopt wanneer geen vrije route beschikbaar is. Walvis en orka houden met
elkaar rekening bij routekeuze. Kleinere vissen gebruiken hun contactcontrole
om de walvis te ontwijken; de walvis wordt daarbij niet weggeduwd.

Deze aanpak vermijdt soms ook open plekken naast of onder rotsgroepen, omdat de
rotsen met begrenzingsdozen worden getest. Je kunt later met de editor rotsen
rond een opgeslagen dier plaatsen; verwijder en herplaats het dier als er daardoor
onvoldoende bewegingsruimte is. Er is nog geen nieuwe klik-/mondinteractie voor
de walvis, geen spuitfontein en geen Fish Studio- of GLB-exportkoppeling.

## Validatie

53 lokale tests slagen. De nieuwe tests controleren gesloten kaak- en
walvisgeometrie, kaakvolume, openen/sluiten, schaalverhouding, geometriebudget,
animatie/pauze, afstandsdetail, materiaalopruiming, routevrijstand en validatie
van het optionele walvisrecord. Bestaande werelden zonder walvisveld blijven
ondersteund. De hoofdpagina en nieuwe modules zijn syntactisch gecontroleerd.

Dit vervangt geen GPU-/browserbeoordeling. De uiteindelijke aansluitingen,
huidweergave, volledige opslaginterface en FPS moeten nog in Codespaces worden
bekeken. Live Firebase is niet opnieuw getest; regels zijn niet gewijzigd.
