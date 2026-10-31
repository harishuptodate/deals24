import type { ProductIdentity } from '../services/telegramTypes';

export const DEAL_SEARCH_INDEX_NAME = 'deal_search_text_v2';
export const DEAL_ATLAS_SEARCH_INDEX_NAME = 'deal_search_atlas_v2';
export const DEAL_SEARCH_SNAPSHOT_LIMIT = 25_000;

export const DEAL_ATLAS_SEARCH_INDEX_DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      searchText: [
        { type: 'string', analyzer: 'lucene.standard' },
        { type: 'autocomplete', tokenization: 'edgeGram', minGrams: 2, maxGrams: 15, foldDiacritics: true },
      ],
      searchTokens: [
        { type: 'string', analyzer: 'lucene.keyword' },
        { type: 'autocomplete', analyzer: 'lucene.keyword', tokenization: 'edgeGram', minGrams: 2, maxGrams: 15, foldDiacritics: false },
      ],
      identity: {
        type: 'document',
        fields: {
          canonicalName: [
            { type: 'string', analyzer: 'lucene.standard' },
            { type: 'autocomplete', tokenization: 'edgeGram', minGrams: 2, maxGrams: 15, foldDiacritics: true },
          ],
          brand: { type: 'string', analyzer: 'lucene.standard' },
          model: { type: 'string', analyzer: 'lucene.standard' },
          productType: { type: 'string', analyzer: 'lucene.standard' },
          variant: { type: 'string', analyzer: 'lucene.standard' },
        },
      },
      channelId: { type: 'token' },
      category: { type: 'token' },
      date: { type: 'date' },
      price: { type: 'number' },
    },
  },
} as const;

export const DEAL_SEARCH_INDEX_FIELDS = {
  searchText: 'text',
  'identity.canonicalName': 'text',
  'identity.brand': 'text',
  'identity.model': 'text',
  'identity.productType': 'text',
  'identity.variant': 'text',
} as const;

export const DEAL_SEARCH_INDEX_WEIGHTS = {
  'identity.model': 10,
  'identity.brand': 8,
  'identity.canonicalName': 6,
  'identity.productType': 4,
  'identity.variant': 3,
  searchText: 1,
};

const URL_PATTERN = /\b(?:(?:https?:\/\/|www\.)[^\s<>{}[\]"']+|(?:[\p{L}\p{N}-]+\.)+(?:com|in|co|net|org|io|ai|app|site|ly|to)(?:\/[^\s<>{}[\]"']*)?)/giu;

const TOKEN_NORMALIZATIONS: Record<string, string> = {
  deals: 'deal',
  offers: 'offer',
  phones: 'phone',
  smartphones: 'smartphone',
  mobiles: 'mobile',
  televisions: 'television',
  laptops: 'laptop',
  notebooks: 'notebook',
  earbuds: 'earbud',
  earphones: 'earphone',
  inches: 'inch',
  cms: 'cm',
  mms: 'mm',
  kgs: 'kg',
  lbs: 'lb',
  tons: 'ton',
  gbs: 'gb',
  tbs: 'tb',
};

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'best',
  'buy',
  'deal',
  'for',
  'in',
  'latest',
  'new',
  'of',
  'offer',
  'on',
  'only',
  'the',
  'with',
]);

const SEARCH_SYNONYM_GROUPS = [
  ['mobile', 'smartphone', 'phone'],
  ['tv', 'television'],
  ['tws', 'earbud', 'earphone'],
  ['laptop', 'notebook'],
  ['ac', 'airconditioner'],
  ['fridge', 'refrigerator'],
];

const SEARCH_SYNONYMS = new Map(
  SEARCH_SYNONYM_GROUPS.flatMap((group) => group.map((term) => [term, group] as const)),
);

const UNIT_TOKENS = new Set(['cm', 'mm', 'inch', 'kg', 'g', 'lb', 'ton', 'gb', 'tb', 'hz', 'mah', 'w', 'l']);

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function stripSearchUrls(value: string): string {
  return String(value || '').replace(URL_PATTERN, ' ');
}

