import express from 'express';
import { getStats, recordView } from '../controllers/stats.controller';

const router = express.Router();

router.get('/stats', getStats);
router.post('/stats/record-view', recordView);

export default router;
