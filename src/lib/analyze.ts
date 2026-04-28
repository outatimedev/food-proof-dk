import { ExtractedLabel } from './scoring';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Opus 4.7 is the first Claude with high-resolution vision (long edge up to
// 2576px), which materially helps reading small Danish nutrition tables.
const MODEL = 'claude-opus-4-7';

const SYSTEM_PROMPT = `Du analyserer billeder af danske fødevareetiketter for FoodProof DK.

Aflæs næringsindholdet pr. 100 g/100 ml fra varedeklarationen og returnér struktureret JSON. Tal kommer ofte med "g" eller "mg" — konvertér mg til g (1000 mg = 1 g). Hvis et felt ikke kan aflæses entydigt, returnér null for det felt.

Returnér KUN gyldigt JSON i præcis dette schema, uden markdown og uden forklaring:

{
  "productName": string | null,
  "brand": string | null,
  "ingredientsDa": string | null,
  "nutritionPer100g": {
    "salt": number | null,
    "sugar": number | null,
    "saturatedFat": number | null,
    "fiber": number | null
  },
  "notes": string | null
}

"sugar" er totalt sukker (eller "heraf sukkerarter" hvis det er angivet).
"saturatedFat" er "heraf mættede fedtsyrer".
"fiber" er kostfibre.
"salt" er salt (ikke natrium — hvis kun natrium er angivet, gang med 2.5).

Alle talværdier er gram pr. 100 g. Returnér udelukkende det rå JSON-objekt.`;

interface AnalyzeOptions {
  apiKey: string;
  imageBase64: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export async function analyzeLabelImage({
  apiKey,
  imageBase64,
  mediaType = 'image/jpeg',
}: AnalyzeOptions): Promise<ExtractedLabel> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Aflæs næringsdeklarationen fra dette billede og returnér JSON som beskrevet.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Anthropic API ${response.status}: ${body.slice(0, 200)}`,
    );
  }

  const payload = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = payload.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();

  return parseExtractedLabel(text);
}

export function parseExtractedLabel(raw: string): ExtractedLabel {
  // Strip code fences if the model added any despite the system prompt.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error('Kunne ikke fortolke svar fra Claude som JSON.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Uventet svar-format fra Claude.');
  }

  const obj = data as Record<string, unknown>;
  const nut = (obj.nutritionPer100g ?? {}) as Record<string, unknown>;

  const num = (v: unknown): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const parsed = Number(v.replace(',', '.'));
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };

  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined;

  return {
    productName: str(obj.productName),
    brand: str(obj.brand),
    ingredientsDa: str(obj.ingredientsDa),
    nutritionPer100g: {
      salt: num(nut.salt),
      sugar: num(nut.sugar),
      saturatedFat: num(nut.saturatedFat),
      fiber: num(nut.fiber),
    },
    notes: str(obj.notes),
  };
}