export function tokenizeDealSearchValue(value: string): string[] {
  const withoutUrls = stripSearchUrls(value).normalize('NFKC').toLowerCase();
  const compactVariants = Array.from(
    withoutUrls.matchAll(/[\p{L}\p{N}]+(?:[-_/][\p{L}\p{N}]+)+/gu),
    (match) => match[0].replace(/[-_/]/g, ''),
  );
  const normalized = withoutUrls
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const baseTokens = normalized
    ? normalized.split(/\s+/).map((token) => TOKEN_NORMALIZATIONS[token] || token)
    : [];
  const expandedTokens = [...baseTokens];

  for (const token of baseTokens) {
    const unitMatch = /^(\d+)(cm|mm|inch|kg|g|lb|ton|gb|tb|hz|mah|w|l)$/.exec(token);
    if (unitMatch) expandedTokens.push(unitMatch[1], unitMatch[2]);
  }

  for (let index = 0; index < baseTokens.length - 1; index += 1) {
    if (/^\d+$/.test(baseTokens[index]) && UNIT_TOKENS.has(baseTokens[index + 1])) {
      expandedTokens.push(`${baseTokens[index]}${baseTokens[index + 1]}`);
    }
  }

  return unique([
    ...expandedTokens,
    ...compactVariants.map((token) => TOKEN_NORMALIZATIONS[token] || token),
  ]);
}

export function buildDealSearchFields(input: {
  text?: string | null;
  identity?: Partial<ProductIdentity> | null;
}) {
  const textTokens = tokenizeDealSearchValue(input.text || '');
  const identityValues = [
    input.identity?.canonicalName,
    input.identity?.brand,
    input.identity?.model,
    input.identity?.productType,
    ...(input.identity?.variant || []),
  ].filter((value): value is string => Boolean(value));
  const identityTokens = identityValues.flatMap(tokenizeDealSearchValue);

  return {
    searchText: textTokens.join(' '),
    searchTokens: unique([...textTokens, ...identityTokens]),
  };
}

export function buildDealSearchPlan(value: string) {
  const allTokens = tokenizeDealSearchValue(value).slice(0, 16);
  const meaningfulTokens = allTokens.filter((token) => !SEARCH_STOP_WORDS.has(token));
  const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;
  const tokenGroups = unique(queryTokens.map(
    (token) => (SEARCH_SYNONYMS.get(token) || [token]).join('|'),
  )).map((group) => group.split('|'));
  const textSearch = unique(tokenGroups.flat()).join(' ');
  const lastWord = stripSearchUrls(value).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)?.at(-1) || '';
  const prefixToken = /^[a-z]{2,30}$/.test(lastWord) && !SEARCH_STOP_WORDS.has(TOKEN_NORMALIZATIONS[lastWord] || lastWord)
    ? TOKEN_NORMALIZATIONS[lastWord] || lastWord : null;

  return { textSearch, tokenGroups, prefixToken };
}

export function buildAtlasSearchStage(input: {
  textSearch: string;
  tokenGroups?: string[][];
  prefixToken?: string | null;
  channelId?: string;
  category?: string;
  fromDate?: Date | null;
  toDate?: Date | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  requirePrice?: boolean;
}) {
  const groups = input.tokenGroups || buildDealSearchPlan(input.textSearch).tokenGroups;
  const prefixToken = input.prefixToken === undefined ? buildDealSearchPlan(input.textSearch).prefixToken : input.prefixToken;
  const should: Array<Record<string, unknown>> = groups.flatMap((group, index) => {
    const isLast = group.includes(prefixToken);
    return group.flatMap((token) => {
      const clauses: Array<Record<string, unknown>> = [{ regex: {
        path: 'searchTokens',
        query: buildSearchTokenPattern(token, false),
        allowAnalyzedField: true,
      } }];
      if (isLast && /^[a-z]{2,30}$/.test(token)) clauses.push({ compound: { must: [
        { autocomplete: { path: 'searchTokens', query: token.slice(0, 15), tokenOrder: 'sequential' } },
        { regex: { path: 'searchTokens', query: token + '[a-z0-9]*', allowAnalyzedField: true } },
      ] } });
      return clauses;
    });
  });
  const filter: Array<Record<string, unknown>> = [];

  if (input.channelId) {
    filter.push({ equals: { path: 'channelId', value: input.channelId } });
  }
  if (input.category) {
    filter.push({ equals: { path: 'category', value: input.category } });
  }
  if (input.fromDate || input.toDate) {
    filter.push({
      range: {
        path: 'date',
        ...(input.fromDate ? { gte: input.fromDate } : {}),
        ...(input.toDate ? { lte: input.toDate } : {}),
      },
    });
  }
  if (input.minPrice != null || input.maxPrice != null || input.requirePrice) {
    filter.push({
      range: {
        path: 'price',
        ...(input.minPrice != null ? { gte: input.minPrice } : {}),
        ...(input.maxPrice != null ? { lte: input.maxPrice } : {}),
        ...(input.requirePrice && input.minPrice == null ? { gte: 0 } : {}),
      },
    });
  }

  return {
    $search: {
      index: DEAL_ATLAS_SEARCH_INDEX_NAME,
      compound: {
        should,
        minimumShouldMatch: 1,
        ...(filter.length > 0 ? { filter } : {}),
      },
    },
  };
}

