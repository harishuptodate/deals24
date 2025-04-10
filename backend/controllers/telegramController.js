const TelegramMessage = require('../models/TelegramMessage');
const { saveMessage } = require('../services/telegramService');

// Handle Telegram webhook updates
exports.handleTelegramWebhook = async (req, res) => {
	try {
		const update = req.body;
		const message = update.message || update.channel_post;

		// Safe logging with optional chaining
		console.log(
			'Received webhook update:',
			JSON.stringify(message?.caption || 'No caption'),
		);

		// Process the message if it exists
		if (message) {
			const result = await saveMessage(message);

			if (result) {
				console.log('Message saved successfully:', result.id);
			} else {
				console.log('Message was not saved (filtered out by criteria)');
			}
		}

		res.status(200).send('OK');
	} catch (error) {
		console.error('Error handling webhook:', error);
		res.status(200).send('OK');
	}
};

// Get all messages with pagination
exports.getMessages = async (req, res) => {
	try {
		const { cursor, limit = 10, category, search } = req.query;
		const query = {};

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
exports.getMessage = async (req, res) => {
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
exports.updateMessageText = async (req, res) => {
	try {
		const { id } = req.params;
		const { text } = req.body;

		if (!text || text.trim() === '') {
			return res.status(400).json({ error: 'Message text cannot be empty' });
		}

		const message = await TelegramMessage.findById(id);

		if (!message) {
			return res.status(404).json({ error: 'Message not found' });
		}

		message.text = text;
		await message.save();

		return res.json({ success: true, message });
	} catch (error) {
		console.error('Error updating message text:', error);
		return res.status(500).json({ error: 'Failed to update message text' });
	}
};

// Track click on a message
exports.trackClick = async (req, res) => {
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
exports.getClickAnalytics = async (req, res) => {
	try {
		const { period = 'day' } = req.query;
		const messages = await TelegramMessage.find({ clicks: { $gt: 0 } });

		const today = new Date();
		const last7Days = [];

		// Prepare last 7 days keys
		for (let i = 6; i >= 0; i--) {
			const d = new Date();
			d.setDate(today.getDate() - i);
			const key = d.toISOString().split('T')[0];
			last7Days.push(key);
		}

		// Initialize day-wise stats
		const dailyStats = {};
		last7Days.forEach((date) => (dailyStats[date] = 0));

		let totalMonth = 0;
		let totalYear = 0;

		// Aggregate click data
		for (const msg of messages) {
			if (msg.dailyClicks) {
				for (const [date, count] of Object.entries(msg.dailyClicks.toJSON())) {
					if (dailyStats[date] !== undefined) {
						dailyStats[date] += count;
					}

					const dateObj = new Date(date);
					if (
						dateObj.getMonth() === today.getMonth() &&
						dateObj.getFullYear() === today.getFullYear()
					) {
						totalMonth += count;
					}

					if (dateObj.getFullYear() === today.getFullYear()) {
						totalYear += count;
					}
				}
			}
		}

		const clicksData = last7Days.map((date) => ({
			name: date.split('-').slice(1).join('-'), // Format as MM-DD for better display
			clicks: dailyStats[date] || 0,
		}));

		// Also create period data for backwards compatibility
		let dateField;
		let format;
		let groupBy;

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
exports.getTopPerforming = async (req, res) => {
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
exports.deleteMessage = async (req, res) => {
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
		console.error('Error deleting message:', error);
		return res
			.status(500)
			.json({ success: false, message: 'Server error', error: error.message });
	}
};
