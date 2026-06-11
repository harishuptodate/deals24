import express, { type Request, type Response } from 'express';
import captionRoutes from './caption';
import telegramRoutes from './telegram';

const router = express.Router();

// Telegram routes - we'll mount these at /api/telegram in index.js
router.use('/telegram', telegramRoutes);
// Caption generation routes - mounted at /api/caption
router.use('/caption', captionRoutes);
router.get('/health', (_req: Request, res: Response) => {
	res.status(200).json('Backend is up and running');
});

export default router;