export const DEAL_SEARCH_RELEVANCE_SORT = { matchCoverage: -1, date: -1, searchScore: -1, clicks: -1, _id: -1 } as const;

// Only tokenized letters/numbers reach these patterns. Keep the first letter
// outside the alternatives so MongoDB can bound fallback index scans by prefix.
export function buildSearchTokenPattern(token: string, prefix: boolean): string {
  const tail = token.slice(1);
  const variants = [tail];
  if (/^[a-z]{4,30}$/.test(token)) {
    for (let index = 0; index < tail.length; index++) {
      const before = tail.slice(0, index);
      const after = tail.slice(index + 1);
      variants.push(before + after, before + '[a-z]' + after, before + '[a-z]' + tail.slice(index));
      if (index < tail.length - 1) variants.push(before + tail[index + 1] + tail[index] + tail.slice(index + 2));
    }
    variants.push(tail + '[a-z]');
  }
  if (prefix && /^[a-z]{2,30}$/.test(token)) variants.push(tail + '[a-z0-9]*');
  return variants.length === 1 ? token : token[0] + '(' + [...new Set(variants)].join('|') + ')';
}

export function buildSearchConceptPattern(group: string[], prefix: boolean): string {
  return '^(' + group.map((token) => buildSearchTokenPattern(token, prefix)).join('|') + ')$';
}

export function buildMongoSearchMatch(plan: ReturnType<typeof buildDealSearchPlan>) {
  const exact = new Set<string>();
  const prefixes: RegExp[] = [];
  for (const group of plan.tokenGroups) for (const token of group) {
    exact.add(token);
    if (/^[a-z]{4,30}$/.test(token)) {
      // Equality bounds avoid scanning every token sharing the first letter.
      for (let index = 1; index <= token.length; index++) {
        const before = token.slice(0, index);
        const after = token.slice(index + 1);
        if (index < token.length) exact.add(before + after);
        if (index < token.length - 1) exact.add(before + token[index + 1] + token[index] + token.slice(index + 2));
        for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
          if (index < token.length) exact.add(before + letter + after);
          exact.add(before + letter + token.slice(index));
        }
      }
    }
    if (group.includes(plan.prefixToken) && /^[a-z]{2,30}$/.test(token)) prefixes.push(new RegExp('^' + token + '[a-z0-9]*$'));
  }
  return { searchTokens: { $in: [...exact, ...prefixes] } };
}

function exactFieldPattern(group: string[]): string {
  return '(^|[^\\p{L}\\p{N}])(' + group.join('|') + ')([^\\p{L}\\p{N}]|$)';
}

export class SearchCursorError extends Error {
  constructor() { super('Search ordering has changed. Refresh results to continue.'); }
}

export function buildDealSearchRankingStage(plan: ReturnType<typeof buildDealSearchPlan>) {
  const phrasePattern = '(^|[^\\p{L}\\p{N}])' + plan.tokenGroups.map((group) => '(' + group.join('|') + ')').join('[^\\p{L}\\p{N}]+') + '([^\\p{L}\\p{N}]|$)';
  return {
    $addFields: {
      // Shared exact-field boosts keep cursor ordering stable across backend changes.
      searchScore: { $sum: [...Object.entries(DEAL_SEARCH_INDEX_WEIGHTS).flatMap(([path, weight]) => (
        plan.tokenGroups.map((group) => ({ $cond: [
          { $regexMatch: {
            input: { $toLower: path === 'identity.variant' ? {
              $reduce: { input: { $ifNull: ['$identity.variant', []] }, initialValue: '', in: { $concat: ['$$value', ' ', '$$this'] } },
            } : { $ifNull: ['$' + path, ''] } },
            regex: exactFieldPattern(group),
          } }, weight, 0,
        ] }))
      )), ...['identity.model', 'identity.canonicalName'].map((path) => ({ $cond: [
        { $regexMatch: { input: { $toLower: { $ifNull: ['$' + path, ''] } }, regex: phrasePattern } }, 20, 0,
      ] }))] },
      matchCoverage: { $sum: plan.tokenGroups.map((group, index) => ({ $cond: [
        { $gt: [{ $size: { $filter: {
          input: { $ifNull: ['$searchTokens', []] }, as: 'token',
          cond: { $regexMatch: { input: '$$token', regex: buildSearchConceptPattern(group, group.includes(plan.prefixToken)) } },
        } } }, 0] }, 1, 0,
      ] })) },
    },
  };
}
