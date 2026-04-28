import { Product } from './types';

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product';

// Fields we ask for explicitly. Keeps the response small and the contract
// stable against OFF schema changes.
const FIELDS = [
  'code',
  'product_name',
  'product_name_da',
  'brands',
  'ingredients_text',
  'ingredients_text_da',
  'image_front_small_url',
  'categories_tags',
  'nutriments',
  'serving_size',
  'serving_quantity',
  'quantity',
  'last_modified_t',
  'rev',
  'status',
  'status_verbose',
].join(',');

export class OpenFoodFactsNotFoundError extends Error {
  readonly code = 'off_not_found';
  constructor(public readonly barcode: string) {
    super(`Open Food Facts has no record for barcode ${barcode}`);
  }
}

export class OpenFoodFactsNetworkError extends Error {
  readonly code = 'off_network';
  constructor(message: string) {
    super(message);
  }
}

interface OFFResponse {
  status: 0 | 1;
  status_verbose?: string;
  code?: string;
  product?: {
    code?: string;
    product_name?: string;
    product_name_da?: string;
    brands?: string;
    ingredients_text?: string;
    ingredients_text_da?: string;
    image_front_small_url?: string;
    categories_tags?: string[];
    nutriments?: Record<string, number | string | undefined>;
    serving_size?: string;
    serving_quantity?: number | string;
    last_modified_t?: number;
    rev?: number;
  };
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const parsed = Number(v.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

// OFF stores salt, but some products only have sodium. Sodium → salt is x2.5.
function resolveSalt(n: Record<string, unknown>): number | undefined {
  const salt = num(n['salt_100g']);
  if (salt !== undefined) return salt;
  const sodium = num(n['sodium_100g']);
  if (sodium !== undefined) return Math.round(sodium * 2.5 * 1000) / 1000;
  return undefined;
}

function detectBasis(categoryTags: string[] | undefined): 'per_100g' | 'per_100ml' {
  // OFF nutriments_*_100g are normalised per 100g for solids, per 100ml for
  // liquids — but the suffix is always "_100g" regardless of basis. We infer
  // the user-facing basis from category tags.
  const tags = (categoryTags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes('beverages') || t.includes('drinks') || t.includes('juices'))) {
    return 'per_100ml';
  }
  return 'per_100g';
}

export async function fetchByBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<Product> {
  const url = `${OFF_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;

  let res: Response;
  try {
    res = await fetch(url, {
      signal,
      headers: {
        // OFF asks third-party clients to identify themselves.
        'User-Agent': 'FoodProofDK/0.1 (https://github.com/outatimedev/food-proof-dk)',
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw new OpenFoodFactsNetworkError(
      err instanceof Error ? err.message : 'Network unavailable',
    );
  }

  if (!res.ok) {
    if (res.status === 404) throw new OpenFoodFactsNotFoundError(barcode);
    throw new OpenFoodFactsNetworkError(`OFF responded ${res.status}`);
  }

  const json = (await res.json()) as OFFResponse;
  if (json.status !== 1 || !json.product) {
    throw new OpenFoodFactsNotFoundError(barcode);
  }

  const p = json.product;
  const n = p.nutriments ?? {};

  const productName =
    (p.product_name_da && p.product_name_da.trim()) ||
    (p.product_name && p.product_name.trim()) ||
    undefined;

  const ingredientsText =
    (p.ingredients_text_da && p.ingredients_text_da.trim()) ||
    (p.ingredients_text && p.ingredients_text.trim()) ||
    undefined;

  const ingredientsLanguage = p.ingredients_text_da ? 'da' : p.ingredients_text ? 'auto' : undefined;

  const categoryTags = p.categories_tags ?? [];
  const basis = detectBasis(categoryTags);

  const lastModifiedISO = p.last_modified_t
    ? new Date(p.last_modified_t * 1000).toISOString()
    : new Date().toISOString();

  return {
    productName,
    brand: p.brands?.split(',')[0]?.trim(),
    ingredientsText,
    ingredientsLanguage,
    imageUrl: p.image_front_small_url,
    categoryTags,
    nutrition: {
      energyKcal: num(n['energy-kcal_100g']),
      energyKj: num(n['energy_100g']),
      fat: num(n['fat_100g']),
      saturatedFat: num(n['saturated-fat_100g']),
      carbs: num(n['carbohydrates_100g']),
      sugar: num(n['sugars_100g']),
      fiber: num(n['fiber_100g']),
      protein: num(n['proteins_100g']),
      salt: resolveSalt(n as Record<string, unknown>),
    },
    basis,
    servingSize:
      typeof p.serving_quantity !== 'undefined'
        ? { value: Number(p.serving_quantity) || 0, unit: basis === 'per_100ml' ? 'ml' : 'g' }
        : undefined,
    source: {
      kind: 'open_food_facts',
      barcode: barcode,
      lastModifiedISO,
      revisionId: p.rev,
      url: `https://world.openfoodfacts.org/product/${barcode}`,
    },
  };
}

// Heuristic — does OFF have enough nutrition data to score against?
export function hasScoreableNutrition(product: Product): boolean {
  const { salt, sugar, saturatedFat } = product.nutrition;
  return [salt, sugar, saturatedFat].some(
    (v) => typeof v === 'number' && Number.isFinite(v),
  );
}
