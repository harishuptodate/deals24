import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { ASIN_UNIQUE_INDEX, dealAsin, mergeAsinDeals, type DealCollections } from './mergeAsinDeals';

test('recognizes normalized ASINs and legacy product links', () => {
  assert.equal(dealAsin({ amazonAsin: ' b012345678 ' }), 'B012345678');
  assert.equal(dealAsin({ link: 'https://amazon.in/gp/product/b012345678?tag=x' }), 'B012345678');
  assert.equal(dealAsin({ text: 'Offer https://amazon.in/gp/aw/d/B012345678' }), 'B012345678');
  assert.equal(dealAsin({ amazonAsin: null, link: 'https://example.com/' }), null);
});

test('transactional ASIN merge preserves history and references, rolls back failures, and enforces uniqueness', {
  skip: process.env.RUN_STAGING_DB_TESTS !== 'true',
}, async () => {
  dotenv.config({ path: '../.env' });
  dotenv.config();
  assert.ok(process.env.MONGODB_URI_STAGING);
  const client = new MongoClient(process.env.MONGODB_URI_STAGING);
  const prefix = `asin_verify_${randomUUID().replace(/-/g, '')}_`;
  const names = ['telegrammessages', 'dealpriceobservations', 'dealalerts', 'wishlistitems', 'alertdeliveries', 'searchsessions'] as const;
  try {
    await client.connect();
    const db = client.db();
    assert.equal(db.databaseName, 'staging');
    for (const name of names) await db.createCollection(prefix + name);
    const collections = Object.fromEntries(names.map((name) => [name, db.collection(prefix + name)])) as DealCollections;
    await collections.dealpriceobservations.createIndex({ sourceKey: 1 }, { unique: true });
    await collections.wishlistitems.createIndex({ userId: 1, dealId: 1 }, { unique: true });
    const asin = 'B012345678';
    const oldId = new ObjectId();
    const newId = new ObjectId();
    const userId = new ObjectId();
    const oldDate = new Date('2026-10-01');
    const newDate = new Date('2026-11-01');
    const seed = async () => {
      for (const name of names) await collections[name].deleteMany({});
      await collections.telegrammessages.insertMany([
        { _id: oldId, link: `https://amazon.in/gp/product/${asin}`, date: oldDate, price: 120, clicks: 2 },
        { _id: newId, amazonAsin: asin, date: newDate, price: 90, clicks: 3 },
      ]);
      await collections.dealpriceobservations.insertOne({ productId: oldId, sourceKey: 'original', observedAt: oldDate, price: 120 });
      await collections.wishlistitems.insertMany([{ userId, dealId: oldId }, { userId, dealId: newId }]);
      await collections.dealalerts.insertOne({ dealId: oldId });
      await collections.alertdeliveries.insertOne({ dealId: oldId });
      await collections.searchsessions.insertOne({ ids: [oldId, newId] });
    };
    await seed();
    const session = client.startSession();
    try {
      const originalDelete = collections.telegrammessages.deleteMany.bind(collections.telegrammessages);
      collections.telegrammessages.deleteMany = async () => { throw new Error('Simulated deletion failure'); };
      await assert.rejects(session.withTransaction(() => mergeAsinDeals(collections, asin, [oldId, newId], session)), /Simulated/);
      collections.telegrammessages.deleteMany = originalDelete;
      assert.equal(await collections.telegrammessages.countDocuments(), 2);
      assert.equal(await collections.dealpriceobservations.countDocuments(), 1);
      assert.equal(await collections.dealpriceobservations.countDocuments({ productId: oldId }), 1);
      assert.equal(await collections.dealalerts.countDocuments({ dealId: oldId }), 1);
      assert.equal(await collections.wishlistitems.countDocuments(), 2);
      await session.withTransaction(() => mergeAsinDeals(collections, asin, [oldId, newId], session));
      assert.equal(await collections.telegrammessages.countDocuments(), 1);
      const keeper = await collections.telegrammessages.findOne({ _id: newId });
      assert.equal(keeper.price, 90);
      assert.equal(keeper.clicks, 5);
      assert.deepEqual((await collections.dealpriceobservations.find({ productId: newId }).sort({ price: 1 }).toArray()).map((row) => row.price), [90, 120]);
      for (const name of ['dealalerts', 'alertdeliveries', 'wishlistitems'] as const) {
        assert.equal(await collections[name].countDocuments({ dealId: newId }), 1);
      }
      assert.deepEqual((await collections.searchsessions.findOne({})).ids, [newId]);
      await collections.telegrammessages.createIndex({ amazonAsin: 1 }, ASIN_UNIQUE_INDEX);
      await assert.rejects(collections.telegrammessages.insertOne({ amazonAsin: asin }), { code: 11000 });
      await collections.telegrammessages.insertMany([{ amazonAsin: null }, { amazonAsin: null }]);
      const concurrent = await Promise.allSettled([
        collections.telegrammessages.insertOne({ amazonAsin: 'B098765432' }),
        collections.telegrammessages.insertOne({ amazonAsin: 'B098765432' }),
      ]);
      assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1);
    } finally {
      await session.endSession();
    }
  } finally {
    for (const name of names) await client.db().collection(prefix + name).drop().catch((error) => {
      if (error.code !== 26) throw error;
    });
    await client.close();
  }
});
