
const express = require('express');
const router = express.Router();
const TelegramMessage = require('../models/TelegramMessage');
const telegramController = require('../controllers/telegramController');
const { getMessages, incrementClicks } = require('../services/telegramService');

// Webhook endpoint for Telegram updates
router.post('/webhook', telegramController.handleTelegramWebhook);

// Get paginated messages with support for category and search
router.get('/messages', async (req, res) => {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const search = req.query.search;
    
    const messages = await getMessages({
      cursor,
      limit,
      category,
      search
    });
    
    res.json(messages);
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

// Track clicks on a message link
router.post('/messages/:id/click', async (req, res) => {
  try {
    const updatedMessage = await incrementClicks(req.params.id);
    
    if (!updatedMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json({ success: true, clicks: updatedMessage.clicks });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Get messages by category
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 10;
    
    const messages = await getMessages({
      cursor,
      limit,
      category
    });
    
    res.json(messages);
  } catch (error) {
    console.error(`Error fetching messages for category ${req.params.category}:`, error);
    res.status(500).json({ error: 'Failed to fetch category messages' });
  }
});

// Search messages
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 10;
    
    const messages = await getMessages({
      cursor,
      limit,
      search: query
    });
    
    res.json(messages);
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// Route to delete a message by ID - making sure this works properly
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Attempting to delete message with ID: ${id}`);
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'Message ID is required' });
    }

    // Find and delete the message
    const result = await TelegramMessage.findByIdAndDelete(id);
    
    if (!result) {
      console.log(`Message with ID ${id} not found`);
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    console.log(`Successfully deleted message with ID: ${id}`);
    return res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get analytics for click tracking
router.get('/analytics/clicks', telegramController.getClickAnalytics);

// Get top performing messages
router.get('/analytics/top-performing', telegramController.getTopPerforming);

module.exports = router;
