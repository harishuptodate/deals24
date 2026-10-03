import mongoose from 'mongoose';

const telegramMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true
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
  telegramFileId: {
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
  price: {
    type: String,
    default: null,
    required: false
  },
  amazonAsin: {
    type: String,
    default: null
  },
  identity: {
    canonicalName: { type: String, default: null },
    brand: { type: String, default: null },
    model: { type: String, default: null },
    productType: { type: String, default: null },
    variant: { type: [String], default: [] }
  },
  identityKey: {
    type: String,
    default: null
  },
  firstSeenAt: {
    type: Date,
    default: null
  },
  lastSeenAt: {
    type: Date,
    default: null
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
telegramMessageSchema.index({ price: 1 });
telegramMessageSchema.index({ amazonAsin: 1 }, { sparse: true });
telegramMessageSchema.index({ identityKey: 1 }, { sparse: true });
telegramMessageSchema.index({ lastSeenAt: -1 });
telegramMessageSchema.index({
  text: 'text',
  'identity.canonicalName': 'text',
  'identity.brand': 'text',
  'identity.model': 'text',
});

const TelegramMessage = mongoose.model('TelegramMessage', telegramMessageSchema);

export default TelegramMessage;
