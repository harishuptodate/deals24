import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const api = 'http://127.0.0.1:8091';
const queries = ['sams', 'samung s25 ultra', 'lg washin machine', 'tv'];
const report = [];
const metrics = async () => (await fetch(`${api}/__qa/metrics`)).json();
const percentile = (values, p) => values[Math.ceil(values.length * p) - 1];

// A fixed workload: 96 requests total, never more than four in flight.
// Wait for any browser-test outage cooldown to end before the native phase.
await new Promise((resolve) => setTimeout(resolve, 31_000));
for (const backend of ['atlas', 'mongoTokens']) {
  if (backend === 'mongoTokens') await fetch(`${api}/__qa/fallback`, { method: 'POST' });
  for (const concurrency of [1, 4]) {
    const before = await metrics();
    const durations = [];
    let errors = 0;
    let next = 0;
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (next < 24) {
        const index = next++;
        const preview = index % 2 === 0;
        const params = new URLSearchParams({ [preview ? 'q' : 'search']: queries[index % queries.length] });
        const startedAt = performance.now();
        try {
          const response = await fetch(`${api}/api/telegram/${preview ? 'search/suggestions' : 'messages'}?${params}`, { signal: AbortSignal.timeout(10_000) });
          assert.equal(response.status, 200);
          const data = await response.json();
          assert.ok(preview ? Array.isArray(data.deals) : Array.isArray(data.data));
        } catch { errors++; }
        durations.push(performance.now() - startedAt);
      }
    }));
    durations.sort((a, b) => a - b);
    const after = await metrics();
    const row = {
      backend, concurrency, requests: durations.length, errors,
      p50Ms: Math.round(percentile(durations, 0.5)), p95Ms: Math.round(percentile(durations, 0.95)), p99Ms: Math.round(percentile(durations, 0.99)),
      observedAtlas: after.atlas - before.atlas, observedFallback: after.mongoTokens - before.mongoTokens,
    };
    report.push(row);
    console.log(JSON.stringify(row));
    assert.equal(errors, 0, 'Search requests failed under bounded concurrency');
    assert.equal(backend === 'atlas' ? row.observedFallback : row.observedAtlas, 0, 'Unexpected backend switch during load phase');
    assert.ok(row.p95Ms < 2000 && row.p99Ms < 4000, 'Search exceeded the local acceptance budget');
  }
}
await mkdir('tmp/search-qa', { recursive: true });
await writeFile('tmp/search-qa/load-report.json', JSON.stringify({ testedAt: new Date().toISOString(), scope: 'Local API and live Atlas; Redis bypassed; 24 requests per sample, not a production capacity estimate', results: report }, null, 2));
