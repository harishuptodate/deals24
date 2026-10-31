import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { getMessagesFromStore } from './telegramMessageQuery';
import { getSearchSuggestions } from './searchSuggestions';
import { canUseAtlas, markAtlasFailure, runSearchWithFallback } from './atlasSearchHealth';

test('prioritizes coverage and recency, and counts inside Atlas', async () => {
  const pipelines: unknown[][] = [];
  await getMessagesFromStore({ aggregate: async <T>(pipeline: unknown[]) => {
    pipelines.push(pipeline);
    return [] as T[];
  } }, { search: 'Samsung mobile' });
  const stages = pipelines.flat() as Array<Record<string, any>>;
  assert.equal(stages.find((stage) => stage.$searchMeta).$searchMeta.count.type, 'total');
  assert.deepEqual(stages.find((stage) => stage.$sort), {
    $sort: { matchCoverage: -1, date: -1, searchScore: -1, clicks: -1, _id: -1 },
  });
  assert.ok(JSON.stringify(stages).includes('autocomplete'));
});

test('ranks S25 Ultra phones before newer Ultra HD TVs and paginates complete matches newest first', async () => {
  const newerDate = new Date('2026-10-29T10:00:00Z');
  const olderDate = new Date('2026-10-28T10:00:00Z');
  const rows = [
    { _id: new mongoose.Types.ObjectId(), text: 'Samsung S25 Ultra', date: olderDate, matchCoverage: 2, searchScore: 100, clicks: 500, price: 50000 },
    { _id: new mongoose.Types.ObjectId(), text: 'Hisense Ultra HD TV', date: newerDate, matchCoverage: 1, searchScore: 1, clicks: 0, price: 40000 },
    { _id: new mongoose.Types.ObjectId(), date: newerDate, matchCoverage: 2, searchScore: 2, clicks: 0, price: 39000 },
    { _id: new mongoose.Types.ObjectId(), date: newerDate, matchCoverage: 2, searchScore: 3, clicks: 0, price: 38000 },
  ];
  const comparable = (value: unknown): string | number => value instanceof Date
    ? value.getTime() : typeof value === 'number' ? value : String(value);
  const store = {
    aggregate: async <Row>(pipeline: unknown[]) => {
      const stages = pipeline as Array<Record<string, any>>;
      if (stages.some((stage) => (stage.$count || stage.$searchMeta))) return [{ count: rows.length }] as Row[];
      let results = [...rows];
      const cursorFilter = stages.find((stage) => stage.$match?.$or)?.$match.$or;
      if (cursorFilter) results = results.filter((row) => cursorFilter.some((clause: Record<string, unknown>) => (
        Object.entries(clause).every(([field, condition]) => {
          const actual = comparable(row[field]);
          if (condition && typeof condition === 'object' && '$lt' in condition) {
            return actual < comparable(condition.$lt);
          }
          return actual === comparable(condition);
        })
      )));
      const sort = stages.find((stage) => stage.$sort)?.$sort;
      results.sort((first, second) => {
        for (const [field, direction] of Object.entries(sort)) {
          const firstValue = comparable(first[field]);
          const secondValue = comparable(second[field]);
          if (firstValue !== secondValue) return (firstValue < secondValue ? -1 : 1) * Number(direction);
        }
        return 0;
      });
      return results.slice(0, stages.find((stage) => stage.$limit)?.$limit) as Row[];
    },
  };
  const ids: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < rows.length; page++) {
    const result = await getMessagesFromStore(store, { search: 's25 ultra', limit: 1, cursor });
    ids.push(result.data[0].id);
    cursor = result.nextCursor || undefined;
  }
  assert.deepEqual(ids, [rows[3], rows[2], rows[0], rows[1]].map((row) => String(row._id)));
});

test('explicit price and oldest sorts still override newest-first search ranking', async () => {
  for (const [sort, expected] of [
    ['price_asc', { price: 1, _id: 1 }],
    ['price_desc', { price: -1, _id: -1 }],
    ['oldest', { date: 1, _id: 1 }],
  ] as const) {
    const pipelines: unknown[][] = [];
    await getMessagesFromStore({ aggregate: async <Row>(pipeline: unknown[]) => {
      pipelines.push(pipeline);
      return [] as Row[];
    } }, { search: 'Samsung phone', sort });
    const stages = pipelines.flat() as Array<Record<string, unknown>>;
    assert.deepEqual(stages.find((stage) => '$sort' in stage), { $sort: expected });
  }
});

