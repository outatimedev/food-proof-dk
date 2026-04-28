# FoodProof DK — Privatlivspolitik

_Senest opdateret: 2025-01-01_

FoodProof DK er designet med dataminimering som udgangspunkt. Vi indsamler og
gemmer så lidt om dig som muligt for at appen kan fungere.

## Hvad sker der lokalt på din enhed

- **Scan-historik.** Hver gang du scanner et produkt, gemmes resultatet
  (produktnavn, mærke, næringsstoffer, vurdering) på din enhed via
  AsyncStorage. Det forlader aldrig telefonen, og det synkroniseres
  ikke til andre enheder eller en server.
- **Indstillinger.** Onboarding-status og daglig vision-tæller gemmes
  lokalt på samme måde.
- **Anonym enheds-ID.** Til at håndhæve gratis-grænsen for
  etiket-fotografering genereres ét tilfældigt ID pr. installation.
  Det er ikke knyttet til navn, e-mail, eller andre konti, og det
  bruges udelukkende som tæller-nøgle.

## Hvad sendes fra din enhed

| Handling | Modtager | Hvad sendes |
|---|---|---|
| Stregkode-scan | Open Food Facts (open-food-facts.org) | Stregkoden alene. Ingen identitet. |
| Etiket-fotografering (gratis) | FoodProof-proxy → Anthropic | Billedet, dit anonyme enheds-ID, MIME-type. |
| Etiket-fotografering (Pro) | FoodProof-proxy → Anthropic | Billedet, RevenueCat-bruger-ID, MIME-type. |
| Køb af Pro | RevenueCat (revenuecat.com) | Apple/Google-kvittering, anonymt RevenueCat-bruger-ID. |

Billeder gemmes ikke på vores side. De videresendes direkte til Anthropic
til aflæsning og kasseres efterfølgende. Anthropic bruger billeder i
overensstemmelse med deres Commercial Terms of Service og bruger dem ikke
til træning af modeller.

## Hvad vi ikke gør

- Vi indsamler **ikke** personlige sundhedsdata, navn, e-mail, alder, vægt,
  IP-adresse, eller andre identifierbare oplysninger.
- Vi sender **ingen** analytics-events. Der er hverken Firebase, Amplitude,
  Sentry eller noget tilsvarende i appen.
- Vi sælger **intet** videre til tredjepart.

## Børn

Appen er ikke målrettet børn under 13. Vi indsamler bevidst ingen data om
børn.

## Sletning

- Alle lokale data ryddes ved at trykke "Ryd scan-historik" i
  Indstillinger eller ved at afinstallere appen.
- Pro-abonnementer styres af Apple App Store / Google Play. Opsig dér.
- For at få fjernet køb-historikken hos RevenueCat: kontakt
  privacy@anthropic.com (placeholder — udskift med din egen kontakt).

## Spørgsmål

Skriv til support@foodproof.dk (placeholder — udskift før udgivelse).
