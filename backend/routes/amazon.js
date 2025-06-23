const express = require('express');
const router = express.Router();
const amazonController = require('../controllers/amazonController');
const { redis } = require('../services/redisClient');

// Helper: Set HTTP cache headers for long-term browser storage
const setImageHeaders = (res, fileId, filename) => {
	res.setHeader('Content-Type', 'image/jpeg');
	res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
	res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
	res.setHeader('ETag', `"${fileId}"`);

	const nowIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
	const istDate = new Date(nowIST);
	res.setHeader('Last-Modified', istDate.toUTCString());
	res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
};

// Route: Image proxy + hybrid caching
router.get('/download-image/:fileId', async (req, res) => {
	const { fileId } = req.params;
	const redisKey = `tg-image:${fileId}`;
	const etag = `"${fileId}"`;
	const token = process.env.TELEGRAM_BOT_TOKEN;

	if (!token) {
		return res.status(500).json({ error: 'Telegram bot token not configured' });
	}

	// 💡 Early return: If browser already has cached copy
	if (req.headers['if-none-match'] === etag) {
		return res.status(304).end(); // Not Modified
	}

	try {
		// 🔁 Try Redis first
		const base64Data = await redis.get(redisKey);
		if (base64Data) {
			console.log('✅ Serving image from Redis cache');
			const buffer = Buffer.from(base64Data, 'base64');
			setImageHeaders(res, fileId, `${fileId}.jpg`);
			return res.send(buffer);
		}

		// 📥 Step 1: Get Telegram file path
		const infoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
		const infoData = await infoRes.json();

		if (!infoData.ok || !infoData.result?.file_path) {
			console.warn(`⚠️ File info not found for ID: ${fileId}`);
			return res.status(404).json({ error: 'File not found' });
		}

		const filePath = infoData.result.file_path;

		// 📥 Step 2: Download image
		const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
		if (!imgRes.ok) {
			console.warn(`⚠️ Image download failed: ${filePath}`);
			return res.status(404).json({ error: 'Failed to download image' });
		}

		const buffer = Buffer.from(await imgRes.arrayBuffer());

		// 💾 Step 3: Cache in Redis (base64 for safe transport)
		await redis.set(redisKey, buffer.toString('base64'), 'EX', 86400); // 1 day

		// 📤 Step 4: Set headers & respond
		setImageHeaders(res, fileId, filePath.split('/').pop());
		res.send(buffer);
	} catch (err) {
		console.error('❌ Image proxy error:', err.message);
		res.status(500).json({ error: 'Image download failed' });
	}
});

// Other routes
router.post('/fetch-product-image', amazonController.fetchProductImage);
router.get('/products', amazonController.getStoredProducts);

module.exports = router;
