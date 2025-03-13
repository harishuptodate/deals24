
const express = require('express');
const router = express.Router();
const telegramRoutes = require('./telegram');

// Telegram routes - we'll mount these at /api/telegram in index.js
router.use('/telegram', telegramRoutes);

module.exports = router;
