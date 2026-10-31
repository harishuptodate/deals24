import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import ClickStat from '../models/clickStat.model';
import ClickFlushReceipt from '../models/ClickFlushReceipt';
import TelegramMessage from '../models/TelegramMessage';
import { applyClickBatch, clickDay, recordClick } from './clickCounters';

// This connection must never queue or replay timed-out click writes indefinitely.
const clickRedis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  autoResendUnfulfilledCommands: false,
  maxRetriesPerRequest: 0,
  commandTimeout: 1500,
  connectTimeout: 1500,
}) : null;
clickRedis?.on('error', () => { /* Requests fall back to MongoDB. */ });
if (clickRedis) void clickRedis.connect().catch(() => {});

export async function trackMessageClick(messageId: string): Promise<number> {
  if (!mongoose.isObjectIdOrHexString(messageId)) throw new Error('Invalid message ID');
  const batchId = `clicks:pending:${randomUUID()}`;
  const entries = {
    [`clicks:msg:${messageId}`]: '1',
    [`clicks:daily:${clickDay()}`]: '1',
  };
  await recordClick(batchId, entries, {
    redisReady: () => clickRedis?.status === 'ready',
    enqueue: (id, values) => clickRedis.hset(id, values),
    persist: (id, values) => applyClickBatch(id, values, {
      transaction: (work) => mongoose.connection.transaction(work),
      receipts: ClickFlushReceipt, messages: TelegramMessage, daily: ClickStat,
      // A late Redis write is cleaned up by the flusher using the same receipt.
      acknowledge: async () => {},
    }),
  });
  return 1;
}
