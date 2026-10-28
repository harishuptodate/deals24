import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TelegramMessage from '../models/TelegramMessage';
import {
  DEAL_ATLAS_SEARCH_INDEX_DEFINITION,
  DEAL_ATLAS_SEARCH_INDEX_NAME,
} from '../utils/dealSearch';

dotenv.config({ path: '../.env' });
dotenv.config();

const POLL_INTERVAL_MS = 5_000;
const READY_TIMEOUT_MS = 10 * 60_000;

async function getSearchIndex() {
  const indexes = await TelegramMessage.collection.aggregate([{
    $listSearchIndexes: { name: DEAL_ATLAS_SEARCH_INDEX_NAME },
  }]).toArray();
  return indexes[0] || null;
}

async function waitUntilReady() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    const index = await getSearchIndex();
    if (index?.status === 'READY' && index?.queryable === true) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out waiting for ${DEAL_ATLAS_SEARCH_INDEX_NAME} to become ready`);
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');

  await mongoose.connect(process.env.MONGODB_URI);
  const database = mongoose.connection.db;
  if (!database) throw new Error('MongoDB connection is not ready');

  const collectionName = TelegramMessage.collection.collectionName;
  const existingIndex = await getSearchIndex();
  if (existingIndex) {
    await database.command({
      updateSearchIndex: collectionName,
      name: DEAL_ATLAS_SEARCH_INDEX_NAME,
      definition: DEAL_ATLAS_SEARCH_INDEX_DEFINITION,
    });
    console.log(`Updating Atlas Search index ${DEAL_ATLAS_SEARCH_INDEX_NAME}`);
  } else {
    await database.command({
      createSearchIndexes: collectionName,
      indexes: [{
        name: DEAL_ATLAS_SEARCH_INDEX_NAME,
        definition: DEAL_ATLAS_SEARCH_INDEX_DEFINITION,
      }],
    });
    console.log(`Creating Atlas Search index ${DEAL_ATLAS_SEARCH_INDEX_NAME}`);
  }

  await waitUntilReady();
  console.log(`Atlas Search index ${DEAL_ATLAS_SEARCH_INDEX_NAME} is ready`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
