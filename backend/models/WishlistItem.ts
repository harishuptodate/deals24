import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'TelegramMessage', required: true },
}, { timestamps: true });

wishlistItemSchema.index({ userId: 1, dealId: 1 }, { unique: true });
wishlistItemSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('WishlistItem', wishlistItemSchema);
