# Rust, clownvisgezinnen en contact tussen vissen

## Nieuwe gedragingen

- Groene platvissen zwemmen eerst ongeveer 20–45 seconden, remmen af bij de
  bodem en slapen vervolgens 2–4 minuten. Ogen sluiten met zichtbare oogleden;
  de zwemslag stopt en alleen subtiele ademhaling blijft over. Na het ontwaken
  kiezen ze opnieuw een route. De cyclus loopt op simulatietijd bij zichtbare
  vissen; pauzeren of buiten beeld gaan telt niet mee als slaaptijd.
- Clownvissen vormen gezinnen met moeder, vader en 2–5 kinderen. Gezinsgroottes
  verschillen; in de vaste scène zijn er twee gezinnen met twee en drie kinderen.
  De moeder is groter dan de vader. Kinderen variëren in grootte en volgen haar
  met eigen posities; achterblijvers versnellen en de moeder wacht bij achterstand.
  Het totale aantal vissen blijft gelijk door een deel van een andere soort te
  vervangen. Sterfte maakt een gezin kleiner; ouders of kinderen worden niet
  automatisch aangevuld.
- De zwemanimatie van de karaktervissen gebruikt gemeten verplaatsing. Snelle
  verplaatsing geeft meer lichaamsbuiging en snellere staartslagen. Een vis die
  door een obstakel of contact stilvalt, blijft niet ter plaatse hard zwemmen.
- Alle vissen krijgen een harde bovengrens onder de laagste golfhoogte. De grens
  houdt rekening met afmetingen en helling van de vis, ook voor importmodellen.
  Oude visposities boven water worden bij de eerstvolgende update gecorrigeerd.
- Nabije vissen zien nu ook andere soorten. Ze sturen bij voor contact en een
  aanvullende contactcontrole scheidt overlappende volumes zonder stuiteren.
  Slapende vissen worden daarbij niet weggeduwd. Correcties worden gecontroleerd
  tegen bodem, watergrens en rotsen.

## Testen in Codespaces

Stop de server met Ctrl+C en voer uit:

```sh
git pull --ff-only origin feature/visual-water-light
npx serve .
```

Open dezelfde simulator met `?scene=reference`, ververs met Ctrl+Shift+R en klik
**Animatie starten**.

1. Volg een groene vis. Wacht tot hij afremt en zijn ogen sluit. Blijf bij hem
   om na 2–4 minuten het ontwaken en de volgende verkenning te zien.
2. Volg een clownvisgezin. Controleer twee ouders en meerdere kleinere kinderen,
   versnellingen, glijfases en weer aansluiten na achterstand.
3. Bekijk ontmoetingen tussen blauwe vissen en clownvissen. Ze mogen dichtbij
   komen, maar hun lichamen horen niet door elkaar heen te schuiven.
4. Bekijk vissen nabij het oppervlak en probeer daar ook een school te importeren.
   Het lichaam hoort onder water te blijven, ook als een vis omhoog wijst.
5. Vergelijk FPS in dezelfde scène en op dezelfde kwaliteitsinstelling.

## Controle en beperkingen

48 lokale tests slagen, waaronder slapen/ontwaken en oogleden, gezinsgroottes,
watergrens bij gekantelde vissen, contact tussen verschillende soorten, snelle
kruisingen, stilstaande slapende vissen en koppeling tussen verplaatsing en animatie.
De bestaande integratietests voor bodemvolgen en weer aansluiten blijven slagen.

De contactvolumes benaderen de visvorm en zijn geen botsingstest per driehoek.
In zeer krappe rotsopeningen of een overvolle groep kan de oplosser onvoldoende
vrije ruimte vinden; de rotscontrole krijgt dan voorrang boven het uit elkaar
schuiven. Dit vraagt nog beoordeling in de browser, net als de uitstraling en FPS.
De contactcontrole gebruikt ruimtelijke vakken en maximaal vier correctierondes
voor vissen in beeld. Firebase-regels en wereldformaat zijn niet gewijzigd.
