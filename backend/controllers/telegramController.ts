import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import TelegramMessage from '../models/TelegramMessage';
import DealPriceObservation from '../models/DealPriceObservation';
import { runWithLogContext } from '../services/logger';
import { getMessages, saveMessage, trackMessageClick } from '../services/telegramService';
import { invalidateDealCaches } from '../services/redisClient';
import type { TelegramInboundMessage } from '../services/telegramTypes';

type TelegramWebhookRequest = Request<
	unknown,
	unknown,
	{ message?: TelegramInboundMessage; channel_post?: TelegramInboundMessage }
>;

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
	period?: 'day' | 'week' | 'month';
};

type MessageIdParams = { id: string };
type CategoryParams = { category: string };
type UpdateCategoryBody = { category?: string };
type UpdateMessageBody = {
	text?: string;
	imageUrl?: string | null;
	price?: string | null;
	priceObservedAt?: string | null;
};

type TelegramListRequest = Request<unknown, unknown, unknown, TelegramListQuery>;
type UpdateMessageRequest = Request<MessageIdParams, unknown, UpdateMessageBody>;
type MessageRequest = Request<MessageIdParams>;
type CategoryRequest = Request<CategoryParams, unknown, unknown, TelegramListQuery>;
type UpdateCategoryRequest = Request<MessageIdParams, unknown, UpdateCategoryBody>;

const DEFAULT_CATEGORY_COUNTS = [
	{ category: 'electronics-home', count: 245 },
	{ category: 'laptops', count: 85 },
	{ category: 'mobile-phones', count: 120 },
	{ category: 'gadgets-accessories', count: 175 },
	{ category: 'fashion', count: 95 },
	{ category: 'lifestyle', count: 0 },
];

function getMessagePreview(text: string) {
	return String(text || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 180);
}

// Handle Telegram webhook updates
export const handleTelegramWebhook = async (req: TelegramWebhookRequest, res: Response) => {
	try {
		const update = req.body;
		const message = update.message || update.channel_post;
		const correlationId = `tg:${message?.chat?.id || 'unknown'}:${message?.message_id || Date.now()}`;

		res.status(200).send('OK');

		if (!message) {
			return;
		}

		void runWithLogContext(
			{
				service: 'telegram-ingest',
				correlationId,
				context: {
					source: 'webhook',
					telegramMessageId: message?.message_id || null,
				},
			},
			async () => {
				console.log(
					'Received webhook update:',
					JSON.stringify(message?.caption || 'No caption'),
				);

				if (message) {
					const result = await saveMessage(message);

					if (result) {
						console.log('Message saved successfully:', getMessagePreview(result.text));
					} else {
						console.log('Message was not saved (filtered out by criteria)');
					}
				}
			},
		).catch((error: unknown) => {
			console.error('Error handling webhook:', error);
		});
	} catch (error) {
		console.error('Error handling webhook:', error);
		if (!res.headersSent) {
			res.status(200).send('OK');
		}
	}
};

// Update message text
export const updateMessageText = async (req: UpdateMessageRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { text, imageUrl, price, priceObservedAt } = req.body;

		if (!text || text.trim() === '') {
			return res.status(400).json({ error: 'Message text cannot be empty' });
		}

		const message = await TelegramMessage.findById(id);

		if (!message) {
			return res.status(404).json({ error: 'Message not found' });
		}

		const normalizedPrice = typeof price === 'string'
			? price.replace(/[^\d]/g, '')
			: '';
		let observedAt: Date | null = null;
		if (priceObservedAt) {
			observedAt = new Date(priceObservedAt);
			if (Number(normalizedPrice) <= 0 || Number.isNaN(observedAt.getTime())) {
				return res.status(400).json({
					error: 'A valid price and observation date are required for price history',
				});
			}
		}

		message.text = text;
		message.imageUrl = imageUrl;
		if (typeof price === 'string') {
			message.price = normalizedPrice || null;
		} else if (price === null || price === '') {
			message.price = null;
		}
		let manualSourceKey: string | null = null;
		if (observedAt) {
			manualSourceKey = `manual:${message._id}:${randomUUID()}`;
			await DealPriceObservation.create({
				productId: message._id,
				sourceKey: manualSourceKey,
				observedAt,
				price: Number(normalizedPrice),
				link: message.link || null,
				matchMethod: 'manual',
				matchConfidence: 1,
			});
		}

		try {
			await message.save();
		} catch (error) {
			if (manualSourceKey) {
				await DealPriceObservation.deleteOne({ sourceKey: manualSourceKey });
			}
			throw error;
		}

		await invalidateDealCaches(String(message._id));

		return res.json({ success: true, message });
	} catch (error) {
		console.error('Error updating message text:', error);
		return res.status(500).json({ error: 'Failed to update message text' });
	}
};

