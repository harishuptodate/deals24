require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { detectCategory } = require('./detectCategory');
const { buildCaptionPrompt } = require('./captionPrompt');
const { createLogger } = require('./logger');

export {};

const logger = createLogger('gemini-caption');

const AVAILABLE_CATEGORIES = [
  'laptops',
  'electronics-home',
  'mobile-phones',
  'gadgets-accessories',
  'fashion',
  'Best-Deals',
  'miscellaneous',
];

function isQuotaOrRateLimitError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message || '';
  if (
    error.status === 'RESOURCE_EXHAUSTED' ||
    error.code === 429 ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.includes('"code":429') ||
    errorMessage.toLowerCase().includes('quota exceeded') ||
    errorMessage.toLowerCase().includes('rate limit')
  ) {
    return true;
  }

  try {
    const parsed = JSON.parse(errorMessage);
    const apiError = parsed?.error || parsed;
    const apiMessage = String(apiError?.message || '').toLowerCase();
    return (
      apiError?.status === 'RESOURCE_EXHAUSTED' ||
      apiError?.code === 429 ||
      apiMessage.includes('quota exceeded') ||
      apiMessage.includes('rate limit')
    );
  } catch {
    return false;
  }
}

function isTransientServiceError(error: any): boolean {
  if (!error) return false;

  const errorMessage = String(error.message || '');
  const lowerMessage = errorMessage.toLowerCase();
  if (
    error.status === 'UNAVAILABLE' ||
    error.code === 503 ||
    lowerMessage.includes('"status":"unavailable"') ||
    lowerMessage.includes('"code":503') ||
    lowerMessage.includes('high demand') ||
    lowerMessage.includes('try again later')
  ) {
    return true;
  }

  try {
    const parsed = JSON.parse(errorMessage);
    const apiError = parsed?.error || parsed;
    const apiMessage = String(apiError?.message || '').toLowerCase();
    return (
      apiError?.status === 'UNAVAILABLE' ||
      apiError?.code === 503 ||
      apiMessage.includes('high demand') ||
      apiMessage.includes('try again later')
    );
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiApiKeys(): string[] {
  return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean) as string[];
}

function buildFallbackResult(messageText: string) {
  return {
    normalizedMessage: messageText.trim(),
    category: detectCategory(messageText),
    price: '',
    usedFallback: true,
  };
}

async function requestGeminiContent(prompt: string, apiKeys: string[]) {
  let response: any;
  let lastError: any = null;

  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const keyIndex = attempt;
    const apiKey = apiKeys[keyIndex];
    const ai = new GoogleGenAI({ apiKey });

    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const hasMoreAttempts = attempt < apiKeys.length - 1;

      if (hasMoreAttempts && isQuotaOrRateLimitError(error)) {
        logger.warn(
          `Gemini quota/rate limit hit for key ${keyIndex + 1}. Rotating to next available key.`,
          { attempt: attempt + 1, keyIndex: keyIndex + 1 },
          { event: 'gemini_rate_limit_retry' },
        );
        continue;
      }

      if (hasMoreAttempts && isTransientServiceError(error)) {
        logger.warn(
          `Gemini service temporarily unavailable for key ${keyIndex + 1}. Retrying once with the next key.`,
          { attempt: attempt + 1, keyIndex: keyIndex + 1, waitMs: 500 },
          { event: 'gemini_transient_retry' },
        );
        await sleep(500);
        continue;
      }

      throw error;
    }
  }

  if (!response && lastError) {
    throw lastError;
  }

  return response;
}

function parseGeminiJsonResponse(responseText: string) {
  let jsonText = responseText.trim();

  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '');
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  return JSON.parse(jsonText);
}

function normalizeGeminiResult(messageText: string, result: any) {
  const resolvedCategory = AVAILABLE_CATEGORIES.includes(result.category)
    ? result.category
    : detectCategory(messageText);

  if (!AVAILABLE_CATEGORIES.includes(result.category)) {
    logger.warn(
      `Invalid category "${result.category}" returned by Gemini. Using fallback detection.`,
      { invalidCategory: result.category },
      { event: 'gemini_invalid_category' },
    );
  }

  return {
    normalizedMessage: result.normalizedMessage || messageText.trim(),
    category: resolvedCategory || detectCategory(messageText),
    price: typeof result.price === 'string' ? result.price.replace(/[^\d]/g, '') : '',
    usedFallback: false,
  };
}

async function GenerateCaptionAndCategory(messageText: string) {
  if (!messageText || typeof messageText !== 'string') {
    throw new Error('Message text is required and must be a string');
  }

  const geminiApiKeys = getGeminiApiKeys();
  if (geminiApiKeys.length === 0) {
    logger.warn(
      'No Gemini API key found in environment variables. Falling back to basic processing.',
      {},
      { event: 'gemini_missing_api_key' },
    );
    return buildFallbackResult(messageText);
  }

  try {
    const prompt = buildCaptionPrompt(messageText);
    const response = await requestGeminiContent(prompt, geminiApiKeys);
    const result = parseGeminiJsonResponse(response.text);
    return normalizeGeminiResult(messageText, result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      'Error calling Gemini API.',
      { error: errorMessage },
      { event: 'gemini_request_failed' },
    );
    return buildFallbackResult(messageText);
  }
}

module.exports = {
  detectCategory,
  GenerateCaptionAndCategory,
};
