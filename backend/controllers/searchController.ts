import type { Request, Response } from 'express';
import TelegramMessage from '../models/TelegramMessage';
import { redis } from '../services/redisClient';
import {
  getSearchSuggestions, normalizeSuggestionQuery, suggestionCacheIdentity,
  type SuggestionFilters, type Suggestions,
} from '../services/searchSuggestions';
import { createHash } from 'node:crypto';

const POPULAR_KEY = 'search:popular:v1';
const DEFAULT_POPULAR = ['AC', 'TV', 'TWS', 'iPhone', 'Gaming Laptop', 'Refrigerator'];

async function optionalRedis<T>(operation: () => Promise<T>): Promise<T | undefined> {
  if (redis.status !== 'ready') return undefined;
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([operation(), new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), 350);
    })]);
  } catch {
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function suggestions(req: Request, res: Response) {
  const query = normalizeSuggestionQuery(typeof req.query.q === 'string' ? req.query.q : '');
  const filters: SuggestionFilters = {};
  for (const key of ['category', 'from', 'to', 'minPrice', 'maxPrice'] as const) {
    if (typeof req.query[key] === 'string') filters[key] = req.query[key].slice(0, 50);
  }
  const cache = suggestionCacheIdentity(query, filters);
  try {
    const cached = await optionalRedis(() => redis.get(cache.key));
    if (cached) {
      try {
        const value = JSON.parse(cached) as { fingerprint: string; data: Suggestions };
        if (value.fingerprint === cache.fingerprint) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(value.data);
        }
      } catch {
        await optionalRedis(() => redis.del(cache.key));
      }
    }
    const data = await getSearchSuggestions(TelegramMessage, query, filters);
    const payload = JSON.stringify({ fingerprint: cache.fingerprint, data });
    if (query.length >= 2 && Buffer.byteLength(payload) <= 12_288) {
      void optionalRedis(() => redis.set(cache.key, payload, 'EX', 45));
    }
    res.setHeader('X-Cache', 'MISS');
    return res.json(data);
  } catch {
    return res.status(503).json({ error: 'Search previews are temporarily unavailable.' });
  }
}

export async function popular(_req: Request, res: Response) {
  const terms = await optionalRedis(() => redis.zrevrange(POPULAR_KEY, 0, 9));
  return res.json({ queries: terms?.length ? terms : DEFAULT_POPULAR });
}

export async function recordSelection(req: Request, res: Response) {
  const query = normalizeSuggestionQuery(typeof req.body?.query === 'string' ? req.body.query : '');
  if (query.length < 2 || !/^[\p{L}\p{N}\s+.,()-]+$/u.test(query)) return res.sendStatus(204);
  const digest = createHash('sha256').update(`${req.ip}:${query}`).digest('hex');
  const guard = `search:selection:${parseInt(digest.slice(0, 8), 16) % 128}`;
  await optionalRedis(() => redis.eval(`
    if redis.call('SET', KEYS[2], '1', 'EX', 60, 'NX') then
      redis.call('ZINCRBY', KEYS[1], 1, ARGV[1])
      redis.call('ZREMRANGEBYRANK', KEYS[1], 0, -101)
      redis.call('EXPIRE', KEYS[1], 604800)
    end
    return 1
  `, 2, POPULAR_KEY, guard, query));
  return res.sendStatus(204);
}
