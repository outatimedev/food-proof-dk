// FoodProof DK — Cloudflare Worker proxy for Claude vision label analysis.
//
// Why this exists:
//   - The Anthropic API key MUST NOT be shipped in the mobile bundle.
//     EXPO_PUBLIC_* env vars are extractable from any installed app, so a
//     direct-from-device call burns our budget at the speed of an attacker.
//   - We also can't trust the device for free-tier quota enforcement: a
//     client-side counter is bypassed by reinstalling. So quota lives here.
//
// What it does:
//   POST /vision
//     body: {
//       deviceId: string,         // stable per install, generated client-side
//       imageBase64: string,
//       mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
//       rcAppUserId?: string       // RevenueCat App User ID, when present
//     }
//
//   Flow:
//     1. If rcAppUserId is provided, ask RevenueCat whether that user has
//        the 'pro' entitlement active. If yes → unmetered.
//     2. Otherwise enforce 3/day per deviceId via KV (TTL'd to 25h, key
//        scoped to YYYY-MM-DD in Europe/Copenhagen so the user's reset
//        boundary matches the client UI).
//     3. Forward to Anthropic Messages API with the server-held key.
//     4. Return Anthropic's response verbatim.
//
// Bindings (wrangler.toml):
//   - secret  ANTHROPIC_API_KEY
//   - secret  REVENUECAT_SECRET_KEY (optional — only if you check entitlements)
//   - kv      QUOTA_KV
//
// Deploy: see proxy/README.md.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-opus-4-7';
const FREE_DAILY_LIMIT = 3;

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

interface Env {
  ANTHROPIC_API_KEY: string;
  REVENUECAT_SECRET_KEY?: string;
  QUOTA_KV: KVNamespace;
  ALLOWED_ORIGINS?: string; // comma-separated, optional
}

interface VisionRequest {
  deviceId: string;
  imageBase64: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  rcAppUserId?: string;
}

const corsHeaders = (origin: string | null, env: Env): HeadersInit => {
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const allowOrigin = allowed.length === 0 ? '*' : origin && allowed.includes(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
};

function jsonResponse(body: unknown, status: number, origin: string | null, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin, env),
    },
  });
}

function copenhagenDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function isPro(rcAppUserId: string, secret: string): Promise<boolean> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(rcAppUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        'X-Platform': 'ios',
      },
    },
  );
  if (!res.ok) return false;
  const json = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> };
  };
  const ent = json.subscriber?.entitlements?.['pro'];
  if (!ent) return false;
  if (!ent.expires_date) return true; // lifetime
  return new Date(ent.expires_date) > new Date();
}

async function checkAndChargeQuota(
  deviceId: string,
  env: Env,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const day = copenhagenDate();
  const key = `quota:${deviceId}:${day}`;
  const raw = await env.QUOTA_KV.get(key);
  const used = raw ? parseInt(raw, 10) : 0;
  if (used >= FREE_DAILY_LIMIT) {
    return { allowed: false, used, limit: FREE_DAILY_LIMIT };
  }
  // 25h TTL — long enough that midnight crossings during a request don't
  // race, short enough that nothing leaks past a day.
  await env.QUOTA_KV.put(key, String(used + 1), { expirationTtl: 60 * 60 * 25 });
  return { allowed: true, used: used + 1, limit: FREE_DAILY_LIMIT };
}

async function refundQuota(deviceId: string, env: Env): Promise<void> {
  const day = copenhagenDate();
  const key = `quota:${deviceId}:${day}`;
  const raw = await env.QUOTA_KV.get(key);
  if (!raw) return;
  const used = parseInt(raw, 10);
  if (used <= 0) return;
  await env.QUOTA_KV.put(key, String(used - 1), { expirationTtl: 60 * 60 * 25 });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, origin, env);
    }
    const url = new URL(req.url);
    if (url.pathname !== '/vision') {
      return jsonResponse({ error: 'not_found' }, 404, origin, env);
    }

    let body: VisionRequest;
    try {
      body = (await req.json()) as VisionRequest;
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400, origin, env);
    }

    if (!body.deviceId || !body.imageBase64) {
      return jsonResponse({ error: 'missing_fields' }, 400, origin, env);
    }

    let pro = false;
    if (body.rcAppUserId && env.REVENUECAT_SECRET_KEY) {
      try {
        pro = await isPro(body.rcAppUserId, env.REVENUECAT_SECRET_KEY);
      } catch {
        pro = false;
      }
    }

    let chargedDeviceId: string | null = null;
    if (!pro) {
      const q = await checkAndChargeQuota(body.deviceId, env);
      if (!q.allowed) {
        return jsonResponse(
          {
            error: 'quota_exceeded',
            message: `Du har brugt dine ${q.limit} gratis etiket-scanninger i dag.`,
            used: q.used,
            limit: q.limit,
          },
          402,
          origin,
          env,
        );
      }
      chargedDeviceId = body.deviceId;
    }

    let upstream: Response;
    try {
      upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
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
                  source: {
                    type: 'base64',
                    media_type: body.mediaType ?? 'image/jpeg',
                    data: body.imageBase64,
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
    } catch (err) {
      // Network error talking to Anthropic — refund the quota charge.
      if (chargedDeviceId) await refundQuota(chargedDeviceId, env);
      return jsonResponse(
        { error: 'upstream_unreachable', message: err instanceof Error ? err.message : String(err) },
        502,
        origin,
        env,
      );
    }

    if (!upstream.ok) {
      // Anthropic returned an error — refund.
      if (chargedDeviceId) await refundQuota(chargedDeviceId, env);
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
          ...corsHeaders(origin, env),
        },
      });
    }

    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin, env),
      },
    });
  },
};

// Cloudflare Worker types (declared inline to avoid a runtime dep).
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}
