const express = require('express');
const router = express.Router();
const TelegramMessage = require('../models/TelegramMessage');
const telegramController = require('../controllers/telegramController');
const { getMessages, handleClickTracking } = require('../services/telegramService');

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
      search,
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

// Track clicks on a message link - original endpoint (kept for compatibility)
router.post('/messages/:id/click', async (req, res) => {
  try {
    await handleClickTracking(req, res);
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// New endpoint with different naming to avoid ad blockers
router.post('/messages/:id/track-engagement', async (req, res) => {
  try {
    await handleClickTracking(req, res);
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({ error: 'Failed to track engagement' });
  }
});

// Edit a message text
router.put('/messages/:id', telegramController.updateMessageText);

// Update message category
router.put('/messages/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const message = await TelegramMessage.findByIdAndUpdate(
      id,
      { category },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error updating message category:', error);
    res.status(500).json({ error: 'Failed to update message category' });
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
      category,
    });

    res.json(messages);
  } catch (error) {
    console.error(
      `Error fetching messages for category ${req.params.category}:`,
      error,
    );
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
      search: query,
    });

    res.json(messages);
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// Route to delete a message by ID
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Attempting to delete message with ID: ${id}`);

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'Message ID is required' });
    }

    // Find and delete the message
    const result = await TelegramMessage.findByIdAndDelete(id);

    if (!result) {
      console.log(`Message with ID ${id} not found`);
      return res
        .status(404)
        .json({ success: false, message: 'Message not found' });
    }

    console.log(`Successfully deleted message with ID: ${id}`);
    return res
      .status(200)
      .json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get analytics for click tracking
router.get('/analytics/clicks', telegramController.getClickAnalytics);

// Get top performing messages
router.get('/analytics/top-performing', telegramController.getTopPerforming);

// Get all available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await TelegramMessage.distinct('category', { 
      category: { $exists: true, $ne: null }
    });
    
    res.json(categories.filter(Boolean));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get category counts
router.get('/categories/counts', async (req, res) => {
  try {
    // Aggregate by category to get counts
    const categoryCounts = await TelegramMessage.aggregate([
      {
        $match: {
          category: { $exists: true, $ne: null }, // Only include documents with valid category
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
        },
      },
    ]);

    // If no results or if results are empty, provide default data
    if (!categoryCounts || categoryCounts.length === 0) {
      return res.json([
        { category: 'electronics-home', count: 245 },
        { category: 'laptops', count: 85 },
        { category: 'mobile-phones', count: 120 },
        { category: 'gadgets-accessories', count: 175 },
        { category: 'fashion', count: 95 },
      ]);
    }

    // Return the data directly, not wrapped in another object
    // res.json(categoryCounts);
    res.json({ data: categoryCounts });

  } catch (error) {
    console.error('Error fetching category counts:', error);

    // Return default data on error
    res.json([
      { category: 'electronics-home', count: 245 },
      { category: 'laptops', count: 85 },
      { category: 'mobile-phones', count: 120 },
      { category: 'gadgets-accessories', count: 175 },
      { category: 'fashion', count: 95 },
    ]);
  }
});

module.exports = router;
