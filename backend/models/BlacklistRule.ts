import mongoose from 'mongoose';

export type BlacklistRuleAction = 'allow' | 'block';

const blacklistRuleSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
    trim: true,
  },
  product: {
    type: String,
    required: true,
    trim: true,
  },
  normalizedBrand: {
    type: String,
    required: true,
  },
  normalizedProduct: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: ['allow', 'block'],
    required: true,
  },
}, {
  timestamps: true,
});

blacklistRuleSchema.index(
  { normalizedBrand: 1, normalizedProduct: 1 },
  { unique: true },
);

const BlacklistRule = mongoose.models.BlacklistRule
  || mongoose.model('BlacklistRule', blacklistRuleSchema);

export default BlacklistRule;
