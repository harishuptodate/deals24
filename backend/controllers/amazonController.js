
const { fetchProductImage, getStoredProducts } = require('../services/amazonService');

// Fetch product image from Amazon URL
exports.fetchProductImage = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Amazon URL is required' });
    }

    console.log('Amazon controller: Processing URL:', url);
    const result = await fetchProductImage(url);
    
    if (result.error) {
      console.log('Amazon controller: Error occurred:', result.error);
      return res.status(400).json(result);
    }

    console.log('Amazon controller: Success, returning result:', result);
    return res.json(result);
  } catch (error) {
    console.error('Error in fetchProductImage controller:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get stored products
exports.getStoredProducts = async (req, res) => {
  try {
    const products = await getStoredProducts();
    return res.json({ products });
  } catch (error) {
    console.error('Error in getStoredProducts controller:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
