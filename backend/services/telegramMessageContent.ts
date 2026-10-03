import type { GeneratedMessageContent, ProductMatchCandidate } from './telegramTypes';
import { detectCategory } from './detectCategory';
import { GenerateCaptionAndCategory } from './CaptionAndCategoryGen';
import { extractPrice } from '../utils/extractPrice';
import { normalizeGeminiPrice } from './telegramMessageFilters';

export async function generateMessageContent(
  cleanedText: string,
  candidates: ProductMatchCandidate[] = [],
): Promise<GeneratedMessageContent> {
  let normalizedText = cleanedText;
  let category = 'miscellaneous';
  let price: string | null = null;

  const result = await GenerateCaptionAndCategory(cleanedText, candidates);
  if (result.normalizedMessage && result.category) {
    normalizedText = result.normalizedMessage;
    category = result.category;
    price = result.price || null;

    if (result.usedFallback) {
      console.warn('Gemini API failed; fallback caption/category was used.');
    } else {
      console.log('Successfully generated caption and category using Gemini API');
    }
  } else {
    console.warn('Gemini API returned incomplete data, using fallback');
    category = detectCategory(cleanedText);
    normalizedText = cleanedText;
  }

  const normalizedPrice = normalizeGeminiPrice(price);
  if (normalizedPrice) {
    return {
      normalizedText,
      category,
      price: normalizedPrice,
      identity: result.identity,
      match: result.match,
      usedFallback: result.usedFallback,
    };
  }

  const fallbackPrice = extractPrice(cleanedText);
  console.log(`Gemini price missing. Fallback extracted price: ${fallbackPrice}`);

  return {
    normalizedText,
    category,
    price: fallbackPrice,
    identity: result.identity,
    match: result.match,
    usedFallback: result.usedFallback,
  };
}
