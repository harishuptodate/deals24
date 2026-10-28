import assert from 'node:assert/strict';
import test from 'node:test';
import { planDealEnrichment, preserveVerifiedFacts } from './dealEnrichment';
import { buildCaptionPrompt } from './captionPrompt';

const cleanDeal = {
  enabled: true, isAmazonDeal: true, hasMatch: false, captionReady: true,
  identityConfidence: 'high', category: 'laptops', price: '50000',
};

test('uses no Gemini operation for clean complete Amazon deals or a disabled master switch', () => {
  assert.deepEqual(planDealEnrichment(cleanDeal), []);
  assert.deepEqual(planDealEnrichment({ ...cleanDeal, enabled: false, captionReady: false, identityConfidence: 'none' }), []);
});

test('combines all unresolved tasks into one enrichment decision', () => {
  assert.deepEqual(planDealEnrichment({
    ...cleanDeal, isAmazonDeal: false, captionReady: false, identityConfidence: 'low',
    category: 'miscellaneous', price: '',
  }), ['normalize-caption', 'extract-price', 'classify-product', 'enrich-identity', 'compare-candidates']);
});

test('known matches can get caption cleanup without another product comparison', () => {
  assert.deepEqual(planDealEnrichment({ ...cleanDeal, hasMatch: true, captionReady: false }), ['normalize-caption']);
  assert.deepEqual(planDealEnrichment({ ...cleanDeal, hasMatch: true, identityConfidence: 'none' }), []);
});

test('identity uncertainty alone can use the combined call while cheap deals stay local', () => {
  assert.deepEqual(planDealEnrichment({ ...cleanDeal, identityConfidence: 'low' }), ['enrich-identity']);
  assert.deepEqual(planDealEnrichment({ ...cleanDeal, identityConfidence: 'low', price: '999' }), []);
});

test('enforces verified price and match in application code and rejects changed URLs', () => {
  const original = 'Laptop @ 50000\nhttps://example.com/original';
  const result = preserveVerifiedFacts({
    normalizedText: 'Laptop @ 49000\nhttps://example.com/invented', price: '49000',
    category: 'fashion', match: { sameProduct: true, candidateId: 'other', confidence: 1, reason: '' },
  }, original, { price: '50000', category: 'laptops', matchedProductId: 'known' });
  assert.equal(result.normalizedText, original);
  assert.equal(result.price, '50000');
  assert.equal(result.category, 'laptops');
  assert.equal(result.match, undefined);
});

test('accepts caption cleanup that preserves verified facts', () => {
  const result = preserveVerifiedFacts({
    normalizedText: 'ASUS Laptop @ 50000\nhttps://example.com', price: '50000', category: 'laptops',
  }, 'Loot ASUS Laptop @ 50000\nhttps://example.com', { price: '50000' });
  assert.equal(result.normalizedText.startsWith('ASUS'), true);
  const prompt = buildCaptionPrompt('Laptop', [], { matchedProductId: 'known', price: '50000' });
  assert.ok(prompt.includes('"matchedProductId":"known"'));
  assert.ok(prompt.includes('"price":"50000"'));
});
