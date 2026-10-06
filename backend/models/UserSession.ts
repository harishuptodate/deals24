import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  lastUsedAt: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('UserSession', userSessionSchema);
