import rulesData from '../../assets/rules.v1.json';
import { Basis, Nutrient } from './types';

export interface ThresholdBand {
  amberAt: number;
  redAt: number;
  unit: 'g';
}

export interface CategoryRules {
  basis: Basis;
  thresholds: Record<Exclude<Nutrient, 'fiber'>, ThresholdBand>;
}

export interface Rules {
  version: string;
  effectiveFrom: string;
  framework: string;
  sources: Array<{ name: string; url: string }>;
  categories: {
    food: CategoryRules;
    beverage: CategoryRules;
  };
  fiberBonusPer100g: number;
  dailyReference: {
    saltMaxG: number;
    addedSugarMaxPctEnergy: number;
    saturatedFatMaxPctEnergy: number;
  };
}

export const rules: Rules = rulesData as Rules;

export const NUTRIENT_LABEL_DA: Record<Nutrient, string> = {
  salt: 'Salt',
  sugar: 'Sukker',
  saturatedFat: 'Mættet fedt',
  fiber: 'Kostfibre',
};

const BEVERAGE_TAGS = [
  'en:beverages',
  'en:non-alcoholic-beverages',
  'en:sodas',
  'en:waters',
  'en:juices',
  'en:plant-based-milks',
  'en:milks',
  'en:dairy-drinks',
];

// Best-effort food-vs-beverage classification from Open Food Facts category
// tags. Falls back to "food" — the safer default for consumer guidance since
// food thresholds are stricter per absolute mass.
export function classifyCategory(categoryTags: string[] = []): 'food' | 'beverage' {
  const lower = categoryTags.map((t) => t.toLowerCase());
  return lower.some((t) => BEVERAGE_TAGS.includes(t)) ? 'beverage' : 'food';
}
