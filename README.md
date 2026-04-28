# FoodProof DK

Expo (React Native) app that scans Danish food labels with the device camera
and cross-references the nutrition declaration with **Sundhedsstyrelsen's**
"De Officielle Kostråd" and the Nordic **Nøglehullet** thresholds.

See [`docs/vision.md`](docs/vision.md) for the product vision.

## Stack

- **Expo SDK 52** + expo-router (typed routes)
- **expo-camera** for label capture, **expo-image-picker** as fallback
- **Claude Opus 4.7 vision** (Messages API) for OCR + structured nutrition extraction
- Deterministic scoring engine in `src/lib/scoring.ts` against thresholds in `src/lib/guidelines.ts`

## Getting started

```sh
npm install
cp .env.example .env
# put your Anthropic API key in EXPO_PUBLIC_ANTHROPIC_API_KEY
npm start
```

Then press `i` for iOS simulator, `a` for Android, or scan the QR code with
Expo Go.

> **Security note.** `EXPO_PUBLIC_*` env vars are bundled into the JS bundle
> and visible in the shipped app. The current setup is fine for local
> development. For anything beyond that, proxy Anthropic calls through your
> own backend and keep the API key server-side.

## How scoring works

For each product the app extracts the per-100 g values for salt, sugar,
saturated fat, and fibre, and assigns each one a traffic-light band:

| Nutrient        | Green (lavt) | Amber       | Red (højt) |
|-----------------|--------------|-------------|------------|
| Salt            | < 0.3 g      | 0.3 – 1.5 g | > 1.5 g    |
| Sugar           | < 5 g        | 5 – 22.5 g  | > 22.5 g   |
| Saturated fat   | < 1.5 g      | 1.5 – 5 g   | > 5 g      |
| Fibre (bonus)   | ≥ 6 g        | < 6 g       | —          |

The verdict rolls up to:

- **Sundhedsstyrelsen-godkendt** — every measured nutrient is green.
- **Spis med måde** — moderate, no reds.
- **Advarsel** — at least one red.
- **Ingen næringsdata fundet** — nothing parseable on the label.

## Project layout

```
app/                    expo-router screens
  _layout.tsx           Stack navigator + status bar
  index.tsx             Home / welcome
  scan.tsx              Camera + library picker
  result.tsx            Verdict, per-nutrient breakdown, references
src/
  lib/
    analyze.ts          Claude vision call + JSON parsing
    guidelines.ts       Sundhedsstyrelsen / Nøglehullet thresholds
    scoring.ts          Pure scoring engine
  theme.ts              Colours + radii
docs/vision.md          Product vision
```

## Disclaimer

Vejledende. Erstatter ikke individuelle kostråd fra sundhedsfaglige personer.
