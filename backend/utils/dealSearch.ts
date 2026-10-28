import type { ProductIdentity } from '../services/telegramTypes';

export const DEAL_SEARCH_INDEX_NAME = 'deal_search_text_v2';

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

  return { textSearch, tokenGroups };
}
