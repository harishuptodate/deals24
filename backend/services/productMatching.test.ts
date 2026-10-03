import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessDealTextReadiness,
  buildIdentityKey,
  getCandidateSearchTokens,
  shouldUseGeminiForDeal,
  shouldUseLocalDealProcessing,
} from './productMatching';

test('accepts a complete, already-clean deal body for local saving', () => {
  assert.equal(assessDealTextReadiness({
    text: `Samsung Galaxy S24 FE 5G 8GB/256GB @ ₹49,999

🔗 https://www.amazon.in/dp/B0EXAMPLE

💡 Flat ₹2,000 off with HDFC credit card`,
    link: 'https://www.amazon.in/dp/B0EXAMPLE',
    price: '49999',
    category: 'mobile-phones',
    categoryConfidence: 'high',
  }).ready, true);
});

test('accepts the alternate recent-caption shape with a dedicated deal line', () => {
  assert.equal(assessDealTextReadiness({
    text: `Xiaomi Air Purifier 4 Lite | 160 Sq.ft. in 6 mins

🔥 Deal ➡️ 10,300

❌ Regular 13,000

📌 1099 HDFC EMI

🔗 https://www.amazon.in/dp/B0EXAMPLE`,
    link: 'https://www.amazon.in/dp/B0EXAMPLE',
    price: '10300',
    category: 'electronics-home',
    categoryConfidence: 'high',
  }).ready, true);
});

test('keeps Gemini for promotional or incomplete deal bodies', () => {
  const baseInput = {
    text: 'ASUS TUF Gaming A15 laptop @ ₹53,000 https://www.amazon.in/dp/B0EXAMPLE',
    link: 'https://www.amazon.in/dp/B0EXAMPLE',
    price: '53000',
    category: 'laptops' as const,
    categoryConfidence: 'high' as const,
  };

  assert.equal(assessDealTextReadiness({
    ...baseInput,
    text: `Mahaa Loot 🚀 ${baseInput.text}`,
  }).reason, 'promotional-noise');
  assert.equal(assessDealTextReadiness({ ...baseInput, link: null }).reason, 'missing-link');
  assert.equal(assessDealTextReadiness({ ...baseInput, price: '' }).reason, 'missing-price');
  assert.equal(assessDealTextReadiness({
    ...baseInput,
    category: 'miscellaneous',
    categoryConfidence: 'low',
  }).reason, 'uncertain-category');
});

test('keeps Gemini when extra lines do not match the learned caption structure', () => {
  assert.equal(assessDealTextReadiness({
    text: `Samsung Galaxy S24 FE 5G @ ₹49,999

This is the greatest phone you can buy today

🔗 https://www.amazon.in/dp/B0EXAMPLE`,
    link: 'https://www.amazon.in/dp/B0EXAMPLE',
    price: '49999',
    category: 'mobile-phones',
    categoryConfidence: 'high',
  }).reason, 'unrecognized-caption-structure');
});

test('routes fashion and sub-1000 deals through local processing', () => {
  assert.equal(shouldUseLocalDealProcessing('fashion', '2499'), true);
  assert.equal(shouldUseLocalDealProcessing('gadgets-accessories', '999'), true);
  assert.equal(shouldUseLocalDealProcessing('gadgets-accessories', '1000'), false);
  assert.equal(shouldUseLocalDealProcessing('laptops', ''), false);
});

test('never uses Gemini for an exact Amazon match', () => {
  assert.equal(shouldUseGeminiForDeal({
    isAmazonDeal: true,
    hasDeterministicMatch: true,
    localApprovalPassed: false,
    category: 'laptops',
    price: '75000',
  }), false);
});

test('uses local approval only for unmatched Amazon deals', () => {
  const input = {
    isAmazonDeal: true,
    hasDeterministicMatch: false,
    category: 'mobile-phones',
    price: '25000',
  };

  assert.equal(shouldUseGeminiForDeal({ ...input, localApprovalPassed: true }), false);
  assert.equal(shouldUseGeminiForDeal({ ...input, localApprovalPassed: false }), true);
});

test('uses one Gemini path for non-Amazon deals except cheap local categories', () => {
  assert.equal(shouldUseGeminiForDeal({
    isAmazonDeal: false,
    hasDeterministicMatch: false,
    localApprovalPassed: true,
    category: 'laptops',
    price: '50000',
  }), true);
  assert.equal(shouldUseGeminiForDeal({
    isAmazonDeal: false,
    hasDeterministicMatch: false,
    localApprovalPassed: false,
    category: 'fashion',
    price: '2500',
  }), false);
  assert.equal(shouldUseGeminiForDeal({
    isAmazonDeal: false,
    hasDeterministicMatch: false,
    localApprovalPassed: false,
    category: 'gadgets-accessories',
    price: '999',
  }), false);
});

test('builds stable identity keys with sorted variants', () => {
  assert.equal(buildIdentityKey({
    canonicalName: 'Samsung Galaxy S24 FE',
    brand: 'Samsung',
    model: 'Galaxy S24 FE',
    productType: 'smartphone',
    variant: ['Graphite', '256 GB'],
  }), 'samsung|galaxy-s24-fe|256-gb|graphite');
});

test('prioritizes model-like tokens for candidate retrieval', () => {
  const tokens = getCandidateSearchTokens('ASUS TUF A15 FA507NUR 16GB laptop deal https://example.com');
  assert.deepEqual(tokens.slice(0, 3), ['fa507nur', '16gb', 'a15']);
});
