import dotenv from 'dotenv';
import mongoose from 'mongoose';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import TelegramMessage from '../models/TelegramMessage';
import { buildAtlasSearchStage, buildDealSearchPlan, buildDealSearchRankingStage, buildDealSearchFields, buildMongoSearchMatch, DEAL_ATLAS_SEARCH_INDEX_DEFINITION, DEAL_ATLAS_SEARCH_INDEX_NAME, DEAL_SEARCH_RELEVANCE_SORT } from '../utils/dealSearch';
import { getMessagesFromStore } from '../services/telegramMessageQuery';
import { markAtlasFailure } from '../services/atlasSearchHealth';
import { getSearchPage } from '../services/searchPagination';
import SearchSession from '../models/SearchSession';

dotenv.config({ path: '../.env' });
dotenv.config();

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  // Verification is read-only, including disabling Mongoose index creation.
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10_000 });
  const indexes = await TelegramMessage.collection.aggregate([
    { $listSearchIndexes: { name: DEAL_ATLAS_SEARCH_INDEX_NAME } },
  ]).toArray();
  if (!indexes[0]?.queryable || indexes[0].status !== 'READY') throw new Error('Atlas deal index is not ready');
  assert.deepEqual(indexes[0].latestDefinition?.mappings, DEAL_ATLAS_SEARCH_INDEX_DEFINITION.mappings, 'Sync the deployed Atlas definition before verification');
  console.log(`Index ${DEAL_ATLAS_SEARCH_INDEX_NAME}: READY`);
  let scanned = 0;
  for await (const row of TelegramMessage.collection.find({}, { projection: { text: 1, identity: 1, searchText: 1, searchTokens: 1 } })) {
    const expected = buildDealSearchFields({ text: row.text, identity: row.identity });
    assert.equal(row.searchText, expected.searchText, `Stale search text: ${row._id}`);
    assert.deepEqual(row.searchTokens, expected.searchTokens, `Stale search tokens: ${row._id}`);
    scanned++;
  }
  console.log(`Verified derived fields for ${scanned} documents`);
  const explain = await TelegramMessage.collection.find(buildMongoSearchMatch(buildDealSearchPlan('sams'))).explain('executionStats');
  assert.ok(JSON.stringify(explain.queryPlanner.winningPlan).includes('deal_search_tokens_v1'), 'Fallback must use the token index');
  assert.ok(!JSON.stringify(explain.queryPlanner.winningPlan).includes('COLLSCAN'), 'Fallback must not scan the collection');
  console.log(JSON.stringify({ fallbackIndex: 'IXSCAN', examined: explain.executionStats.totalDocsExamined, returned: explain.executionStats.nReturned }));
  for (const query of ['sams', 'samsung s25 ultra', 'samung s25 ultra', 'lg washin machine', 'tv']) {
    const plan = buildDealSearchPlan(query);
    const stage = buildAtlasSearchStage({ textSearch: plan.textSearch, tokenGroups: plan.tokenGroups, prefixToken: plan.prefixToken });
    const startedAt = Date.now();
    const count = await TelegramMessage.aggregate([
      { $searchMeta: { ...stage.$search, count: { type: 'total' } } },
    ]).option({ maxTimeMS: 4500 });
    const ranking = [buildDealSearchRankingStage(plan), { $sort: DEAL_SEARCH_RELEVANCE_SORT }, { $limit: 50 }, { $project: { matchCoverage: 1, searchScore: 1 } }];
    const rows = await TelegramMessage.aggregate([stage, ...ranking]).option({ maxTimeMS: 4500 });
    const fallback = await TelegramMessage.aggregate([{ $match: buildMongoSearchMatch(plan) }, ...ranking]).option({ maxTimeMS: 4500 });
    assert.deepEqual(rows, fallback, `Atlas/fallback ranking mismatch: ${query}`);
    const fallbackCount = await TelegramMessage.countDocuments(buildMongoSearchMatch(plan)).maxTimeMS(4500);
    assert.equal(count[0]?.count?.total ?? 0, fallbackCount, `Atlas/fallback count mismatch: ${query}`);
    console.log(JSON.stringify({ query, total: fallbackCount, elapsedMs: Date.now() - startedAt, parity: 'PASS' }));
  }
  if (process.argv.includes('--fixtures')) await verifyFixtures();
}

