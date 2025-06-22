const mongoose = require('mongoose');
const TelegramMessage = require('../models/TelegramMessage');
const ClickStat = require('../models/clickStat.model');
const {redis} = require('../services/redisClient');
require('dotenv').config();

function startFlushLoop(intervalMs = 60000) {
	async function flushClicks() {
		try {
			const keys = await redis.keys('clicks:msg:*');

			for (const key of keys) {
				const id = key.split(':')[2];
				const count = parseInt(await redis.get(key));

				if (!count || isNaN(count)) continue;

				try {
					await TelegramMessage.findByIdAndUpdate(
						id,
						{ $inc: { clicks: count } },
						{ new: true },
					);
					await redis.del(key);
					console.log(`✅ Flushed ${count} clicks for ${id}`);
				} catch (mongoErr) {
					console.error(`❌ Mongo flush error for ${id}:`, mongoErr.message);
				}
			}

			// Handle daily total
			const istNow = new Date(
				new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
			);
			istNow.setHours(0, 0, 0, 0);
			const dailyKey = `clicks:daily:${istNow.toISOString().slice(0, 10)}`;
			const dailyCount = parseInt(await redis.get(dailyKey));

			if (dailyCount) {
				try {
					await ClickStat.findOneAndUpdate(
						{ date: istNow },
						{ $inc: { clicks: dailyCount } },
						{ upsert: true, new: true },
					);
					await redis.del(dailyKey);
					console.log(`✅ Flushed daily count of ${dailyCount}`);
				} catch (dailyErr) {
					console.error('❌ Mongo daily flush error:', dailyErr.message);
				}
			}
		} catch (error) {
			console.error('🔥 Flush loop error:', error.message);
		}
	}

	flushClicks();
	setInterval(flushClicks, intervalMs);
}

module.exports = startFlushLoop;
