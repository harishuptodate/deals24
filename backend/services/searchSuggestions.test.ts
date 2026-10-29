import assert from 'node:assert/strict';
import test from 'node:test';
import { getMessagesFromStore } from './telegramMessageQuery';
import {
  getSearchSuggestions, shapeSuggestions, suggestionCacheIdentity, buildSuggestionFilter,
} from './searchSuggestions';

test('suggestion cache normalizes queries, separates filters, and has only 256 slots', () => {
  assert.deepEqual(suggestionCacheIdentity('  Samsung  TV ', {}), suggestionCacheIdentity('samsung tv', {}));
  assert.notEqual(suggestionCacheIdentity('samsung', {}).fingerprint, suggestionCacheIdentity('samsung', { maxPrice: '10000' }).fingerprint);
  const keys = new Set(Array.from({ length: 2000 }, (_, index) => suggestionCacheIdentity(`query${index}`, {}).key));
  assert.ok(keys.size <= 256);
});

test('suggestions skip the database for single characters and URL-only input', async () => {
  const store = { aggregate: () => { throw new Error('must not query'); } };
  assert.equal((await getSearchSuggestions(store, 's')).deals.length, 0);
  assert.equal((await getSearchSuggestions(store, 'https://example.com')).deals.length, 0);
});

test('deduplicates Amazon products but retains different variants and latest price', () => {
  const result = shapeSuggestions([
    { _id: 'old', amazonAsin: 'ASIN1', price: 50000, date: '2026-10-20' },
    { _id: 'latest', amazonAsin: 'ASIN1', price: 45000, date: '2026-10-28', identity: { canonicalName: 'Samsung S24' } },
    { _id: 'variant', amazonAsin: 'ASIN2', price: 49000 },
  ], 'sam');
  assert.deepEqual(result.deals.map((deal) => deal.id), ['latest', 'variant']);
  assert.equal(result.deals[0].price, 45000);
  assert.equal(result.products[0].label, 'Samsung S24');
  assert.equal(result.categories[0].category, 'mobile-phones');
});

test('validates filter values before generating database conditions', () => {
  const match = buildSuggestionFilter({ minPrice: 'invalid', maxPrice: '30000', from: 'bad', to: '2026-10-28' });
  assert.deepEqual(match.price, { $lte: 30000 });
  assert.deepEqual(match.date, { $lte: new Date('2026-10-28T23:59:59.999Z') });
});

test('preserves Telegram image IDs in both search backends', async () => {
  for (const fallback of [false, true]) {
    let calls = 0;
    const store = { aggregate: <Row>(pipeline: unknown[]) => ({ option: async () => {
      calls += 1;
      if (fallback && calls === 1) throw new Error('Atlas unavailable');
      const projection = pipeline.find((stage) => '$project' in (stage as object)) as { $project: Record<string, number> };
      assert.equal(projection.$project.telegramFileId, 1);
      return [{ _id: 'telegram', telegramFileId: 'photo-file-id' }] as Row[];
    } }) };
    const result = await getSearchSuggestions(store, 'samsung');
    assert.equal(result.deals[0].telegramFileId, 'photo-file-id');
    assert.equal(result.deals[0].imageUrl, null);
  }
  assert.equal(shapeSuggestions([{ _id: 'no-image' }], 'samsung').deals[0].telegramFileId, null);
});

test('TV searches retain synonym expansion and Atlas fuzzy matching', async () => {
  const pipelines: unknown[][] = [];
  const store = { aggregate: <Row>(pipeline: unknown[]) => ({ option: async () => {
    pipelines.push(pipeline);
    return [] as Row[];
  } }) };
  await getSearchSuggestions(store, 'tv');
  const stage = JSON.stringify(pipelines[0][0]);
  assert.ok(stage.includes('television'));
  assert.ok(stage.includes('fuzzy'));
  assert.ok(!stage.includes('autocomplete'));
  const stages = pipelines[0] as Array<Record<string, unknown>>;
  const sortIndex = stages.findIndex((stage) => '$sort' in stage);
  assert.deepEqual(stages[sortIndex], { $sort: { matchCoverage: -1, date: -1, searchScore: -1, clicks: -1, _id: -1 } });
  assert.ok(!stages.slice(0, sortIndex).some((entry) => '$limit' in entry));
});

test('text search fallback preserves every filter', async () => {
  const pipelines: unknown[][] = [];
  const store = { aggregate: <Row>(pipeline: unknown[]) => ({ option: async () => {
    pipelines.push(pipeline);
    if (pipelines.length === 1) throw new Error('Atlas unavailable');
    return [{ _id: 'fallback', text: 'Samsung TV', price: 20000 }] as Row[];
  } }) };
  const result = await getSearchSuggestions(store, 'Samsung tv', { maxPrice: '30000', category: 'electronics-home' });
  assert.equal(result.deals[0].id, 'fallback');
  assert.deepEqual((pipelines[1][0] as { $match: { price: unknown } }).$match.price, { $lte: 30000 });
  assert.ok(JSON.stringify(pipelines[1]).includes('electronics-home'));
});

for (const query of ['lg washing machine', 'lg washin machine', 'samsung s23', 'samung s25 ultra']) {
  for (const fallback of [false, true]) {
    test(`dropdown and grid share matching and ranking for "${query}" (fallback=${fallback})`, async () => {
      const previewPipelines: unknown[][] = [];
      const gridPipelines: unknown[][] = [];
      const capture = (pipelines: unknown[][], pipeline: unknown[]) => {
        pipelines.push(pipeline);
        if (fallback && '$search' in (pipeline[0] as object)) throw new Error('Atlas unavailable');
        return [];
      };
      await getSearchSuggestions({ aggregate: <Row>(pipeline: unknown[]) => ({
        option: async () => capture(previewPipelines, pipeline) as Row[],
      }) }, query);
      await getMessagesFromStore({ aggregate: async <Row>(pipeline: unknown[]) => capture(gridPipelines, pipeline) as Row[] }, { search: query });
      const preview = previewPipelines.at(-1) as Array<Record<string, unknown>>;
      const grid = [...gridPipelines].reverse().find((pipeline) => pipeline.some((stage) => '$addFields' in (stage as object))) as Array<Record<string, unknown>>;
      assert.deepEqual(preview[0], grid[0]);
      assert.deepEqual(preview.find((stage) => '$addFields' in stage), grid.find((stage) => '$addFields' in stage));
      assert.deepEqual(preview.find((stage) => '$sort' in stage), grid.find((stage) => '$sort' in stage));
      assert.ok(!preview.some((stage) => '$match' in stage && '$and' in (stage.$match as object)));
    });
  }
}
