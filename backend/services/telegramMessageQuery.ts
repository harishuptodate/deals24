import type { MessageQueryOptions } from './telegramTypes';

const mongoose = require('mongoose');

export {};

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

function buildSearchQuery(search: string) {
  const rawSearch = search.trim();
  const words = rawSearch.split(/\s+/);

  const normalizeWord = (word: string) => {
    const lc = word.toLowerCase();
    const stems: Record<string, string> = {
      inches: 'inch',
      cms: 'cm',
      kgs: 'kg',
      lbs: 'lb',
      tons: 'ton',
      hz: 'hz',
      gbs: 'gb',
    };
    return stems[lc] || word;
  };

  const normalizedWords = words.map(normalizeWord);
  const unitWords = ['cm', 'inch', 'kg', 'gb', 'hz', 'tb', 'ton', 'lb'];

  const regexQueries = normalizedWords.map((word) => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isLooseMatch = /^\d+$/.test(word) || unitWords.includes(word.toLowerCase());
    const pattern = isLooseMatch ? escapedWord : `\\b${escapedWord}\\b`;
    return { text: { $regex: new RegExp(pattern, 'i') } };
  });

  const escapedFullSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const urlExclusionRegex = new RegExp(
    `(https?:\\/\\/\\S*${escapedFullSearch}\\S*)|(www\\.\\S*${escapedFullSearch}\\S*)`,
    'i',
  );

  return [
    ...regexQueries,
    {
      text: {
        $not: { $regex: urlExclusionRegex },
      },
    },
  ];
}

function parseNumericFilter(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (!/^\d+$/.test(String(value))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function getMessagesFromStore(TelegramMessage: any, options: MessageQueryOptions = {}) {
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

  const numericLimit = parseInt(String(limit), 10);
  const isPriceAsc = sort === 'price_asc';
  const isPriceDesc = sort === 'price_desc';
  const isPriceSort = isPriceAsc || isPriceDesc;
  const isOldestFirst = sort === 'oldest';
  const objectId = mongoose.Types.ObjectId;

  const query: Record<string, any> = {};
  if (channelId) {
    query.channelId = channelId;
  }

  if (cursor && !isPriceSort && objectId.isValid(cursor)) {
    query._id = { [isOldestFirst ? '$gt' : '$lt']: new objectId(cursor) };
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

  if (search) {
    query.$and = buildSearchQuery(search);
  }

  const minPriceNumber = parseNumericFilter(minPrice);
  const maxPriceNumber = parseNumericFilter(maxPrice);
  const hasPriceFilter = minPriceNumber !== null || maxPriceNumber !== null;

  const addNumericPriceStage = {
    $addFields: {
      priceNumber: {
        $convert: {
          input: '$price',
          to: 'double',
          onError: null,
          onNull: null,
        },
      },
    },
  };

  const buildPriceRangeMatch = () => {
    const priceRange: Record<string, number> = {};
    if (minPriceNumber !== null) priceRange.$gte = minPriceNumber;
    if (maxPriceNumber !== null) priceRange.$lte = maxPriceNumber;
    return Object.keys(priceRange).length > 0 ? { priceNumber: priceRange } : null;
  };

  const pipelineBase: any[] = [{ $match: query }];
  if (hasPriceFilter || isPriceSort) {
    pipelineBase.push(addNumericPriceStage);
  }

  const priceRangeMatch = buildPriceRangeMatch();
  if (priceRangeMatch) {
    pipelineBase.push({ $match: priceRangeMatch });
  }

  if (isPriceSort) {
    pipelineBase.push({ $match: { priceNumber: { $ne: null } } });
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
      pipelineBase.push({
        $match: {
          $or: [
            { priceNumber: { [isPriceAsc ? '$gt' : '$lt']: cursorPrice } },
            { priceNumber: cursorPrice, _id: { [isPriceAsc ? '$gt' : '$lt']: cursorId } },
          ],
        },
      });
    }
  }

  const sortStage = isPriceSort
    ? { $sort: { priceNumber: isPriceAsc ? 1 : -1, _id: isPriceAsc ? 1 : -1 } }
    : { $sort: { _id: isOldestFirst ? 1 : -1 } };

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
      priceNumber: 1,
    },
  };

  const [totalDealsResult, messages] = await Promise.all([
    TelegramMessage.aggregate([...pipelineBase, { $count: 'count' }]),
    TelegramMessage.aggregate([
      ...pipelineBase,
      sortStage,
      { $limit: numericLimit + 1 },
      projectionStage,
    ]),
  ]);

  const hasMore = messages.length > numericLimit;
  const data = hasMore ? messages.slice(0, numericLimit) : messages;

  const processedData = data.map((item: any) => ({
    ...item,
    id: item._id.toString(),
  }));

  const totalDealsCount = totalDealsResult?.[0]?.count || 0;
  const nextCursor = (() => {
    if (!hasMore || data.length === 0) return null;
    const lastItem = data[data.length - 1];
    if (isPriceSort) {
      const lastWithPrice = [...data]
        .reverse()
        .find((item: any) => typeof item.priceNumber === 'number');
      if (!lastWithPrice) return null;
      return `${lastWithPrice.priceNumber}|${lastWithPrice._id}`;
    }
    return lastItem._id;
  })();

  return {
    data: processedData,
    hasMore,
    nextCursor,
    totalDealsCount,
  };
}

module.exports = {
  getMessagesFromStore,
};
