import type { MessageQueryOptions } from './telegramTypes';
import mongoose from 'mongoose';
import { runSearchWithFallback } from './atlasSearchHealth';
import {
  buildDealSearchPlan,
  buildAtlasSearchStage,
  buildDealSearchRankingStage,
  DEAL_SEARCH_RELEVANCE_SORT,
  buildMongoSearchMatch,
  SearchCursorError,
  DEAL_SEARCH_SNAPSHOT_LIMIT,
} from '../utils/dealSearch';

type QueryableTelegramMessage = {
  aggregate: <T>(pipeline: unknown[]) => PromiseLike<T[]> & { option?: (options: { maxTimeMS: number }) => PromiseLike<T[]> };
};

type TelegramMessageQuery = Record<string, unknown> & {
  _id?: Record<string, mongoose.Types.ObjectId>;
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

type SearchBackend = 'atlas' | 'mongoTokens';
type SearchQueryOptions = MessageQueryOptions & { captureIds?: boolean };
const ATLAS_SEARCH_TIMEOUT_MS = 5_000;
const countCache = new WeakMap<object, Map<string, { count: number; expiresAt: number }>>();

function validateSearchCursor(cursor: string): void {
  const parts = cursor.split('|');
  const [coverage, score, date, clicks, id, version] = parts;
  if (parts.length !== 6 || version !== 'v2' || parts.slice(0, 4).some((part) => !part || !Number.isFinite(Number(part)))
    || !Number.isInteger(Number(coverage)) || Number(coverage) < 0 || Number(coverage) > 16
    || Number(score) < 0 || Number(clicks) < 0 || Number.isNaN(new Date(Number(date)).getTime())
    || !mongoose.Types.ObjectId.isValid(id)) throw new SearchCursorError();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Atlas Search timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}


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

async function getMessagesFromStoreWithBackend(
  TelegramMessage: QueryableTelegramMessage,
  options: SearchQueryOptions,
  searchBackend: SearchBackend,
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
  const numericLimit = options.captureIds ? DEAL_SEARCH_SNAPSHOT_LIMIT : Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 10;
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
  const fromDate = from ? parseDateOnlyToUtc(from, false) : null;
  const toDate = to ? parseDateOnlyToUtc(to, true) : null;

  const query: TelegramMessageQuery = {};
  if (channelId) {
    query.channelId = channelId;
  }

  if (category) {
    query.category = category;
  }

  if (fromDate || toDate) {
    const dateQuery: Record<string, Date> = {};
    if (fromDate) dateQuery.$gte = fromDate;
    if (toDate) dateQuery.$lte = toDate;

    if (Object.keys(dateQuery).length > 0) {
      query.date = dateQuery;
    }
  }

  if (searchPlan && searchBackend === 'mongoTokens') Object.assign(query, buildMongoSearchMatch(searchPlan));

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

  const filterPipeline: Array<Record<string, unknown>> = searchPlan && searchBackend === 'atlas'
    ? [buildAtlasSearchStage({
        textSearch: searchPlan.textSearch,
        tokenGroups: searchPlan.tokenGroups,
        prefixToken: searchPlan.prefixToken,
        channelId,
        category,
        fromDate,
        toDate,
        minPrice: minPriceNumber,
        maxPrice: maxPriceNumber,
        requirePrice: isPriceSort,
      })]
    : [{ $match: query }];

  const resultPipeline = [...filterPipeline];
  if (searchPlan) {
    resultPipeline.push(buildDealSearchRankingStage(searchPlan));
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
            { matchCoverage: cursorCoverage, date: { $lt: cursorDate } },
            { date: cursorDate, matchCoverage: cursorCoverage, searchScore: { $lt: cursorScore } },
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
      ? { $sort: DEAL_SEARCH_RELEVANCE_SORT }
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

  const aggregate = <T>(pipeline: unknown[]) => {
    const operation = TelegramMessage.aggregate<T>(pipeline);
    return operation.option ? operation.option({ maxTimeMS: ATLAS_SEARCH_TIMEOUT_MS - 500 }) : operation;
  };
  const countPipeline = searchPlan && searchBackend === 'atlas'
    ? [{ $searchMeta: { ...((filterPipeline[0] as ReturnType<typeof buildAtlasSearchStage>).$search), count: { type: 'total' } } },
      { $project: { count: '$count.total' } }]
    : [...filterPipeline, { $count: 'count' }];
  const countKey = JSON.stringify([searchBackend, searchPlan, channelId, category, fromDate, toDate, minPriceNumber, maxPriceNumber, isPriceSort]);
  const counts = countCache.get(TelegramMessage) || new Map<string, { count: number; expiresAt: number }>();
  const cachedCount = searchPlan && cursor ? counts.get(countKey) : undefined;
  const [totalDealsResult, messages] = await Promise.all([
    options.captureIds ? Promise.resolve([] as CountRow[]) : cachedCount && cachedCount.expiresAt > Date.now()
      ? Promise.resolve([{ count: cachedCount.count }])
      : aggregate<CountRow>(countPipeline),
    aggregate<TelegramMessageAggregateRow>([
      ...resultPipeline,
      sortStage,
      { $limit: numericLimit + 1 },
      options.captureIds ? { $project: { _id: 1 } } : projectionStage,
    ]),
  ]);

  const hasMore = messages.length > numericLimit;
  const data = hasMore ? messages.slice(0, numericLimit) : messages;

  const processedData = data.map((item) => {
    const { searchScore: _searchScore, matchCoverage: _matchCoverage, ...message } = item;
    return { ...message, id: message._id.toString() };
  });

  const totalDealsCount = totalDealsResult?.[0]?.count || 0;
  if (searchPlan && !options.captureIds && (!cachedCount || cachedCount.expiresAt <= Date.now())) {
    counts.delete(countKey);
    counts.set(countKey, { count: totalDealsCount, expiresAt: Date.now() + 30_000 });
    if (counts.size > 128) counts.delete(counts.keys().next().value);
    countCache.set(TelegramMessage, counts);
  }
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
      return `${lastItem.matchCoverage ?? 0}|${lastItem.searchScore ?? 0}|${new Date(lastItem.date || 0).getTime()}|${lastItem.clicks || 0}|${lastItem._id}|v2`;
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

export async function getMessagesFromStore(
  TelegramMessage: QueryableTelegramMessage,
  options: SearchQueryOptions = {},
) {
  const hasSearchInput = typeof options.search === 'string' && options.search.trim().length > 0;
  if (!hasSearchInput) {
    return getMessagesFromStoreWithBackend(TelegramMessage, options, 'mongoTokens');
  }

  // Validate before entering the circuit: a stale cursor is not an Atlas outage.
  if (options.cursor && options.sort !== 'price_asc' && options.sort !== 'price_desc' && options.sort !== 'oldest') validateSearchCursor(options.cursor);
  return runSearchWithFallback(TelegramMessage, 'results',
    () => withTimeout(getMessagesFromStoreWithBackend(TelegramMessage, options, 'atlas'), ATLAS_SEARCH_TIMEOUT_MS),
    () => getMessagesFromStoreWithBackend(TelegramMessage, options, 'mongoTokens'),
  );
}
