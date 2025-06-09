
const express = require('express');
const router = express.Router();
const amazonController = require('../controllers/amazonController');

// Fetch product image from Amazon URL
router.post('/fetch-product-image', amazonController.fetchProductImage);

// Get stored products
router.get('/products', amazonController.getStoredProducts);

// Download image proxy endpoint for Telegram images - NO CACHING
router.get('/download-image/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  try {
    // Get file info from Telegram
    const fileInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const fileInfoData = await fileInfoResponse.json();

    if (!fileInfoData.ok) {
      return res.status(404).json({ error: 'File not found' });
    }
    console.log(fileInfoData);
    const filePath = fileInfoData.result.file_path;
    console.log(filePath);
    // Download the actual file
    const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    
    if (!fileResponse.ok) {
      return res.status(404).json({ error: 'Failed to download file' });
    }

    const buffer = await fileResponse.arrayBuffer();

    // Set appropriate headers WITHOUT caching
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename=${filePath.split('/').pop()}`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Disable caching
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Failed to download image:', error);
    res.status(500).json({ error: 'Image download failed' });
  }
});

module.exports = router;
