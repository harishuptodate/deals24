import { createLogger } from './logger';
import { resolveAmazonProductUrl } from './amazon/amazonLink';
import { scrapeAmazonProduct } from './amazon/amazonScraper';
import { fetchAmazonProductFallback } from './amazon/amazonFallback';

const logger = createLogger('amazon-image');

export async function fetchProductImage(amazonUrl: string) {
  let canonicalUrl: string | undefined;

  try {
    canonicalUrl = await resolveAmazonProductUrl(amazonUrl);
    let product;

    try {
      product = await scrapeAmazonProduct(canonicalUrl);
    } catch (internalError) {
      const internalErrorMessage = internalError instanceof Error
        ? internalError.message
        : String(internalError);
      logger.warn(
        'Internal Amazon image fetch failed; trying fallback service.',
        { amazonUrl: canonicalUrl, error: internalErrorMessage },
        { event: 'amazon_image_fallback_started' },
      );

      product = {
        ...await fetchAmazonProductFallback(canonicalUrl),
        amazonUrl: canonicalUrl,
      };
    }

    logger.info(
      'Amazon image fetch succeeded.',
      { amazonUrl: canonicalUrl, imageUrl: product.imageUrl },
      { event: 'amazon_image_fetch_succeeded' },
    );

    return {
      success: true,
      imageUrl: product.imageUrl,
      title: product.title,
      amazonUrl: canonicalUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      'Amazon image fetch failed.',
      { amazonUrl: canonicalUrl || amazonUrl, error: errorMessage },
      { event: 'amazon_image_fetch_failed' },
    );
    return {
      error: errorMessage,
      amazonUrl: canonicalUrl,
    };
  }
}

export async function getStoredProducts() {
  return [];
}
