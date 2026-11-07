import assert from 'node:assert/strict';
import type { ClientSession, Collection, Document, ObjectId } from 'mongodb';
import { extractAmazonAsin } from './amazon/amazonLink';

export const ASIN_UNIQUE_INDEX = {
  name: 'amazon_asin_unique',
  unique: true,
  partialFilterExpression: { amazonAsin: { $type: 'string', $gt: '' } },
} as const;

export function dealAsin(deal: Document): string | null {
  const value = typeof deal.amazonAsin === 'string' ? deal.amazonAsin.trim().toUpperCase() : '';
  return /^[A-Z0-9]{10}$/.test(value) ? value : extractAmazonAsin(deal.link) || extractAmazonAsin(deal.text);
}

export type DealCollections = Record<
  'telegrammessages' | 'dealpriceobservations' | 'dealalerts' | 'wishlistitems' | 'alertdeliveries' | 'searchsessions',
  Collection<Document>
>;

// The caller supplies a transaction; any failed assertion rolls back the entire group.
export async function mergeAsinDeals(collections: DealCollections, asin: string, ids: ObjectId[], session: ClientSession) {
  const options = { session };
  const messages = collections.telegrammessages;
  const history = collections.dealpriceobservations;
  const deals = await messages.find({ _id: { $in: ids } }, options).sort({ date: -1, _id: -1 }).toArray();
  assert.equal(deals.length, ids.length, 'Deal group changed; rerun the migration');
  assert.ok(deals.every((deal) => dealAsin(deal) === asin), 'ASIN changed; rerun the migration');
  const [keeper, ...duplicates] = deals;
  const duplicateIds = duplicates.map((deal) => deal._id);
  const originals = await history.find({ productId: { $in: ids } }, options).toArray();

  // Older records may predate price observations. Preserve their displayed prices too.
  for (const deal of deals) {
    if (!(typeof deal.price === 'number' && Number.isFinite(deal.price) && deal.price > 0)) continue;
    const observedAt = deal.date || deal.createdAt;
    assert.ok(observedAt instanceof Date, 'Cannot preserve a price without its date');
    const represented = originals.some((row) => String(row.productId) === String(deal._id)
      && row.price === deal.price && row.observedAt?.getTime() === observedAt.getTime());
    if (represented) continue;
    const sourceKey = `asin-merge:${deal._id}:${observedAt.getTime()}`;
    const existing = await history.findOne({ sourceKey }, options);
    if (existing) {
      assert.equal(String(existing.productId), String(deal._id), 'Price observation belongs to another deal');
      assert.equal(existing.price, deal.price, 'Existing observation differs from the displayed price');
      continue;
    }
    await history.insertOne({
      productId: deal._id, sourceKey, observedAt, price: deal.price,
      link: deal.link || null, matchMethod: 'baseline', matchConfidence: 1,
    }, options);
  }
  await history.updateMany({ productId: { $in: duplicateIds } }, { $set: { productId: keeper._id } }, options);
  for (const name of ['dealalerts', 'alertdeliveries'] as const) {
    await collections[name].updateMany({ dealId: { $in: duplicateIds } }, { $set: { dealId: keeper._id } }, options);
  }
  for (const item of await collections.wishlistitems.find({ dealId: { $in: duplicateIds } }, options).toArray()) {
    const existing = await collections.wishlistitems.findOne({ userId: item.userId, dealId: keeper._id }, options);
    if (existing) {
      await collections.wishlistitems.deleteOne({ _id: item._id }, options);
    } else {
      await collections.wishlistitems.updateOne({ _id: item._id }, { $set: { dealId: keeper._id } }, options);
    }
  }
  for (const snapshot of await collections.searchsessions.find({ ids: { $in: duplicateIds } }, options).toArray()) {
    const mapped = snapshot.ids.map((id: ObjectId) => duplicateIds.some((old) => old.equals(id)) ? keeper._id : id);
    const unique = mapped.filter((id: ObjectId, index: number) => mapped.findIndex((other: ObjectId) => other.equals(id)) === index);
    await collections.searchsessions.updateOne({ _id: snapshot._id }, { $set: { ids: unique } }, options);
  }

  // Verify every original observation survives and every reference has moved before deletion.
  const movedHistory = await history.find({ _id: { $in: originals.map((row) => row._id) } }, options).toArray();
  const movedById = new Map(movedHistory.map((row) => [String(row._id), row]));
  for (const row of originals) assert.deepEqual(movedById.get(String(row._id)), { ...row, productId: keeper._id });
  assert.equal(await history.countDocuments({ productId: { $in: duplicateIds } }, options), 0);
  for (const name of ['dealalerts', 'alertdeliveries', 'wishlistitems'] as const) {
    assert.equal(await collections[name].countDocuments({ dealId: { $in: duplicateIds } }, options), 0);
  }
  assert.equal(await collections.searchsessions.countDocuments({ ids: { $in: duplicateIds } }, options), 0);
  const firstSeen = deals.map((deal) => deal.firstSeenAt || deal.createdAt || deal.date).filter((date) => date instanceof Date);
  const clicks = deals.reduce((total, deal) => total + (deal.clicks || 0), 0);
  const deleted = await messages.deleteMany({ _id: { $in: duplicateIds } }, options);
  assert.equal(deleted.deletedCount, duplicates.length);
  await messages.updateOne({ _id: keeper._id }, { $set: {
    amazonAsin: asin, clicks,
    ...(firstSeen.length ? { firstSeenAt: new Date(Math.min(...firstSeen.map((date) => date.getTime()))) } : {}),
  } }, options);
  assert.equal(await messages.countDocuments({ _id: { $in: ids } }, options), 1);
  return { asin, keptId: String(keeper._id), deleted: duplicates.length, originalObservations: originals.length };
}
