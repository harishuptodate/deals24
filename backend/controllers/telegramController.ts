const TelegramMessage = require('../models/TelegramMessage');
const { saveMessage } = require('../services/telegramService');
const { runWithLogContext } = require('../services/logger');
export {};

function getMessagePreview(text: string) {
	return String(text || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 180);
}

// Handle Telegram webhook updates
exports.handleTelegramWebhook = async (req: any, res: any) => {
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
		).catch((error: any) => {
			console.error('Error handling webhook:', error);
		});
	} catch (error) {
		console.error('Error handling webhook:', error);
		if (!res.headersSent) {
			res.status(200).send('OK');
		}
	}
};

// Get all messages with pagination
exports.getMessages = async (req: any, res: any) => {
	try {
		const { cursor, limit = 10, category, search } = req.query;
		const query: any = {};

		// Apply category filter if provided
		if (category) {
			query.category = category;
		}

		// Apply search filter if provided
		if (search) {
			query.text = { $regex: search, $options: 'i' };
		}

		// Apply cursor-based pagination
		if (cursor) {
			query._id = { $lt: cursor };
		}

		// Get one more than the limit to check if there are more results
		const messages = await TelegramMessage.find(query)
			.sort({ _id: -1 })
			.limit(parseInt(limit) + 1);

		// Check if there are more results
		const hasMore = messages.length > parseInt(limit);

		// Remove the extra message if there are more results
		if (hasMore) {
			messages.pop();
		}

		// Get the next cursor
		const nextCursor = hasMore ? messages[messages.length - 1]._id : undefined;

		// Return the messages
		return res.json({
			data: messages,
			hasMore,
			nextCursor,
		});
	} catch (error) {
		console.error('Error getting messages:', error);
		return res.status(500).json({ error: 'Failed to get messages' });
	}
};

// Get a single message by ID
exports.getMessage = async (req: any, res: any) => {
	try {
		const { id } = req.params;

		const message = await TelegramMessage.findById(id);

		if (!message) {
			return res.status(404).json({ error: 'Message not found' });
		}

		return res.json(message);
	} catch (error) {
		console.error('Error getting message:', error);
		return res.status(500).json({ error: 'Failed to get message' });
	}
};

// Update message text
exports.updateMessageText = async (req: any, res: any) => {
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

// Track click on a message
exports.trackClick = async (req: any, res: any) => {
	try {
		const { id } = req.params;

		const message = await TelegramMessage.findById(id);

		if (!message) {
			return res.status(404).json({ error: 'Message not found' });
		}

		// Current date in YYYY-MM-DD format
		const today = new Date().toISOString().split('T')[0];

		// Increment total clicks
		message.clicks = (message.clicks || 0) + 1;

		// Increment today's clicks
		const currentCount = message.dailyClicks.get(today) || 0;
		message.dailyClicks.set(today, currentCount + 1);

		await message.save();

		return res.json({ success: true });
	} catch (error) {
		console.error('Error tracking click:', error);
		return res.status(500).json({ error: 'Failed to track click' });
	}
};

// Get click analytics
exports.getClickAnalytics = async (req: any, res: any) => {
	try {
		const { period = 'day' } = req.query;
		const messages = await TelegramMessage.find({ clicks: { $gt: 0 } });

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

		// Aggregate click data
		for (const msg of messages) {
			if (msg.dailyClicks) {
				for (const [date, count] of Object.entries(msg.dailyClicks.toJSON())) {
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
		}

		const clicksData = last7Days.map((date) => ({
			name: date.split('-').slice(1).join('-'), // Format as MM-DD for better display
			clicks: dailyStats[date] || 0,
		}));

		// Also create period data for backwards compatibility
		let dateField: any;
		let format: any;
		let groupBy: any;

		// Set date field and format based on period for legacy code
		switch (period) {
			case 'week':
				dateField = { $week: '$createdAt' };
				format = '%U';
				groupBy = 'week';
				break;
			case 'month':
				dateField = { $month: '$createdAt' };
				format = '%m';
				groupBy = 'month';
				break;
			default: // day
				dateField = { $dayOfMonth: '$createdAt' };
				format = '%d';
				groupBy = 'day';
		}

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
exports.getTopPerforming = async (req: any, res: any) => {
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

// Delete a message by ID
exports.deleteMessage = async (req: any, res: any) => {
	try {
		const { id } = req.params;

		console.log(`Attempting to delete message with ID: ${id}`);

		// Verify that id is provided
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
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		console.error('Error deleting message:', error);
		return res
			.status(500)
			.json({ success: false, message: 'Server error', error: errorMessage });
	}
};