test('falls back to MongoDB token search when Atlas Search fails', async () => {
  const pipelines: unknown[][] = [];
  const messageId = new mongoose.Types.ObjectId();
  const store = {
    aggregate: async <T>(pipeline: unknown[]) => {
      pipelines.push(pipeline);
      if ('$search' in (pipeline[0] as Record<string, unknown>)) {
        throw new Error('Atlas Search index is unavailable');
      }
      if (pipeline.some((stage) => ('$count' in (stage as Record<string, unknown>) || '$searchMeta' in (stage as Record<string, unknown>)))) {
        return [{ count: 1 }] as T[];
      }
      return [{
        _id: messageId,
        text: 'Samsung Galaxy smartphone deal',
        date: new Date('2026-10-28T10:00:00.000Z'),
        clicks: 5,
      }] as T[];
    },
  };

  const result = await getMessagesFromStore(store, { search: 'Samsung mobile', limit: 12 });
  const fallbackPipeline = pipelines.find(
    (pipeline) => (
      '$match' in (pipeline[0] as Record<string, unknown>) &&
      !pipeline.some((stage) => ('$count' in (stage as Record<string, unknown>) || '$searchMeta' in (stage as Record<string, unknown>)))
    ),
  ) as Array<Record<string, unknown>>;

  const fallbackMatch = fallbackPipeline[0].$match as { searchTokens: { $in: Array<string | RegExp> } };
  assert.ok(fallbackMatch.searchTokens.$in.some((pattern) => typeof pattern === 'string' ? pattern === 'samung' : pattern.test('samung')));
  assert.ok(!JSON.stringify(fallbackPipeline).includes('textScore'));
  assert.equal(result.data.length, 1);
  assert.deepEqual(fallbackPipeline.find((stage) => '$sort' in stage), {
    $sort: { matchCoverage: -1, date: -1, searchScore: -1, clicks: -1, _id: -1 },
  });
});

test('applies deal filters inside the Atlas Search stage', async () => {
  const pipelines: unknown[][] = [];
  const messageId = new mongoose.Types.ObjectId();
  const store = {
    aggregate: async <T>(pipeline: unknown[]) => {
      pipelines.push(pipeline);
      if (pipeline.some((stage) => ('$count' in (stage as Record<string, unknown>) || '$searchMeta' in (stage as Record<string, unknown>)))) {
        return [{ count: 1 }] as T[];
      }
      return [{
        _id: messageId,
        text: 'Samsung Galaxy smartphone deal',
        date: new Date('2026-10-28T10:00:00.000Z'),
        price: 25_000,
      }] as T[];
    },
  };

  await getMessagesFromStore(store, {
    search: 'Samsung mobile',
    channelId: 'deals-channel',
    category: 'mobile-phones',
    from: '2026-10-01',
    to: '2026-10-31',
    minPrice: '5000',
    maxPrice: '50000',
  });

  const resultPipeline = pipelines.find(
    (pipeline) => !pipeline.some((stage) => ('$count' in (stage as Record<string, unknown>) || '$searchMeta' in (stage as Record<string, unknown>))),
  ) as Array<Record<string, unknown>>;
  const searchStage = resultPipeline[0] as {
    $search: { compound: { filter: unknown[] } };
  };
  assert.deepEqual(searchStage.$search.compound.filter, [
    { equals: { path: 'channelId', value: 'deals-channel' } },
    { equals: { path: 'category', value: 'mobile-phones' } },
    {
      range: {
        path: 'date',
        gte: new Date('2026-10-01T00:00:00.000Z'),
        lte: new Date('2026-10-31T23:59:59.999Z'),
      },
    },
    { range: { path: 'price', gte: 5000, lte: 50000 } },
  ]);
});

test('returns no deals without querying MongoDB for a URL-only search', async () => {
  let aggregateCalls = 0;
  const result = await getMessagesFromStore({
    aggregate: async <T>() => {
      aggregateCalls += 1;
      return [] as T[];
    },
  }, { search: 'https://amazon.in/dp/B0ABC12345' });

  assert.deepEqual(result, {
    data: [],
    hasMore: false,
    nextCursor: null,
    totalDealsCount: 0,
  });
  assert.equal(aggregateCalls, 0);
});

