import express, { type Request } from 'express';
import * as priceHistoryController from '../controllers/priceHistoryController';
import * as telegramController from '../controllers/telegramController';
import { cacheHybrid } from '../services/redisClient';

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
};
type TelegramListRequest = Request<unknown, unknown, unknown, TelegramListQuery>;
type MessageRequest = Request<{ id: string }>;
type CategoryRequest = Request<{ category: string }, unknown, unknown, TelegramListQuery>;

router.post('/webhook', telegramController.handleTelegramWebhook);

router.get(
  '/categories/counts',
  cacheHybrid(() => 'categories:counts', 60, 60, 300),
  telegramController.getCategoryCounts,
);

router.get(
  '/messages',
  cacheHybrid(
    (req: TelegramListRequest) => {
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
    60,
    0,
    0,
  ),
  telegramController.listMessages,
);

router.get('/messages/:id/price-history', priceHistoryController.getDealPriceHistory);
router.put('/messages/:id/price-history/:observationId', priceHistoryController.updateDealPriceHistory);
router.delete('/messages/:id/price-history/:observationId', priceHistoryController.deleteDealPriceHistory);

router.get(
  '/messages/:id',
  cacheHybrid((req: MessageRequest) => `message:id:${req.params.id}`, 60, 60, 300),
  telegramController.getMessage,
);
router.post('/messages/:id/today', telegramController.trackMessageEngagement);
router.put('/messages/:id', telegramController.updateMessageText);
router.put('/messages/:id/category', telegramController.updateMessageCategory);

router.get(
  '/categories/:category',
  cacheHybrid(
    (req: CategoryRequest) => {
      const cursor = req.query.cursor || '0';
      const limit = req.query.limit || '10';
      return `messages:category:${req.params.category}&cursor=${cursor}&limit=${limit}`;
    },
    60,
    60,
    300,
  ),
  telegramController.listCategoryMessages,
);

router.get('/search', telegramController.searchMessages);
router.delete('/messages/:id', telegramController.deleteMessage);

router.get(
  '/analytics/clicks',
  cacheHybrid(() => 'analytics:clicks', 60, 60, 300),
  telegramController.getClickAnalytics,
);
router.get(
  '/analytics/top-performing',
  cacheHybrid(() => 'analytics:top-performing', 60, 60, 600),
  telegramController.getTopPerforming,
);
router.get(
  '/categories',
  cacheHybrid(() => 'categories:distinct', 300, 300, 300),
  telegramController.listCategories,
);

export default router;
