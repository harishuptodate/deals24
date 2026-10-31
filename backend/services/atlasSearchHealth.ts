const RETRY_AFTER_MS = 30_000;
const failures = new WeakMap<object, { retryAt: number; probing: boolean }>();

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
  let backend = 'mongoTokens';
  let success = false;
  let fallbackReason = 'cooldown';
  try {
    if (canUseAtlas(store)) {
      const state = failures.get(store);
      if (state) state.probing = true;
      try {
        const result = await atlas();
        // An older successful request cannot close a newer failure's circuit.
        if (state && failures.get(store) === state) failures.delete(store);
        backend = 'atlas';
        success = true;
        return result;
      } catch {
        fallbackReason = 'atlas_error';
        markAtlasFailure(store);
      }
    }
    const result = await fallback();
    success = true;
    return result;
  } finally {
    console.info(JSON.stringify({ event: 'deal_search', operation, backend, elapsedMs: Date.now() - startedAt, success, ...(backend === 'mongoTokens' ? { fallbackReason } : {}) }));
  }
}
