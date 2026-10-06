import mongoose from 'mongoose';

const magicLoginTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  ownerToken: { type: String, default: null },
  expiresAt: { type: Date, required: true, expires: 0 },
  consumedAt: { type: Date, default: null },
}, { timestamps: true });

magicLoginTokenSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model('MagicLoginToken', magicLoginTokenSchema);
