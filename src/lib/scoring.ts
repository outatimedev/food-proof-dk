import {
  Band,
  FIBER_BONUS_PER_100G,
  LOWER_IS_BETTER,
  NUTRIENT_LABEL_DA,
  Nutrient,
} from './guidelines';

export interface NutritionPer100g {
  salt?: number;
  sugar?: number;
  saturatedFat?: number;
  fiber?: number;
}

export interface ExtractedLabel {
  productName?: string;
  brand?: string;
  ingredientsDa?: string;
  nutritionPer100g: NutritionPer100g;
  notes?: string;
}

export interface NutrientFinding {
  nutrient: Nutrient;
  labelDa: string;
  valuePer100g: number | null;
  band: Band;
  rationaleDa: string;
}

export type Verdict = 'proof' | 'moderate' | 'warning' | 'unknown';

export interface ScoreResult {
  verdict: Verdict;
  headlineDa: string;
  subheadDa: string;
  findings: NutrientFinding[];
}

function bandFor(value: number, nutrient: Exclude<Nutrient, 'fiber'>): Band {
  const t = LOWER_IS_BETTER[nutrient];
  if (value >= t.red) return 'red';
  if (value >= t.amber) return 'amber';
  return 'green';
}

function rationale(nutrient: Nutrient, value: number, band: Band): string {
  if (nutrient === 'fiber') {
    return value >= FIBER_BONUS_PER_100G
      ? `${value.toFixed(1)} g/100g — opfylder Nøglehullets fuldkornskriterium (≥ ${FIBER_BONUS_PER_100G} g).`
      : `${value.toFixed(1)} g/100g — under Nøglehullets fuldkornskriterium (${FIBER_BONUS_PER_100G} g).`;
  }
  const t = LOWER_IS_BETTER[nutrient];
  switch (band) {
    case 'green':
      return `${value.toFixed(2)} g/100g — lavt indhold (under ${t.amber} g).`;
    case 'amber':
      return `${value.toFixed(2)} g/100g — moderat indhold (${t.amber}–${t.red} g).`;
    case 'red':
      return `${value.toFixed(2)} g/100g — højt indhold (over ${t.red} g).`;
  }
}

export function scoreLabel(label: ExtractedLabel): ScoreResult {
  const findings: NutrientFinding[] = [];
  const n = label.nutritionPer100g;

  for (const nutrient of ['salt', 'sugar', 'saturatedFat'] as const) {
    const value = n[nutrient];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const band = bandFor(value, nutrient);
      findings.push({
        nutrient,
        labelDa: NUTRIENT_LABEL_DA[nutrient],
        valuePer100g: value,
        band,
        rationaleDa: rationale(nutrient, value, band),
      });
    } else {
      findings.push({
        nutrient,
        labelDa: NUTRIENT_LABEL_DA[nutrient],
        valuePer100g: null,
        band: 'amber',
        rationaleDa: 'Ikke fundet på etiketten.',
      });
    }
  }

  if (typeof n.fiber === 'number' && Number.isFinite(n.fiber)) {
    findings.push({
      nutrient: 'fiber',
      labelDa: NUTRIENT_LABEL_DA.fiber,
      valuePer100g: n.fiber,
      band: n.fiber >= FIBER_BONUS_PER_100G ? 'green' : 'amber',
      rationaleDa: rationale('fiber', n.fiber, 'green'),
    });
  }

  const reds = findings.filter((f) => f.band === 'red').length;
  const greens = findings.filter(
    (f) => f.band === 'green' && f.nutrient !== 'fiber',
  ).length;
  const known = findings.filter(
    (f) => f.valuePer100g !== null && f.nutrient !== 'fiber',
  ).length;

  let verdict: Verdict;
  let headlineDa: string;
  let subheadDa: string;

  if (known === 0) {
    verdict = 'unknown';
    headlineDa = 'Ingen næringsdata fundet';
    subheadDa = 'Vi kunne ikke aflæse næringsindholdet. Prøv at tage et nyt billede af bagsiden.';
  } else if (reds > 0) {
    verdict = 'warning';
    headlineDa = 'Advarsel';
    subheadDa =
      reds === 1
        ? '1 næringsstof overskrider Sundhedsstyrelsens anbefalede grænse.'
        : `${reds} næringsstoffer overskrider Sundhedsstyrelsens anbefalede grænser.`;
  } else if (greens === known) {
    verdict = 'proof';
    headlineDa = 'Sundhedsstyrelsen-godkendt';
    subheadDa = 'Alle målte næringsstoffer ligger inden for de officielle anbefalinger.';
  } else {
    verdict = 'moderate';
    headlineDa = 'Spis med måde';
    subheadDa = 'Produktet ligger i det moderate område for et eller flere næringsstoffer.';
  }

  return { verdict, headlineDa, subheadDa, findings };
}
