import type { CategoryConfidence, DealCategory } from './detectCategory';
import type { ProductIdentity } from './telegramTypes';

const STOP_WORDS = new Set([
  'with', 'from', 'this', 'that', 'deal', 'price', 'offer', 'only', 'flat',
  'amazon', 'buy', 'now', 'sale', 'today', 'lowest', 'loot', 'bank', 'card',
]);

const PROMOTIONAL_NOISE_PATTERNS = [
  /#[\p{L}\p{N}_]+/u,
  /\b(?:maha+a?\s+)?lo{2,}t\b/iu,
  /\b(?:sale ends?|festive deals?|lowest|hurry|grab fast)\b/iu,
  /\b(?:check (?:the )?review|highly recommended|very premium brand)\b/iu,
  /^\s*\[?back\]?\b/iu,
];

const URL_PATTERN = /https?:\/\/\S+/iu;
const DEAL_PRICE_LINE_PATTERN = /(?:@|\bdeal(?:\s+price)?\b|\bat\b|\bfor\b|➡)/iu;
const REGULAR_PRICE_LINE_PATTERN = /\b(?:regular(?:\s+price)?|reg|mrp)\b/iu;
const OFFER_LINE_PATTERN = /\b(?:flat|apply|coupon|off|bank|card|cc|emi|hdfc|sbi|icici)\b/iu;

export type DealTextReadiness = {
  ready: boolean;
  reason:
    | 'ready'
    | 'missing-link'
    | 'missing-price'
    | 'uncertain-category'
    | 'insufficient-product-text'
    | 'promotional-noise'
    | 'unrecognized-caption-structure';
};

export function assessDealTextReadiness(input: {
  text: string;
  link: string | null;
  price: string;
  category: DealCategory;
  categoryConfidence: CategoryConfidence;
}): DealTextReadiness {
  if (!input.link) return { ready: false, reason: 'missing-link' };

  const numericPrice = Number(input.price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return { ready: false, reason: 'missing-price' };
  }

  if (
    input.categoryConfidence !== 'high'
    || input.category === 'miscellaneous'
    || input.category === 'Best-Deals'
  ) {
    return { ready: false, reason: 'uncertain-category' };
  }

  const lines = input.text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const headline = lines[0] || '';
  const productWords = headline.match(/[\p{L}\p{N}][\p{L}\p{N}+.-]*/gu) || [];
  if (headline.length < 20 || headline.length > 180 || productWords.length < 3) {
    return { ready: false, reason: 'insufficient-product-text' };
  }

  const textWithoutLinks = input.text.replace(URL_PATTERN, ' ').trim();
  if (PROMOTIONAL_NOISE_PATTERNS.some((pattern) => pattern.test(textWithoutLinks))) {
    return { ready: false, reason: 'promotional-noise' };
  }

  if (lines.length < 2 || lines.length > 5 || URL_PATTERN.test(headline)) {
    return { ready: false, reason: 'unrecognized-caption-structure' };
  }

  const linkLines = lines.filter((line) => {
    if (!URL_PATTERN.test(line)) return false;
    return !/[\p{L}\p{N}]/u.test(line.replace(URL_PATTERN, ''));
  });
  if (linkLines.length !== 1) {
    return { ready: false, reason: 'unrecognized-caption-structure' };
  }

  const hasDealPriceLine = lines.some((line) => DEAL_PRICE_LINE_PATTERN.test(line));
  const hasUnknownSupportingLine = lines.slice(1).some((line) => (
    line !== linkLines[0]
    && !DEAL_PRICE_LINE_PATTERN.test(line)
    && !REGULAR_PRICE_LINE_PATTERN.test(line)
    && !OFFER_LINE_PATTERN.test(line)
  ));
  if (!hasDealPriceLine || hasUnknownSupportingLine) {
    return { ready: false, reason: 'unrecognized-caption-structure' };
  }

  return { ready: true, reason: 'ready' };
}

export function shouldUseLocalDealProcessing(category: string, price: string): boolean {
  const numericPrice = Number(price);
  return category === 'fashion' || (Number.isFinite(numericPrice) && numericPrice > 0 && numericPrice < 1000);
}

export function shouldUseGeminiForDeal(input: {
  isAmazonDeal: boolean;
  hasDeterministicMatch: boolean;
  localApprovalPassed: boolean;
  category: string;
  price: string;
}): boolean {
  if (input.hasDeterministicMatch) return false;
  if (shouldUseLocalDealProcessing(input.category, input.price)) return false;

  // Amazon misses can still avoid AI when the incoming caption is already trustworthy.
  if (input.isAmazonDeal && input.localApprovalPassed) return false;

  return true;
}

function normalizeIdentityPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildIdentityKey(identity?: Partial<ProductIdentity>): string | null {
  if (!identity?.brand || (!identity.model && !identity.canonicalName)) {
    return null;
  }

  const base = [identity.brand, identity.model || identity.canonicalName]
    .map(normalizeIdentityPart)
    .filter(Boolean);
  const variants = (identity.variant || [])
    .map(normalizeIdentityPart)
    .filter(Boolean)
    .sort();

  return [...base, ...variants].join('|') || null;
}

export function getCandidateSearchTokens(text: string): string[] {
  const withoutLinks = text.replace(/https?:\/\/\S+/gi, ' ');
  const tokens = withoutLinks.toLowerCase().match(/[a-z0-9]+(?:[-+][a-z0-9]+)*/g) || [];

  return [...new Set(tokens)]
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    .sort((left, right) => {
      const leftHasNumber = /\d/.test(left) ? 1 : 0;
      const rightHasNumber = /\d/.test(right) ? 1 : 0;
      return rightHasNumber - leftHasNumber || right.length - left.length;
    })
    .slice(0, 8);
}
