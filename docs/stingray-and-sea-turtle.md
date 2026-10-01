# Rog en reuzenschildpad

Via het bestaande grafische menu kan de eigenaar één rog en één reuzenschildpad
plaatsen, volgen en verwijderen. Volgen kan ook als bezoeker; wijzigen blijft
achter de bestaande wereldrechten. Plaatsing zoekt eerst dichtbij de camera,
met vrije zwemruimte vooruit. Als er geen veilige plek is verschijnt een melding.

De rog heeft een gesloten, afgeronde schijf met roomkleurige onderzijde,
blauwgrijze bovenzijde, fijne stippen, ogen en spiracula. Een vertexshader laat
een golf door de vinranden lopen; de gelede staart volgt licht mee. De schildpad
heeft een vast schild met gebogen schubplaten, een afzonderlijke buik, beweegbare
kop, twee voorflippers en twee achterflippers. Flipperslagen wisselen in kracht;
de vaarsnelheid varieert rustig. Periodiek zoekt de schildpad de oppervlakte op
en blijft daar kort voordat hij weer afdaalt, mits de route vrij is.

`ReefVisitors.js` maakt beide modellen zonder downloads of Blender. Cartoon en
realistisch gebruiken dezelfde vormen en animatie; de materiaalruwheid en het
subtiele huidreliëf verschillen. De grote lichaamsmeshes hebben twee detailniveaus.

`ReefVisitorNavigation.js` controleert volledige verplaatsingen en draaibewegingen
tegen nabije, afzonderlijke rotsvolumes. De rog heeft een brede lage lichaamsbox
en een smalle staartbox; de schildpad een eigen hogere box. De hoogte wordt dus
niet afgeleid van de spanwijdte. Gras blokkeert geen routes. Dit blijft een
conservatieve benadering: een visueel erg nauwe spleet kan onbruikbaar zijn.

De dieren gebruiken eigen navigatie; gewone viscohesie en voedselmigratie sturen
ze niet tegelijk. Andere vissen wijken voor hun lichaamsvolume uit. Hun vaste
spelbelasting is 3 (rog) en 4 (schildpad). Ze vallen niet onder de health-afname
of voortplanting van importvissen en verschijnen alleen na plaatsing/herstel.

Wereldformaat 4 krijgt het optionele veld `reefVisitors` met maximaal twee
records: `stingray` en `turtle`, elk met `position` en `heading`. Oude werelden
zonder dit veld blijven geldig. De bestaande wereldopslag bewaart de records;
er worden geen extra Firebase-listeners of periodieke positieschrijfacties gestart.
Verwijderen verwijdert ook het record bij de volgende keer opslaan.

Verificatie omvat geometrie, pauze, stijlen, navigatie onder overhangen, vaste
rotsen inclusief de staart, oppervlaktegedrag, valide/onvalide opslagrecords,
menubediening, bewegen naast gewone vissen, herstel en bezoekersrechten.
