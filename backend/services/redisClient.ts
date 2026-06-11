import Redis from 'ioredis';
export const redis = new Redis(process.env.REDIS_URL);

type CacheRequestLike = {
  originalUrl?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
};

type CacheResponseLike = {
  setHeader: (name: string, value: string) => void;
  json: (data: unknown) => void;
};

type CacheNext = () => void;
type CacheKeyGenerator = (req: CacheRequestLike) => string | null | undefined;

// ✅ Add support for binary buffer retrieval
redis.getBuffer = function (key: string) {
  return this.callBuffer('GET', key); // Ensures raw Buffer (not string)
};

redis.on('connect', () => {
  console.log('Connected to Redis');
});
redis.on('error', (err: Error) => {
  console.error('Redis error:', err);
});

/**
 * Redis + HTTP header caching hybrid middleware
 * @param {Function} keyGenerator - function to generate cache key based on req
 * @param {number} ttl - Redis expiration (seconds)
 * @param {number} maxAge - HTTP max-age in seconds
 * @param {number} staleWhileRevalidate - HTTP stale-while-revalidate in seconds
 */
export const cacheHybrid = (
  keyGenerator: CacheKeyGenerator,
  ttl = 60,
  maxAge = 60,
  staleWhileRevalidate = 300,
) => {
  return async (req: CacheRequestLike, res: CacheResponseLike, next: CacheNext): Promise<void> => {
    const key = keyGenerator(req);
    if (!key) {
      next();
      return;
    }

    try {
      const cached = await redis.get(key);
      if (cached) {
        // console.log(`✅ Redis cache hit for ${key}`);

        // Set browser/client cache headers
        res.setHeader('Cache-Control', `max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
        res.setHeader('X-Cache', 'HIT');

        res.json(JSON.parse(cached));
        return;
      }

      // Override res.json to cache after sending
      const originalJson = res.json.bind(res);
      res.json = (data: unknown): void => {
        redis.set(key, JSON.stringify(data), 'EX', ttl);

        // Also set headers for first-time response
        res.setHeader('Cache-Control', `max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
        res.setHeader('X-Cache', 'MISS');

        originalJson(data);
      };

      next();
      return;
    } catch (err) {
      console.error('Redis error:', err);
      next();
      return;
    }
  };
};
