import crypto from 'node:crypto';
import type { ResolvedImageData, TelegramPhoto } from './telegramTypes';
import { fetchProductImage } from './amazonService';

let lastAmazonApiCall = 0;
const MIN_API_DELAY = 2000;

export function hasAmazonLinks(text: string): boolean {
  if (!text) return false;
  const amazonRegex = /(https?:\/\/)?(www\.)?(amazon\.[a-z]{2,}|amzn\.to)\/[^\s]*/gi;
  return amazonRegex.test(text);
}

export function extractAmazonUrls(text: string): string[] {
  if (!text) return [];
  const amazonRegex = /(https?:\/\/)?(www\.)?(amazon\.[a-z]{2,}|amzn\.to)\/[^\s]*/gi;
  const matches = text.match(amazonRegex) || [];
  return matches.map((url) => (url.startsWith('http') ? url : `https://${url}`));
}

function getHighestQualityPhoto(photos: TelegramPhoto[] | null | undefined): TelegramPhoto | null {
  if (!photos || photos.length === 0) return null;

  return photos.reduce<TelegramPhoto | null>((largest, current) => {
    const largestSize = largest?.file_size || 0;
    const currentSize = current?.file_size || 0;
    return currentSize > largestSize ? current : largest;
  }, null);
}

async function waitForApiRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastAmazonApiCall;

  if (timeSinceLastCall < MIN_API_DELAY) {
    const waitTime = MIN_API_DELAY - timeSinceLastCall;
    console.log(`Rate limiting: waiting ${waitTime}ms before Amazon API call`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastAmazonApiCall = Date.now();
}

export function normalizeMessage(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function calculateHash(text: string): string {
  return crypto.createHash('sha256').update(normalizeMessage(text)).digest('hex');
}

export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function replaceLinksAndText(text: string): string {
  let result = text;

  const linksToReplace = (process.env.LINKS_TO_REPLACE || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const linkReplaceWith = process.env.LINK_REPLACE_WITH || '';

  for (const link of linksToReplace) {
    const regex = new RegExp(link, 'g');
    result = result.replace(regex, linkReplaceWith);
  }

  const textReplacements = (process.env.TEXT_REPLACEMENTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  for (const pair of textReplacements) {
    const [from, to = ''] = pair.split(':');
    if (!from) continue;
    const regex = new RegExp(from, 'g');
    result = result.replace(regex, to);
  }

  return result.trim();
}

export function isRecentMessage(messageDate: number): boolean {
  const messageTimestamp = messageDate * 1000;
  return Date.now() - messageTimestamp <= 5 * 60 * 1000;
}

export function isLowContext(text: string): boolean {
  const meaningfulText = text.replace(/https?:\/\/\S+/g, '').trim();
  if (meaningfulText.length < 30) return true;

  const lowContextKeywords = ['loot', 'deal', 'link', 'fast', 'price drop'];
  const keywordMatch = lowContextKeywords.some((keyword) =>
    meaningfulText.toLowerCase().includes(keyword),
  );

  return keywordMatch && meaningfulText.length < 60;
}

export function shouldSkipTwsDeal(text: string): boolean {
  const normalizedText = text.toLowerCase();
  const isTwsDeal = /\btws\b|true wireless|earbuds|ear buds/.test(normalizedText);

  if (!isTwsDeal) {
    return false;
  }

  const blockedBrands = [
    'ptron',
    'fire-boltt',
    'fire boltt',
    'boat',
    'mivi',
    'nu republic',
    'amazon basics',
  ];

  return blockedBrands.some((brand) => normalizedText.includes(brand));
}

export function isProfitableProduct(text: string): boolean {
  const profitableKeywords = [
    'tv', 'tvs', '4ktvs', '4k', 'laptop', 'washing machine', 'ai',
    'kg', '12 kg', '9 kg', '7 kg', '8 kg', '6.5 kg', '10 kg', '8.5 kg',
    'front load', 'top load', 'air conditioner', 'ac', 'acs', 'ton',
    'refrigerator', '653 l', 'single door', 'double door', 'triple door',
    'side by side', 'intel', 'core', 'ryzen', 'bravia',
  ];

  return profitableKeywords.some((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(text);
  });
}

export function normalizeGeminiPrice(price: unknown): string {
  if (price === null || price === undefined) {
    return '';
  }

  if (typeof price === 'number') {
    if (!Number.isFinite(price) || price <= 0) {
      return '';
    }

    return String(Math.trunc(price));
  }

  if (typeof price !== 'string') {
    return '';
  }

  const normalizedPrice = price.replace(/[^\d]/g, '');
  if (!normalizedPrice) {
    return '';
  }

  const numericPrice = Number(normalizedPrice);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return '';
  }

  return String(numericPrice);
}

export function getTelegramFileIdFromPhoto(photo: TelegramPhoto[] | null | undefined): string | null {
  if (!photo || photo.length === 0) {
    return null;
  }

  const highestQualityPhoto = getHighestQualityPhoto(photo);
  return highestQualityPhoto?.file_id || null;
}

async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    const contentType = res.headers.get('Content-Type') || res.headers.get('content-type');
    return res.ok && Boolean(contentType) && contentType.startsWith('image/');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn('Error validating image URL:', errorMessage);
    return false;
  }
}

export async function resolveImageData(
  cleanedText: string,
  photo: TelegramPhoto[] | null | undefined,
): Promise<ResolvedImageData> {
  let imageUrl: string | null = null;
  let telegramFileId: string | null = null;

  if (hasAmazonLinks(cleanedText)) {
    const amazonUrls = extractAmazonUrls(cleanedText);

    if (amazonUrls.length > 0) {
      try {
        await waitForApiRateLimit();
        const result = await fetchProductImage(amazonUrls[amazonUrls.length - 1]);

        if (result.success && result.imageUrl) {
          const validImageUrl = await isValidImageUrl(result.imageUrl);
          if (validImageUrl) {
            imageUrl = result.imageUrl;
          } else {
            console.log('Fetched image URL is invalid or not accessible. Falling back to Telegram image.');
          }
        } else {
          console.log('Failed to fetch Amazon image via API:', result.error);
          console.log('Falling back to Telegram image');
        }
      } catch (error) {
        console.error('Error fetching Amazon product image via API & using fallback Telegram image function :', error);
      }
    }
  }

  if (!imageUrl && photo && photo.length > 0) {
    console.log('Message contains Telegram photo, extracting file ID');
    telegramFileId = getTelegramFileIdFromPhoto(photo);

    if (telegramFileId) {
      console.log('Extracted Telegram file ID:', telegramFileId);
    }
  }

  return {
    imageUrl,
    telegramFileId,
  };
}
