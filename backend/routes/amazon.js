const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // or use global fetch in Node 18+
const {redis} = require('../services/redisClient');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// 🔧 Set HTTP cache headers
function setImageHeaders(res, fileId, filename) {
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('ETag', `"${fileId}"`);

  const nowIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  res.setHeader('Last-Modified', new Date(nowIST).toUTCString());
  res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()); // 1 year
}

// 🖼 Download proxy endpoint
router.get('/download-image/:fileId', async (req, res) => {
  const { fileId } = req.params;

  if (!TELEGRAM_BOT_TOKEN) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  const redisKey = `tg-image:${fileId}`;
  const etag = `"${fileId}"`;

  // 💡 Conditional GET support
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  try {
    // ✅ Check Redis for cached image (as Buffer)
    const cachedBuffer = await redis.getBuffer(redisKey);
    if (cachedBuffer) {
      console.log('✅ Served image from Redis');
      setImageHeaders(res, fileId, `${fileId}.jpg`);
      return res.send(cachedBuffer);
    }

    // 🔄 If not in Redis, fetch from Telegram
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = fileInfo.result.file_path;
    const imageRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`);
    const imageArrayBuffer = await imageRes.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    // 💾 Cache in Redis for 24 hours
    await redis.set(redisKey, imageBuffer, 'EX', 86400);

    setImageHeaders(res, fileId, filePath.split('/').pop());
    res.send(imageBuffer);
  } catch (err) {
    console.error('❌ Failed to serve image:', err.message);
    res.status(500).json({ error: 'Image download failed' });
  }
});

module.exports = router;
