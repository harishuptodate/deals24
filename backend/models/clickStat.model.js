
const mongoose = require('mongoose');

const clickStatSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  clicks: {
    type: Number,
    default: 1,
  },
});

// Unique index to avoid duplicate daily entries
clickStatSchema.index({ messageId: 1, date: 1 }, { unique: true });

const ClickStat = mongoose.model('ClickStat', clickStatSchema);

module.exports = ClickStat;
