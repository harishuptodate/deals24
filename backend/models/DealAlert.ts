import mongoose from 'mongoose';

const dealAlertSchema = new mongoose.Schema({
  ownerToken: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  type: { type: String, enum: ['deal', 'keyword'], required: true },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TelegramMessage',
    default: null,
  },
  dealTitle: { type: String, default: null },
  keywords: { type: [String], default: [] },
  targetPrice: { type: Number, default: null },
  active: { type: Boolean, default: true },
  unsubscribeToken: { type: String, required: true, unique: true },
}, { timestamps: true });

dealAlertSchema.index({ active: 1, type: 1, dealId: 1 });
dealAlertSchema.index({ ownerToken: 1, createdAt: -1 });

export default mongoose.model('DealAlert', dealAlertSchema);
