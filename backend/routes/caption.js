const express = require('express');
const router = express.Router();
const { testCaptionGeneration } = require('../controllers/captionController');

// Test endpoint for Gemini API caption generation
router.post('/test', testCaptionGeneration);

module.exports = router;
