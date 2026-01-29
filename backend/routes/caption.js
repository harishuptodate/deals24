const express = require('express');
const router = express.Router();
const { CaptionGeneration } = require('../controllers/captionController');

// Endpoint for Gemini API caption generation
router.post('/', CaptionGeneration);

module.exports = router;
