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
  assert.deepEqual(resultPipeline[0], {
    $match: { $text: { $search: 'samsung mobile smartphone phone' } },
  });
  assert.deepEqual(resultPipeline[1], {
    $addFields: {
      searchScore: { $meta: 'textScore' },
      matchCoverage: {
        $sum: [
          {
            $cond: [
              { $gt: [{ $size: { $setIntersection: ['$searchTokens', ['samsung']] } }, 0] },
              1,
              0,
            ],
          },
          {
            $cond: [
              {
                $gt: [{
                  $size: {
                    $setIntersection: ['$searchTokens', ['mobile', 'smartphone', 'phone']],
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