// Get click analytics
export const getClickAnalytics = async (req: TelegramListRequest, res: Response) => {
	try {
		const { period = 'day' } = req.query;
		const messages = await TelegramMessage.find({ clicks: { $gt: 0 } });
		type DailyClicksStore = {
			toJSON: () => Record<string, number>;
		};
		type DailyClicksMessage = {
			dailyClicks?: DailyClicksStore;
		};

		const today = new Date();
		const last7Days: string[] = [];

		// Prepare last 7 days keys
		for (let i = 6; i >= 0; i--) {
			const d = new Date();
			d.setDate(today.getDate() - i);
			const key = d.toISOString().split('T')[0];
			last7Days.push(key);
		}

		// Initialize day-wise stats
		const dailyStats: Record<string, number> = {};
		last7Days.forEach((date) => (dailyStats[date] = 0));

		let totalMonth = 0;
		let totalYear = 0;

		for (const msg of messages) {
			const messageWithDailyClicks = msg as DailyClicksMessage;
			if (!messageWithDailyClicks.dailyClicks) {
				continue;
			}

			for (const [date, count] of Object.entries(messageWithDailyClicks.dailyClicks.toJSON())) {
				const numericCount = Number(count) || 0;
				if (dailyStats[date] !== undefined) {
					dailyStats[date] += numericCount;
				}

				const dateObj = new Date(date);
				if (
					dateObj.getMonth() === today.getMonth() &&
					dateObj.getFullYear() === today.getFullYear()
				) {
					totalMonth += numericCount;
				}

				if (dateObj.getFullYear() === today.getFullYear()) {
					totalYear += numericCount;
				}
			}
		}

		const clicksData = last7Days.map((date) => ({
			name: date.split('-').slice(1).join('-'), // Format as MM-DD for better display
			clicks: dailyStats[date] || 0,
		}));

		// Get total clicks
		const totalClicks = messages.reduce((acc, m) => acc + m.clicks, 0);

		// Get total messages
		const totalMessages = await TelegramMessage.countDocuments();

		return res.json({
			clicksData,
			totalClicks,
			totalMessages,
			period,
			totalMonth,
			totalYear,
		});
	} catch (error) {
		console.error('Error getting click analytics:', error);
		return res.status(500).json({ error: 'Failed to get click analytics' });
	}
};

// Get top performing messages
export const getTopPerforming = async (req: TelegramListRequest, res: Response) => {
	try {
		const { limit = 5 } = req.query;

		const topMessages = await TelegramMessage.find({ clicks: { $gt: 0 } })
			.sort({ clicks: -1 })
			.limit(parseInt(limit));

		const totalMessages = await TelegramMessage.countDocuments(); // ✅ Get actual total
		
		return res.json({ topMessages, totalMessages });
	} catch (error) {
		console.error('Error getting top performing messages:', error);
		return res
			.status(500)
			.json({ error: 'Failed to get top performing messages' });
	}
};

export const getCategoryCounts = async (_req: Request, res: Response) => {
	try {
		const categoryCounts = await TelegramMessage.aggregate([
			{ $match: { category: { $exists: true, $ne: null } } },
			{ $group: { _id: '$category', count: { $sum: 1 } } },
			{ $project: { _id: 0, category: '$_id', count: 1 } },
		]);
		return categoryCounts?.length
			? res.json({ data: categoryCounts })
			: res.json(DEFAULT_CATEGORY_COUNTS);
	} catch (error) {
		console.error('Error fetching category counts:', error);
		return res.json(DEFAULT_CATEGORY_COUNTS);
	}
};

