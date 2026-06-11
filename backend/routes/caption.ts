import express from 'express';
import { CaptionGeneration } from '../controllers/captionController';

const router = express.Router();

// Endpoint for Gemini API caption generation
router.post('/', CaptionGeneration);

export default router;
