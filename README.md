# FoodProof DK

Expo (React Native) app that tells Danish consumers whether a food product
fits **De Officielle Kostråd** — Sundhedsstyrelsen's official dietary
guidelines.

Vision: [`docs/vision.md`](docs/vision.md). Architecture rationale lives in
the commit log; the iterations were planned and shipped end to end with each
commit standing alone.

## Architecture at a glance

```
                  Camera (barcode)                Camera (label fallback)
                        │                                   │
                        ▼                                   ▼
              Open Food Facts API                Cloudflare Worker proxy
              (free, deterministic)            ┌─────────────────────────┐
                        │                      │ • RevenueCat Pro check  │
                        │                      │ • KV daily quota (3/d)  │
                        │                      │ • Anthropic key holder  │
                        ▼                      └────────────┬────────────┘
                ┌──────────────────┐                        │
                │   Product type   │◀───────────────────────┘
                │ (source-tagged)  │
                └────────┬─────────┘
                         ▼
             scoring engine (pure function)
             reads assets/rules.v1.json
                         ▼
                ┌──────────────────┐
                │  Verdict result  │ — cites rule version + data source
                └──────────────────┘
```

### Why barcode-first

Reading a curved back-of-pack photo with vision OCR is the worst data path
available: 3–10 seconds, ~1–5¢ per call, hallucinatable, no shared cache.
Every EU package has a GTIN that deterministically resolves to nutrition
data via Open Food Facts — free, sub-second, with strong Nordic coverage.
Vision OCR is the fallback for products OFF doesn't know yet.

### Why a server proxy

`EXPO_PUBLIC_*` env vars get bundled into the JS and are extractable from
any installed app. A direct Anthropic call from the device is an open
invoice. The Worker in `proxy/` holds the key, validates Pro entitlement
via the RevenueCat REST API, and enforces the free-tier quota in KV.

### Why versioned rules JSON

`assets/rules.v1.json` is the single source of truth for thresholds. Each
verdict records the rule version it was scored under, so when
Sundhedsstyrelsen revises the kostråd we ship a new file via Expo OTA and
old verdicts remain explainable.

## Stack

- **Expo SDK 52** (typed routes, expo-router 4, new architecture on)
- **expo-camera** with built-in barcode scanner (no extra native modules)
- **AsyncStorage** for history, onboarding flag, deviceId, dev Pro toggle
- **react-native-purchases** (RevenueCat) for Pro entitlement; transparent
  in-memory dev stub when keys aren't configured
- **Cloudflare Workers + KV** for the vision proxy
- **Claude Opus 4.7 vision** for label OCR (proxied)
- **Open Food Facts** for primary nutrition lookup

## Getting started

```sh
npm install
cp .env.example .env
```

Two ways to run vision OCR:

1. **Production mode (recommended).** Deploy the proxy in `proxy/` (see
   [`proxy/README.md`](proxy/README.md)) and set
   `EXPO_PUBLIC_API_BASE_URL=https://your-worker.workers.dev` in `.env`.
2. **Dev mode (key on the device, fine for the simulator).** Set
   `EXPO_PUBLIC_ANTHROPIC_API_KEY` instead. **Do not ship a build with
   this set** — keys in `EXPO_PUBLIC_*` are extractable from the bundle.

Then:

```sh
npm start          # Expo dev server, then press i / a
```

For Pro IAP development, the app falls back to an in-memory toggle so you
can test entitlement-gated features without a sandbox account. Use the
"Simulér Pro" switch under Settings → Udvikler. Once you add real
RevenueCat keys to `app.json` (`extra.revenueCatIosKey` and
`extra.revenueCatAndroidKey`) the dev toggle disappears automatically.

## How scoring works

Per 100 g (food) or per 100 ml (beverages, detected from OFF category
tags), each measured nutrient gets a traffic-light band:

| Nutrient | Green (lavt) | Amber | Red (højt) |
|---|---|---|---|
| Salt (food) | < 0.3 g | 0.3 – 1.5 g | > 1.5 g |
| Sugar (food) | < 5 g | 5 – 22.5 g | > 22.5 g |
| Saturated fat (food) | < 1.5 g | 1.5 – 5 g | > 5 g |
| Sugar (beverage) | < 2.5 g | 2.5 – 11.25 g | > 11.25 g |
| Fibre (bonus) | ≥ 6 g | < 6 g | – |

Verdict roll-up:

- **Et grønt valg** — every measured nutrient is green
- **Spis med måde** — at least one amber, no red
- **Spis sjældent** — at least one red
- **Ingen næringsdata fundet** — nothing parseable

Implausible OCR readings (e.g. salt > 50 g/100 g) are flagged amber with a
"prøv at scanne igen" rationale instead of being scored as red.

## Freemium

- **Free** — unlimited barcode scans, 3 vision OCR scans/day, 14-day
  history.
- **Pro** — unlimited vision OCR, 500-item history, plus future allergens
  / daily intake / comparison features.

Quota is the only metered surface because vision is the only path that
costs us per-scan. It's pre-checked client-side (UX) and enforced
server-side (truth) in the proxy's KV store.

## Project layout

```
app/                         expo-router screens
  _layout.tsx                Stack + onboarding gate + entitlement init
  index.tsx                  Home
  onboarding.tsx             4-slide first-launch
  scan.tsx                   Barcode + etiket modes
  manual.tsx                 Manual GTIN entry fallback
  result.tsx                 Verdict + sources + history write
  history.tsx                Persistent scan list
  paywall.tsx                Pro plans + restore
  settings.tsx               Pro state, history, sources, dev toggle
src/
  lib/
    types.ts                 Source-tagged Product, Band, Verdict
    rules.ts                 Loader + food/beverage classifier
    openfoodfacts.ts         OFF v2 API client + typed errors
    analyze.ts               Proxy/direct vision call + parsing
    scoring.ts               Pure scoring engine
    history.ts               AsyncStorage history + dedup
    quota.ts                 Local daily vision counter (advisory)
    entitlement.ts           RevenueCat wrapper + dev stub
    device.ts                Stable per-install ID
    onboarding.ts            First-launch flag
    errors.ts                classify() + GTIN validator
  components/
    ErrorCard.tsx            Shared red error card
  theme.ts                   Colours + radii
assets/
  rules.v1.json              Versioned thresholds
proxy/
  worker.ts                  Cloudflare Worker
  wrangler.toml              Deploy config
  README.md                  Deploy instructions
```

## Pre-ship checklist

- [ ] Replace placeholder support email in `PRIVACY.md`
- [ ] Generate real icon / splash / adaptive icon (see `assets/README.md`)
- [ ] Configure RevenueCat: products, offerings, App Store and Play
      Console signing keys; paste public keys into `app.json` extra
- [ ] Deploy the Worker; set its URL in `.env` for production builds
- [ ] Run a TestFlight + internal Play track build via EAS; verify:
      barcode scan, OFF lookup, vision OCR (free + Pro paths), purchase
      flow, restore, paywall on quota exceeded, history, onboarding
- [ ] App Store privacy nutrition labels per `STORE.md`
- [ ] Google Play data safety per `STORE.md`

## Disclaimer

Vejledende. Erstatter ikke individuelle kostråd fra sundhedsfaglige
personer.

## Licences

- Open Food Facts data: CC-BY-SA 3.0 — credited in the in-app Settings
  screen and on the result screen.
- App code: see `LICENSE` (TODO before public release).
