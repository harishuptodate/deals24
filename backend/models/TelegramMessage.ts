import mongoose from 'mongoose';
import {
  buildDealSearchFields,
  DEAL_SEARCH_INDEX_FIELDS,
  DEAL_SEARCH_INDEX_NAME,
  DEAL_SEARCH_INDEX_WEIGHTS,
} from '../utils/dealSearch';

const telegramMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  searchText: {
    type: String,
    default: ''
  },
  searchTokens: {
    type: [String],
    default: []
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
    type: Number,
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
telegramMessageSchema.index(DEAL_SEARCH_INDEX_FIELDS, {
  name: DEAL_SEARCH_INDEX_NAME,
  default_language: 'none',
  weights: DEAL_SEARCH_INDEX_WEIGHTS,
});

telegramMessageSchema.pre('validate', function syncDerivedFields(next) {
  const searchFields = buildDealSearchFields({ text: this.text, identity: this.identity });
  this.searchText = searchFields.searchText;
  this.searchTokens = searchFields.searchTokens;
  next();
});

const TelegramMessage = mongoose.model('TelegramMessage', telegramMessageSchema);

export default TelegramMessage;
