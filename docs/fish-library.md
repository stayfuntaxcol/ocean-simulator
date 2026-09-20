# Mijn visbibliotheek

Open **Mijn visbibliotheek** in de oceaan of in de studio. De collectie wordt
opgeslagen in IndexedDB op dit apparaat, voor deze browser en website. Dit
onderdeel leest of schrijft niets in Firebase. De normale wereldverbinding
van de oceaan blijft bestaan.

## Een vis bewaren en gebruiken

1. Open de studio, geef je vis een naam en eventueel de naam van de maker.
2. Kies **Bewaar in bibliotheek**. Dit bewaart model, voorbeeld, kleuren,
   patroon en de oorspronkelijke verf van romp en staart.
3. Kies **Bewaar & naar oceaan**. De oceaan opent de bibliotheek bij deze vis.
4. Kies 1, 8, 20 of 50 vissen en **Voeg toe aan mijn oceaan**.

De collectie overleeft herladen. Plaatsing van geïmporteerde vissen blijft,
zoals voorheen, voor de lopende oceaansessie; ze worden niet aan de online
wereldopslag toegevoegd. Bezoekers mogen de bibliotheek bekijken en bestanden
toevoegen, maar kunnen alleen in hun eigen wereld vissen plaatsen.

## Bestaande bestanden en uitwisseling

Via **Bestanden toevoegen** kun je meerdere GLB-bestanden tegelijk selecteren.
Je kunt bestanden ook naar de bibliotheek slepen. Identieke bestanden worden
herkend. Geldige bestanden blijven bewaard als een ander bestand in de batch
mislukt. Maximum: 25 MB per bestand; afbeeldingen moeten ingebed zijn.

**Download deelbestand** maakt een gewone GLB met naam en maker. Bij nieuwe
studio-ontwerpen bevat dit bestand ook de bewerkbare verflagen in glTF-extras.
Stuur het bestand zelf door: de ontvanger kiest **Bestanden toevoegen** en kan
het daarna plaatsen en, als de verflagen aanwezig zijn, verder ontwerpen.
Oude GLB's missen die verflagen en zijn alleen te plaatsen en te delen.

Zoek op naam, maker of soort. Markeer favorieten. Naam en maker kunnen worden
aangepast. **Bewaar als nieuwe vis** bewaart een variant; **Bewaar in
bibliotheek** werkt het geopende ontwerp bij. Volledig identieke exporten
worden samengevoegd. Een vis uit de bibliotheek verwijderen laat al geplaatste
vissen in de actieve sessie staan.

## Lokale opslag en beperkingen

Gebruik steeds dezelfde website en browser. Een andere Codespaces-URL, een
ander apparaat of het wissen van browsergegevens heeft een aparte of lege
collectie. Bewaar deelbestanden als reservekopie. De browser kan je
Downloads-map niet automatisch doorzoeken; selecteer oudere bestanden eenmaal.
Deze versie heeft geen openbare cloudcatalogus en uploadt geen GLB naar Firebase.

## Verificatie

`npm test` bevat controles op GLB-integriteit, externe bronnen, overdracht van
verflagen en het hernoemen zonder modelverlies. De browsercontrole
`node scripts/test-fish-library-browser.mjs` gebruikt Playwright en vervangt
Firebase door een testadapter. Ze controleert bewaren/herladen, verfherstel,
delen tussen twee browsercollecties, deduplicatie, zoeken, favorieten,
plaatsing in de oceaan, bezoekersrechten en mobiele weergave.
