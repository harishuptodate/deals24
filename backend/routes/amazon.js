
const express = require('express');
const router = express.Router();
const amazonController = require('../controllers/amazonController');

// Fetch product image from Amazon URL
router.post('/fetch-product-image', amazonController.fetchProductImage);

// Get stored products
router.get('/products', amazonController.getStoredProducts);

// Download image proxy endpoint for Telegram images - WITH CACHING
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
    
    const filePath = fileInfoData.result.file_path;
    
    // Download the actual file
    const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    
    if (!fileResponse.ok) {
      return res.status(404).json({ error: 'Failed to download file' });
    }

    const buffer = await fileResponse.arrayBuffer();

    // Set appropriate headers WITH AGGRESSIVE CACHING
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename=${filePath.split('/').pop()}`);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.setHeader('ETag', `"${fileId}"`); // Use fileId as ETag for caching
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()); // 1 year from now
    
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Failed to download image:', error);
    res.status(500).json({ error: 'Image download failed' });
  }
});

module.exports = router;
