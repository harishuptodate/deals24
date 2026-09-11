import mongoose from 'mongoose';

export type BlacklistEntryType = 'brand' | 'product';

const blacklistEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['brand', 'product'],
    required: true,
    index: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
  normalizedValue: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

blacklistEntrySchema.index({ type: 1, normalizedValue: 1 }, { unique: true });

const BlacklistEntry = mongoose.models.BlacklistEntry
  || mongoose.model('BlacklistEntry', blacklistEntrySchema);

export default BlacklistEntry;
