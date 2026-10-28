import type { ProductIdentity } from './telegramTypes';

export type LocalIdentityExtraction = {
  identity?: ProductIdentity;
  confidence: 'none' | 'low' | 'medium' | 'high';
};

const BRANDS: Array<[RegExp, string]> = [
  [/\bhero\s+motocorp\b/iu, 'Hero MotoCorp'],
  [/\bbajaj\s+auto\b/iu, 'Bajaj Auto'],
  [/\bcentuary\s+mattresses\b/iu, 'Centuary Mattresses'],
  [/\borient\s+electric\b/iu, 'Orient Electric'],
  [/\bhome\s+centre\b/iu, 'Home Centre'],
  [/\bvoltas\s+beko\b/iu, 'Voltas Beko'],
  [/\b(?:oneplus|samsung|sony|bosch|godrej|haier|lenovo|asus|dell|canon|dji|xgimi|lumio|crossbeats|aquaguard|boat|boAt|xiaomi|bajaj|ktm|ampere|amo|zebronics|jbl|philips|qubo|portronics|prestige|ifb|luminous|livguard|livpure|crompton|mivi|fastrack|wzatco|apple|puma|harley-davidson|hikoki|vlite|samyang|eox|royaloak|firetv|lg)\b/iu, ''],
];

const PRODUCT_TYPES: Array<[RegExp, string]> = [
  [/\b(?:washer\s*dryer|washing\s+machine)\b/iu, 'washing machine'],
  [/\b(?:mobile\s+phone|smartphone|phone)\b/iu, 'mobile phone'],
  [/\b(?:true\s+wireless|tws|earbuds?)\b/iu, 'earbuds'],
  [/\b(?:smart\s*watch|galaxy\s+watch)\b/iu, 'smartwatch'],
  [/\b(?:electric\s+scooter|e-scooter)\b/iu, 'electric scooter'],
  [/\b(?:motorcycle|motorbike)\b/iu, 'motorcycle'],
  [/\b(?:television|smart\s+tv|oled\s+tv|qled\s+tv|led\s+tv)\b/iu, 'television'],
  [/\b(?:refrigerator|fridge)\b/iu, 'refrigerator'],
  [/\b(?:air\s+conditioner|split\s+ac|window\s+ac)\b/iu, 'air conditioner'],
  [/\b(?:water\s+purifier|ro\s+purifier)\b/iu, 'water purifier'],
  [/\b(?:security\s+camera|dash\s*cam|dash\s+camera|cctv\s+camera)\b/iu, 'security camera'],
  [/\b(?:soundbar|home\s+theatre)\b/iu, 'soundbar'],
  [/\b(?:mirrorless\s+camera|dslr|camera)\b/iu, 'camera'],
  [/\b(?:tablet|\bpad\b)\b/iu, 'tablet'],
  [/\b(?:notebook|laptop)\b/iu, 'laptop'],
  [/\bprojector\b/iu, 'projector'],
  [/\bspeakers?\b/iu, 'speaker'],
  [/\blens\b/iu, 'lens'],
  [/\b(?:vacuum\s+cleaner|robot\s+vacuum)\b/iu, 'vacuum cleaner'],
  [/\b(?:air\s+fryer|multi\s+cooker)\b/iu, 'kitchen appliance'],
  [/\b(?:inverter(?:\s+and|\s*&)?\s+battery|inverter)\b/iu, 'inverter'],
  [/\b(?:mattress|bed|sofa|console\s+table|dining\s+table)\b/iu, 'furniture'],
  [/\b(?:bicycle|bike)\b/iu, 'bicycle'],
  [/\bscooter\b/iu, 'scooter'],
  [/\b(?:backpack|rucksack|handbag|suitcase)\b/iu, 'bag'],
  [/\b(?:kadai|cookware|frying\s+pan|pressure\s+cooker)\b/iu, 'cookware'],
];

const VARIANT_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*(?:GB|TB)\s*(?:RAM|ROM|SSD|storage)?\b/giu,
  /\b\d+(?:\.\d+)?\s*(?:inch(?:es)?|cm|mm|litres?|liter|L|kg|ton|cc|MP|mAh|W|Hz)\b/giu,
  /\b\d+\s*star\b/giu,
  /\b(?:single|double|triple|french|side[ -]by[ -]side)\s+door\b/giu,
  /\bfrost[ -]free\b/giu,
  /\b(?:drum\s+brake|double\s+disc|disc\s+brake|mirrorless|cordless|wi-?fi|5g|4k|oled|qled|full\s+hd|fhd)\b/giu,
];

