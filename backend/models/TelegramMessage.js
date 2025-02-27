
const mongoose = require('mongoose');

const telegramMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  link: {
    type: String
  },
  imageUrl: {
    type: String
  },
  channelId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster querying
telegramMessageSchema.index({ date: -1 });
telegramMessageSchema.index({ messageId: 1, channelId: 1 }, { unique: true });

const TelegramMessage = mongoose.model('TelegramMessage', telegramMessageSchema);

module.exports = TelegramMessage;
