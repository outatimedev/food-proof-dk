import { classifyCategory, NUTRIENT_LABEL_DA, rules } from './rules';
import {
  Band,
  NutrientFinding,
  Product,
  ScoreResult,
  Verdict,
} from './types';

function bandFor(value: number, amberAt: number, redAt: number): Band {
  if (value >= redAt) return 'red';
  if (value >= amberAt) return 'amber';
  return 'green';
}

// Sanity check: catch obvious extraction errors before scoring. Real food
// can't have, say, 80g of salt per 100g; values like that almost always come
// from OCR misreads (e.g. "0.8" parsed as "8.0").
function isPlausible(nutrient: 'salt' | 'sugar' | 'saturatedFat', value: number): boolean {
  if (value < 0) return false;
  if (nutrient === 'salt' && value > 50) return false;
  if (nutrient === 'sugar' && value > 100) return false;
  if (nutrient === 'saturatedFat' && value > 100) return false;
  return true;
}

function rationale(
  nutrient: 'salt' | 'sugar' | 'saturatedFat',
  value: number,
  band: Band,
  amberAt: number,
  redAt: number,
  basisLabel: string,
): string {
  switch (band) {
    case 'green':
      return `${value.toFixed(2)} g${basisLabel} — lavt indhold (under ${amberAt} g).`;
    case 'amber':
      return `${value.toFixed(2)} g${basisLabel} — moderat indhold (${amberAt}–${redAt} g).`;
    case 'red':
      return `${value.toFixed(2)} g${basisLabel} — højt indhold (over ${redAt} g).`;
  }
}

export function scoreProduct(product: Product): ScoreResult {
  const category = classifyCategory(product.categoryTags);
  const cat = rules.categories[category];
  const basisLabel = category === 'beverage' ? '/100 ml' : '/100 g';

  const findings: NutrientFinding[] = [];

  for (const nutrient of ['salt', 'sugar', 'saturatedFat'] as const) {
    const value = product.nutrition[nutrient];
    const t = cat.thresholds[nutrient];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      findings.push({
        nutrient,
        labelDa: NUTRIENT_LABEL_DA[nutrient],
        value: null,
        band: 'amber',
        rationaleDa: 'Ikke fundet på etiketten.',
      });
      continue;
    }

    if (!isPlausible(nutrient, value)) {
      findings.push({
        nutrient,
        labelDa: NUTRIENT_LABEL_DA[nutrient],
        value,
        band: 'amber',
        rationaleDa: `Mistænkelig værdi (${value.toFixed(2)} g${basisLabel}). Prøv at scanne igen.`,
      });
      continue;
    }

    const band = bandFor(value, t.amberAt, t.redAt);
    findings.push({
      nutrient,
      labelDa: NUTRIENT_LABEL_DA[nutrient],
      value,
      band,
      rationaleDa: rationale(nutrient, value, band, t.amberAt, t.redAt, basisLabel),
    });
  }

  // Fibre is bonus information (food only — Nøglehullets whole-grain criterion
  // is per 100g of dry food).
  if (
    category === 'food' &&
    typeof product.nutrition.fiber === 'number' &&
    Number.isFinite(product.nutrition.fiber)
  ) {
    const fiber = product.nutrition.fiber;
    findings.push({
      nutrient: 'fiber',
      labelDa: NUTRIENT_LABEL_DA.fiber,
      value: fiber,
      band: fiber >= rules.fiberBonusPer100g ? 'green' : 'amber',
      rationaleDa:
        fiber >= rules.fiberBonusPer100g
          ? `${fiber.toFixed(1)} g/100 g — opfylder Nøglehullets fuldkornskriterium (≥ ${rules.fiberBonusPer100g} g).`
          : `${fiber.toFixed(1)} g/100 g — under Nøglehullets fuldkornskriterium (${rules.fiberBonusPer100g} g).`,
    });
  }

  const reds = findings.filter((f) => f.band === 'red').length;
  const knownPrimary = findings.filter(
    (f) => f.value !== null && f.nutrient !== 'fiber',
  ).length;
  const greens = findings.filter(
    (f) => f.band === 'green' && f.nutrient !== 'fiber',
  ).length;

  let verdict: Verdict;
  let headlineDa: string;
  let subheadDa: string;

  if (knownPrimary === 0) {
    verdict = 'unknown';
    headlineDa = 'Ingen næringsdata fundet';
    subheadDa = 'Vi kunne ikke aflæse næringsindholdet. Prøv at scanne stregkoden eller bagsiden igen.';
  } else if (reds > 0) {
    verdict = 'warning';
    headlineDa = 'Spis sjældent';
    subheadDa =
      reds === 1
        ? 'Ét næringsstof er over Sundhedsstyrelsens anbefalede grænse.'
        : `${reds} næringsstoffer er over Sundhedsstyrelsens anbefalede grænser.`;
  } else if (greens === knownPrimary) {
    verdict = 'proof';
    headlineDa = 'Et grønt valg';
    subheadDa = 'Alle målte næringsstoffer ligger inden for De Officielle Kostråds anbefalinger.';
  } else {
    verdict = 'moderate';
    headlineDa = 'Spis med måde';
    subheadDa = 'Produktet ligger i det moderate område for et eller flere næringsstoffer.';
  }

  return {
    verdict,
    headlineDa,
    subheadDa,
    findings,
    appliedRulesVersion: rules.version,
    appliedCategory: category,
    basis: cat.basis,
  };
}
