
const TelegramMessage = require('../models/TelegramMessage');
const { extractLinks } = require('../utils/messageParser');

/**
 * Save a new message from Telegram
 * @param {Object} message - Telegram message object
 * @returns {Promise<Object>} - Saved message
 */
async function saveMessage(message) {
  try {
    // Extract message details
    const { message_id, chat, date, text, photo } = message;
    const channelId = chat.id.toString();
    
    // Check if message already exists
    const existingMessage = await TelegramMessage.findOne({
      messageId: message_id.toString(),
      channelId
    });
    
    if (existingMessage) {
      return existingMessage;
    }
    
    // Extract link from text
    const link = extractLinks(text);
    
    // Get image URL if available
    let imageUrl = null;
    if (photo && photo.length > 0) {
      // Use the largest photo available
      const largestPhoto = photo[photo.length - 1];
      
      // In a real implementation, you would use the Telegram API to get the file path
      // and then construct the full URL. This is a placeholder.
      imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${largestPhoto.file_id}`;
    }
    
    // Create and save new message
    const newMessage = new TelegramMessage({
      messageId: message_id.toString(),
      text,
      date: new Date(date * 1000), // Convert Unix timestamp to Date
      link,
      imageUrl,
      channelId
    });
    
    return await newMessage.save();
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

/**
 * Get messages with pagination
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} - Paginated messages
 */
async function getMessages(options = {}) {
  const { limit = 10, cursor, channelId } = options;
  
  let query = {};
  if (channelId) {
    query.channelId = channelId;
  }
  
  if (cursor) {
    query.date = { $lt: new Date(cursor) };
  }
  
  const messages = await TelegramMessage.find(query)
    .sort({ date: -1 })
    .limit(limit + 1)
    .lean();
  
  const hasMore = messages.length > limit;
  const data = hasMore ? messages.slice(0, limit) : messages;
  
  return {
    data,
    hasMore,
    nextCursor: hasMore && data.length > 0 ? data[data.length - 1].date.toISOString() : null
  };
}

module.exports = {
  saveMessage,
  getMessages
};
