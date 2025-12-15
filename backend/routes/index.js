const express = require('express');
const router = express.Router();
const telegramRoutes = require('./telegram');
const captionRoutes = require('./caption');

// Telegram routes - we'll mount these at /api/telegram in index.js
router.use('/telegram', telegramRoutes);
// Caption generation routes - mounted at /api/caption
router.use('/caption', captionRoutes);
router.get('/health', (req, res) => {
	res.status(200).json('Backend is up and running');
});
module.exports = router;
