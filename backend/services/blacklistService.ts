import BlacklistBootstrap from '../models/BlacklistBootstrap';
import BlacklistEntry, { type BlacklistEntryType } from '../models/BlacklistEntry';
import BlacklistRule, { type BlacklistRuleAction } from '../models/BlacklistRule';

export type BrandProductRule = {
  brand: string;
  product: string;
  action: BlacklistRuleAction;
};

export type DealBlacklist = {
  brands: string[];
  products: string[];
  rules?: BrandProductRule[];
};

const CACHE_TTL_MS = 30_000;
const BOOTSTRAP_KEY = 'legacy-hardcoded-blacklist-v1';

const legacyEntries: Array<{ type: BlacklistEntryType; value: string }> = [
  ...[
    'ptron',
    'fire-boltt',
    'fire boltt',
    'boat',
    'mivi',
    'nu republic',
    'amazon basics',
    'zebronics',
    'portronics',
    'egate',
    'nu',
    'noise',
  ].map((value) => ({ type: 'brand' as const, value })),
  ...[
    'tws',
    'true wireless',
    'earbuds',
    'rockerz',
    'airdopes',
    'duopods',
    'ear buds',
    'bluetooth headset',
    'neckband',
    'earphones',
    'powerbank',
    'power bank',
  ].map((value) => ({ type: 'product' as const, value })),
];

let cachedBlacklist: DealBlacklist | null = null;
let cacheExpiresAt = 0;

export function normalizeBlacklistValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function invalidateBlacklistCache(): void {
  cachedBlacklist = null;
  cacheExpiresAt = 0;
}

export async function getDealBlacklist(): Promise<DealBlacklist> {
  if (cachedBlacklist && Date.now() < cacheExpiresAt) {
    return cachedBlacklist;
  }

  const [entries, rules] = await Promise.all([
    BlacklistEntry.find({}, { type: 1, normalizedValue: 1 })
      .sort({ type: 1, normalizedValue: 1 })
      .lean(),
    BlacklistRule.find({}, { normalizedBrand: 1, normalizedProduct: 1, action: 1 })
      .lean(),
  ]);

  cachedBlacklist = {
    brands: entries
      .filter((entry) => entry.type === 'brand')
      .map((entry) => entry.normalizedValue),
    products: entries
      .filter((entry) => entry.type === 'product')
      .map((entry) => entry.normalizedValue),
    rules: rules.map((rule) => ({
      brand: rule.normalizedBrand,
      product: rule.normalizedProduct,
      action: rule.action,
    })),
  };
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedBlacklist;
}

export async function listBlacklistEntries() {
  return BlacklistEntry.find()
    .sort({ type: 1, normalizedValue: 1 })
    .lean();
}

export async function listBlacklistRules() {
  return BlacklistRule.find()
    .sort({ normalizedBrand: 1, normalizedProduct: 1 })
    .lean();
}

export async function addBlacklistEntry(type: BlacklistEntryType, value: string) {
  const normalizedValue = normalizeBlacklistValue(value);
  const entry = await BlacklistEntry.create({ type, value: value.trim(), normalizedValue });
  invalidateBlacklistCache();
  return entry.toObject();
}

export async function removeBlacklistEntry(id: string) {
  const entry = await BlacklistEntry.findByIdAndDelete(id).lean();
  if (entry) {
    invalidateBlacklistCache();
  }
  return entry;
}

export async function upsertBlacklistRule(
  brand: string,
  product: string,
  action: BlacklistRuleAction,
) {
  const normalizedBrand = normalizeBlacklistValue(brand);
  const normalizedProduct = normalizeBlacklistValue(product);
  const rule = await BlacklistRule.findOneAndUpdate(
    { normalizedBrand, normalizedProduct },
    {
      $set: {
        brand: brand.trim(),
        product: product.trim(),
        normalizedBrand,
        normalizedProduct,
        action,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  invalidateBlacklistCache();
  return rule;
}

export async function removeBlacklistRule(id: string) {
  const rule = await BlacklistRule.findByIdAndDelete(id).lean();
  if (rule) {
    invalidateBlacklistCache();
  }
  return rule;
}

export async function seedLegacyBlacklist(): Promise<void> {
  const completedBootstrap = await BlacklistBootstrap.exists({ key: BOOTSTRAP_KEY });
  if (completedBootstrap) {
    return;
  }

  await BlacklistEntry.bulkWrite(legacyEntries.map(({ type, value }) => {
    const normalizedValue = normalizeBlacklistValue(value);
    return {
      updateOne: {
        filter: { type, normalizedValue },
        update: { $setOnInsert: { type, value, normalizedValue } },
        upsert: true,
      },
    };
  }));

  await BlacklistBootstrap.updateOne(
    { key: BOOTSTRAP_KEY },
    { $setOnInsert: { key: BOOTSTRAP_KEY, completedAt: new Date() } },
    { upsert: true },
  );
  invalidateBlacklistCache();
}
