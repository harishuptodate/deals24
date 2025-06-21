const mongoose = require('mongoose');
const TelegramMessage = require('../models/TelegramMessage');
const ClickStat = require('../models/clickStat.model');
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL)
require('dotenv').config();

function startFlushLoop() {
async function flushClicks() {
  try {
    const keys = await redis.keys('clicks:msg:*');

    for (const key of keys) {
      const id = key.split(':')[2]; // clicks:msg:<ID>
      const count = parseInt(await redis.get(key));

      if (!count || isNaN(count)) continue;

      await TelegramMessage.findByIdAndUpdate(
        id,
        { $inc: { clicks: count } },
        { new: true }
      );

      await redis.del(key);
      console.log(`Flushed ${count} clicks for ${id}`);
    }

    // Optional: flush global daily click stat
    const dailyKey = `clicks:daily:${new Date().toISOString().slice(0, 10)}`;
    const dailyCount = parseInt(await redis.get(dailyKey));

    if (dailyCount) {
      const ist = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const istMidnight = new Date(ist);
      istMidnight.setHours(0, 0, 0, 0);

      await ClickStat.findOneAndUpdate(
        { date: istMidnight },
        { $inc: { clicks: dailyCount } },
        { upsert: true, new: true }
      );

      await redis.del(dailyKey);
      console.log(`Flushed daily count of ${dailyCount}`);
    }

  } catch (error) {
    console.error('Flush failed:', error);
  }
}

  flushClicks();
  setInterval(flushClicks, 60000); // Run every minute
};
module.exports = startFlushLoop;