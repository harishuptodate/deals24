
const express = require('express');
const router = express.Router();
const TelegramMessage = require('../models/TelegramMessage');
const { handleTelegramWebhook } = require('../controllers/telegramController');

// Webhook endpoint for Telegram updates
router.post('/webhook', handleTelegramWebhook);

// Get paginated messages
router.get('/messages', async (req, res) => {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 10;
    
    let query = {};
    if (cursor) {
      query.date = { $lt: new Date(cursor) };
    }
    
    const messages = await TelegramMessage.find(query)
      .sort({ date: -1 })
      .limit(limit + 1)
      .lean();
    
    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    
    res.json({
      data,
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].date.toISOString() : null
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get a single message by ID
router.get('/messages/:id', async (req, res) => {
  try {
    const message = await TelegramMessage.findById(req.params.id).lean();
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

module.exports = router;
