const express = require('express');
const router = express.Router();
const TelegramMessage = require('../models/TelegramMessage');
const telegramController = require('../controllers/telegramController');
const { getMessages, handleClickTracking } = require('../services/telegramService');

// Set up cache middleware for stable data with configurable parameters and defaults
const cacheMiddleware = (maxAge = 60, staleWhileRevalidate = 300) => {
  return (req, res, next) => {
    // Set caching headers with both configurable parameters
    res.setHeader('Cache-Control', `max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
    next();
  };
};

// Webhook endpoint for Telegram updates
router.post('/webhook', telegramController.handleTelegramWebhook);

// Fix — Put This Route First in Your Route File:
// Get category counts - Fresh for 1 minute, stale for 5 minutes
router.get('/categories/counts', cacheMiddleware(60, 300), async (req, res) => {
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

// Get paginated messages with support for category and search
router.get('/messages', async (req, res) => {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const search = req.query.search;

    // Only cache if there's no search parameter
    if (!search) {
      res.setHeader('Cache-Control', 'max-age=60, stale-while-revalidate=300');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

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

// Get a single message by ID - Cache for 1 minute, stale for 5 minutes
router.get('/messages/:id', cacheMiddleware(60, 300), async (req, res) => {
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

// Track clicks on a message link - No caching
router.post('/messages/:id/click', async (req, res) => {
  try {
    await handleClickTracking(req, res);
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// New endpoint with different naming to avoid ad blockers - No caching
router.post('/messages/:id/today', async (req, res) => {
  try {
    await handleClickTracking(req, res);
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({ error: 'Failed to track engagement' });
  }
});

// Edit a message text - No caching
router.put('/messages/:id', telegramController.updateMessageText);

// Update message category - No caching
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

// Get messages by category - Fresh for 1 minute, stale for 5 minutes
router.get('/categories/:category', cacheMiddleware(60, 300), async (req, res) => {
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

// Search messages - No caching for search results
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

// Route to delete a message by ID - No caching
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

// Get analytics for click tracking - Fresh for 1 minute, stale for 10 minutes
router.get('/analytics/clicks', cacheMiddleware(60, 300), telegramController.getClickAnalytics);

// Get top performing messages - Fresh for 1 minute, stale for 5 minutes
router.get('/analytics/top-performing', cacheMiddleware(60, 300), telegramController.getTopPerforming);

// Get all available categories - Fresh for 5 minutes, stale for 5 minutes
router.get('/categories', cacheMiddleware(300, 300), async (req, res) => {
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

module.exports = router;
