import crypto from 'node:crypto';
import type { ResolvedImageData, TelegramPhoto } from './telegramTypes';
import { fetchProductImage } from './amazonService';
import type { DealBlacklist } from './blacklistService';

let lastAmazonFetchAt = 0;
const MIN_AMAZON_FETCH_DELAY = 2000;

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

async function waitForAmazonRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastAmazonFetchAt;

  if (timeSinceLastCall < MIN_AMAZON_FETCH_DELAY) {
    const waitTime = MIN_AMAZON_FETCH_DELAY - timeSinceLastCall;
    console.log(`Rate limiting: waiting ${waitTime}ms before Amazon fetch`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastAmazonFetchAt = Date.now();
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

type NormalizedMatchText = {
  value: string;
  starts: number[];
  ends: number[];
};

const INVISIBLE_CHARACTER_REGEX = /[\u200B-\u200D\uFE0E\uFE0F\uFEFF]/u;
const LETTER_OR_NUMBER_REGEX = /[\p{L}\p{N}]/u;

function normalizeForMatch(input: string): NormalizedMatchText {
  const characters: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;

  const append = (character: string, start: number, end: number) => {
    const isWordCharacter = LETTER_OR_NUMBER_REGEX.test(character);
    const normalizedCharacter = isWordCharacter ? character : ' ';
    const lastIndex = characters.length - 1;

    if (normalizedCharacter === ' ' && characters[lastIndex] === ' ') {
      ends[lastIndex] = end;
      return;
    }

    // Marketing words are commonly stretched ("loooooot"). Keep normal double
    // letters, but collapse any additional copies in the comparison form only.
    if (
      isWordCharacter
      && characters[lastIndex] === normalizedCharacter
      && characters[lastIndex - 1] === normalizedCharacter
    ) {
      ends[lastIndex] = end;
      return;
    }

    characters.push(normalizedCharacter);
    starts.push(start);
    ends.push(end);
  };

  for (const originalCharacter of input) {
    const start = offset;
    offset += originalCharacter.length;

    for (const character of originalCharacter.normalize('NFKC').toLowerCase()) {
      if (!INVISIBLE_CHARACTER_REGEX.test(character)) {
        append(character, start, offset);
      }
    }
  }

  while (characters[0] === ' ') {
    characters.shift();
    starts.shift();
    ends.shift();
  }
  while (characters[characters.length - 1] === ' ') {
    characters.pop();
    starts.pop();
    ends.pop();
  }

  return { value: characters.join(''), starts, ends };
}

function hasEdgeDecoration(value: string, edge: 'start' | 'end'): boolean {
  const visibleCharacters = [...value].filter((character) => (
    !INVISIBLE_CHARACTER_REGEX.test(character) && !/\s/u.test(character)
  ));
  const character = edge === 'start'
    ? visibleCharacters[0]
    : visibleCharacters[visibleCharacters.length - 1];
  return Boolean(character) && !LETTER_OR_NUMBER_REGEX.test(character);
}

function replaceNormalizedMatches(text: string, from: string, to: string): string {
  const normalizedText = normalizeForMatch(text);
  const normalizedFrom = normalizeForMatch(from).value;
  if (!normalizedFrom) return text;

  const spans: Array<{ start: number; end: number }> = [];
  let searchFrom = 0;

  while (searchFrom <= normalizedText.value.length - normalizedFrom.length) {
    const matchIndex = normalizedText.value.indexOf(normalizedFrom, searchFrom);
    if (matchIndex === -1) break;

    const afterMatch = matchIndex + normalizedFrom.length;
    const hasWordBefore = matchIndex > 0
      && LETTER_OR_NUMBER_REGEX.test(normalizedText.value[matchIndex - 1]);
    const hasWordAfter = afterMatch < normalizedText.value.length
      && LETTER_OR_NUMBER_REGEX.test(normalizedText.value[afterMatch]);

    if (!hasWordBefore && !hasWordAfter) {
      let start = normalizedText.starts[matchIndex];
      let end = normalizedText.ends[afterMatch - 1];

      if (hasEdgeDecoration(from, 'start')) {
        const decoration = text.slice(0, start).match(/[^\p{L}\p{N}\s]+$/u)?.[0];
        start -= decoration?.length || 0;
      }
      if (hasEdgeDecoration(from, 'end')) {
        const decoration = text.slice(end).match(/^[^\p{L}\p{N}\s]+/u)?.[0];
        end += decoration?.length || 0;
      }

      spans.push({ start, end });
    }

    searchFrom = afterMatch;
  }

  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index];
    text = `${text.slice(0, span.start)}${to}${text.slice(span.end)}`;
  }

  return text;
}