test('filters and sorts directly on the numeric price field', async () => {
  const pipelines: unknown[][] = [];
  const messageId = new mongoose.Types.ObjectId();
  const store = {
    aggregate: async <T>(pipeline: unknown[]) => {
      pipelines.push(pipeline);
      if (pipeline.some((stage) => ('$count' in (stage as Record<string, unknown>) || '$searchMeta' in (stage as Record<string, unknown>)))) {
        return [{ count: 1 }] as T[];
      }
      return [{
        _id: messageId,
        text: 'Numeric price deal',
        date: new Date('2026-10-28T10:00:00.000Z'),
        price: 2499,
      }] as T[];
    },
  };

  await getMessagesFromStore(store, {
    minPrice: '1000',
    maxPrice: '5000',
    sort: 'price_asc',
  });

  const resultPipeline = pipelines.find(
    (pipeline) => !pipeline.some((stage) => ('$count' in (stage as Record<string, unknown>) || '$searchMeta' in (stage as Record<string, unknown>))),
  ) as Array<Record<string, unknown>>;
  assert.deepEqual(resultPipeline[0], {
    $match: { price: { $gte: 1000, $lte: 5000, $ne: null } },
  });
  assert.deepEqual(resultPipeline[1], {
    $sort: { price: 1, _id: 1 },
  });
  assert.equal(JSON.stringify(resultPipeline).includes('$convert'), false);
  assert.equal(JSON.stringify(resultPipeline).includes('priceNumber'), false);
});

test('database operations receive server time limits and pagination reuses a bounded count', async () => {
  const pipelines: Array<Array<Record<string, any>>> = [];
  const timeouts: number[] = [];
  const id = new mongoose.Types.ObjectId();
  const store = { aggregate: <T>(pipeline: unknown[]) => {
    const stages = pipeline as Array<Record<string, any>>;
    pipelines.push(stages);
    const operation = Promise.resolve((stages[0].$searchMeta ? [{ count: 2 }] : [
      { _id: id, date: new Date(), matchCoverage: 1, searchScore: 1, clicks: 0 },
      { _id: new mongoose.Types.ObjectId(), date: new Date(), matchCoverage: 1, searchScore: 1, clicks: 0 },
    ]) as T[]);
    return Object.assign(operation, { option: ({ maxTimeMS }: { maxTimeMS: number }) => {
      timeouts.push(maxTimeMS);
      return operation;
    } });
  } };
  const first = await getMessagesFromStore(store, { search: 'samsung', limit: 1 });
  const second = await getMessagesFromStore(store, { search: 'samsung', limit: 1, cursor: first.nextCursor! });
  assert.equal(second.totalDealsCount, 2);
  assert.equal(pipelines.filter((pipeline) => pipeline[0].$searchMeta).length, 1);
  assert.ok(timeouts.every((timeout) => timeout === 4500));
  await getMessagesFromStore(store, { search: 'samsung', category: 'mobile-phones', cursor: first.nextCursor! });
  assert.equal(pipelines.filter((pipeline) => pipeline[0].$searchMeta).length, 2);
});

test('previews and grid share outage cooldown and retry Atlas after 30 seconds', async (context) => {
  let now = Date.now();
  context.mock.method(Date, 'now', () => now);
  const pipelines: Array<Array<Record<string, any>>> = [];
  const store = { aggregate: <T>(pipeline: unknown[]) => {
    pipelines.push(pipeline as Array<Record<string, any>>);
    const operation = Promise.resolve([] as T[]);
    return Object.assign(operation, { option: () => operation });
  } };
  markAtlasFailure(store);
  assert.equal(canUseAtlas(store), false);
  await getSearchSuggestions(store, 'sams');
  await getMessagesFromStore(store, { search: 'sams' });
  assert.ok(pipelines.every((pipeline) => !pipeline[0].$search && !pipeline[0].$searchMeta));
  now += 30_001;
  assert.equal(canUseAtlas(store), true);
  await getMessagesFromStore(store, { search: 'sams' });
  assert.ok(pipelines.some((pipeline) => pipeline[0].$search));
});

test('only one request probes recovery and an older success cannot clear a newer outage', async (context) => {
  let now = Date.now();
  context.mock.method(Date, 'now', () => now);
  const store = {};
  markAtlasFailure(store);
  now += 30_001;
  let release: (value: string) => void;
  const probe = new Promise<string>((resolve) => { release = resolve; });
  const first = runSearchWithFallback(store, 'results', () => probe, async () => 'fallback');
  assert.equal(canUseAtlas(store), false);
  const second = await runSearchWithFallback(store, 'previews', async () => { throw new Error('must not probe twice'); }, async () => 'fallback');
  assert.equal(second, 'fallback');
  markAtlasFailure(store);
  release('atlas');
  assert.equal(await first, 'atlas');
  assert.equal(canUseAtlas(store), false);
});

test('old score cursors require a refresh without querying either backend', async () => {
  await assert.rejects(() => getMessagesFromStore({ aggregate: async () => { throw new Error('must not query'); } }, {
    search: 'samsung', cursor: `1|10|12345|0|${new mongoose.Types.ObjectId()}`,
  }), /Refresh results/);
});
