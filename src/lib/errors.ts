// Centralised error classification so every screen can render the same
// recovery affordances ("retry", "switch to label", "report missing", …)
// regardless of which layer threw.

import { OpenFoodFactsNetworkError, OpenFoodFactsNotFoundError } from './openfoodfacts';
import { VisionExtractionError } from './analyze';

export type RecoverableErrorKind =
  | 'offline'
  | 'product_not_found'
  | 'no_nutrition_data'
  | 'vision_failed'
  | 'rate_limited'
  | 'auth_failed'
  | 'unknown';

export interface ClassifiedError {
  kind: RecoverableErrorKind;
  titleDa: string;
  bodyDa: string;
  cta: { primary?: string; secondary?: string };
}

export function classify(err: unknown): ClassifiedError {
  if (err instanceof OpenFoodFactsNotFoundError) {
    return {
      kind: 'product_not_found',
      titleDa: 'Stregkode ikke fundet',
      bodyDa: `${err.barcode} findes ikke i Open Food Facts. Du kan fotografere bagsiden i stedet.`,
      cta: { primary: 'Fotografér etiket', secondary: 'Indtast manuelt' },
    };
  }
  if (err instanceof OpenFoodFactsNetworkError) {
    return {
      kind: 'offline',
      titleDa: 'Ingen forbindelse',
      bodyDa: 'Vi kunne ikke nå Open Food Facts. Tjek din internetforbindelse og prøv igen.',
      cta: { primary: 'Prøv igen' },
    };
  }
  if (err instanceof VisionExtractionError) {
    if (err.status === 401 || err.status === 403) {
      return {
        kind: 'auth_failed',
        titleDa: 'API-nøgle afvist',
        bodyDa: 'Anthropic afviste anmodningen. Tjek din EXPO_PUBLIC_ANTHROPIC_API_KEY.',
        cta: { primary: 'OK' },
      };
    }
    if (err.status === 429) {
      return {
        kind: 'rate_limited',
        titleDa: 'For mange forsøg',
        bodyDa: 'Vent et øjeblik og prøv igen.',
        cta: { primary: 'Prøv igen' },
      };
    }
    return {
      kind: 'vision_failed',
      titleDa: 'Kunne ikke aflæse etiketten',
      bodyDa: 'Sørg for godt lys og at hele næringsdeklarationen er i billedet, og prøv igen.',
      cta: { primary: 'Prøv igen', secondary: 'Indtast manuelt' },
    };
  }
  return {
    kind: 'unknown',
    titleDa: 'Noget gik galt',
    bodyDa: err instanceof Error ? err.message : String(err),
    cta: { primary: 'OK' },
  };
}

// EAN-13 / EAN-8 / UPC-A check digit validation. Catches mistyped manual
// entries before we hit the network.
export function isValidGtin(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const arr = digits.split('').map(Number);
  const check = arr.pop()!;
  // Standard GTIN check-digit: weights alternate 3/1 from the right.
  const sum = arr
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}
