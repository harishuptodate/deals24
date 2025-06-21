// redisClient.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL); // e.g., from Render: redis://default:<password>@<host>:<port>

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error:', err));

// middleware-redis.js
const cache =
	(keyGenerator, ttl = 60) =>
	async (req, res, next) => {
		const key = keyGenerator(req);

		try {
			const cached = await redis.get(key);
			if (cached) {
				return res.json(JSON.parse(cached));
			}

			// Override res.json to cache response after sending
			const originalJson = res.json.bind(res);
			res.json = (data) => {
				redis.set(key, JSON.stringify(data), 'EX', ttl);
				return originalJson(data);
			};
			res.setHeader('Cache-Control', `no-store`); // Optional — prevents browser cache

			next();
		} catch (err) {
			console.error('Redis cache error:', err);
			next();
		}
	};

module.exports = cache;
