
const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/stats.controller');

router.get('/stats/:messageId', getStats);

module.exports = router;
