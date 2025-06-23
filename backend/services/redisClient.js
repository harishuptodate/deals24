const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// ✅ Add support for binary buffer retrieval
redis.getBuffer = function (key) {
  return this.callBuffer('GET', key); // Ensures raw Buffer (not string)
};

redis.on('connect', () => {
  console.log('Connected to Redis');
});
redis.on('error', (err) => {
  console.error('Redis error:', err);
});

/**
 * Redis + HTTP header caching hybrid middleware
 * @param {Function} keyGenerator - function to generate cache key based on req
 * @param {number} ttl - Redis expiration (seconds)
 * @param {number} maxAge - HTTP max-age in seconds
 * @param {number} staleWhileRevalidate - HTTP stale-while-revalidate in seconds
 */
const cacheHybrid = (keyGenerator, ttl = 60, maxAge = 60, staleWhileRevalidate = 300) => {
  return async (req, res, next) => {
    const key = keyGenerator(req);
    if (!key) return next();

    try {
      const cached = await redis.get(key);
      if (cached) {
        // console.log(`✅ Redis cache hit for ${key}`);

        // Set browser/client cache headers
        res.setHeader('Cache-Control', `max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
        res.setHeader('X-Cache', 'HIT');

        return res.json(JSON.parse(cached));
      }

      // Override res.json to cache after sending
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        redis.set(key, JSON.stringify(data), 'EX', ttl);

        // Also set headers for first-time response
        res.setHeader('Cache-Control', `max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
        res.setHeader('X-Cache', 'MISS');

        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Redis error:', err);
      next();
    }
  };
};

module.exports = {
  cacheHybrid,
  redis
};
