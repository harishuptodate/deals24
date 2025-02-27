
const { saveMessage } = require('../services/telegramService');

/**
 * Process incoming webhook from Telegram
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleTelegramWebhook(req, res) {
  try {
    const update = req.body;
    
    // Check if the update contains a message
    if (update && update.message) {
      console.log('Received message from Telegram:', update.message);
      
      // Process and save the message
      const savedMessage = await saveMessage(update.message);
      
      if (savedMessage) {
        console.log('Message saved successfully:', savedMessage.id);
      } else {
        console.log('Message was not saved (filtered out by criteria)');
      }
    } else if (update && update.channel_post) {
      // Handle channel posts
      console.log('Received channel post from Telegram:', update.channel_post);
      
      // Process and save the channel post
      const savedMessage = await saveMessage(update.channel_post);
      
      if (savedMessage) {
        console.log('Channel post saved successfully:', savedMessage.id);
      } else {
        console.log('Channel post was not saved (filtered out by criteria)');
      }
    }
    
    // Always return 200 OK to Telegram
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    // Still return 200 to prevent Telegram from retrying
    res.status(200).json({ status: 'error', message: 'Error processing webhook' });
  }
}

module.exports = {
  handleTelegramWebhook
};