async function verifyFixtures() {
  const name = `deal_search_verify_${randomUUID().replace(/-/g, '')}`;
  const model = mongoose.model(name, TelegramMessage.schema.clone(), name);
  try {
    await model.createCollection();
    await model.collection.createIndex({ searchTokens: 1 }, { name: 'deal_search_tokens_v1' });
    const samples = [
      ['old-phone', 'Samsung Galaxy S25 Ultra 256GB', '2026-10-28', 'mobile-phones', 80000],
      ['new-phone', 'Samsung Galaxy S25 Ultra 256GB', '2026-10-29', 'mobile-phones', 75000],
      ['wrong-model', 'Samsung Galaxy S24 Ultra 256GB', '2026-10-30', 'mobile-phones', 65000],
      ['tv', 'Hisense Ultra HD television', '2026-10-31', 'electronics-home', 30000],
      ['washer', 'LG washing machine', '2026-10-29', 'electronics-home', 20000],
      ['numeric-suffix', '256GBPS network adapter', '2026-10-31', 'gadgets-accessories', 1000],
      ['unicode-suffix', 'samsé', '2026-10-31', 'gadgets-accessories', 1000],
    ] as const;
    await model.collection.insertMany(samples.map(([messageId, text, date, category, price]) => ({
      messageId, text, date: new Date(date), channelId: 'verification', category, price, clicks: 0,
      identity: { canonicalName: text, brand: text.split(' ')[0], model: text.includes('S25') ? 'S25 Ultra' : null, variant: [] },
      ...buildDealSearchFields({ text }),
    })));
    await mongoose.connection.db.command({ createSearchIndexes: name, indexes: [{ name: DEAL_ATLAS_SEARCH_INDEX_NAME, definition: DEAL_ATLAS_SEARCH_INDEX_DEFINITION }] });
    const deadline = Date.now() + 180_000;
    while (true) {
      const [index] = await model.collection.aggregate([{ $listSearchIndexes: { name: DEAL_ATLAS_SEARCH_INDEX_NAME } }]).toArray();
      if (index?.queryable && index.status === 'READY') break;
      if (index?.status === 'FAILED' || Date.now() > deadline) throw new Error('Fixture index did not become ready');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    // Do not allow production fallback to conceal a broken native query.
    const native = async (query: string, match = {}) => {
      const plan = buildDealSearchPlan(query);
      return model.aggregate([
        buildAtlasSearchStage({ textSearch: plan.textSearch, tokenGroups: plan.tokenGroups, prefixToken: plan.prefixToken }),
        { $match: match }, buildDealSearchRankingStage(plan), { $sort: DEAL_SEARCH_RELEVANCE_SORT },
      ]).option({ maxTimeMS: 4500 });
    };
    const phones = await native('samung s25 ultra');
    assert.deepEqual(phones.slice(0, 2).map((row) => row.messageId), ['new-phone', 'old-phone']);
    assert.equal(phones[0].matchCoverage, 3);
    assert.equal((await native('lg washin machine'))[0].messageId, 'washer');
    assert.deepEqual((await native('sams')).map((row) => row.messageId), ['wrong-model', 'new-phone', 'old-phone']);
    assert.ok((await native('tv')).some((row) => row.messageId === 'tv'));
    assert.ok(!(await native('256gb')).some((row) => row.messageId === 'numeric-suffix'));
    const filtered = await getMessagesFromStore(model, { search: 's25 ultra', category: 'mobile-phones', minPrice: '70000', maxPrice: '77000', from: '2026-10-29', to: '2026-10-29' });
    assert.deepEqual(filtered.data.map((row) => row.messageId), ['new-phone']);
    assert.equal(filtered.totalDealsCount, 1);
    for (const [sort, first] of [['price_asc', 'wrong-model'], ['price_desc', 'old-phone'], ['oldest', 'old-phone']] as const) {
      const result = await getMessagesFromStore(model, { search: 's25 ultra', category: 'mobile-phones', sort });
      assert.equal(result.data[0].messageId, first, `Explicit sort ${sort}`);
    }
    const ids: string[] = [];
    let cursor: string | undefined;
    const recoveredStore = { aggregate: <T>(pipeline: unknown[]) => model.aggregate<T>(pipeline as any[]) };
    for (let page = 0; page <= phones.length; page++) {
      const result = await getMessagesFromStore(page >= 2 ? recoveredStore : model, { search: 'samung s25 ultra', limit: 1, cursor });
      ids.push(...result.data.map((row) => row.id));
      if (page === 0) markAtlasFailure(model);
      if (!result.hasMore) break;
      cursor = result.nextCursor;
    }
    assert.deepEqual(ids, phones.map((row) => String(row._id)), 'Failover pagination must not skip or duplicate results');
    await SearchSession.createIndexes();
    const snapshot = await getSearchPage(model, { search: 'samung s25 ultra', limit: 1 });
    assert.equal(snapshot.data[0].messageId, 'new-phone');
    await model.collection.updateOne({ messageId: 'new-phone' }, { $set: { date: new Date('2020-01-01'), clicks: 9000 } });
    await model.collection.updateOne({ messageId: 'old-phone' }, { $set: { date: new Date('2030-01-01'), price: 1234, clicks: 10000 } });
    await model.collection.deleteOne({ messageId: 'tv' });
    const snapshotIds = snapshot.data.map((row) => row.id);
    let snapshotCursor = snapshot.nextCursor;
    let updatedPrice: number;
    while (snapshotCursor) {
      const page = await getSearchPage(model, { search: 'samung s25 ultra', limit: 1, cursor: snapshotCursor });
      for (const row of page.data) {
        snapshotIds.push(row.id);
        if (row.messageId === 'old-phone') updatedPrice = row.price;
      }
      snapshotCursor = page.nextCursor;
    }
    assert.deepEqual(snapshotIds, phones.filter((row) => row.messageId !== 'tv').map((row) => String(row._id)), 'Concurrent mutations must not skip or repeat snapshot members');
    assert.equal(updatedPrice, 1234, 'Snapshot order must still display current details');
    console.log('Snapshot assertions: date/click/price changes and deletion PASS');
    console.log('Fixture assertions: relevance, typo, prefix, synonyms, model numbers, filters, counts and failover pagination PASS');
  } finally {
    const fixtureIds = await model.collection.find({}, { projection: { _id: 1 } }).toArray();
    if (fixtureIds.length) await SearchSession.deleteMany({ ids: { $in: fixtureIds.map((row) => row._id) } });
    // Only delete the exact isolated collection created above.
    await model.collection.drop().catch((error) => { if (error.code !== 26) throw error; });
    mongoose.deleteModel(name);
    console.log(`Removed fixture collection ${name}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Atlas verification failed');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
