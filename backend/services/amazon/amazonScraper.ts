import { parse } from 'node-html-parser';
import { cleanAmazonImageUrl } from './amazonLink';

export type AmazonProductData = {
  title: string;
  imageUrl: string;
  amazonUrl: string;
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.1 Safari/605.1.15',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function extractTitle(html: string): string {
  const root = parse(html);
  const selectors = [
    '#productTitle',
    '.product-title',
    "[data-automation-id='product-title']",
    'h1.a-size-large',
    'h1 span',
  ];

  for (const selector of selectors) {
    const title = root.querySelector(selector)?.text.trim();
    if (title) return title;
  }

  return 'Amazon Product';
}

function extractImageUrl(html: string): string | null {
  const root = parse(html);
  const selectors = [
    '#landingImage',
    '#imgBlkFront',
    '#ebooksImgBlkFront',
    '.a-dynamic-image',
    '[data-old-hires]',
    '.a-image-wrapper img',
  ];

  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (!element) continue;

    for (const attribute of ['data-old-hires', 'data-a-hires', 'src', 'data-src']) {
      const url = element.getAttribute(attribute);
      if (url?.startsWith('http')) return cleanAmazonImageUrl(url);
    }
  }

  for (const script of root.querySelectorAll('script')) {
    for (const pattern of [
      /"large":"([^"]+)"/,
      /"hiRes":"([^"]+)"/,
      /"main":{"[^"]+":"([^"]+)"/,
      /colorImages[^{]*{[^{]*"large":"([^"]+)"/,
    ]) {
      const match = script.text.match(pattern);
      if (!match?.[1]) continue;

      const decodedUrl = match[1]
        .replace(/\\u([\dA-F]{4})/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
        .replace(/\\\//g, '/');
      return cleanAmazonImageUrl(decodedUrl);
    }
  }

  const matches = html.match(/https:\/\/[^"'\s]*\.media-amazon\.com[^"'\s]*\.(?:jpg|jpeg|png|webp)/gi);
  return matches?.[0] ? cleanAmazonImageUrl(matches[0]) : null;
}

export async function scrapeAmazonProduct(amazonUrl: string): Promise<AmazonProductData> {
  const response = await fetch(amazonUrl, {
    signal: AbortSignal.timeout(15_000),
    headers: {
      'User-Agent': getRandomUserAgent(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9',
    },
  });

  if (response.status === 429 || response.status === 503) {
    throw new Error(`Amazon blocked the request (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`Amazon returned HTTP ${response.status}`);
  }

  const html = await response.text();
  if (/captcha|Robot Check/i.test(html)) {
    throw new Error('Amazon returned a CAPTCHA page');
  }

  const imageUrl = extractImageUrl(html);
  if (!imageUrl) {
    throw new Error('Could not find the product image in the Amazon page');
  }

  return {
    title: extractTitle(html),
    imageUrl,
    amazonUrl,
  };
}
