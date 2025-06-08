const { parse } = require('node-html-parser');

async function fetchProductImage(amazonUrl) {
  try {
    console.log('Fetching Amazon product image for URL:', amazonUrl);
    
    // Validate the URL is from Amazon
    if (!amazonUrl.includes("amazon.") && !amazonUrl.includes("amzn.to")) {
      console.log('Invalid Amazon URL provided');
      return { error: "Please provide a valid Amazon product URL" };
    }

    // Handle short links (amzn.to)
    if (amazonUrl.includes("amzn.to")) {
      console.log('Resolving short Amazon URL...');
      const response = await fetch(amazonUrl, { redirect: "follow" });
      amazonUrl = response.url;
      console.log('Resolved URL:', amazonUrl);
    }

    // Fetch the product page
    console.log('Fetching Amazon product page...');
    const response = await fetch(amazonUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.log('Failed to fetch Amazon page, status:', response.status);
      return { error: "Failed to fetch product information" };
    }

    const html = await response.text();
    const root = parse(html);

    // Extract product title
    const titleElement = root.querySelector("#productTitle");
    const title = titleElement ? titleElement.text.trim() : "Unknown Product";
    console.log('Product title:', title);

    // Extract product image
    // Amazon uses different image selectors, so we try multiple options
    let imageUrl = "";

    // Try to find the main product image
    const mainImageElement =
      root.querySelector("#landingImage") ||
      root.querySelector("#imgBlkFront") ||
      root.querySelector("#ebooksImgBlkFront");

    if (mainImageElement && mainImageElement.getAttribute("data-old-hires")) {
      imageUrl = mainImageElement.getAttribute("data-old-hires") || "";
      console.log('Found image URL from data-old-hires:', imageUrl);
    } else if (mainImageElement && mainImageElement.getAttribute("src")) {
      imageUrl = mainImageElement.getAttribute("src") || "";
      console.log('Found image URL from src:', imageUrl);
    }

    // If we couldn't find the image, try another approach
    if (!imageUrl) {
      console.log('Trying alternative image extraction method...');
      const scriptTags = root.querySelectorAll("script");
      for (const script of scriptTags) {
        const content = script.text;
        if (content.includes("'colorImages'")) {
          const match = content.match(/"large":"([^"]+)"/);
          if (match && match[1]) {
            imageUrl = match[1];
            console.log('Found image URL from script tag:', imageUrl);
            break;
          }
        }
      }
    }

    if (!imageUrl) {
      console.log('Could not find product image');
      return { error: "Could not find product image" };
    }

    console.log('Successfully extracted image URL:', imageUrl);
    
    // Return just the image URL without storing anything
    return { 
      success: true, 
      imageUrl: imageUrl,
      title: title 
    };
    
  } catch (error) {
    console.error("Error fetching Amazon product:", error);
    return { error: "Failed to process the Amazon link" };
  }
}

// Keep this for backward compatibility but return empty array
async function getStoredProducts() {
  return [];
}

module.exports = {
  fetchProductImage,
  getStoredProducts
};
