
const TelegramMessage = require('../models/TelegramMessage');
const { detectCategory } = require('../utils/categoryDetector');
const { saveMessage } = require('../services/telegramService');

// Handle Telegram webhook updates
exports.handleTelegramWebhook = async (req, res) => {
  try {
    console.log('Received webhook update:', JSON.stringify(req.body));
    
    const update = req.body;
    
    // Process the message
    if (update.message || update.channel_post) {
      const message = update.message || update.channel_post;
      
      const result = await saveMessage(message);
      
      if (result) {
        console.log('Message saved successfully:', result.id);
      } else {
        console.log('Message was not saved (filtered out by criteria)');
      }
    }
    
    // Always return 200 OK to Telegram
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling webhook:', error);
    // Always return 200 OK to Telegram even if there's an error
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
      nextCursor
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

// Track click on a message
exports.trackClick = async (req, res) => {
  try {
    const { id } = req.params;
    
    const message = await TelegramMessage.findById(id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Increment clicks count
    message.clicks = (message.clicks || 0) + 1;
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
    
    let dateField;
    let format;
    let groupBy;
    
    // Set date field and format based on period
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
    
    // Get click analytics
    const clicksData = await TelegramMessage.aggregate([
      {
        $match: {
          clicks: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: dateField,
          clicks: { $sum: '$clicks' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          name: { $toString: '$_id' },
          clicks: 1
        }
      }
    ]);
    
    // Get total clicks
    const totalClicksResult = await TelegramMessage.aggregate([
      {
        $group: {
          _id: null,
          totalClicks: { $sum: '$clicks' }
        }
      }
    ]);
    
    const totalClicks = totalClicksResult.length > 0 ? totalClicksResult[0].totalClicks : 0;
    
    // Get total messages
    const totalMessages = await TelegramMessage.countDocuments();
    
    return res.json({
      clicksData,
      totalClicks,
      totalMessages,
      period
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
    
    return res.json(topMessages);
  } catch (error) {
    console.error('Error getting top performing messages:', error);
    return res.status(500).json({ error: 'Failed to get top performing messages' });
  }
};

// Delete a message by ID
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Message ID is required' });
    }
    
    const result = await TelegramMessage.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
};
