const DEFAULT_FALLBACK_API_URL = 'https://amznpf.vercel.app/api/fetch-image';

type AmazonFallbackResponse = {
  success?: boolean;
  error?: string;
  data?: {
    imageUrl?: string;
    title?: string;
  };
};

export type AmazonFallbackProduct = {
  imageUrl: string;
  title: string;
};

export async function fetchAmazonProductFallback(
  amazonUrl: string,
  endpoint = process.env.AMAZON_IMAGE_FALLBACK_API_URL?.trim() || DEFAULT_FALLBACK_API_URL,
): Promise<AmazonFallbackProduct> {
  const response = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ amazonUrl, retries: 1 }),
  });

  const result = await response.json() as AmazonFallbackResponse;
  if (!response.ok || !result.success || !result.data?.imageUrl) {
    throw new Error(result.error || `Amazon fallback returned HTTP ${response.status}`);
  }

  return {
    imageUrl: result.data.imageUrl,
    title: result.data.title || 'Amazon Product',
  };
}
