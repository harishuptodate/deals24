import mongoose from 'mongoose';

// Keep receipts so delayed Redis writes and old workers remain safe to replay.
export default mongoose.model('ClickFlushReceipt', new mongoose.Schema({
  _id: String,
}, { timestamps: true }));
