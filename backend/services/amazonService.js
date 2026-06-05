const { createLogger } = require('./logger');

const logger = createLogger('amazon-image');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetries(url, options, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      logger.warn(
        `Fetch failed (try ${i + 1}/${retries}), status: ${res.status}`,
        { attempt: i + 1, retries, status: res.status },
        { event: 'amazon_fetch_retryable_failure' },
      );
    } catch (e) {
      logger.warn(
        `Fetch error on attempt ${i + 1}`,
        { attempt: i + 1, retries, error: e.message },
        { event: 'amazon_fetch_retryable_failure' },
      );
    }
    
    // Wait longer between retries for this API
    if (i < retries - 1) {
      logger.info(
        `Waiting ${delayMs}ms before retry...`,
        { attempt: i + 1, delayMs },
        { event: 'amazon_fetch_retry_wait' },
      );
      await delay(delayMs);
    }
  }
  throw new Error(`Failed to fetch after ${retries} retries`);
}

async function fetchProductImage(amazonUrl) {
  try {
    logger.info(
      'Fetching Amazon product image for URL.',
      { amazonUrl },
      { event: 'amazon_image_fetch_started' },
    );

    if (!amazonUrl.includes("amazon.") && !amazonUrl.includes("amzn.to")) {
      logger.warn(
        'Invalid Amazon URL provided.',
        { amazonUrl },
        { event: 'amazon_invalid_url' },
      );
      return { error: "Please provide a valid Amazon product URL" };
    }

    // Add delay before making the API call to be respectful
    // console.log('Adding initial delay before API call...');
    await delay(1000);

    // Use the new API endpoint
    const apiUrl = `https://amznpf.vercel.app/api/fetch-image?url=${encodeURIComponent(amazonUrl)}`;
    logger.info(
      'Calling Amazon image API.',
      { apiUrl },
      { event: 'amazon_image_api_called' },
    );

    const response = await fetchWithRetries(apiUrl, {
      method: 'GET',
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      timeout: 8000, // Allow up to 8 seconds for the API response
    }, 2, 3000); // Retry 2 times with 3 second delays

    const result = await response.json();
    // console.log('Amazon API response:', result);

    if (result.success && result.data && result.data.imageUrl) {
      logger.info(
        'Successfully fetched image URL from API.',
        { imageUrl: result.data.imageUrl },
        { event: 'amazon_image_fetch_succeeded' },
      );
      
      return {
        success: true,
        imageUrl: result.data.imageUrl,
        title: result.data.title || "Amazon Product"
      };
    } else {
      logger.warn(
        'Amazon API returned error or no image URL.',
        { error: result.error || 'No image URL found' },
        { event: 'amazon_image_fetch_failed' },
      );
      return { error: result.error || "Could not fetch product image from API" };
    }

  } catch (error) {
    logger.error(
      'Error fetching Amazon product from API.',
      { error: error.message },
      { event: 'amazon_image_fetch_failed' },
    );
    return { error: "Failed to fetch product information from API" };
  }
}

async function getStoredProducts() {
  return [];
}

module.exports = {
  fetchProductImage,
  getStoredProducts
};
