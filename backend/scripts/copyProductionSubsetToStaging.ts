import dotenv from 'dotenv';
import { BSON, MongoClient, type Document } from 'mongodb';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

dotenv.config({ path: '../.env' });
dotenv.config();

async function main() {
  const sourceUri = process.env.MONGODB_URI;
  const targetUri = process.env.MONGODB_URI_STAGING;
  if (!sourceUri || !targetUri) throw new Error('Both MongoDB URIs must be configured');
  if (sourceUri === targetUri) throw new Error('Source and target must differ');
  const source = new MongoClient(sourceUri);
  const target = new MongoClient(targetUri);
  try {
    await source.connect();
    await target.connect();
    const prod = source.db();
    const staging = target.db();
    assert.equal(prod.databaseName, 'deals');
    assert.equal(staging.databaseName, 'staging');
    const rows: Record<string, Document[]> = {};
    rows.telegrammessages = await prod.collection('telegrammessages')
      .find({}).sort({ date: -1, _id: -1 }).limit(100).toArray();
    assert.equal(rows.telegrammessages.length, 100, 'Production must contain at least 100 messages');
    const ids = rows.telegrammessages.map((row) => row._id);
    rows.dealpriceobservations = await prod.collection('dealpriceobservations').find({ productId: { $in: ids } }).toArray();
    rows.wishlistitems = await prod.collection('wishlistitems').find({ dealId: { $in: ids } }).toArray();
    rows.alertdeliveries = await prod.collection('alertdeliveries').find({ dealId: { $in: ids } }).toArray();
    rows.dealalerts = await prod.collection('dealalerts').find({ $or: [
      { dealId: { $in: ids } },
      { _id: { $in: rows.alertdeliveries.map((row) => row.alertId) } },
    ] }).toArray();
    const userIds = [...rows.wishlistitems, ...rows.dealalerts].map((row) => row.userId).filter(Boolean);
    rows.users = await prod.collection('users').find({ _id: { $in: userIds } }).toArray();
    const hasId = (collection: string, id: unknown) => rows[collection].some((row) => String(row._id) === String(id));
    for (const row of rows.dealalerts) {
      if (row.dealId) assert.ok(hasId('telegrammessages', row.dealId), 'Related alert references a message outside the selected 100');
      if (row.userId) assert.ok(hasId('users', row.userId), 'Missing alert user in production');
    }
    for (const row of rows.wishlistitems) assert.ok(hasId('users', row.userId), 'Missing wishlist user in production');
    const orphanDeliveries = rows.alertdeliveries.filter((row) => !hasId('dealalerts', row.alertId));
    console.log(`Production deliveries with missing alerts: ${orphanDeliveries.length}`);
    console.log(JSON.stringify({ source: prod.databaseName, target: staging.databaseName, counts: Object.fromEntries(
      Object.entries(rows).map(([name, documents]) => [name, documents.length]),
    ) }));
    if (!process.argv.includes('--apply')) return;

    const backup = join(homedir(), 'deals24-db-backups', new Date().toISOString().replace(/[:.]/g, '-'));
    await mkdir(backup, { recursive: true, mode: 0o700 });
    // Back up all affected collections before the first write; BSON preserves native types.
    for (const name of Object.keys(rows)) {
      const documents = await staging.collection(name).find({}).toArray();
      await writeFile(join(backup, `${name}.bson`), Buffer.concat(documents.map((row) => BSON.serialize(row))), { mode: 0o600 });
      const indexes = await staging.collection(name).listIndexes().toArray().catch((error) => {
        if (error.code === 26) return [];
        throw error;
      });
      await writeFile(join(backup, `${name}.indexes.json`), BSON.EJSON.stringify(indexes), { mode: 0o600 });
    }
    console.log(`Staging backup: ${backup}`);
    for (const name of ['users', 'telegrammessages', 'dealalerts', 'dealpriceobservations', 'wishlistitems', 'alertdeliveries']) {
      const documents = rows[name];
      if (!documents.length) continue;
      await staging.collection(name).bulkWrite(documents.map((row) => ({ replaceOne: {
        filter: { _id: row._id }, replacement: row, upsert: true,
      } })));
      for (const index of await prod.collection(name).listIndexes().toArray()) {
        if (index.name === '_id_') continue;
        const { key, v, ns, ...options } = index;
        await staging.collection(name).createIndex(key, options);
      }
      const copied = await staging.collection(name).find({ _id: { $in: documents.map((row) => row._id) } }).toArray();
      assert.equal(copied.length, documents.length);
      for (const row of documents) assert.deepEqual(copied.find((entry) => String(entry._id) === String(row._id)), row);
      console.log(`Verified ${name}: ${documents.length}`);
    }
    console.log('Copy complete; existing unrelated staging documents retained.');
  } finally {
    await source.close();
    await target.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Copy failed');
  process.exitCode = 1;
});
