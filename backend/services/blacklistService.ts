import BlacklistBootstrap from '../models/BlacklistBootstrap';
import BlacklistEntry, { type BlacklistEntryType } from '../models/BlacklistEntry';

export type DealBlacklist = {
  brands: string[];
  products: string[];
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

  const entries = await BlacklistEntry.find({}, { type: 1, normalizedValue: 1 })
    .sort({ type: 1, normalizedValue: 1 })
    .lean();

  cachedBlacklist = {
    brands: entries
      .filter((entry) => entry.type === 'brand')
      .map((entry) => entry.normalizedValue),
    products: entries
      .filter((entry) => entry.type === 'product')
      .map((entry) => entry.normalizedValue),
  };
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedBlacklist;
}

export async function listBlacklistEntries() {
  return BlacklistEntry.find()
    .sort({ type: 1, normalizedValue: 1 })
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
