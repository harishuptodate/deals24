import type { Request, Response } from 'express';
import TelegramMessage from '../models/TelegramMessage';
import { runWithLogContext } from '../services/logger';
import { saveMessage } from '../services/telegramService';
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
	period?: 'day' | 'week' | 'month';
};

type MessageIdParams = { id: string };
type UpdateMessageBody = {
	text?: string;
	imageUrl?: string | null;
	price?: string | null;
};

type TelegramListRequest = Request<unknown, unknown, unknown, TelegramListQuery>;
type UpdateMessageRequest = Request<MessageIdParams, unknown, UpdateMessageBody>;

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
		const { text, imageUrl, price } = req.body;

		if (!text || text.trim() === '') {
			return res.status(400).json({ error: 'Message text cannot be empty' });
		}

		const message = await TelegramMessage.findById(id);

		if (!message) {
			return res.status(404).json({ error: 'Message not found' });
		}

		message.text = text;
		message.imageUrl = imageUrl;
		if (typeof price === 'string') {
			const normalizedPrice = price.replace(/[^\d]/g, '');
			message.price = normalizedPrice || null;
		} else if (price === null || price === '') {
			message.price = null;
		}
		await message.save();

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
