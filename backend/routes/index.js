
const express = require('express');
const router = express.Router();
const telegramRoutes = require('./telegram');
const amazonRoutes = require('./amazon');

// Telegram routes
router.use('/telegram', telegramRoutes);

// Amazon routes
router.use('/amazon', amazonRoutes);

module.exports = router;
