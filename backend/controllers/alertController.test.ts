import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import DealAlert from '../models/DealAlert';
import { updateAlert } from './alertController';
import { alertMatchesDeal } from '../services/alertMatching';

const ownerToken = 'test-alert-owner-token-1234567890';
const alertId = '507f1f77bcf86cd799439011';

async function patchPrice(targetPrice: unknown) {
  return patchAlert({ targetPrice });
}

async function patchAlert(update: Record<string, unknown>) {
  let status = 200;
  let body: Record<string, unknown>;
  const req = {
    body: { ownerToken, ...update },
    params: { id: alertId },
    get: () => undefined,
  } as unknown as Request;
  const res = {
    status(code: number) { status = code; return this; },
    json(value: Record<string, unknown>) { body = value; return this; },
  } as unknown as Response;
  await updateAlert(req, res);
  return { status, body };
}

for (const type of ['deal', 'keyword'] as const) {
  test(`updates and clears a ${type} alert price through the database update`, async (t) => {
    const stored = { _id: alertId, type, dealId: 'deal-1', keywords: ['laptop'], active: false, targetPrice: 1000 };
    t.mock.method(DealAlert, 'findOneAndUpdate', async (filter, update, options) => {
      assert.deepEqual(filter, { _id: alertId, ownerToken });
      assert.deepEqual(options, { new: true });
      Object.assign(stored, update);
      return { ...stored };
    });
    const deal = { id: 'deal-1', text: 'Laptop', price: 1500 };
    assert.equal(alertMatchesDeal(stored, deal), false);

    const updated = await patchPrice(2000);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.targetPrice, 2000);
    assert.equal(stored.targetPrice, 2000);
    assert.equal(stored.active, false);
    assert.equal(alertMatchesDeal(stored, deal), true);

    const cleared = await patchPrice(null);
    assert.equal(cleared.status, 200);
    assert.equal(stored.targetPrice, null);
    assert.equal(alertMatchesDeal(stored, { ...deal, price: 3000 }), true);
  });
}

test('rejects invalid prices without writing to the database', async (t) => {
  const update = t.mock.method(DealAlert, 'findOneAndUpdate', async () => { throw new Error('Unexpected database write'); });
  for (const price of [-1, 0, 100000001, 'invalid']) {
    const result = await patchPrice(price);
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'Enter a valid target price');
  }
  assert.equal(update.mock.callCount(), 0);
});

test('does not update an alert belonging to another owner', async (t) => {
  t.mock.method(DealAlert, 'findOneAndUpdate', async (filter) => {
    assert.deepEqual(filter, { _id: alertId, ownerToken });
    return null;
  });
  const result = await patchPrice(2000);
  assert.equal(result.status, 404);
});

test('normalizes and saves edited keywords while preserving price and paused status', async (t) => {
  const stored = { _id: alertId, type: 'keyword' as const, keywords: ['laptop'], targetPrice: 2000, active: false };
  t.mock.method(DealAlert, 'findOneAndUpdate', async (filter, update, options) => {
    assert.deepEqual(filter, { _id: alertId, ownerToken, type: 'keyword' });
    assert.deepEqual(update, { keywords: ['headphones', 'smart tv'] });
    assert.deepEqual(options, { new: true });
    Object.assign(stored, update);
    return { ...stored };
  });
  const result = await patchAlert({ keywords: ['  Smart   TV ', 'HEADPHONES', 'smart tv'] });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.keywords, ['headphones', 'smart tv']);
  assert.equal(stored.targetPrice, 2000);
  assert.equal(stored.active, false);
  assert.equal(alertMatchesDeal(stored, { id: 'deal-1', text: 'Laptop', price: 1500 }), false);
  assert.equal(alertMatchesDeal(stored, { id: 'deal-2', text: 'Smart TV', price: 1500 }), true);
});

test('rejects empty, malformed, oversized and excessive keyword edits without database writes', async (t) => {
  const update = t.mock.method(DealAlert, 'findOneAndUpdate', async () => { throw new Error('Unexpected database write'); });
  for (const keywords of [null, 'laptop', [], [' '], ['a'], [123], ['a'.repeat(81)], Array(11).fill('laptop'), ['valid', '']]) {
    const result = await patchAlert({ keywords });
    assert.equal(result.status, 400);
  }
  assert.equal(update.mock.callCount(), 0);
});

test('keyword edits cannot update deal alerts or alerts owned by another user', async (t) => {
  t.mock.method(DealAlert, 'findOneAndUpdate', async (filter) => {
    assert.deepEqual(filter, { _id: alertId, ownerToken, type: 'keyword' });
    return null;
  });
  assert.equal((await patchAlert({ keywords: ['laptop'] })).status, 404);
});
