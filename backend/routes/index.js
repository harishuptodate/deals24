
const express = require('express');
const router = express.Router();
const telegramRoutes = require('./telegram');
const amazonRoutes = require('./amazon');

// Telegram routes - we'll mount these at /api/telegram in index.js
router.use('/telegram', telegramRoutes);

// Amazon routes - we'll mount these at /api/amazon in index.js
router.use('/amazon', amazonRoutes);

module.exports = router;
