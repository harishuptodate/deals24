import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import SearchSession from '../models/SearchSession';
import TelegramMessage from '../models/TelegramMessage';
import { markAtlasFailure } from '../services/atlasSearchHealth';

dotenv.config({ path: '../.env' });
dotenv.config();
// This local-only test server runs the real routes without bots, ingestion,
// click flushing, shared Redis writes, or production write endpoints.
process.env.REDIS_URL = 'redis://127.0.0.1:1';

async function main() {
  const module = await import('../routes/telegram.js');
  const router = (module.default as any).default || module.default;
  const { redis } = await import('../services/redisClient.js');
  redis.disconnect();
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  await SearchSession.createIndexes();
  const app = express();
  const metrics = { atlas: 0, mongoTokens: 0, failed: 0 };
  const originalInfo = console.info.bind(console);
  console.info = (...args) => {
    try {
      const event = JSON.parse(String(args[0]));
      if (event.event === 'deal_search') {
        if (event.backend === 'atlas') metrics.atlas++;
        else metrics.mongoTokens++;
        if (!event.success) metrics.failed++;
      }
    } catch { /* Other application logs are not metrics. */ }
    originalInfo(...args);
  };
  app.use(cors());
  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'search-qa' }));
  app.get('/__qa/metrics', (_req, res) => res.json(metrics));
  app.post('/__qa/fallback', (_req, res) => { markAtlasFailure(TelegramMessage); res.sendStatus(204); });
  app.post('/api/telegram/search/selection', (_req, res) => res.sendStatus(204));
  app.use((req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : res.sendStatus(405));
  app.use('/api/telegram', router);
  const server = app.listen(8091, '127.0.0.1', () => console.log('Search QA API: http://127.0.0.1:8091'));
  const close = () => { server.close(() => { void mongoose.disconnect(); }); };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

main().catch(async (error) => { console.error(error.message); process.exitCode = 1; await mongoose.disconnect(); });
