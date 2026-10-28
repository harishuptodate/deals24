import type { GeneratedMessageContent, ProductIdentity } from './telegramTypes';
import { extractPrice } from '../utils/extractPrice';

export type EnrichmentContext = {
  price?: string;
  category?: string;
  identity?: ProductIdentity;
  matchedProductId?: string;
  amazonAsin?: string | null;
};

export function planDealEnrichment(input: {
  enabled: boolean;
  isAmazonDeal: boolean;
  hasMatch: boolean;
  captionReady: boolean;
  identityConfidence: string;
  category: string;
  price: string;
}): string[] {
  if (!input.enabled) return [];
  const price = Number(input.price);
  if (input.category === 'fashion' || (price > 0 && price < 1000)) return [];
  const reasons: string[] = [];
  if (!input.captionReady) reasons.push('normalize-caption');
  if (!input.price) reasons.push('extract-price');
  if (input.category === 'miscellaneous') reasons.push('classify-product');
  if (!input.hasMatch && input.identityConfidence !== 'high') reasons.push('enrich-identity');
  if (!input.hasMatch && !input.isAmazonDeal) reasons.push('compare-candidates');
  return reasons;
}

export function preserveVerifiedFacts(
  result: GeneratedMessageContent,
  originalText: string,
  context: EnrichmentContext,
): GeneratedMessageContent {
  const originalLinks = originalText.match(/https?:\/\/\S+/gu) || [];
  const generatedLinks = result.normalizedText.match(/https?:\/\/\S+/gu) || [];
  const linksPreserved = originalLinks.length === generatedLinks.length
    && originalLinks.every((link, index) => link === generatedLinks[index]);
  const pricePreserved = !context.price || extractPrice(result.normalizedText) === context.price;
  return {
    ...result,
    normalizedText: linksPreserved && pricePreserved ? result.normalizedText : originalText,
    price: context.price || result.price,
    category: context.category || result.category,
    match: context.matchedProductId ? undefined : result.match,
  };
}
