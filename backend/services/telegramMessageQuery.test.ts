import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { getMessagesFromStore } from './telegramMessageQuery';

test('uses concept coverage, text relevance, recency, and clicks for search ranking', async () => {
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
    $sort: { matchCoverage: -1, searchScore: -1, date: -1, clicks: -1, _id: -1 },
  });
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
