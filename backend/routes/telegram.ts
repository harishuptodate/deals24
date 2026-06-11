import express, { type Request, type Response } from 'express';
import TelegramMessage from '../models/TelegramMessage';
import * as telegramController from '../controllers/telegramController';
import { cacheHybrid } from '../services/redisClient';
import { getMessages, handleClickTracking } from '../services/telegramService';

const router = express.Router();

type TelegramListQuery = {
  cursor?: string;
  limit?: string;
  category?: string;
  search?: string;
  from?: string;
  to?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  query?: string;
};

type MessageIdParams = { id: string };
type CategoryParams = { category: string };
type UpdateCategoryBody = { category?: string };
type TelegramListRequest = Request<unknown, unknown, unknown, TelegramListQuery>;
type MessageRequest = Request<MessageIdParams>;
type CategoryRequest = Request<CategoryParams, unknown, unknown, TelegramListQuery>;
type UpdateCategoryRequest = Request<MessageIdParams, unknown, UpdateCategoryBody>;

// Webhook endpoint for Telegram updates
router.post('/webhook', telegramController.handleTelegramWebhook);

// Fix — Put This Route First in Your Route File:
// Get category counts - Fresh for 1 minute, stale for 5 minutes
router.get('/categories/counts', 
  cacheHybrid(() => 'categories:counts', 60, 60, 300),
  async (_req: Request, res: Response) => {
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
router.get('/messages', 
    cacheHybrid(
    (req: TelegramListRequest) => {
      // Skip Redis caching if there's a search query
      if (req.query.search) return null;

      const category = req.query.category || 'all';
      const cursor = req.query.cursor || '0';
      const limit = req.query.limit || '10';
      const from = req.query.from || '';
      const to = req.query.to || '';
      const minPrice = req.query.minPrice || '';
      const maxPrice = req.query.maxPrice || '';
      const sort = req.query.sort || '';
      return `messages:category=${category}&cursor=${cursor}&limit=${limit}&from=${from}&to=${to}&minPrice=${minPrice}&maxPrice=${maxPrice}&sort=${sort}`;
    },
    60,  // Redis TTL (1 min)
    60,  // HTTP max-age
    300  // HTTP stale-while-revalidate
  ),
  async (req: TelegramListRequest, res: Response) => {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const search = req.query.search;
    const from = req.query.from;
    const to = req.query.to;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const sort = req.query.sort;

    // Only cache if there's no search parameter
    // if (!search) {
    //   res.setHeader('Cache-Control', 'max-age=60, stale-while-revalidate=300');
    // } else {
    //   res.setHeader('Cache-Control', 'no-cache');
    // }

    const messages = await getMessages({
      cursor,
      limit,
      category,
      search,
      from,
      to,
      minPrice,
      maxPrice,
      sort,
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get a single message by ID - Cache for 1 minute, stale for 5 minutes
router.get('/messages/:id', 
  cacheHybrid(
    (req: MessageRequest) => `message:id:${req.params.id}`,
    60,  // Redis TTL
    60,  // HTTP max-age
    300  // HTTP stale-while-revalidate
  ),
  async (req: MessageRequest, res: Response) => {
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

// New endpoint with different naming to avoid ad blockers - No caching
router.post('/messages/:id/today', async (req: MessageRequest, res: Response) => {
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
router.put('/messages/:id/category', async (req: UpdateCategoryRequest, res: Response) => {
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
router.get('/categories/:category', 
  cacheHybrid(
    (req: CategoryRequest) => {
      const category = req.params.category;
      const cursor = req.query.cursor || '0';
      const limit = req.query.limit || '10';
      return `messages:category:${category}&cursor=${cursor}&limit=${limit}`;
    },
    60,    // Redis TTL
    60,    // max-age
    300    // stale-while-revalidate
  ),
  async (req: CategoryRequest, res: Response) => {
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
router.get('/search', async (req: TelegramListRequest, res: Response) => {
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
router.delete('/messages/:id', async (req: MessageRequest, res: Response) => {
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

// Get analytics for click tracking - Fresh for 1 minute, stale for 5 minutes
router.get('/analytics/clicks', 
  cacheHybrid(() => 'analytics:clicks', 60, 60, 300),
  telegramController.getClickAnalytics);

// Get top performing messages - Fresh for 1 minute, stale for 10 minutes
router.get('/analytics/top-performing', 
  cacheHybrid(() => 'analytics:top-performing', 60, 60, 600),
  telegramController.getTopPerforming);

// Get all available categories - Fresh for 5 minutes, stale for 5 minutes
router.get('/categories', 
  cacheHybrid(() => 'categories:distinct', 300, 300, 300),
  async (_req: Request, res: Response) => {
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

export default router;
