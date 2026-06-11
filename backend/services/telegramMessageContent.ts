import type { GeneratedMessageContent } from './telegramTypes';

const { detectCategory } = require('../utils/categoryDetector');
const { GenerateCaptionAndCategory } = require('./CaptionAndCategoryGen');
const { extractPrice } = require('../utils/extractPrice');
const { normalizeGeminiPrice } = require('./telegramMessageFilters');

export {};

async function generateMessageContent(cleanedText: string): Promise<GeneratedMessageContent> {
  let normalizedText = cleanedText;
  let category = 'miscellaneous';
  let price: string | null = null;

  const result = await GenerateCaptionAndCategory(cleanedText);
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
    };
  }

  const fallbackPrice = extractPrice(cleanedText);
  console.log(`Gemini price missing. Fallback extracted price: ${fallbackPrice}`);

  return {
    normalizedText,
    category,
    price: fallbackPrice,
  };
}

module.exports = {
  generateMessageContent,
};
