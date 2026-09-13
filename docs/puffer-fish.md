# Kogelvis: opblazen bij klik en orka

De lichtblauwe standaardsoort (`reef_4`) krijgt een kogelvismodel met een
beige-olijfgroene gevlekte huid, lichte buik, grote ogen en korte stekeltjes.
De vaste scène bevat vijf exemplaren; de populatie groeit niet.

Klikken laat hem in ongeveer 1,2 seconde opblazen. Vanaf de klik blijft het
opblaasdoel 120 seconden actief; daarna loopt hij in 30 seconden vloeiend leeg.
Opnieuw klikken herstart de wachttijd. Opgeblazen zwemt hij trager.

Een levende orka binnen circa acht meter activeert dezelfde reactie. Dit is
afstand tot de begrenzingsdoos van de orka, niet alleen tot zijn middelpunt.
Een marge tot tien meter voorkomt snel wisselen van de dreigingsstatus.
Zolang de orka dichtbij blijft, wordt de wachttijd verlengd. Na zijn vertrek
volgen twee minuten wachten en langzaam leeglopen.

## Testen in Codespaces

Stop de server met Ctrl+C en voer uit:

```sh
git pull --ff-only origin feature/visual-water-light
npx serve .
```

Ververs met Ctrl+Shift+R. Open eventueel `?scene=reference`, kies Nieuwe
onderwatersfeer en klik **Animatie starten**. Klik **Bekijk kogelvis**, daarna
op zijn lichaam. Pauzeren bevriest ook het opblazen en de timer.

Controleer de bolle vorm en de ogen. Wacht ruim twee minuten en bekijk het
leeglopen. Plaats vervolgens een orka en bekijk de reactie wanneer hij nadert.
Een dode, verwijderde of ver weg zwemmende orka veroorzaakt geen nieuwe reactie.

## Controle en grenzen

57 lokale tests slagen, inclusief timers, herhaald klikken, dreiging, pauze,
vormverandering, oogaanhechting, groeiende water-/contactgrenzen, afstandsdetail
en opruimen. De hoofdpagina en module zijn syntactisch gecontroleerd.

Uiterlijk, aanklikken in de browser, FPS en contact met complex koraal moeten
nog visueel worden beoordeeld. Rotsvrijstand is een benadering; opblazen in een
nauwe spleet kan nog onvolkomenheden tonen. De tijdelijke opblaasstatus wordt
niet bewaard bij herladen. Firebase-configuratie en wereldformaat zijn ongewijzigd.
