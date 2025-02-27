
const express = require('express');
const router = express.Router();
const TelegramMessage = require('../models/TelegramMessage');
const { extractLinks } = require('../utils/messageParser');

// Get paginated messages
router.get('/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor; // Date-based cursor for pagination
    
    let query = {};
    if (cursor) {
      query.date = { $lt: new Date(cursor) };
    }
    
    // Get one more than the limit to check if there are more results
    const messages = await TelegramMessage.find(query)
      .sort({ date: -1 })
      .limit(limit + 1)
      .lean();
    
    // Check if there are more results
    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    
    // Format the response
    const formattedData = data.map(msg => ({
      id: msg._id.toString(),
      text: msg.text,
      date: msg.date.toISOString(),
      link: msg.link,
      imageUrl: msg.imageUrl
    }));
    
    // Get the next cursor
    const nextCursor = hasMore && data.length > 0 
      ? data[data.length - 1].date.toISOString() 
      : null;
    
    res.json({
      data: formattedData,
      hasMore,
      nextCursor
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
    
    res.json({
      id: message._id.toString(),
      text: message.text,
      date: message.date.toISOString(),
      link: message.link,
      imageUrl: message.imageUrl
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

module.exports = router;
