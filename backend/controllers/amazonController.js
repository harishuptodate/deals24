
const amazonService = require('../services/amazonService');

// Get product image by URL
exports.getProductImage = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const imageUrl = await amazonService.getProductImageUrl(url);
    
    if (!imageUrl) {
      return res.status(404).json({ error: 'Image not found for the given URL' });
    }
    
    return res.json({ imageUrl });
  } catch (error) {
    console.error('Error in getProductImage controller:', error);
    return res.status(500).json({ error: 'Failed to fetch product image' });
  }
};

// Get product details by URL
exports.getProductDetails = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const asin = amazonService.extractAsin(url);
    
    if (!asin) {
      return res.status(400).json({ error: 'Invalid Amazon product URL' });
    }
    
    const productDetails = await amazonService.getProductDetails(asin);
    
    if (!productDetails) {
      return res.status(404).json({ error: 'Product details not found' });
    }
    
    return res.json(productDetails);
  } catch (error) {
    console.error('Error in getProductDetails controller:', error);
    return res.status(500).json({ error: 'Failed to fetch product details' });
  }
};
