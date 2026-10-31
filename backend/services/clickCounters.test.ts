import assert from 'node:assert/strict';
import test from 'node:test';
import { applyClickBatch, applyClickBatches, clickDay, recordClick } from './clickCounters';

test('click dates change at IST midnight regardless of host timezone', () => {
  assert.equal(clickDay(new Date('2026-10-31T18:29:59Z')), '2026-10-31');
  assert.equal(clickDay(new Date('2026-10-31T18:30:00Z')), '2026-11-01');
});

function fixture() {
  let committed = { receipts: new Set<string>(), message: 0, daily: 0 };
  let state = committed;
  let failDaily = false;
  let failAck = false;
  const dates: Date[] = [];
  const deps = {
    transaction: async (work: (session: any) => Promise<void>) => {
      state = { ...committed, receipts: new Set(committed.receipts) };
      await work({});
      committed = state;
    },
    receipts: {
      find: (filter: { _id: { $in: string[] } }) => ({ session: async () =>
        filter._id.$in.filter((id) => state.receipts.has(id)).map((_id) => ({ _id })) }),
      create: async (receipts: { _id: string }[]) => {
        for (const receipt of receipts) state.receipts.add(receipt._id);
      },
    },
    messages: { bulkWrite: async (ops: any[]) => {
      for (const op of ops) state.message += op.updateOne.update.$inc.clicks;
    } },
    daily: { bulkWrite: async (ops: any[]) => {
      if (failDaily) throw new Error('Mongo unavailable');
      for (const op of ops) {
        state.daily += op.updateOne.update.$inc.clicks;
        dates.push(op.updateOne.filter.date);
      }
    } },
    acknowledge: async () => { if (failAck) throw new Error('Redis unavailable'); },
  };
  return {
    deps, dates, counts: () => [committed.message, committed.daily],
    failDaily: (value: boolean) => { failDaily = value; },
    failAck: (value: boolean) => { failAck = value; },
  };
}
const entries = { 'clicks:msg:123': '3', 'clicks:daily:2026-10-30': '3' };

test('retry after Mongo commit and Redis acknowledgement failure does not double count', async () => {
  const f = fixture();
  f.failAck(true);
  await assert.rejects(applyClickBatch('batch1', entries, f.deps));
  assert.deepEqual(f.counts(), [3, 3]);
  f.failAck(false);
  await applyClickBatch('batch1', entries, f.deps);
  assert.deepEqual(f.counts(), [3, 3]);
  assert.equal(f.dates[0].toISOString(), '2026-10-30T00:00:00.000Z');
});

test('healthy Redis buffers clicks without writing to MongoDB', async () => {
  let queued = false;
  await recordClick('click1', entries, {
    redisReady: () => true,
    enqueue: async (id, values) => {
      assert.equal(id, 'click1');
      assert.deepEqual(values, entries);
      queued = true;
    },
    persist: async () => { assert.fail('must not write directly'); },
  });
  assert.equal(queued, true);
});

test('missing or disconnected Redis records both counters directly in MongoDB', async () => {
  const f = fixture();
  await recordClick('click2', entries, {
    redisReady: () => false,
    enqueue: async () => { assert.fail('must not queue offline writes'); },
    persist: (id, values) => applyClickBatch(id, values, f.deps),
  });
  assert.deepEqual(f.counts(), [3, 3]);
});

test('Redis timeout followed by a late write is counted once after recovery', async () => {
  const f = fixture();
  let delayed: { id: string; entries: Record<string, string> };
  await recordClick('click3', entries, {
    redisReady: () => true,
    enqueue: async (id, values) => {
      delayed = { id, entries: values };
      throw new Error('command timed out after Redis accepted write');
    },
    persist: (id, values) => applyClickBatch(id, values, f.deps),
  });
  await applyClickBatches([delayed, { id: 'new-click', entries }], f.deps);
  assert.deepEqual(f.counts(), [6, 6]);
});

test('fallback propagates Mongo failure instead of reporting success', async () => {
  const f = fixture();
  f.failDaily(true);
  await assert.rejects(recordClick('click4', entries, {
    redisReady: () => false,
    enqueue: async () => {},
    persist: (id, values) => applyClickBatch(id, values, f.deps),
  }), /Mongo unavailable/);
  assert.deepEqual(f.counts(), [0, 0]);
});

test('retries a duplicate-key race using a fresh transaction', async () => {
  const f = fixture();
  const transaction = f.deps.transaction;
  let calls = 0;
  f.deps.transaction = async (work) => {
    if (++calls === 1) throw Object.assign(new Error('concurrent daily upsert'), { code: 11000 });
    return transaction(work);
  };
  await applyClickBatch('raced-click', entries, f.deps);
  assert.equal(calls, 2);
  assert.deepEqual(f.counts(), [3, 3]);
});

test('partial Mongo failure rolls back and preserves the batch for retry', async () => {
  const f = fixture();
  f.failDaily(true);
  await assert.rejects(applyClickBatch('batch2', entries, f.deps));
  assert.deepEqual(f.counts(), [0, 0]);
  f.failDaily(false);
  await applyClickBatch('batch2', entries, f.deps);
  await applyClickBatch('batch3', entries, f.deps);
  assert.deepEqual(f.counts(), [6, 6]);
});
