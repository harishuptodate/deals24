import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TelegramMessage from '../models/TelegramMessage';
import SearchSession from '../models/SearchSession';
import { buildDealSearchFields } from '../utils/dealSearch';

dotenv.config({ path: '../.env' });
dotenv.config();

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  let scanned = 0;
  let changed = 0;
  let updated = 0;
  let batch = [];
  const flush = async () => {
    if (apply && batch.length) {
      const result = await TelegramMessage.collection.bulkWrite(batch, { ordered: false });
      updated += result.modifiedCount;
    }
    batch = [];
  };
  for await (const row of TelegramMessage.collection.find({}, {
    projection: { text: 1, identity: 1, searchText: 1, searchTokens: 1 }, batchSize: 250,
  })) {
    scanned++;
    const fields = buildDealSearchFields({ text: row.text, identity: row.identity });
    if (row.searchText === fields.searchText && JSON.stringify(row.searchTokens) === JSON.stringify(fields.searchTokens)) continue;
    changed++;
    // Do not overwrite a deal edited by ingestion/admin while the scan is running.
    batch.push({ updateOne: {
      filter: { _id: row._id, text: row.text, identity: Object.hasOwn(row, 'identity') ? row.identity : { $exists: false } },
      update: { $set: fields },
    } });
    if (batch.length === 250) await flush();
  }
  await flush();
  if (apply) {
    await TelegramMessage.collection.createIndex({ searchTokens: 1 }, { name: 'deal_search_tokens_v1' });
    await SearchSession.createIndexes();
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', scanned, changed, updated, concurrentEditsSkipped: apply ? changed - updated : 0 }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Search backfill failed');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
