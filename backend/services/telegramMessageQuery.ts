import type { MessageQueryOptions } from './telegramTypes';
import mongoose from 'mongoose';
import { buildDealSearchPlan } from '../utils/dealSearch';

type QueryableTelegramMessage = {
  aggregate: <T>(pipeline: unknown[]) => Promise<T[]>;
};

type TelegramMessageQuery = Record<string, unknown> & {
  _id?: Record<string, mongoose.Types.ObjectId>;
  $text?: { $search: string };
  $or?: Record<string, unknown>[];
  channelId?: string;
  category?: string;
  date?: Record<string, Date>;
  price?: Record<string, number | null>;
};

type TelegramMessageAggregateRow = {
  _id: mongoose.Types.ObjectId;
  messageId?: string;
  text?: string;
  date?: Date;
  link?: string;
  imageUrl?: string;
  telegramFileId?: string;
  channelId?: string;
  category?: string;
  price?: number | null;
  clicks?: number;
  createdAt?: Date;
  searchScore?: number;
  matchCoverage?: number;
};

type CountRow = { count: number };

function parseDateOnlyToUtc(dateStr: string, endOfDay: boolean): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const hours = endOfDay ? 23 : 0;
  const minutes = endOfDay ? 59 : 0;
  const seconds = endOfDay ? 59 : 0;
  const ms = endOfDay ? 999 : 0;

  const parsed = new Date(Date.UTC(year, monthIndex, day, hours, minutes, seconds, ms));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function parseNumericFilter(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (!/^\d+$/.test(String(value))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function getMessagesFromStore(
  TelegramMessage: QueryableTelegramMessage,
  options: MessageQueryOptions = {},
) {
  const {
    limit = 10,
    cursor,
    channelId,
    category,
    search,
    from,
    to,
    minPrice,
    maxPrice,
    sort,
  } = options;

  const parsedLimit = parseInt(String(limit), 10);
  const numericLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 10;
  const isPriceAsc = sort === 'price_asc';
  const isPriceDesc = sort === 'price_desc';
  const isPriceSort = isPriceAsc || isPriceDesc;
  const isOldestFirst = sort === 'oldest';
  const hasSearchInput = typeof search === 'string' && search.trim().length > 0;
  const searchPlan = hasSearchInput ? buildDealSearchPlan(search.slice(0, 200)) : null;
  if (searchPlan && !searchPlan.textSearch) {
    return { data: [], hasMore: false, nextCursor: null, totalDealsCount: 0 };
  }
  const isRelevanceSort = Boolean(searchPlan) && !isPriceSort && !isOldestFirst;
  const objectId = mongoose.Types.ObjectId;

  const query: TelegramMessageQuery = {};
  if (channelId) {
    query.channelId = channelId;
  }

  if (category) {
    query.category = category;
  }

  if (from || to) {
    const dateQuery: Record<string, Date> = {};
    if (from) {
      const start = parseDateOnlyToUtc(from, false);
      if (start) dateQuery.$gte = start;
    }

    if (to) {
      const end = parseDateOnlyToUtc(to, true);
      if (end) dateQuery.$lte = end;
    }

    if (Object.keys(dateQuery).length > 0) {
      query.date = dateQuery;
    }
  }

  if (searchPlan) {
    query.$text = { $search: searchPlan.textSearch };
  }

  const minPriceNumber = parseNumericFilter(minPrice);
  const maxPriceNumber = parseNumericFilter(maxPrice);
  const hasPriceFilter = minPriceNumber !== null || maxPriceNumber !== null;

  if (hasPriceFilter || isPriceSort) {
    const priceRange: Record<string, number | null> = {};
    if (minPriceNumber !== null) priceRange.$gte = minPriceNumber;
    if (maxPriceNumber !== null) priceRange.$lte = maxPriceNumber;
    if (isPriceSort) priceRange.$ne = null;
    query.price = priceRange;
  }

  const filterPipeline: Array<Record<string, unknown>> = [{ $match: query }];

  const resultPipeline = [...filterPipeline];
  if (searchPlan) {
    resultPipeline.push({
      $addFields: {
        searchScore: { $meta: 'textScore' },
        matchCoverage: {
          $sum: searchPlan.tokenGroups.map((group) => ({
            $cond: [
              { $gt: [{ $size: { $setIntersection: ['$searchTokens', group] } }, 0] },
              1,
              0,
            ],
          })),
        },
      },
    });
  }

  if (cursor && isPriceSort) {
    const [cursorPriceRaw, cursorIdRaw] = String(cursor).split('|');
    const cursorPrice = Number(cursorPriceRaw);
    const isValidCursor =
      Number.isFinite(cursorPrice) &&
      Boolean(cursorIdRaw) &&
      objectId.isValid(cursorIdRaw);

    if (isValidCursor) {
      const cursorId = new objectId(cursorIdRaw);
      resultPipeline.push({
        $match: {
          $or: [
            { price: { [isPriceAsc ? '$gt' : '$lt']: cursorPrice } },
            { price: cursorPrice, _id: { [isPriceAsc ? '$gt' : '$lt']: cursorId } },
          ],
        },
      });
    }
  } else if (cursor && isRelevanceSort) {
    const [
      cursorCoverageRaw,
      cursorScoreRaw,
      cursorDateRaw,
      cursorClicksRaw,
      cursorIdRaw,
    ] = String(cursor).split('|');
    const cursorCoverage = Number(cursorCoverageRaw);
    const cursorScore = Number(cursorScoreRaw);
    const cursorDate = new Date(Number(cursorDateRaw));
    const cursorClicks = Number(cursorClicksRaw);
    const isValidCursor =
      Number.isFinite(cursorCoverage) &&
      Number.isFinite(cursorScore) &&
      !Number.isNaN(cursorDate.getTime()) &&
      Number.isFinite(cursorClicks) &&
      Boolean(cursorIdRaw) &&
      objectId.isValid(cursorIdRaw);

    if (isValidCursor) {
      const cursorId = new objectId(cursorIdRaw);
      resultPipeline.push({
        $match: {
          $or: [
            { matchCoverage: { $lt: cursorCoverage } },
            { matchCoverage: cursorCoverage, searchScore: { $lt: cursorScore } },
            { matchCoverage: cursorCoverage, searchScore: cursorScore, date: { $lt: cursorDate } },
            { matchCoverage: cursorCoverage, searchScore: cursorScore, date: cursorDate, clicks: { $lt: cursorClicks } },
            { matchCoverage: cursorCoverage, searchScore: cursorScore, date: cursorDate, clicks: cursorClicks, _id: { $lt: cursorId } },
          ],
        },
      });
    }
  } else if (cursor) {
    const [cursorDateRaw, cursorIdRaw] = String(cursor).split('|');
    const cursorDate = new Date(Number(cursorDateRaw));
    if (
      cursorIdRaw &&
      objectId.isValid(cursorIdRaw) &&
      !Number.isNaN(cursorDate.getTime())
    ) {
      const comparison = isOldestFirst ? '$gt' : '$lt';
      resultPipeline.push({
        $match: {
          $or: [
            { date: { [comparison]: cursorDate } },
            { date: cursorDate, _id: { [comparison]: new objectId(cursorIdRaw) } },
          ],
        },
      });
    } else if (objectId.isValid(cursor)) {
      resultPipeline.push({
        $match: { _id: { [isOldestFirst ? '$gt' : '$lt']: new objectId(cursor) } },
      });
    }
  }

  const sortStage = isPriceSort
    ? { $sort: { price: isPriceAsc ? 1 : -1, _id: isPriceAsc ? 1 : -1 } }
    : isRelevanceSort
      ? { $sort: { matchCoverage: -1, searchScore: -1, date: -1, clicks: -1, _id: -1 } }
      : { $sort: { date: isOldestFirst ? 1 : -1, _id: isOldestFirst ? 1 : -1 } };

  const projectionStage = {
    $project: {
      messageId: 1,
      text: 1,
      date: 1,
      link: 1,
      imageUrl: 1,
      telegramFileId: 1,
      channelId: 1,
      category: 1,
      price: 1,
      clicks: 1,
      createdAt: 1,
      searchScore: 1,
      matchCoverage: 1,
    },
  };

  const [totalDealsResult, messages] = await Promise.all([
    TelegramMessage.aggregate<CountRow>([...filterPipeline, { $count: 'count' }]),
    TelegramMessage.aggregate<TelegramMessageAggregateRow>([
      ...resultPipeline,
      sortStage,
      { $limit: numericLimit + 1 },
      projectionStage,
    ]),
  ]);

  const hasMore = messages.length > numericLimit;
  const data = hasMore ? messages.slice(0, numericLimit) : messages;

  const processedData = data.map((item) => {
    const { searchScore: _searchScore, matchCoverage: _matchCoverage, ...message } = item;
    return { ...message, id: message._id.toString() };
  });

  const totalDealsCount = totalDealsResult?.[0]?.count || 0;
  const nextCursor = (() => {
    if (!hasMore || data.length === 0) return null;
    const lastItem = data[data.length - 1];
    if (isPriceSort) {
      const lastWithPrice = [...data]
        .reverse()
        .find((item) => typeof item.price === 'number');
      if (!lastWithPrice) return null;
      return `${lastWithPrice.price}|${lastWithPrice._id}`;
    }
    if (isRelevanceSort) {
      return `${lastItem.matchCoverage ?? 0}|${lastItem.searchScore ?? 0}|${new Date(lastItem.date || 0).getTime()}|${lastItem.clicks || 0}|${lastItem._id}`;
    }
    return `${new Date(lastItem.date || 0).getTime()}|${lastItem._id}`;
  })();

  return {
    data: processedData,
    hasMore,
    nextCursor,
    totalDealsCount,
  };
}
