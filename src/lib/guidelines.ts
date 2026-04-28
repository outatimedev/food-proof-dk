// Per-100g thresholds derived from Sundhedsstyrelsen's "De Officielle Kostråd"
// and the Nordic Nøglehullet (Keyhole) criteria administered with
// Fødevarestyrelsen. Values are aligned with the FSA traffic-light bands the
// Danish authorities reference for consumer guidance.
//
// Sources:
//   - Sundhedsstyrelsen, De Officielle Kostråd (2021)
//   - Fødevarestyrelsen, Nøglehulsmærket (BEK nr 159 af 24/02/2015 with
//     subsequent amendments)

export type Nutrient = 'salt' | 'sugar' | 'saturatedFat' | 'fiber';

export type Band = 'green' | 'amber' | 'red';

export interface Threshold {
  // Lower bound (inclusive) at which the band applies, in grams per 100g.
  green: number;
  amber: number;
  // Anything >= red is considered red.
  red: number;
}

export const NUTRIENT_LABEL_DA: Record<Nutrient, string> = {
  salt: 'Salt',
  sugar: 'Sukker',
  saturatedFat: 'Mættet fedt',
  fiber: 'Kostfibre',
};

// Lower-is-better thresholds (per 100g).
export const LOWER_IS_BETTER: Record<
  Exclude<Nutrient, 'fiber'>,
  Threshold
> = {
  salt: { green: 0, amber: 0.3, red: 1.5 },
  sugar: { green: 0, amber: 5, red: 22.5 },
  saturatedFat: { green: 0, amber: 1.5, red: 5 },
};

// Higher-is-better threshold for fibre (Nøglehullet whole-grain criterion).
export const FIBER_BONUS_PER_100G = 6;

// Daily reference intakes from De Officielle Kostråd, used for context strings.
export const DAILY_REFERENCE = {
  saltMaxG: 6,
  addedSugarMaxPctEnergy: 10,
  saturatedFatMaxPctEnergy: 10,
};
