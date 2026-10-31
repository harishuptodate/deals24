import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import ClickStat from '../models/clickStat.model';
import ClickFlushReceipt from '../models/ClickFlushReceipt';
import TelegramMessage from '../models/TelegramMessage';
import { redis } from '../services/redisClient';
import { applyClickBatches, CLAIM_CLICKS } from '../services/clickCounters';

async function scan(pattern: string, visit: (keys: string[]) => Promise<void>) {
  let cursor = '0';
  do {
    const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = result[0];
    // COUNT is a hint; bound each batch even when Redis returns more keys.
    for (let i = 0; i < result[1].length; i += 500) {
      await visit(result[1].slice(i, i + 500));
    }
  } while (cursor !== '0');
}

export default function startFlushLoop(intervalMs = 60000) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  async function processBatches(keys: string[]) {
    const batches = [];
    for (const id of new Set(keys)) {
      const entries = await redis.hgetall(id);
      if (Object.keys(entries).length) batches.push({ id, entries });
    }
    if (!batches.length) return;
    await applyClickBatches(batches, {
      transaction: (work) => mongoose.connection.transaction(work),
      receipts: ClickFlushReceipt, messages: TelegramMessage, daily: ClickStat,
      acknowledge: () => redis.del(...batches.map((batch) => batch.id)),
    });
  }
  async function flushClicks() {
    try {
      if (!process.env.REDIS_URL || redis.status !== 'ready') return;
      // Pending batches survive failures and are always retried before new work.
      await scan('clicks:pending:*', async (keys) => {
        await processBatches(keys);
      });
      for (const pattern of ['clicks:msg:*', 'clicks:daily:*']) {
        await scan(pattern, async (keys) => {
          if (keys.length) {
            const batchId = `clicks:pending:${randomUUID()}`;
            await redis.eval(CLAIM_CLICKS, keys.length + 1,
              batchId, ...keys);
            await processBatches([batchId]);
          }
        });
      }
    } catch (error) {
      console.error('Click flush failed; pending batches will be retried:', error);
    } finally {
      // Scheduling after completion prevents overlapping runs in this process.
      if (!stopped) timer = setTimeout(flushClicks, intervalMs);
    }
  }
  void flushClicks();
  return () => { stopped = true; clearTimeout(timer); };
}
