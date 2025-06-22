const express = require('express');
const router = express.Router();
const {redis} = require('../services/redisClient'); // must export .getBuffer correctly
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Set image headers
const setImageHeaders = (res, fileId, filename) => {
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('ETag', `"${fileId}"`);
  res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());

  const ist = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(ist);
  res.setHeader('Last-Modified', istDate.toUTCString());
};

router.get('/download-image/:fileId', async (req, res) => {
  const { fileId } = req.params;

  if (!TELEGRAM_TOKEN) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  const redisKey = `tg-image:${fileId}`;
  const etag = `"${fileId}"`;

  // Conditional GET support
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // Browser can use local cache
  }

  try {
    // Check Redis first
    const cachedBuffer = await redis.getBuffer(redisKey);
    if (cachedBuffer) {
      console.log('✅ Served image from Redis');
      setImageHeaders(res, fileId, `${fileId}.jpg`);
      return res.send(cachedBuffer);
    }

    // Get file path from Telegram
    const fileInfoResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
    const fileInfoData = await fileInfoResp.json();

    if (!fileInfoData.ok) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = fileInfoData.result.file_path;

    // Download actual image
    const imageResp = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
    const arrayBuffer = await imageResp.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Cache to Redis for 1 day
    await redis.set(redisKey, imageBuffer, 'EX', 60 * 60 * 24); // 24h

    setImageHeaders(res, fileId, filePath.split('/').pop());
    return res.send(imageBuffer);

  } catch (error) {
    console.error('❌ Image download failed:', error);
    res.status(500).json({ error: 'Image download failed' });
  }
});

module.exports = router;