const MODEL_BOUNDARY = /\b(?:\d+(?:\.\d+)?\s*(?:GB|TB|inch(?:es)?|cm|litres?|liter|L|kg|ton|cc|MP|mAh|W|Hz|ch)|\d{3,4}p|5g|full\s+hd|bluetooth|with\b|gaming\b|single\s+seat|double\s+door|triple\s+door|frost[ -]free)\b/iu;
const TRAILING_PRODUCT_TYPE = /\s+(?:mobile\s+phone|smartphone|phone|tablet|laptop|notebook|projector|soundbar|camera|lens|refrigerator|television|smart\s+tv|motorcycle|scooter|speaker|earbuds?)$/iu;

function normalizeBrand(match: RegExpMatchArray, canonical: string): string {
  if (canonical) return canonical;
  const value = match[0];
  if (/^asus$/iu.test(value)) return 'ASUS';
  if (/^dji$/iu.test(value)) return 'DJI';
  if (/^xgimi$/iu.test(value)) return 'XGIMI';
  if (/^ifb$/iu.test(value)) return 'IFB';
  if (/^lg$/iu.test(value)) return 'LG';
  if (/^amo$/iu.test(value)) return 'AMO';
  if (/^ktm$/iu.test(value)) return 'KTM';
  if (/^wzatco$/iu.test(value)) return 'WZATCO';
  if (/^oneplus$/iu.test(value)) return 'OnePlus';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getHeadline(text: string): string {
  const firstContentLine = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line && !/^https?:\/\//iu.test(line)) || '';

  return firstContentLine
    .replace(/https?:\/\/\S+/giu, ' ')
    .split(/\s+(?:@|deal\s+price|offer\s+price|for\s+â?₹?\s*\d|âž¡)/iu, 1)[0]
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function extractModel(headline: string, brandMatch?: RegExpMatchArray, productType = ''): string {
  if (!brandMatch) return '';
  let remainder = headline.slice((brandMatch.index || 0) + brandMatch[0].length)
    .replace(/^[\s:|,-]+/u, '')
    .trim();
  if (!remainder) return '';

  if (productType === 'lens') {
    return remainder.replace(TRAILING_PRODUCT_TYPE, '').trim().slice(0, 80);
  }

  const boundary = remainder.search(MODEL_BOUNDARY);
  if (boundary >= 0) remainder = remainder.slice(0, boundary).trim();
  remainder = remainder
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .replace(TRAILING_PRODUCT_TYPE, '')
    .replace(/[|,;:-]+$/u, '')
    .trim();

  if (!remainder || remainder.split(/\s+/u).length > 5 || remainder.length > 60) return '';
  if (!/\d/u.test(remainder) && !/\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b/iu.test(remainder)) {
    return '';
  }
  return remainder;
}

function extractVariants(headline: string): string[] {
  const variants: string[] = [];
  for (const pattern of VARIANT_PATTERNS) {
    for (const match of headline.matchAll(pattern)) {
      const value = match[0].replace(/\s+/gu, ' ').trim();
      if (!variants.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
        variants.push(value);
      }
    }
  }
  return variants.slice(0, 8);
}

export function extractLocalProductIdentity(text: string): LocalIdentityExtraction {
  const headline = getHeadline(text);
  if (!headline) return { confidence: 'none' };

  let brand = '';
  let brandMatch: RegExpMatchArray | undefined;
  for (const [pattern, canonical] of BRANDS) {
    const match = headline.match(pattern);
    if (match) {
      brand = normalizeBrand(match, canonical);
      brandMatch = match;
      break;
    }
  }

  let productType = '';
  for (const [pattern, canonical] of PRODUCT_TYPES) {
    if (pattern.test(headline)) {
      productType = canonical;
      break;
    }
  }

  const model = extractModel(headline, brandMatch, productType);
  const variant = extractVariants(headline);
  const evidenceCount = Number(Boolean(brand)) + Number(Boolean(productType)) + Number(Boolean(model));
  if (evidenceCount === 0) return { confidence: 'none' };

  return {
    identity: {
      canonicalName: brand && model ? `${brand} ${model}` : '',
      brand,
      model,
      productType,
      variant,
    },
    confidence: evidenceCount === 3 ? 'high' : evidenceCount === 2 ? 'medium' : 'low',
  };
}

export function mergeProductIdentities(
  localIdentity?: ProductIdentity,
  generatedIdentity?: ProductIdentity,
): ProductIdentity | undefined {
  if (!localIdentity) return generatedIdentity;
  if (!generatedIdentity) return localIdentity;

  const variant = [...generatedIdentity.variant, ...localIdentity.variant]
    .filter((value, index, values) => values.findIndex(
      (candidate) => candidate.toLowerCase() === value.toLowerCase(),
    ) === index);

  return {
    canonicalName: generatedIdentity.canonicalName || localIdentity.canonicalName,
    brand: generatedIdentity.brand || localIdentity.brand,
    model: generatedIdentity.model || localIdentity.model,
    productType: generatedIdentity.productType || localIdentity.productType,
    variant,
  };
}
