export type ProductSource =
  | {
      kind: 'open_food_facts';
      barcode: string;
      lastModifiedISO: string;
      revisionId?: number;
      url: string;
    }
  | {
      kind: 'vision_ocr';
      model: string;
      capturedAtISO: string;
    }
  | {
      kind: 'manual';
      enteredAtISO: string;
    };

export interface NutritionPer100g {
  energyKcal?: number;
  energyKj?: number;
  fat?: number;
  saturatedFat?: number;
  carbs?: number;
  sugar?: number;
  fiber?: number;
  protein?: number;
  salt?: number;
}

export type Basis = 'per_100g' | 'per_100ml';

export interface Product {
  productName?: string;
  brand?: string;
  ingredientsText?: string;
  ingredientsLanguage?: string;
  imageUrl?: string;
  // OFF taxonomy tags, e.g. "en:beverages", "en:dairies"
  categoryTags: string[];
  nutrition: NutritionPer100g;
  basis: Basis;
  servingSize?: { value: number; unit: 'g' | 'ml' };
  source: ProductSource;
}

export type Band = 'green' | 'amber' | 'red';

export type Nutrient = 'salt' | 'sugar' | 'saturatedFat' | 'fiber';

export interface NutrientFinding {
  nutrient: Nutrient;
  labelDa: string;
  value: number | null;
  band: Band;
  rationaleDa: string;
}

export type Verdict = 'proof' | 'moderate' | 'warning' | 'unknown';

export interface ScoreResult {
  verdict: Verdict;
  headlineDa: string;
  subheadDa: string;
  findings: NutrientFinding[];
  appliedRulesVersion: string;
  appliedCategory: 'food' | 'beverage';
  basis: Basis;
}