export function replaceLinksAndText(text: string): string {
  let result = text;

  const linksToReplace = (process.env.LINKS_TO_REPLACE || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const linkReplaceWith = process.env.LINK_REPLACE_WITH || '';

  for (const link of linksToReplace) {
    const regex = new RegExp(escapeRegExp(link), 'gi');
    result = result.replace(regex, () => linkReplaceWith);
  }

  const textReplacements = (process.env.TEXT_REPLACEMENTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((pair) => {
      const separatorIndex = pair.indexOf(':');
      return separatorIndex === -1
        ? { from: pair, to: '' }
        : {
            from: pair.slice(0, separatorIndex),
            to: pair.slice(separatorIndex + 1),
          };
    })
    .filter(({ from }) => Boolean(from))
    .sort((left, right) => (
      normalizeForMatch(right.from).value.length - normalizeForMatch(left.from).value.length
      || right.from.length - left.from.length
    ));

  for (const { from, to } of textReplacements) {
    if (normalizeForMatch(from).value) {
      result = replaceNormalizedMatches(result, from, to);
    } else {
      const regex = new RegExp(escapeRegExp(from), 'gu');
      result = result.replace(regex, () => to);
    }
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function editDistanceWithin(left: string, right: string, maximumDistance: number): boolean {
  if (Math.abs(left.length - right.length) > maximumDistance) return false;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
      rowMinimum = Math.min(rowMinimum, current[rightIndex]);
    }

    if (rowMinimum > maximumDistance) return false;
    previous = current;
  }

  return previous[right.length] <= maximumDistance;
}

function tokensAreSimilar(candidate: string, expected: string, allowFuzzy: boolean): boolean {
  if (candidate === expected) return true;
  if (!allowFuzzy) return false;

  const shorterLength = Math.min(candidate.length, expected.length);
  const longerLength = Math.max(candidate.length, expected.length);
  if (shorterLength <= 4) return false;

  const lengthDifference = longerLength - shorterLength;
  if (
    lengthDifference <= 3
    && shorterLength / longerLength >= 0.7
    && (candidate.startsWith(expected) || expected.startsWith(candidate))
  ) {
    return true;
  }

  const maximumDistance = longerLength >= 8 ? 2 : 1;
  return editDistanceWithin(candidate, expected, maximumDistance);
}

function hasKeyword(text: string, keyword: string, allowFuzzy = true): boolean {
  const textTokens = normalizeForMatch(text).value.split(' ').filter(Boolean);
  const keywordTokens = normalizeForMatch(keyword).value.split(' ').filter(Boolean);
  if (keywordTokens.length === 0 || keywordTokens.length > textTokens.length) return false;

  for (let index = 0; index <= textTokens.length - keywordTokens.length; index += 1) {
    const matches = keywordTokens.every((keywordToken, tokenIndex) => (
      tokensAreSimilar(textTokens[index + tokenIndex], keywordToken, allowFuzzy)
    ));
    if (matches) return true;
  }

  return false;
}

export function shouldSkipBadProducts(text: string, blacklist: DealBlacklist): boolean {
  const normalizedText = text.toLowerCase();
  const exactMatchingRules = (blacklist.rules || []).filter((rule) => (
    hasKeyword(normalizedText, rule.brand, false)
    && hasKeyword(normalizedText, rule.product, false)
  ));

  if (exactMatchingRules.some((rule) => rule.action === 'allow')) {
    return false;
  }

  if (exactMatchingRules.some((rule) => rule.action === 'block')) {
    return true;
  }

  const hasFuzzyBlockRule = (blacklist.rules || []).some((rule) => (
    rule.action === 'block'
    && hasKeyword(normalizedText, rule.brand)
    && hasKeyword(normalizedText, rule.product)
  ));
  if (hasFuzzyBlockRule) {
    return true;
  }

  const isBadProduct = blacklist.products.some((keyword) => hasKeyword(normalizedText, keyword));

  if (!isBadProduct) {
    return false;
  }

  return blacklist.brands.some((brand) => hasKeyword(normalizedText, brand));
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
  let amazonUrl: string | null = null;

  if (hasAmazonLinks(cleanedText)) {
    const amazonUrls = extractAmazonUrls(cleanedText);

    if (amazonUrls.length > 0) {
      try {
        await waitForAmazonRateLimit();
        const result = await fetchProductImage(amazonUrls[amazonUrls.length - 1]);
        amazonUrl = result.amazonUrl || null;

        if (result.success && result.imageUrl) {
          const validImageUrl = await isValidImageUrl(result.imageUrl);
          if (validImageUrl) {
            imageUrl = result.imageUrl;
          } else {
            console.log('Fetched image URL is invalid or not accessible. Falling back to Telegram image.');
          }
        } else {
          console.log('Failed to fetch Amazon image:', result.error);
          console.log('Falling back to Telegram image');
        }
      } catch (error) {
        console.error('Error fetching Amazon product image; using Telegram image fallback:', error);
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
    amazonUrl,
  };
}
