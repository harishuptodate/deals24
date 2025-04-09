
const mongoose = require('mongoose');

const clickStatSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true, // One document per day
  },
  clicks: {
    type: Number,
    default: 1,
  },
});

const ClickStat = mongoose.model('ClickStat', clickStatSchema);

module.exports = ClickStat;
