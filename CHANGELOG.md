# Changelog

## [Unreleased]

### Added
- Cloudflare Worker proxy for vision OCR with server-side daily quota.
- Onboarding flow + Settings screen with attribution and privacy summary.
- Freemium model: free barcode scans, 3 vision OCR/day, FoodProof Pro
  unlocks unlimited vision and full history.
- Persistent scan history with verdict pills.
- Manual barcode entry fallback with GTIN check-digit validation.
- Open Food Facts as the primary product-data source; Claude vision OCR
  retained as fallback.
- Versioned thresholds JSON with per-category rules (food vs. beverage).

### Changed
- Result screen now cites the data source (OFF revision date or Claude
  model), the rule version, and the underlying Sundhedsstyrelsen /
  Nøglehullet sources.
- Verdict copy avoids implying Sundhedsstyrelsen has approved individual
  products.

## [0.1.0]

### Added
- Initial Expo SDK 52 scaffold realising the vision in `docs/vision.md`:
  scan a Danish food label, cross-reference with De Officielle Kostråd,
  return a Proof / Warning verdict.
