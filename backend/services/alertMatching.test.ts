import assert from 'node:assert/strict';
import test from 'node:test';
import { alertMatchesDeal, matchesKeyword, parseDealPrice } from './alertMatching';

test('matches a keyword when all of its words appear in the deal', () => {
  assert.equal(matchesKeyword('Samsung Crystal 65-inch 4K Smart TV', ['samsung 65inch tv']), true);
  assert.equal(matchesKeyword('Samsung Crystal 55-inch 4K Smart TV', ['samsung 65inch tv']), false);
});

test('matches any phrase from a keyword alert', () => {
  assert.equal(matchesKeyword('New Apple MacBook Air with M5 chip', [
    'havells bldc fan',
    'macbook m5 air',
  ]), true);
});

test('normalizes formatted prices', () => {
  assert.equal(parseDealPrice('₹1,29,999'), 129999);
  assert.equal(parseDealPrice(null), null);
});

test('applies an optional target price to deal alerts', () => {
  const deal = { id: 'deal-1', text: 'Laptop', price: '74999' };
  assert.equal(alertMatchesDeal({ type: 'deal', dealId: 'deal-1' }, deal), true);
  assert.equal(alertMatchesDeal({ type: 'deal', dealId: 'deal-1', targetPrice: 75000 }, deal), true);
  assert.equal(alertMatchesDeal({ type: 'deal', dealId: 'deal-1', targetPrice: 70000 }, deal), false);
});
