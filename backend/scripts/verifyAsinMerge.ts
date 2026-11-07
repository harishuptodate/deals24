import dotenv from 'dotenv';
import { BSON, MongoClient, type Document } from 'mongodb';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dealAsin, ASIN_UNIQUE_INDEX } from '../services/mergeAsinDeals';

dotenv.config({ path: '../.env' });
dotenv.config();

async function readBackup(directory: string, name: string): Promise<Document[]> {
  const buffer = await readFile(join(directory, `${name}.bson`));
  const rows: Document[] = [];
  for (let offset = 0; offset < buffer.length;) {
    const length = buffer.readInt32LE(offset);
    assert.ok(length >= 5 && offset + length <= buffer.length, 'Invalid BSON backup');
    rows.push(BSON.deserialize(buffer.subarray(offset, offset + length)));
    offset += length;
  }
  return rows;
}

async function main() {
  const directory = process.argv.find((argument) => argument.startsWith('--backup='))?.slice('--backup='.length);
  assert.ok(directory, 'Supply --backup=/absolute/backup/path');
  const production = process.argv.includes('--production');
  const uri = production ? process.env.MONGODB_URI : process.env.MONGODB_URI_STAGING;
  assert.ok(uri, 'Required MongoDB URI is missing');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    assert.equal(db.databaseName, production ? 'deals' : 'staging');
    const groups = BSON.EJSON.parse(await readFile(join(directory, 'groups.json'), 'utf8')) as [string, Document[]][];
    const canonical = new Map<string, string>();
    let removedDeals = 0;
    for (const [, rows] of groups) {
      rows.sort((left, right) => right.date.getTime() - left.date.getTime() || String(right._id).localeCompare(String(left._id)));
      for (const row of rows) canonical.set(String(row._id), String(rows[0]._id));
      removedDeals += rows.length - 1;
    }
    const messages = await db.collection('telegrammessages').find({}).toArray();
    const messagesById = new Map(messages.map((row) => [String(row._id), row]));
    const byAsin = new Set<string>();
    for (const row of messages) {
      const asin = dealAsin(row);
      if (!asin) continue;
      assert.ok(!byAsin.has(asin), `Duplicate remains: ${asin}`);
      byAsin.add(asin);
    }
    for (const [oldId, keeperId] of canonical) {
      assert.ok(messagesById.has(keeperId), `Missing retained deal: ${keeperId}`);
      if (oldId !== keeperId) assert.ok(!messagesById.has(oldId), `Duplicate was not deleted: ${oldId}`);
    }
    const history = await db.collection('dealpriceobservations').find({}).toArray();
    const historyById = new Map(history.map((row) => [String(row._id), row]));
    const pricePoints = new Set(history.map((row) => `${row.productId}:${row.observedAt?.getTime()}:${row.price}`));
    for (const [, rows] of groups) {
      if (rows.length < 2) continue;
      for (const row of rows) {
        if (!(typeof row.price === 'number' && Number.isFinite(row.price) && row.price > 0)) continue;
        assert.ok(pricePoints.has(`${canonical.get(String(row._id))}:${(row.date || row.createdAt).getTime()}:${row.price}`),
          `Missing displayed price from merged deal: ${row._id}`);
      }
    }
    const originalHistory = await readBackup(directory, 'dealpriceobservations');
    for (const row of originalHistory) {
      const actual = historyById.get(String(row._id));
      assert.ok(actual, `Missing original price observation: ${row._id}`);
      assert.equal(String(actual.productId), canonical.get(String(row.productId)) || String(row.productId));
      const { productId: oldProductId, ...oldFields } = row;
      const { productId: newProductId, ...newFields } = actual;
      assert.deepEqual(newFields, oldFields, `Changed original price observation: ${row._id}`);
    }
    for (const name of ['dealalerts', 'alertdeliveries'] as const) {
      const live = new Map((await db.collection(name).find({}).toArray()).map((row) => [String(row._id), row]));
      for (const row of await readBackup(directory, name)) {
        const keeperId = canonical.get(String(row.dealId));
        if (!keeperId) continue;
        assert.equal(String(live.get(String(row._id))?.dealId), keeperId, `Missing ${name} reference`);
      }
    }
    const wishes = await db.collection('wishlistitems').find({}).toArray();
    const wishKeys = new Set(wishes.map((row) => `${row.userId}:${row.dealId}`));
    for (const row of await readBackup(directory, 'wishlistitems')) {
      assert.ok(wishKeys.has(`${row.userId}:${canonical.get(String(row.dealId)) || row.dealId}`), 'Lost wishlist membership');
    }
    for (const name of ['dealpriceobservations', 'dealalerts', 'alertdeliveries', 'wishlistitems', 'searchsessions']) {
      for (const row of await db.collection(name).find({}).toArray()) {
        const refs = name === 'searchsessions' ? row.ids : [name === 'dealpriceobservations' ? row.productId : row.dealId];
        for (const id of refs || []) assert.ok(!canonical.has(String(id)) || canonical.get(String(id)) === String(id), `Stale ${name} reference`);
      }
    }
    const indexes = await db.collection('telegrammessages').listIndexes().toArray();
    assert.ok(indexes.some((index) => index.name === ASIN_UNIQUE_INDEX.name && index.unique), 'Missing unique ASIN index');
    const result = { database: db.databaseName, removedDeals, remainingDeals: messages.length,
      originalObservationsVerified: originalHistory.length, currentObservations: history.length,
      addedObservations: history.length - originalHistory.length, referencesVerified: true, duplicateAsins: 0, uniqueIndex: true };
    await writeFile(join(directory, 'verification.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
    console.log(JSON.stringify(result));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Verification failed');
  process.exitCode = 1;
});