export const listMessages = async (req: TelegramListRequest, res: Response) => {
	try {
		const messages = await getMessages({
			cursor: req.query.cursor,
			limit: parseInt(req.query.limit) || 10,
			category: req.query.category,
			search: req.query.search,
			from: req.query.from,
			to: req.query.to,
			minPrice: req.query.minPrice,
			maxPrice: req.query.maxPrice,
			sort: req.query.sort,
		});
		return res.json(messages);
	} catch (error) {
		console.error('Error fetching messages:', error);
		return res.status(500).json({ error: 'Failed to fetch messages' });
	}
};

export const getMessage = async (req: MessageRequest, res: Response) => {
	try {
		const message = await TelegramMessage.findById(req.params.id).lean();
		if (!message) return res.status(404).json({ error: 'Message not found' });
		return res.json(message);
	} catch (error) {
		console.error('Error fetching message:', error);
		return res.status(500).json({ error: 'Failed to fetch message' });
	}
};

export const trackMessageEngagement = async (req: MessageRequest, res: Response) => {
	if (!req.params.id) return res.status(400).json({ error: 'Message ID is required' });
	try {
		const clicks = await trackMessageClick(req.params.id);
		return res.json({ success: true, clicks });
	} catch (error) {
		console.error('Error tracking engagement:', error);
		return res.status(500).json({ error: 'Failed to track engagement' });
	}
};

export const updateMessageCategory = async (req: UpdateCategoryRequest, res: Response) => {
	try {
		const { category } = req.body;
		if (!category) return res.status(400).json({ error: 'Category is required' });

		const message = await TelegramMessage.findByIdAndUpdate(
			req.params.id,
			{ category },
			{ new: true },
		);
		if (!message) return res.status(404).json({ error: 'Message not found' });
		return res.json({ success: true, message });
	} catch (error) {
		console.error('Error updating message category:', error);
		return res.status(500).json({ error: 'Failed to update message category' });
	}
};

export const listCategoryMessages = async (req: CategoryRequest, res: Response) => {
	try {
		const messages = await getMessages({
			cursor: req.query.cursor,
			limit: parseInt(req.query.limit) || 10,
			category: req.params.category,
		});
		return res.json(messages);
	} catch (error) {
		console.error(`Error fetching messages for category ${req.params.category}:`, error);
		return res.status(500).json({ error: 'Failed to fetch category messages' });
	}
};

export const searchMessages = async (req: TelegramListRequest, res: Response) => {
	try {
		if (!req.query.query) return res.status(400).json({ error: 'Search query is required' });
		const messages = await getMessages({
			cursor: req.query.cursor,
			limit: parseInt(req.query.limit) || 10,
			search: req.query.query,
		});
		return res.json(messages);
	} catch (error) {
		console.error('Error searching messages:', error);
		return res.status(500).json({ error: 'Failed to search messages' });
	}
};

export const deleteMessage = async (req: MessageRequest, res: Response) => {
	try {
		const result = await TelegramMessage.findByIdAndDelete(req.params.id);
		if (!result) {
			return res.status(404).json({ success: false, message: 'Message not found' });
		}
		await DealPriceObservation.deleteMany({ productId: result._id });
		return res.json({ success: true, message: 'Message deleted successfully' });
	} catch (error) {
		console.error('Error deleting message:', error);
		return res.status(500).json({
			success: false,
			message: 'Server error',
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

export const listCategories = async (_req: Request, res: Response) => {
	try {
		const categories = await TelegramMessage.distinct('category', {
			category: { $exists: true, $ne: null },
		});
		return res.json(categories.filter(Boolean));
	} catch (error) {
		console.error('Error fetching categories:', error);
		return res.status(500).json({ error: 'Failed to fetch categories' });
	}
};
