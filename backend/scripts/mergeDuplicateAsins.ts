import dotenv from 'dotenv';
import { BSON, MongoClient } from 'mongodb';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ASIN_UNIQUE_INDEX, dealAsin, mergeAsinDeals, type DealCollections } from '../services/mergeAsinDeals';

dotenv.config({ path: '../.env' });
dotenv.config();

async function main() {
  const productionReadOnly = process.argv.includes('--production-readonly');
  const production = productionReadOnly || process.argv.includes('--production');
  if (productionReadOnly && process.argv.includes('--apply')) throw new Error('Production inspection is read-only');
  const uri = production ? process.env.MONGODB_URI : process.env.MONGODB_URI_STAGING;
  if (!uri) throw new Error('Required MongoDB URI is missing');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    assert.equal(db.databaseName, production ? 'deals' : 'staging', 'Unexpected database');
    const names = ['telegrammessages', 'dealpriceobservations', 'dealalerts', 'wishlistitems', 'alertdeliveries', 'searchsessions'] as const;
    const collections = Object.fromEntries(names.map((name) => [name, db.collection(name)])) as DealCollections;
    const rows = await collections.telegrammessages.find({}).toArray();
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const asin = dealAsin(row);
      if (asin) groups.set(asin, [...(groups.get(asin) || []), row]);
    }
    const duplicates = [...groups.entries()].filter(([, deals]) => deals.length > 1);
    console.log(JSON.stringify({ database: db.databaseName, deals: rows.length,
      duplicateAsins: duplicates.length, redundantDeals: duplicates.reduce((total, [, deals]) => total + deals.length - 1, 0),
      normalizeAsins: rows.filter((row) => dealAsin(row) && dealAsin(row) !== row.amazonAsin).length,
    }));
    if (!process.argv.includes('--apply')) return;
    const backup = join(homedir(), 'deals24-db-backups', `${db.databaseName}-asin-merge-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    await mkdir(backup, { recursive: true, mode: 0o700 });
    for (const name of names) {
      const documents = await collections[name].find({}).toArray();
      await writeFile(join(backup, `${name}.bson`), Buffer.concat(documents.map((row) => BSON.serialize(row))), { mode: 0o600 });
    }
    console.log(`Backup: ${backup}`);
    await writeFile(join(backup, 'groups.json'), BSON.EJSON.stringify([...groups.entries()]), { mode: 0o600 });
    // Collections must exist before transactions on Atlas; create only missing ones.
    const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((row) => row.name));
    for (const name of names) if (!existing.has(name)) await db.createCollection(name);
    let deletedDeals = 0;
    let mergedGroups = 0;
    const pending = [...groups.entries()].filter(([asin, deals]) => deals.length > 1 || deals[0].amazonAsin !== asin);
    // Each group owns different deals; bound concurrency to four transactions.
    const mergeGroup = async ([asin, deals]: typeof pending[number]) => {
      const session = client.startSession();
      try {
        let result: Awaited<ReturnType<typeof mergeAsinDeals>>;
        await session.withTransaction(async () => {
          result = await mergeAsinDeals(collections, asin, deals.map((row) => row._id), session);
        }, {
          readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' },
        });
        deletedDeals += result.deleted;
        mergedGroups++;
        console.log(JSON.stringify(result));
      } finally {
        await session.endSession();
      }
    };
    for (let offset = 0; offset < pending.length; offset += 4) {
      const results = await Promise.allSettled(pending.slice(offset, offset + 4).map(mergeGroup));
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    }
    await collections.telegrammessages.createIndex({ amazonAsin: 1 }, ASIN_UNIQUE_INDEX);
    const remaining = await collections.telegrammessages.aggregate([
      { $match: { amazonAsin: { $type: 'string', $ne: '' } } },
      { $group: { _id: '$amazonAsin', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]).toArray();
    assert.equal(remaining.length, 0);
    const summary = { database: db.databaseName, mergedGroups, deletedDeals,
      remainingDeals: await collections.telegrammessages.countDocuments(), duplicateAsins: remaining.length,
      uniqueIndex: ASIN_UNIQUE_INDEX.name };
    await writeFile(join(backup, 'result.json'), JSON.stringify(summary, null, 2), { mode: 0o600 });
    console.log(JSON.stringify(summary));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'ASIN migration failed');
  process.exitCode = 1;
});
