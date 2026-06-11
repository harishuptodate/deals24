import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateHash,
  extractAmazonUrls,
  getTelegramFileIdFromPhoto,
  hasAmazonLinks,
  isLowContext,
  isProfitableProduct,
  isRecentMessage,
  normalizeGeminiPrice,
  normalizeMessage,
  replaceLinksAndText,
  shouldSkipTwsDeal,
} from './telegramMessageFilters';

test('detects amazon links and normalizes shortened urls', () => {
  const input = 'Deal link amzn.to/abc and https://amazon.in/dp/test';
  assert.equal(hasAmazonLinks(input), true);
  assert.deepEqual(extractAmazonUrls(input), ['https://amzn.to/abc', 'https://amazon.in/dp/test']);
});

test('normalizes message content for duplicate detection', () => {
  assert.equal(
    normalizeMessage('Hello   World https://example.com\nNow'),
    'hello world now',
  );
});

test('hashing is stable for semantically equivalent normalized text', () => {
  const left = calculateHash('Deal https://a.com   now');
  const right = calculateHash('Deal now');
  assert.equal(left, right);
});

test('replaces configured links and text fragments', () => {
  const previousLinks = process.env.LINKS_TO_REPLACE;
  const previousLinkReplacement = process.env.LINK_REPLACE_WITH;
  const previousTextReplacements = process.env.TEXT_REPLACEMENTS;

  process.env.LINKS_TO_REPLACE = 'example.com';
  process.env.LINK_REPLACE_WITH = 'deals24.in';
  process.env.TEXT_REPLACEMENTS = 'Loot:,Sale:Deal';

  assert.equal(
    replaceLinksAndText('Loot https://example.com Sale'),
    'https://deals24.in Deal',
  );

  process.env.LINKS_TO_REPLACE = previousLinks;
  process.env.LINK_REPLACE_WITH = previousLinkReplacement;
  process.env.TEXT_REPLACEMENTS = previousTextReplacements;
});

test('classifies low-context and profitable messages', () => {
  assert.equal(isLowContext('loot link fast buy now'), true);
  assert.equal(isProfitableProduct('Best laptop deal with ryzen processor'), true);
});

test('skips blocked tws deals but not unrelated messages', () => {
  assert.equal(shouldSkipTwsDeal('Boat TWS earbuds deal'), true);
  assert.equal(shouldSkipTwsDeal('Samsung phone launch offer'), false);
});

test('normalizes Gemini price inputs safely', () => {
  assert.equal(normalizeGeminiPrice('₹12,999'), '12999');
  assert.equal(normalizeGeminiPrice(34999), '34999');
  assert.equal(normalizeGeminiPrice('invalid'), '');
});

test('picks highest quality photo file id', () => {
  const photos = [
    { file_id: 'small', file_size: 1200 },
    { file_id: 'large', file_size: 3400 },
  ];
  assert.equal(getTelegramFileIdFromPhoto(photos), 'large');
});

test('recent-message check only passes fresh timestamps', () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  assert.equal(isRecentMessage(nowSeconds), true);
  assert.equal(isRecentMessage(nowSeconds - 10 * 60), false);
});
