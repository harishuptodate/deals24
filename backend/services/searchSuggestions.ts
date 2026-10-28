import { createHash } from 'node:crypto';
import type { ProductIdentity } from './telegramTypes';
import { DEAL_ATLAS_SEARCH_INDEX_NAME, buildDealSearchPlan } from '../utils/dealSearch';

export const SEARCH_CATEGORIES = [
  { label: 'Mobile phones', category: 'mobile-phones', terms: 'phone mobile smartphone iphone samsung' },
  { label: 'Laptops', category: 'laptops', terms: 'laptop notebook macbook gaming' },
  { label: 'Home & appliances', category: 'electronics-home', terms: 'tv television ac refrigerator fridge washing machine furniture' },
  { label: 'Gadgets & accessories', category: 'gadgets-accessories', terms: 'earbuds tws headphones watch tablet camera' },
  { label: 'Fashion', category: 'fashion', terms: 'shirt clothing dress t-shirt' },
  { label: 'Lifestyle', category: 'lifestyle', terms: 'shoes luggage perfume fitness' },
];

export type SuggestionFilters = { category?: string; from?: string; to?: string; minPrice?: string; maxPrice?: string };
type SuggestionRow = {
  _id: unknown; text?: string; identity?: Partial<ProductIdentity>; amazonAsin?: string;
  identityKey?: string; date?: Date | string; price?: number; imageUrl?: string; telegramFileId?: string; category?: string;
};
type SuggestionStore = { aggregate: <T>(pipeline: unknown[]) => { option: (options: { maxTimeMS: number }) => PromiseLike<T[]> } };
export type Suggestions = ReturnType<typeof shapeSuggestions>;

export function normalizeSuggestionQuery(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim().slice(0, 100);
}

export function suggestionCacheIdentity(query: string, filters: SuggestionFilters) {
  const canonical = JSON.stringify([normalizeSuggestionQuery(query), ...['category', 'from', 'to', 'minPrice', 'maxPrice'].map(
    (key) => filters[key as keyof SuggestionFilters] || '',
  )]);
  const fingerprint = createHash('sha256').update(canonical).digest('hex');
  return { fingerprint, key: `search:suggestions:v1:${parseInt(fingerprint.slice(0, 8), 16) % 256}` };
}

export function buildSuggestionFilter(filters: SuggestionFilters): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.category) match.category = filters.category;
  const price: Record<string, number> = {};
  for (const [key, operator] of [['minPrice', '$gte'], ['maxPrice', '$lte']] as const) {
    const value = filters[key];
    if (value && Number.isFinite(Number(value)) && Number(value) >= 0) price[operator] = Number(value);
  }
  if (Object.keys(price).length) match.price = price;
  const date: Record<string, Date> = {};
  for (const [key, operator] of [['from', '$gte'], ['to', '$lte']] as const) {
    const value = filters[key];
    if (value && /^\d{4}-\d{2}-\d{2}$/u.test(value)) {
      const parsed = new Date(`${value}T${key === 'to' ? '23:59:59.999' : '00:00:00.000'}Z`);
      if (Number.isFinite(parsed.getTime())) date[operator] = parsed;
    }
  }
  if (Object.keys(date).length) match.date = date;
  return match;
}

export function shapeSuggestions(rows: SuggestionRow[], query: string) {
  const latest = new Map<string, SuggestionRow>();
  for (const row of rows) {
    const key = row.amazonAsin || row.identityKey || String(row._id);
    const existing = latest.get(key);
    if (!existing || new Date(row.date || 0).getTime() > new Date(existing.date || 0).getTime()) latest.set(key, row);
  }
  const deals = [...latest.values()].slice(0, 5).map((row) => ({
    id: String(row._id),
    title: (row.identity?.canonicalName || row.text?.split('\n')[0] || 'Deal').slice(0, 150),
    price: typeof row.price === 'number' ? row.price : null,
    imageUrl: row.imageUrl || null,
    telegramFileId: row.telegramFileId || null,
    date: row.date || null,
    category: row.category || null,
  }));
  const products = [...new Set(rows.map((row) => row.identity?.canonicalName).filter(
    (name): name is string => Boolean(name),
  ))].slice(0, 5).map((label) => ({ label: label.slice(0, 120), query: label.slice(0, 100) }));
  const tokens = query.split(/\s+/u).filter(Boolean);
  const categories = SEARCH_CATEGORIES.filter((item) => tokens.some(
    (token) => `${item.label.toLowerCase()} ${item.terms}`.split(/\s+/u).some((term) => term.startsWith(token)),
  )).map(({ label, category }) => ({ label, category })).slice(0, 3);
  return { deals, products, categories };
}

export async function getSearchSuggestions(store: SuggestionStore, rawQuery: string, filters: SuggestionFilters = {}) {
  const query = normalizeSuggestionQuery(rawQuery);
  const plan = buildDealSearchPlan(query);
  if (query.length < 2 || !plan.textSearch) return shapeSuggestions([], query);
  const isShortConcept = ['tv', 'ac', 'tws'].includes(query);
  const match = buildSuggestionFilter(filters);
  const projection = { $project: { text: 1, identity: 1, identityKey: 1, amazonAsin: 1, date: 1, price: 1, imageUrl: 1, telegramFileId: 1, category: 1 } };
  let rows: SuggestionRow[];
  try {
    rows = await store.aggregate<SuggestionRow>([
      { $search: { index: DEAL_ATLAS_SEARCH_INDEX_NAME, compound: {
        should: isShortConcept ? [{ text: { query: plan.textSearch, path: 'searchTokens' } }] : ['identity.canonicalName', 'searchText'].map((path) => ({ autocomplete: {
          path, query, tokenOrder: 'sequential',
          ...(query.length >= 4 ? { fuzzy: { maxEdits: 1, prefixLength: 2, maxExpansions: 20 } } : {}),
        } })), minimumShouldMatch: 1,
      } } },
      { $match: match },
      { $set: {
        coverage: { $sum: plan.tokenGroups.map((group) => ({ $cond: [
          { $gt: [{ $size: { $setIntersection: [{ $ifNull: ['$searchTokens', []] }, group] } }, 0] }, 1, 0,
        ] })) },
      } },
      { $sort: { coverage: -1, date: -1, _id: -1 } },
      { $limit: 25 }, projection,
    ]).option({ maxTimeMS: 1800 });
  } catch {
    const tokens = query.match(/[\p{L}\p{N}]+/gu)?.slice(0, 6) || [];
    if (!tokens.length) return shapeSuggestions([], query);
    const clauses = isShortConcept ? [{ searchTokens: { $in: plan.tokenGroups.flat() } }] : tokens.map((token) => ({ searchText: {
      $regex: `(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, $options: 'i',
    } }));
    rows = await store.aggregate<SuggestionRow>([
      { $match: { ...match, $and: clauses } }, { $sort: { date: -1, _id: -1 } },
      { $limit: 25 }, projection,
    ]).option({ maxTimeMS: 1800 });
  }
  return shapeSuggestions(rows, query);
}
