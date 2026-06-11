import express, { type Request, type Response } from 'express';
import ClickStat from '../models/clickStat.model';
import { getStats } from '../controllers/stats.controller';

const router = express.Router();

router.get('/stats', getStats);

router.post('/stats/record-view', async (_req: Request, res: Response) => {
  try {
    // Get today's date and set to beginning of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Update or create today's record
    const result = await ClickStat.findOneAndUpdate(
      { date: today },
      { $inc: { clicks: 1 } },
      { upsert: true, new: true }
    );
    console.log('This is not from mobile-phone/BeaconAPI, Updated or created record:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error recording view:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

export default router;
