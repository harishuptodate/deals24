import assert from 'node:assert/strict';
import test from 'node:test';
import { getSearchMetrics, markAtlasFailure, runSearchWithFallback } from './atlasSearchHealth';

test('normal successful searches are silent while counters remain accurate', async (context) => {
  const info = context.mock.method(console, 'info', () => undefined);
  const warn = context.mock.method(console, 'warn', () => undefined);
  const before = getSearchMetrics();
  const store = {};
  for (let index = 0; index < 100; index++) {
    assert.equal(await runSearchWithFallback(store, 'results', async () => 'atlas', async () => 'fallback'), 'atlas');
  }
  markAtlasFailure(store);
  await runSearchWithFallback(store, 'previews', async () => 'atlas', async () => 'fallback');
  assert.equal(info.mock.callCount(), 0);
  assert.equal(warn.mock.callCount(), 0);
  assert.equal(getSearchMetrics().atlas - before.atlas, 100);
  assert.equal(getSearchMetrics().mongoTokens - before.mongoTokens, 1);
});

test('slow requests warn at most once per minute and every slow request is counted', async (context) => {
  let now = 0;
  context.mock.method(Date, 'now', () => now);
  const warn = context.mock.method(console, 'warn', () => undefined);
  const before = getSearchMetrics();
  const store = {};
  const search = () => runSearchWithFallback(store, 'results', async () => { now += 2500; return []; }, async () => []);
  await search();
  await search();
  assert.equal(warn.mock.callCount(), 1);
  now += 60_000;
  await search();
  assert.equal(warn.mock.callCount(), 2);
  assert.equal(getSearchMetrics().slow - before.slow, 3);
  assert.equal(JSON.parse(warn.mock.calls[0].arguments[0]).event, 'deal_search_slow');
});

test('outages do not flood logs and recovery is logged once', async (context) => {
  let now = 0;
  context.mock.method(Date, 'now', () => now);
  const warn = context.mock.method(console, 'warn', () => undefined);
  const info = context.mock.method(console, 'info', () => undefined);
  const store = {};
  const fail = async () => { throw new Error('unavailable'); };
  const fallback = async () => [];
  await runSearchWithFallback(store, 'results', fail, fallback);
  for (let index = 0; index < 100; index++) await runSearchWithFallback(store, 'previews', fail, fallback);
  now += 30_001;
  await runSearchWithFallback(store, 'results', fail, fallback);
  assert.equal(warn.mock.callCount(), 1);
  now += 30_001;
  await runSearchWithFallback(store, 'results', async () => [], fallback);
  await runSearchWithFallback(store, 'results', async () => [], fallback);
  assert.equal(info.mock.callCount(), 1);
  assert.equal(JSON.parse(info.mock.calls[0].arguments[0]).event, 'deal_search_recovered');
});

test('repeated failed requests are counted without repeated failure logs', async (context) => {
  const warn = context.mock.method(console, 'warn', () => undefined);
  const store = {};
  markAtlasFailure(store);
  const before = getSearchMetrics();
  for (let index = 0; index < 10; index++) await assert.rejects(() => runSearchWithFallback(store, 'results', async () => [], async () => { throw new Error('database unavailable'); }));
  assert.equal(warn.mock.callCount(), 1);
  assert.equal(getSearchMetrics().failed - before.failed, 10);
  assert.equal(JSON.parse(warn.mock.calls[0].arguments[0]).event, 'deal_search_failed');
});
