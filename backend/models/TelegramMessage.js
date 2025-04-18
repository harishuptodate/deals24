
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
  category: {
    type: String,
    default: null,
    required: false
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster querying
telegramMessageSchema.index({ date: -1 });
telegramMessageSchema.index({ messageId: 1, channelId: 1 }, { unique: true });
telegramMessageSchema.index({ category: 1 });

const TelegramMessage = mongoose.model('TelegramMessage', telegramMessageSchema);

module.exports = TelegramMessage;
