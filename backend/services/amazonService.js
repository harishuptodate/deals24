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
    } catch (e) {
    }
    
    // Wait longer between retries for this API
    if (i < retries - 1) {
      await delay(delayMs);
    }
  }
  throw new Error(`Failed to fetch after ${retries} retries`);
}

async function fetchProductImage(amazonUrl) {
  try {
    if (!amazonUrl.includes("amazon.") && !amazonUrl.includes("amzn.to")) {
      logger.warn('Amazon image fetch failed.', { amazonUrl, error: 'Invalid Amazon URL provided' }, { event: 'amazon_image_fetch_failed' });
      return { error: "Please provide a valid Amazon product URL" };
    }

    // Add delay before making the API call to be respectful
    // console.log('Adding initial delay before API call...');
    await delay(1000);

    // Use the new API endpoint
    const apiUrl = `https://amznpf.vercel.app/api/fetch-image?url=${encodeURIComponent(amazonUrl)}`;

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
        'Amazon image fetch succeeded.',
        { amazonUrl, apiUrl, imageUrl: result.data.imageUrl },
        { event: 'amazon_image_fetch_succeeded' },
      );
      
      return {
        success: true,
        imageUrl: result.data.imageUrl,
        title: result.data.title || "Amazon Product"
      };
    } else {
      logger.warn(
        'Amazon image fetch failed.',
        { amazonUrl, apiUrl, error: result.error || 'No image URL found' },
        { event: 'amazon_image_fetch_failed' },
      );
      return { error: result.error || "Could not fetch product image from API" };
    }

  } catch (error) {
    logger.error(
      'Amazon image fetch failed.',
      { amazonUrl, error: error.message },
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
