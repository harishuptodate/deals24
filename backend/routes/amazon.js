const express = require('express');
const router = express.Router();
const amazonController = require('../controllers/amazonController');
const redis = require('../services/redis-Service');

// Helper function to set image headers
const setImageHeaders = (res, fileId, filename) => {
	res.setHeader('Content-Type', 'image/jpeg');
	res.setHeader('Content-Disposition', `inline; filename=${filename}`);
	res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
	res.setHeader('ETag', `"${fileId}"`); // Use fileId as ETag for caching

	// Fix the Last-Modified header to use proper IST time
	const nowInIST = new Date().toLocaleString('en-US', {
		timeZone: 'Asia/Kolkata',
	});
	const istDate = new Date(nowInIST);
	res.setHeader('Last-Modified', istDate.toUTCString());

	res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()); // Cache for 1 year
};

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
		// Check Redis cache first
		const redisKey = `tg-image:${fileId}`;
		const cachedBuffer = await redis.getBuffer(redisKey);

		if (cachedBuffer) {
			console.log('Serving from Redis cache');
			setImageHeaders(res, fileId, `${fileId}.jpg`);
			return res.send(cachedBuffer);
		}

		// Get file info from Telegram
		const fileInfoResponse = await fetch(
			`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
		);
		const fileInfoData = await fileInfoResponse.json();

		if (!fileInfoData.ok) {
			return res.status(404).json({ error: 'File not found' });
		}

		const filePath = fileInfoData.result.file_path;

		// Download the actual file
		const fileResponse = await fetch(
			`https://api.telegram.org/file/bot${token}/${filePath}`,
		);

		if (!fileResponse.ok) {
			return res.status(404).json({ error: 'Failed to download file' });
		}

		const buffer = await fileResponse.arrayBuffer();

		// Cache the image in Redis for 1 day
		await redis.set(redisKey, Buffer.from(buffer), 'EX', 60 * 60 * 24);

		// Set headers and send response
		setImageHeaders(res, fileId, filePath.split('/').pop());
		res.send(Buffer.from(buffer));
	} catch (error) {
		console.error(`Failed to download image: ${error.name}: ${error.message}`);
		res.status(500).json({ error: 'Image download failed' });
	}
});

module.exports = router;
