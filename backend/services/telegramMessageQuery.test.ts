import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { getMessagesFromStore } from './telegramMessageQuery';

test('prioritizes query coverage, then newest matches before text score and clicks', async () => {
  const pipelines: unknown[][] = [];
  const messageId = new mongoose.Types.ObjectId();
  const store = {
    aggregate: async <T>(pipeline: unknown[]) => {
      pipelines.push(pipeline);
      if (pipeline.some((stage) => '$count' in (stage as Record<string, unknown>))) {
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

  await getMessagesFromStore(store, { search: 'Samsung mobile', limit: 12 });

  const resultPipeline = pipelines.find(
    (pipeline) => !pipeline.some((stage) => '$count' in (stage as Record<string, unknown>)),
  ) as Array<Record<string, unknown>>;
  const searchStage = resultPipeline[0] as {
    $search: {
      index: string;
      compound: { should: Array<{ text: Record<string, unknown> }> };
    };
  };
  assert.equal(searchStage.$search.index, 'deal_search_atlas_v1');
  assert.equal(searchStage.$search.compound.should.length, 7);
  assert.deepEqual(searchStage.$search.compound.should[0], {
    text: {
      query: 'samsung mobile smartphone phone',
      path: 'identity.model',
      score: { boost: { value: 10 } },
    },
  });
  assert.deepEqual(searchStage.$search.compound.should[6], {
    text: {
      query: 'samsung mobile smartphone phone',
      path: 'searchTokens',
      fuzzy: { maxEdits: 1, prefixLength: 1, maxExpansions: 50 },
      score: { boost: { value: 1 } },
    },
  });
  assert.deepEqual(resultPipeline[1], {
    $addFields: {
      searchScore: { $meta: 'searchScore' },
      matchCoverage: {
        $sum: [
          {
            $cond: [
              {
                $gt: [{
                  $size: {
                    $setIntersection: [{ $ifNull: ['$searchTokens', []] }, ['samsung']],
                  },
                }, 0],
              },
              1,
              0,
            ],
          },
          {
            $cond: [
              {
                $gt: [{
                  $size: {
                    $setIntersection: [
                      { $ifNull: ['$searchTokens', []] },
                      ['mobile', 'smartphone', 'phone'],
                    ],
                  },
                }, 0],
              },
              1,
              0,
            ],
          },
        ],
      },
    },
  });
  assert.deepEqual(resultPipeline[2], {
    $sort: { matchCoverage: -1, date: -1, searchScore: -1, clicks: -1, _id: -1 },
  });
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
      if (stages.some((stage) => stage.$count)) return [{ count: rows.length }] as Row[];
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

test('falls back to MongoDB text search when Atlas Search fails', async () => {
  const pipelines: unknown[][] = [];
  const messageId = new mongoose.Types.ObjectId();
  const store = {
    aggregate: async <T>(pipeline: unknown[]) => {
      pipelines.push(pipeline);
      if ('$search' in (pipeline[0] as Record<string, unknown>)) {
        throw new Error('Atlas Search index is unavailable');
      }
      if (pipeline.some((stage) => '$count' in (stage as Record<string, unknown>))) {
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
      !pipeline.some((stage) => '$count' in (stage as Record<string, unknown>))
    ),
  ) as Array<Record<string, unknown>>;

  assert.deepEqual(fallbackPipeline[0], {
    $match: { $text: { $search: 'samsung mobile smartphone phone' } },
  });
  assert.deepEqual(fallbackPipeline[1], {
    $addFields: {
      searchScore: { $meta: 'textScore' },
      matchCoverage: {
        $sum: [
          {
            $cond: [
              {
                $gt: [{
                  $size: {
                    $setIntersection: [{ $ifNull: ['$searchTokens', []] }, ['samsung']],
                  },
                }, 0],
              },
              1,
              0,
            ],
          },
          {
            $cond: [
              {
                $gt: [{
                  $size: {
                    $setIntersection: [
                      { $ifNull: ['$searchTokens', []] },
                      ['mobile', 'smartphone', 'phone'],
                    ],
                  },
                }, 0],
              },
              1,
              0,
            ],
          },
        ],
      },
    },
  });
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
      if (pipeline.some((stage) => '$count' in (stage as Record<string, unknown>))) {
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
    (pipeline) => !pipeline.some((stage) => '$count' in (stage as Record<string, unknown>)),
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
      if (pipeline.some((stage) => '$count' in (stage as Record<string, unknown>))) {
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
    (pipeline) => !pipeline.some((stage) => '$count' in (stage as Record<string, unknown>)),
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
