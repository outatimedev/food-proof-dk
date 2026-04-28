import { getDeviceId } from './device';
import { getRcAppUserId } from './entitlement';
import { NutritionPer100g, Product } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Opus 4.7's high-resolution vision (long edge up to 2576px) materially helps
// reading small Danish nutrition tables.
const MODEL = 'claude-opus-4-7';

const DIRECT_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const PROXY_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const SYSTEM_PROMPT = `Du analyserer billeder af danske fødevareetiketter for FoodProof DK.

Aflæs næringsindholdet pr. 100 g (eller 100 ml for drikkevarer) fra varedeklarationen og returnér struktureret JSON.

Konvertér mg til g (1000 mg = 1 g). Hvis kun natrium er angivet, beregn salt = natrium × 2.5.
Hvis et felt ikke kan aflæses entydigt, returnér null.

Returnér KUN gyldigt JSON i præcis dette schema, uden markdown og uden forklaring:

{
  "productName": string | null,
  "brand": string | null,
  "ingredientsText": string | null,
  "categoryHint": "food" | "beverage" | null,
  "nutrition": {
    "energyKcal": number | null,
    "energyKj": number | null,
    "fat": number | null,
    "saturatedFat": number | null,
    "carbs": number | null,
    "sugar": number | null,
    "fiber": number | null,
    "protein": number | null,
    "salt": number | null
  }
}

"sugar" er totalt sukker eller "heraf sukkerarter".
"saturatedFat" er "heraf mættede fedtsyrer".
"fiber" er kostfibre.
"salt" er salt (ikke natrium).

Alle talværdier er gram pr. 100 g/ml. Returnér udelukkende det rå JSON-objekt.`;

interface AnalyzeOptions {
  imageBase64: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  signal?: AbortSignal;
}

export class VisionExtractionError extends Error {
  readonly code: 'http' | 'parse' | 'empty' | 'quota_exceeded' | 'config';
  readonly status?: number;
  constructor(
    code: 'http' | 'parse' | 'empty' | 'quota_exceeded' | 'config',
    message: string,
    status?: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface RawExtraction {
  productName?: string | null;
  brand?: string | null;
  ingredientsText?: string | null;
  categoryHint?: 'food' | 'beverage' | null;
  nutrition?: Record<string, number | null | undefined>;
}

export async function analyzeLabelImage(opts: AnalyzeOptions): Promise<Product> {
  const { imageBase64, mediaType = 'image/jpeg', signal } = opts;
  if (PROXY_BASE_URL) {
    return viaProxy(imageBase64, mediaType, signal);
  }
  if (DIRECT_API_KEY) {
    return viaDirect(DIRECT_API_KEY, imageBase64, mediaType, signal);
  }
  throw new VisionExtractionError(
    'config',
    'Hverken EXPO_PUBLIC_API_BASE_URL eller EXPO_PUBLIC_ANTHROPIC_API_KEY er sat.',
  );
}

// ---------- Proxy path (production) ----------

async function viaProxy(
  imageBase64: string,
  mediaType: string,
  signal?: AbortSignal,
): Promise<Product> {
  const deviceId = await getDeviceId();
  const rcAppUserId = getRcAppUserId() ?? undefined;

  let res: Response;
  try {
    res = await fetch(`${PROXY_BASE_URL!.replace(/\/$/, '')}/vision`, {
      signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, rcAppUserId, imageBase64, mediaType }),
    });
  } catch (err) {
    throw new VisionExtractionError(
      'http',
      err instanceof Error ? err.message : 'Network unavailable',
    );
  }

  if (res.status === 402) {
    throw new VisionExtractionError(
      'quota_exceeded',
      'Du har brugt dine gratis etiket-scanninger i dag.',
      402,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new VisionExtractionError(
      'http',
      `Proxy svarede ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }

  return readMessagesResponse(res);
}

// ---------- Direct path (dev only) ----------

async function viaDirect(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
  signal?: AbortSignal,
): Promise<Product> {
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(messagesBody(imageBase64, mediaType)),
    });
  } catch (err) {
    throw new VisionExtractionError(
      'http',
      err instanceof Error ? err.message : 'Network unavailable',
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new VisionExtractionError(
      'http',
      `Anthropic API ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }
  return readMessagesResponse(res);
}

function messagesBody(imageBase64: string, mediaType: string) {
  return {
    model: MODEL,
    max_tokens: 1024,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Aflæs næringsdeklarationen fra dette billede og returnér JSON som beskrevet.',
          },
        ],
      },
    ],
  };
}

async function readMessagesResponse(res: Response): Promise<Product> {
  const payload = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const text = payload.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();
  if (!text) throw new VisionExtractionError('empty', 'Tomt svar fra Claude.');
  const raw = parseJson(text);
  return rawToProduct(raw);
}

function parseJson(raw: string): RawExtraction {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as RawExtraction;
  } catch {
    throw new VisionExtractionError('parse', 'Kunne ikke fortolke svar som JSON.');
  }
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function rawToProduct(raw: RawExtraction): Product {
  const n = raw.nutrition ?? {};
  const nutrition: NutritionPer100g = {
    energyKcal: num(n.energyKcal),
    energyKj: num(n.energyKj),
    fat: num(n.fat),
    saturatedFat: num(n.saturatedFat),
    carbs: num(n.carbs),
    sugar: num(n.sugar),
    fiber: num(n.fiber),
    protein: num(n.protein),
    salt: num(n.salt),
  };
  const categoryHint = raw.categoryHint === 'beverage' ? 'en:beverages' : null;
  return {
    productName: str(raw.productName),
    brand: str(raw.brand),
    ingredientsText: str(raw.ingredientsText),
    ingredientsLanguage: 'da',
    categoryTags: categoryHint ? [categoryHint] : [],
    nutrition,
    basis: raw.categoryHint === 'beverage' ? 'per_100ml' : 'per_100g',
    source: {
      kind: 'vision_ocr',
      model: MODEL,
      capturedAtISO: new Date().toISOString(),
    },
  };
}
