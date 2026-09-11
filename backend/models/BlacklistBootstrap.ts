import mongoose from 'mongoose';

const blacklistBootstrapSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

const BlacklistBootstrap = mongoose.models.BlacklistBootstrap
  || mongoose.model('BlacklistBootstrap', blacklistBootstrapSchema);

export default BlacklistBootstrap;
