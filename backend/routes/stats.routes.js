
const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/stats.controller');

router.get('/stats', getStats);
router.post('/stats/record-view', async (req, res) => {
  try {
    const ClickStat = require('../models/clickStat.model');
    
    // Get today's date and set to beginning of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Update or create today's record
    const result = await ClickStat.findOneAndUpdate(
      { date: today },
      { $inc: { clicks: 1 } },
      { upsert: true, new: true }
    );
    console.log('Updated or created record:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error recording view:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

module.exports = router;
