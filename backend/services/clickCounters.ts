export function clickDay(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

// Move counters into an immutable, retryable batch without dropping concurrent clicks.
export const CLAIM_CLICKS = `
for i = 2, #KEYS do
  local value = redis.call('GET', KEYS[i])
  if value and tonumber(value) and tonumber(value) > 0 then
    redis.call('HSET', KEYS[1], KEYS[i], value)
    redis.call('DEL', KEYS[i])
  end
end
return redis.call('HLEN', KEYS[1])
`;

export async function recordClick(
  batchId: string,
  entries: Record<string, string>,
  deps: {
    redisReady: () => boolean;
    enqueue: (batchId: string, entries: Record<string, string>) => Promise<unknown>;
    persist: (batchId: string, entries: Record<string, string>) => Promise<unknown>;
  },
) {
  if (deps.redisReady()) {
    try {
      await deps.enqueue(batchId, entries);
      return;
    } catch {
      // The Redis write may have succeeded despite the error. The shared receipt
      // makes both the fallback and any later Redis flush idempotent.
    }
  }
  await deps.persist(batchId, entries);
}

type Batch = { id: string; entries: Record<string, string> };
type BatchDependencies = {
  transaction: (work: (session: any) => Promise<void>) => Promise<unknown>;
  receipts: any;
  messages: any;
  daily: any;
  acknowledge: () => Promise<unknown>;
};

export async function applyClickBatch(
  batchId: string,
  entries: Record<string, string>,
  deps: BatchDependencies,
) {
  return applyClickBatches([{ id: batchId, entries }], deps);
}

export async function applyClickBatches(batches: Batch[], deps: BatchDependencies) {
  const work = async (session: any) => {
    const existing = await deps.receipts.find({ _id: { $in: batches.map((batch) => batch.id) } }).session(session);
    const applied = new Set(existing.map((receipt: { _id: string }) => receipt._id));
    const pending = batches.filter((batch) => !applied.has(batch.id));
    if (!pending.length) return;
    const totals: Record<string, number> = {};
    for (const batch of pending) {
      for (const [key, value] of Object.entries(batch.entries)) {
        totals[key] = (totals[key] || 0) + Number(value);
      }
    }
    const messages = [];
    const daily = [];
    for (const [key, count] of Object.entries(totals)) {
      if (key.startsWith('clicks:msg:')) {
        messages.push({ updateOne: {
          filter: { _id: key.slice('clicks:msg:'.length) },
          update: { $inc: { clicks: count } },
        } });
      } else if (key.startsWith('clicks:daily:')) {
        daily.push({ updateOne: {
          filter: { date: new Date(`${key.slice('clicks:daily:'.length)}T00:00:00.000Z`) },
          update: { $inc: { clicks: count } }, upsert: true,
        } });
      }
    }
    if (messages.length) await deps.messages.bulkWrite(messages, { session });
    if (daily.length) await deps.daily.bulkWrite(daily, { session });
    await deps.receipts.create(pending.map((batch) => ({ _id: batch.id })), { session, ordered: true });
  };
  for (let attempt = 0; ; attempt++) {
    try {
      await deps.transaction(work);
      break;
    } catch (error) {
      // Concurrent workers can race on a receipt or the first upsert of a day.
      // Retry the entire transaction, including the receipt check.
      if (error?.code !== 11000 || attempt >= 2) throw error;
    }
  }
  // Receipts remain durable: a worker that read an old batch can still retry safely.
  await deps.acknowledge();
}
