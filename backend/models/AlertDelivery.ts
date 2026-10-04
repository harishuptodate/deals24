import mongoose from 'mongoose';

const alertDeliverySchema = new mongoose.Schema({
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DealAlert',
    required: true,
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TelegramMessage',
    required: true,
  },
  sourceKey: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  providerMessageId: { type: String, default: null },
  error: { type: String, default: null },
}, { timestamps: true });

alertDeliverySchema.index({ alertId: 1, sourceKey: 1 }, { unique: true });

export default mongoose.model('AlertDelivery', alertDeliverySchema);
