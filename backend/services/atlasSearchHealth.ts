const RETRY_AFTER_MS = 30_000;
const failures = new WeakMap<object, { retryAt: number; probing: boolean }>();
const warningTimes = new WeakMap<object, Partial<Record<'fallback' | 'failed' | 'slow', number>>>();
const metrics = { atlas: 0, mongoTokens: 0, failed: 0, slow: 0 };

export function getSearchMetrics() {
  return { ...metrics };
}

function warnOnce(store: object, category: 'fallback' | 'failed' | 'slow', details: Record<string, unknown>) {
  const times = warningTimes.get(store) || {};
  const now = Date.now();
  if (times[category] !== undefined && now - times[category] < 60_000) return;
  times[category] = now;
  warningTimes.set(store, times);
  console.warn(JSON.stringify(details));
}

export function canUseAtlas(store: object): boolean {
  const state = failures.get(store);
  return !state || (Date.now() >= state.retryAt && !state.probing);
}

export function markAtlasFailure(store: object): void {
  failures.set(store, { retryAt: Date.now() + RETRY_AFTER_MS, probing: false });
}

export async function runSearchWithFallback<T>(
  store: object,
  operation: 'results' | 'previews',
  atlas: () => PromiseLike<T>,
  fallback: () => PromiseLike<T>,
): Promise<T> {
  const startedAt = Date.now();
  let backend: 'atlas' | 'mongoTokens' = 'mongoTokens';
  let success = false;
  let recovered = false;
  try {
    if (canUseAtlas(store)) {
      const state = failures.get(store);
      if (state) state.probing = true;
      try {
        const result = await atlas();
        // An older successful request cannot close a newer failure's circuit.
        if (state && failures.get(store) === state) {
          failures.delete(store);
          recovered = true;
        }
        backend = 'atlas';
        success = true;
        return result;
      } catch {
        markAtlasFailure(store);
        warnOnce(store, 'fallback', { event: 'deal_search_fallback', operation, reason: 'atlas_error', retryAfterMs: RETRY_AFTER_MS });
      }
    }
    const result = await fallback();
    success = true;
    return result;
  } finally {
    const elapsedMs = Date.now() - startedAt;
    metrics[backend]++;
    if (!success) metrics.failed++;
    if (elapsedMs >= 2000) metrics.slow++;
    const details = { operation, backend, elapsedMs };
    if (!success) warnOnce(store, 'failed', { event: 'deal_search_failed', ...details });
    else if (elapsedMs >= 2000) warnOnce(store, 'slow', { event: 'deal_search_slow', ...details });
    if (recovered) console.info(JSON.stringify({ event: 'deal_search_recovered', ...details }));
  }
}
