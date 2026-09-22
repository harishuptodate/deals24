const DEFAULT_AFFILIATE_TAG = 'harishch-21';

const ASIN_PATH_PATTERN = /\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:[/?#]|$)/i;
const AMAZON_LINK_PATTERN = /(https?:\/\/)?(www\.)?(amazon\.(?:in|com)|amzn\.to)\/[^\s]*/gi;

function extractUrl(value: string): URL {
  const match = value.trim().match(/https?:\/\/[^\s]+/i);

  if (!match) {
    throw new Error('Please provide a valid Amazon product URL');
  }

  try {
    return new URL(match[0]);
  } catch {
    throw new Error('Please provide a valid Amazon product URL');
  }
}

function isSupportedAmazonHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return [
    'amazon.in',
    'www.amazon.in',
    'amazon.com',
    'www.amazon.com',
  ].includes(normalizedHost);
}

export function isAmazonShortUrl(value: string): boolean {
  const { hostname } = extractUrl(value);
  return hostname === 'amzn.to' || hostname === 'www.amzn.to';
}

export function cleanAmazonProductUrl(
  value: string,
  affiliateTag = process.env.AMAZON_AFFILIATE_TAG?.trim() || DEFAULT_AFFILIATE_TAG,
): string {
  const url = extractUrl(value);

  if (!isSupportedAmazonHost(url.hostname)) {
    throw new Error('Please provide a valid Amazon product URL');
  }

  const asin = url.pathname.match(ASIN_PATH_PATTERN)?.[1];
  if (!asin) {
    throw new Error('Could not find a valid product ASIN in the Amazon link');
  }

  const cleanUrl = new URL(`https://www.amazon.in/dp/${asin.toUpperCase()}`);
  cleanUrl.searchParams.set('tag', affiliateTag);
  return cleanUrl.toString();
}

export async function resolveAmazonProductUrl(value: string): Promise<string> {
  if (!isAmazonShortUrl(value)) {
    return cleanAmazonProductUrl(value);
  }

  const response = await fetch(value, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',
    },
  });

  return cleanAmazonProductUrl(response.url);
}

export function replaceLastAmazonUrl(text: string, canonicalUrl: string): string {
  const matches = [...text.matchAll(AMAZON_LINK_PATTERN)];
  const lastMatch = matches[matches.length - 1];

  if (!lastMatch || lastMatch.index === undefined) {
    return text;
  }

  return `${text.slice(0, lastMatch.index)}${canonicalUrl}${text.slice(lastMatch.index + lastMatch[0].length)}`;
}

export function cleanAmazonImageUrl(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/\._[^.]+_(?=\.[a-z0-9]{3,4}(?:$|\?))/i, '');
}
