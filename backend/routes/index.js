
const express = require('express');
const router = express.Router();
const telegramRoutes = require('./telegram');

// Telegram routes - we'll mount these at /api/telegram in index.js
router.use('/telegram', telegramRoutes);
router.get('/health', (req, res) => {
  res.status(200).json('Backend is up and running');
});
module.exports = router;
