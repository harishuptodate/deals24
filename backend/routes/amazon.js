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
		function getISTDate() {
			const nowInIST = new Date().toLocaleString('en-US', {
				timeZone: 'Asia/Kolkata',
			});
			return new Date(nowInIST);
		}
		const istDate = getISTDate();
	res.setHeader('Last-Modified', istDate.toUTCString());

	res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()); // 1 year
};

// Route to fetch image from Telegram and cache in Redis
router.get('/download-image/:fileId', async (req, res) => {
	const { fileId } = req.params;
	const token = process.env.TELEGRAM_BOT_TOKEN;

	if (!token) {
		return res.status(500).json({ error: 'Bot token not configured' });
	}

	try {
		// Set ETag
		const etag = `"${fileId}"`;
		res.setHeader('ETag', etag);

		// Return 304 if client's ETag matches
		if (req.headers['if-none-match'] === etag) {
			return res.status(304).end();
		}

		// Check Redis cache first
		const redisKey = `tg-image:${fileId}`;
		const cachedBuffer = await redis.getBuffer(redisKey);

		if (cachedBuffer) {
			console.log('✅ Serving image from Redis cache');
			const istDate = getISTDate();
			// Set strong caching headers
			res.setHeader('Content-Type', 'image/jpeg');
			res.setHeader('Content-Disposition', `inline; filename=${fileId}.jpg`);
			res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
			res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
			res.setHeader('Last-Modified', istDate.toUTCString());

			return res.send(cachedBuffer);
		}

		// Fetch image from Telegram
		const fileInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
		const fileInfoData = await fileInfoResponse.json();

		if (!fileInfoData.ok) {
			return res.status(404).json({ error: 'File not found' });
		}

		const filePath = fileInfoData.result.file_path;
		const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);

		if (!fileResponse.ok) {
			return res.status(404).json({ error: 'Failed to download file' });
		}

		const buffer = await fileResponse.arrayBuffer();
		const imageBuffer = Buffer.from(buffer);

		// Store in Redis
		await redis.set(redisKey, imageBuffer, 'EX', 60 * 60 * 24);

		// Set headers again
		res.setHeader('Content-Type', 'image/jpeg');
		res.setHeader('Content-Disposition', `inline; filename=${fileId}.jpg`);
		res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
		res.setHeader('ETag', etag);
		res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
		res.setHeader('Last-Modified', new Date().toUTCString());

		return res.send(imageBuffer);

	} catch (error) {
		console.error('Image download error:', error);
		return res.status(500).json({ error: 'Image download failed' });
	}
});


// Other Amazon routes
router.post('/fetch-product-image', amazonController.fetchProductImage);
router.get('/products', amazonController.getStoredProducts);

module.exports = router;
