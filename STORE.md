# FoodProof DK — Store listing notes

Reference material for the App Store / Play Store submission. **Replace
placeholders with finalised copy before submitting.**

## Pitch

**Tagline:** Scan, og se om varen passer med De Officielle Kostråd.

**Subtitle (iOS, 30 chars):** Sundhed på stregkoden.

## Long description (DA)

```
FoodProof DK fortæller dig på et øjeblik, om en dansk fødevare passer
med Sundhedsstyrelsens officielle kostråd.

Sådan virker det:
• Scan stregkoden — vi slår produktet op i Open Food Facts.
• Vi sammenligner salt, sukker og mættet fedt med de tærskler, som
  Sundhedsstyrelsen og Fødevarestyrelsen anvender til Nøglehulsmærket.
• Du får et grønt, gult eller rødt signal pr. næringsstof, og en samlet
  vurdering du kan bruge i butikken.

Hvis stregkoden ikke er kendt, kan du fotografere bagsiden — så aflæser
vi næringsdeklarationen for dig.

FoodProof Pro:
• Ubegrænset etiket-fotografering
• Fuld scan-historik (op til 500 produkter)
• Allergen- og tilsætningsstof-advarsler
• Daglig oversigt over salt, sukker og mættet fedt
• Sammenlign to produkter side om side
• Eksportér historik som CSV

Vejledende. Erstatter ikke individuelle kostråd fra sundhedsfaglige
personer.
```

## Keywords (iOS, 100 chars total)

```
sundhed,kost,sundhedsstyrelsen,nøglehullet,kostråd,scan,stregkode,næring,salt,sukker,fødevarer,opskrift
```

## Categories

- Primary: Health & Fitness
- Secondary: Food & Drink

## Age rating

4+ (no objectionable content). Note that vision OCR sends user-supplied
images to a third-party (Anthropic) and you must declare third-party data
sharing accordingly.

## Required screenshots (per platform)

1. Hero / home screen
2. Barcode scanning view
3. Result with green verdict (Sundhedsstyrelsen-godkendt look)
4. Result with red verdict + nutrient breakdown
5. History list
6. Paywall (annual highlighted)
7. Settings / sources

## Required URLs

- Privacy policy: hosted version of `PRIVACY.md`
- Support: `mailto:support@foodproof.dk` (placeholder)
- Marketing: optional landing page

## App Store privacy nutrition labels

| Data category | Collected | Linked to user | Used for tracking |
|---|---|---|---|
| Purchases (subscription state) | Yes (RevenueCat) | No (anonymous user ID) | No |
| Diagnostics | No | – | – |
| Usage Data | No | – | – |
| Identifiers | "User ID" — anonymous device + RevenueCat ID | No | No |
| Photos (label OCR) | Used in-session, not stored | No | No |

## Google Play Data safety

| Data type | Collected | Shared | Required |
|---|---|---|---|
| Photos and videos (label image) | Yes | Yes (Anthropic, processing only) | Optional — only when user fotografs an etiket |
| App activity (purchases) | Yes | Yes (RevenueCat, billing) | Required |
| App info and performance | No | – | – |

## Versioning

- iOS bundle id: `dk.foodproof.app`
- Android package: `dk.foodproof.app`
- Version source of truth: `expo.version` in `app.json`
- Build number: bump `expo.ios.buildNumber` and
  `expo.android.versionCode` per build via EAS.
