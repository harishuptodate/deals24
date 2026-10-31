import assert from 'node:assert/strict';
import test from 'node:test';
import { paginateSearch, type SearchSessionRepository } from './searchPagination';

test('snapshot order survives date, price and click changes while details stay current', async () => {
  let saved: Parameters<SearchSessionRepository['save']>[0];
  const sessions: SearchSessionRepository = { save: async (row) => { saved = row; }, load: async () => saved };
  const rows = new Map(['a', 'b', 'c', 'd'].map((_id, index) => [_id, { _id, date: 100 - index, price: index, clicks: 0 }]));
  let captures = 0;
  const capture = async () => { captures++; return ['a', 'b', 'c', 'd']; };
  const read = async (ids: string[]) => ids.flatMap((id) => rows.has(id) ? [rows.get(id)!] : []).reverse();
  const first = await paginateSearch({ search: 'samsung', limit: 1 }, capture, read, sessions);
  rows.get('a')!.date = 0; // Seen deal moves behind the cursor in live ordering.
  rows.get('b')!.date = 999; // Unseen deal moves ahead of it.
  rows.get('b')!.price = 500;
  rows.get('b')!.clicks = 999;
  const second = await paginateSearch({ search: 'samsung', limit: 1, cursor: first.nextCursor! }, capture, read, sessions);
  const third = await paginateSearch({ search: 'samsung', limit: 2, cursor: second.nextCursor! }, capture, read, sessions);
  assert.deepEqual([...first.data, ...second.data, ...third.data].map((row) => row.id), ['a', 'b', 'c', 'd']);
  assert.equal(second.data[0].price, 500);
  assert.equal(second.data[0].clicks, 999);
  assert.equal(captures, 1);
  assert.equal(third.hasMore, false);
});

test('expired, evicted, malformed and cross-query cursors require a refresh', async () => {
  let saved: Parameters<SearchSessionRepository['save']>[0];
  const sessions: SearchSessionRepository = { save: async (row) => { saved = row; }, load: async () => saved };
  const first = await paginateSearch({ search: 'tv', limit: 1 }, async () => ['a', 'b'], async () => [], sessions);
  for (const cursor of ['legacy|cursor', Buffer.from('null').toString('base64url'), first.nextCursor!]) {
    await assert.rejects(() => paginateSearch({ search: 'different', cursor }, async () => [], async () => [], sessions), /Refresh results/);
  }
  saved.expiresAt = new Date(0);
  await assert.rejects(() => paginateSearch({ search: 'tv', cursor: first.nextCursor! }, async () => [], async () => [], sessions), /Refresh results/);
  await assert.rejects(() => paginateSearch({ search: 'tv', cursor: first.nextCursor! }, async () => [], async () => [], { ...sessions, load: async () => null }), /Refresh results/);
});

test('deleted deals are omitted without shifting the remaining snapshot offsets', async () => {
  let saved: Parameters<SearchSessionRepository['save']>[0];
  const sessions: SearchSessionRepository = { save: async (row) => { saved = row; }, load: async () => saved };
  const first = await paginateSearch({ search: 'tv', limit: 1 }, async () => ['a', 'b', 'c'], async (ids) => ids.map((_id) => ({ _id })), sessions);
  const next = await paginateSearch({ search: 'tv', limit: 1, cursor: first.nextCursor! }, async () => [], async () => [], sessions);
  assert.equal(next.data.length, 0);
  assert.equal(next.hasMore, true);
  const last = await paginateSearch({ search: 'tv', cursor: next.nextCursor! }, async () => [], async () => [{ _id: 'c' }], sessions);
  assert.deepEqual(last.data.map((row) => row.id), ['c']);
});
