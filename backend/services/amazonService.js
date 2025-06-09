const { parse } = require('node-html-parser');
const fetch = require('node-fetch'); // Only if needed for Node environments

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetries(url, options, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      console.warn(`Fetch failed (try ${i + 1}/${retries}), status: ${res.status}`);
    } catch (e) {
      console.warn(`Fetch error on attempt ${i + 1}:`, e.message);
    }
    await delay(delayMs);
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

    if (amazonUrl.includes("amzn.to")) {
      console.log('Resolving short Amazon URL...');
      const response = await fetchWithRetries(amazonUrl, { redirect: "follow" });
      amazonUrl = response.url;
      console.log('Resolved URL:', amazonUrl);
    }

    console.log('Fetching Amazon product page...');
    const response = await fetchWithRetries(amazonUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.amazon.in/",
      },
      timeout: 4000, // Optional: if you use a fetch lib that supports timeout
    });

    const html = await response.text();
    const root = parse(html);

    const titleElement = root.querySelector("#productTitle");
    const title = titleElement ? titleElement.text.trim() : "Unknown Product";
    console.log('Product title:', title);

    let imageUrl = "";

    const mainImageElement =
      root.querySelector("#landingImage") ||
      root.querySelector("#imgBlkFront") ||
      root.querySelector("#ebooksImgBlkFront") ||
      root.querySelector("img#main-image") ||
      root.querySelector("img#imgTagWrapperId img");

    if (mainImageElement) {
      imageUrl = mainImageElement.getAttribute("data-old-hires") ||
                 mainImageElement.getAttribute("src") || "";
    }

    if (!imageUrl) {
      console.log('Trying alternative image extraction method...');
      const scriptTags = root.querySelectorAll("script");
      for (const script of scriptTags) {
        const content = script.text;
        const match = content.match(/"hiRes"\s*:\s*"([^"]+)"/) ||
                      content.match(/"large"\s*:\s*"([^"]+)"/) ||
                      content.match(/"mainUrl"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          imageUrl = match[1];
          console.log('Found image URL from script tag:', imageUrl);
          break;
        }
      }
    }

    if (!imageUrl) {
      console.log('Could not find product image');
      return { error: "Could not find product image" };
    }

    console.log('Successfully extracted image URL:', imageUrl);

    return {
      success: true,
      imageUrl,
      title
    };
  } catch (error) {
    console.error("Error fetching Amazon product:", error.message);
    return { error: "Failed to fetch product information" };
  }
}

async function getStoredProducts() {
  return [];
}

module.exports = {
  fetchProductImage,
  getStoredProducts
};
