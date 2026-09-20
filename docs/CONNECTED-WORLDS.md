# Verbonden oceaanwerelden — eerste werkende reis

Deze ontwikkelversie bouwt voort op de gepubliceerde `index.html` van commit
`9a34c61b373a781c9d404cf961a062b344bfd388`. Bestaande rif-, vis- en microlevenmodules blijven gebruikt.

## Gebruik

1. Open je opgeslagen wereld en wacht tot Firebase is verbonden.
2. Kies **Werelden & doorgangen**. Plak de gedeelde link of ID van een andere bestaande wereld.
3. Kies een vrije zijde en druk **Verbind bezoekwereld**.
4. Klik de doorgang onder het formulier, klik vervolgens op het water en zwem met W door.
5. In de buurwereld kun je dezelfde route terugnemen. De atlas kan een direct aangrenzende wereld ook meteen openen.

De bezoekkaart is lokaal op dit apparaat opgeslagen. Het verbinden verandert geen
wereldgegevens of posities van andere eigenaren in Firebase. Eigen onopgeslagen
bouwwerken blijven in het geheugen tijdens deze browsersessie bewaard, ook bij een
heen- en terugreis. Bewaar je werk online of exporteer het voordat je het tabblad sluit.

## Uitgevoerd

- Eén vaste flat-top hexagon: radius 144, binnenoppervlakte 90%, overgangsband 10%.
- Zes aansluitzijden via axiale coördinaten, zonder dubbele posities in de bezoekkaart.
- Vooraf laden bij een nabijgelegen doorgang en opnieuw lezen bij binnenkomst.
- Wereldwissel zonder paginaverversing; dezelfde kijkrichting en corresponderende tegenoverliggende ingang.
- Een korte waterovergang maskeert het opbouwen van de bestemming.
- Gemeenschappelijke bodemhoogtes in de overgangsband; eigen bodemfunctie blijft binnen het bouwgebied behouden.
- Maximaal zeven opgehaalde wereldrecords; eigen concepten afzonderlijk begrensd en nooit stilzwijgend verwijderd.
- Mislukte reis laat de huidige wereld intact; mislukte activering probeert de bronwereld terug te zetten.
- Bouwknoppen uitgeschakeld bij bezoek; bestaande Firebase-eigenaarsregels blijven de grens voor online wijzigingen.
- Scrollbaar bouwmenu en atlasformulier. Typen in formulieren beweegt de camera niet.
- Atlas, minimap en bouwkaart gebruiken noord boven en oost rechts. Kaartklikken en de kijkpijl volgen dezelfde richting.
- A beweegt links en D rechts tijdens vrij zwemmen, vis/school volgen en bouwen. Overschakelen naar bouwen stopt de volgcamera.
- Diepe geulen blijven bereikbaar: de ondergrens van de zwemcamera volgt de bodem.
- Opslaan behoudt de bestaande zichtbaarheid; linkwerelden worden niet automatisch in een openbare index geplaatst.

## Afbakening

Dit is de eerste reis tussen twee opgeslagen werelden, geen afgerond gezamenlijk wereldregister.
De bestaande opgeslagen versies 1–4 blijven leesbaar. Werelden worden nog als complete
records gelezen/opgeslagen; chunkopslag is nog niet toegevoegd.

Eén wereld heeft tegelijk zijn volledige landschap en simulatie actief. Bij buren is
voorlopig alleen de bodem zichtbaar. De bestaande algemene basisomgeving en normale
vispopulatie blijven onderdeel van de simulator; vrije vissen migreren nog niet tussen
werelden. Alleen de al bestaande orka-/walvisgegevens worden per opgeslagen wereld hersteld.
De overgangsbodem is gebaseerd op de momenteel beschikbare buurrecords en wordt bijgewerkt
wanneer extra buren worden geladen. De exacte geometrische aansluiting is getest; er is
nog geen meting van vloeiendheid op de werkcomputer van de gebruiker.

Nieuwe leesaanvragen omzeilen onze eigen voorlaadcache. De Firebase SDK kan bij een
mislukte serververbinding echter zelf terugvallen op eerder gelezen gegevens; daarom is
dit geen gegarandeerde servercontrole van gewijzigde leesrechten. Zie de officiële
[Firebase-documentatie over eenmalig lezen](https://firebase.google.com/docs/database/web/read-and-write#read_data_once).
Er wordt bij reizen niets naar Firebase geschreven.

De regels in `database.rules.json` ondersteunen eigenaarschap en het lezen van gedeelde
wereldlinks. Ze ondersteunen nog geen gezamenlijk atlasregister of bijdragersrollen.
Deze wijziging past die regels niet aan. De anonieme gebruikersidentiteit is bovendien
apparaatgebonden; duurzaam eigenaarschap over meerdere apparaten vereist een accountkoppeling.

## Volgende fasen

| Fase | Uitwerking | Controle voor afronding |
| --- | --- | --- |
| 1–3: basisreis | Hexagonmaat, twee werelden, overgangsbodem, terugreis | Gereed in deze ontwikkelversie; geautomatiseerd en in Chromium met testdata getest |
| 4: gezamenlijke atlas | Openbare metadata, eigen privéoverzicht, unieke posities atomair reserveren, serverrevisies | Twee gebruikers kunnen nooit dezelfde positie reserveren; private werelden lekken niet |
| 5: verbindingen | Tien doorgangstypen, instemming van beide eigenaren, bevriezen en terugzetten, deterministische aansluitingen | Gedeelde verbinding blijft gelijk voor beide gebruikers en tijdens gelijktijdige wijzigingen |
| 6: samenwerken | Toevoegen, wijzigen en verwijderen als afzonderlijke rechten; serverregels en revisieconflicten | Bijdrager kan toevoegen maar niets verwijderen zonder recht; emulator test beide accounts |
| 7: schaal en landschap | Opslag/laden in stukken, naburige begroeiing, vloeiende objectovergangen | Beperkt geheugen en netwerkverkeer; geen zichtbare vierkante begroeiingsgrenzen |

## Validatie

`npm test`: 130 geslaagde tests, met scenario's voor alle
zijden, gedeelde randen/driehoekspunten, oud formaat, rechtenfouten, behoud van concepten,
rollback, dubbele reisaanvragen, timeout en begrensde cache.

`scripts/test-community-browser.mjs`: echte `index.html` en Three.js in Chromium,
met een afgevangen Firebase-adapter en twee expliciete testwerelden. Controleert
heen/terug, richting, tegenoverliggende ingang, diepe bodem, bezoekersknoppen, geweigerde
toegang, behoud van eigen wijzigingen, desktopmenu en mobiel atlasformulier. Ook gecontroleerd: vier kijkrichtingen bij vrij zwemmen, links/rechts rond vis én school, alle kwadranten in de bouwkaart, kaartteleport en W over de noordgrens. Geen
browserfouten en nul databasewrites. Dit is geen test tegen de productie-Firebase.

Uitvoeren met Playwright en Chromium beschikbaar:

```sh
node scripts/test-community-browser.mjs
```

`PLAYWRIGHT_MODULE` kan naar een geïnstalleerde Playwright-module verwijzen. Voor een
serverless Chromium-bundel zijn `CHROMIUM_MODULE` en `CHROMIUM_BUNDLE` optioneel.
Het script maakt screenshots en `browser-result.json` in `docs/community-review/`.
Met `OCEAN_BROWSER_ARTIFACTS` kun je een andere uitvoermap instellen.
