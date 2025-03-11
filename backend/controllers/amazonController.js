
// This file should interact with the Amazon Product Advertising API
const amazonService = require('../services/amazonService');

// Get product image URL
exports.getProductImage = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product URL is required' 
      });
    }
    
    console.log(`Fetching image for Amazon product URL: ${url}`);
    
    // Extract ASIN from the URL
    const asin = amazonService.extractAsinFromUrl(url);
    
    if (!asin) {
      console.log('Could not extract ASIN from URL');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid Amazon URL. Could not extract product ID.' 
      });
    }
    
    console.log(`Extracted ASIN: ${asin}`);
    
    // Get the image URL from the Amazon API
    const imageUrl = await amazonService.getProductImageUrl(asin);
    
    if (!imageUrl) {
      console.log('No image URL found for the product');
      return res.status(404).json({ 
        success: false, 
        message: 'No image found for this product' 
      });
    }
    
    console.log(`Image URL found: ${imageUrl}`);
    
    return res.status(200).json({ 
      success: true, 
      imageUrl 
    });
  } catch (error) {
    console.error('Error fetching Amazon product image:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching product image', 
      error: error.message 
    });
  }
};

// Get detailed product information
exports.getProductDetails = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product URL is required' 
      });
    }
    
    // Extract ASIN from the URL
    const asin = amazonService.extractAsinFromUrl(url);
    
    if (!asin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid Amazon URL. Could not extract product ID.' 
      });
    }
    
    // Get the product details from the Amazon API
    const productDetails = await amazonService.getProductDetails(asin);
    
    if (!productDetails) {
      return res.status(404).json({ 
        success: false, 
        message: 'No details found for this product' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      productDetails 
    });
  } catch (error) {
    console.error('Error fetching Amazon product details:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching product details', 
      error: error.message 
    });
  }
};

// Helper function to check if Amazon API is configured
exports.checkApiConfiguration = async (req, res) => {
  try {
    const isConfigured = amazonService.isApiConfigured();
    
    return res.status(200).json({ 
      success: true, 
      isConfigured,
      message: isConfigured 
        ? 'Amazon API is properly configured' 
        : 'Amazon API is not configured. Please add credentials to your environment variables.'
    });
  } catch (error) {
    console.error('Error checking Amazon API configuration:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking API configuration', 
      error: error.message 
    });
  }
};
