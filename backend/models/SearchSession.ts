import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  fingerprint: { type: String, required: true },
  ids: { type: [mongoose.Schema.Types.ObjectId], required: true },
  createdAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ createdAt: -1, _id: -1 });

export default mongoose.model('SearchSession', schema);
