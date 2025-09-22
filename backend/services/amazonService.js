
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetries(url, options, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      console.warn(`Fetch failed (try ${i + 1}/${retries}), status: ${res.status}`);
    } catch (e) {
      console.warn(`Fetch error on attempt ${i + 1}:`, e.message);
    }
    
    // Wait longer between retries for this API
    if (i < retries - 1) {
      console.log(`Waiting ${delayMs}ms before retry...`);
      await delay(delayMs);
    }
  }
  throw new Error(`Failed to fetch after ${retries} retries`);
}

async function fetchProductImage(amazonUrl) {
  try {
    console.log('Fetching Amazon product image for URL:', amazonUrl);

    if (!amazonUrl.includes("amazon.") && !amazonUrl.includes("amzn.to")) {
      console.log('Invalid Amazon URL provided');
      return { error: "Please provide a valid Amazon product URL" };
    }

    // Add delay before making the API call to be respectful
    // console.log('Adding initial delay before API call...');
    await delay(1000);

    // Use the new API endpoint
    const apiUrl = `https://amznpf.vercel.app/api/fetch-image?url=${encodeURIComponent(amazonUrl)}`;
    console.log('Calling Amazon API:', apiUrl);

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
      console.log('Successfully fetched image URL from API:', result.data.imageUrl);
      
      return {
        success: true,
        imageUrl: result.data.imageUrl,
        title: result.data.title || "Amazon Product"
      };
    } else {
      console.log('API returned error or no image URL:', result.error || 'No image URL found');
      return { error: result.error || "Could not fetch product image from API" };
    }

  } catch (error) {
    console.error("Error fetching Amazon product from API:", error.message);
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
