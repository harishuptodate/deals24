const express = require('express');
const router = express.Router();
const amazonController = require('../controllers/amazonController');
const {redis} = require('../services/redisClient');

// Helper function to set image caching headers
const setImageHeaders = (res, fileId, filename) => {
	res.setHeader('Content-Type', 'image/jpeg');
	res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
	res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
	res.setHeader('ETag', `"${fileId}"`);

	// Use current time in IST
	const nowInIST = new Date().toLocaleString('en-US', {
		timeZone: 'Asia/Kolkata',
	});
	const istDate = new Date(nowInIST);
	res.setHeader('Last-Modified', istDate.toUTCString());

	res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()); // 1 year
};

// Route to fetch image from Telegram and cache in Redis
router.get('/download-image/:fileId', async (req, res) => {
	const { fileId } = req.params;
	const token = process.env.TELEGRAM_BOT_TOKEN;

	if (!token) {
		return res.status(500).json({ error: 'Telegram bot token not configured' });
	}

	try {
		const redisKey = `tg-image:${fileId}`;
		const base64Data = await redis.get(redisKey);

		if (base64Data) {
			console.log('✅ Serving image from Redis cache');
			const buffer = Buffer.from(base64Data, 'base64');
			setImageHeaders(res, fileId, `${fileId}.jpg`);
			return res.send(buffer);
		}

		// 1. Fetch file info from Telegram API
		const fileInfoRes = await fetch(
			`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
		);
		const fileInfo = await fileInfoRes.json();

		if (!fileInfo.ok) {
			console.warn(`File not found: ${fileId}`);
			return res.status(404).json({ error: 'File not found' });
		}

		const filePath = fileInfo.result.file_path;

		// 2. Download the actual image file
		const fileRes = await fetch(
			`https://api.telegram.org/file/bot${token}/${filePath}`
		);

		if (!fileRes.ok) {
			console.warn(`Download failed: ${filePath}`);
			return res.status(404).json({ error: 'Failed to download image' });
		}

		const arrayBuffer = await fileRes.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// 3. Cache image in Redis (as base64) for 1 day
		await redis.set(redisKey, buffer.toString('base64'), 'EX', 86400);

		// 4. Set headers and respond with image
		setImageHeaders(res, fileId, filePath.split('/').pop());
		res.send(buffer);
	} catch (err) {
		console.error('❌ Image download failed:', err.message);
		res.status(500).json({ error: 'Image download failed' });
	}
});

// Other Amazon routes
router.post('/fetch-product-image', amazonController.fetchProductImage);
router.get('/products', amazonController.getStoredProducts);

module.exports = router;
