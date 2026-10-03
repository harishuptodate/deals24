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
  removeDisallowedEmojis,
  removeLeadingFlatDiscount,
  replaceLinksAndText,
  shouldSkipBadProducts,
} from './telegramMessageFilters';

const blacklist = {
  brands: ['boat', 'noise'],
  products: ['tws', 'power bank'],
  rules: [],
};

test('detects amazon links and normalizes shortened urls', () => {
  const input = 'Deal link amzn.to/abc and https://amazon.in/dp/test';
  assert.equal(hasAmazonLinks(input), true);
  assert.deepEqual(extractAmazonUrls(input), ['https://amzn.to/abc', 'https://amazon.in/dp/test']);
});

test('allows and blocks exact brand-product overrides before the default rule', () => {
  const policy = {
    ...blacklist,
    rules: [
      { brand: 'boat', product: 'tws', action: 'allow' as const },
      { brand: 'samsung', product: 'tws', action: 'block' as const },
    ],
  };

  assert.equal(shouldSkipBadProducts('Boat TWS earbuds deal', policy), false);
  assert.equal(shouldSkipBadProducts('Samsung TWS earbuds deal', policy), true);
  assert.equal(shouldSkipBadProducts('Noise TWS earbuds deal', policy), true);
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

test('matches text replacements across casing, separators, invisible characters, and stretched letters', () => {
  const previousTextReplacements = process.env.TEXT_REPLACEMENTS;
  process.env.TEXT_REPLACEMENTS = 'Mahaaa Looot!:,TRT Premium Deals:Deals24,Sale:Offer';

  assert.equal(
    replaceLinksAndText('mahaaa---looooooot? TV | trt---premium deals | S\u200Bale'),
    'TV | Deals24 | Offer',
  );

  process.env.TEXT_REPLACEMENTS = previousTextReplacements;
});

test('does not replace a configured word inside an unrelated longer word', () => {
  const previousTextReplacements = process.env.TEXT_REPLACEMENTS;
  process.env.TEXT_REPLACEMENTS = 'Loot:';

  assert.equal(replaceLinksAndText('Loot now, but keep Looting'), 'now, but keep Looting');

  process.env.TEXT_REPLACEMENTS = previousTextReplacements;
});

test('applies overlapping text replacements from longest to shortest', () => {
  const previousTextReplacements = process.env.TEXT_REPLACEMENTS;
  process.env.TEXT_REPLACEMENTS = 'Mahaa:,Mahaaa Looot🚀🚀👌:,Looot🚀🚀:,Looot🔥:';

  assert.equal(
    replaceLinksAndText('Mahaaa Looot🚀🚀👌 TV Looot🚀🚀 deal Looot🔥 now'),
    'TV  deal  now',
  );

  process.env.TEXT_REPLACEMENTS = previousTextReplacements;
});

test('removes every emoji except the configured allowlist', () => {
  assert.equal(
    removeDisallowedEmojis('✅ 🔗 ❌ 💡 ➡️ 🔥 🤩 🚀 👌 ⚡️ 💥 1️⃣ 🇮🇳 👨‍👩‍👧'),
    '✅ 🔗 ❌ 💡 ➡️ 🔥        ',
  );
});

test('removes a flat discount only when it starts the message', () => {
  const message = [
    'Flat 14K Off',
    '',
    'Sony 43 inches BRAVIA TV @ ₹30,815',
    '',
    '❌ Regular price @ ₹43,990 | 💡 Flat ₹7,675 Off Via Flipkart AXIS Cc',
  ].join('\n');

  assert.equal(
    removeLeadingFlatDiscount(message),
    [
      'Sony 43 inches BRAVIA TV @ ₹30,815',
      '',
      '❌ Regular price @ ₹43,990 | 💡 Flat ₹7,675 Off Via Flipkart AXIS Cc',
    ].join('\n'),
  );
  assert.equal(
    removeLeadingFlatDiscount('Sony TV with Flat 10k Off'),
    'Sony TV with Flat 10k Off',
  );
});

test('classifies low-context and profitable messages', () => {
  assert.equal(isLowContext('loot link fast buy now'), true);
  assert.equal(isProfitableProduct('Best laptop deal with ryzen processor'), true);
});

test('skips blocked tws deals but not unrelated messages', () => {
  assert.equal(shouldSkipBadProducts('Boat TWS earbuds deal', blacklist), true);
  assert.equal(shouldSkipBadProducts('Boat phone launch offer', blacklist), false);
  assert.equal(shouldSkipBadProducts('Samsung TWS launch offer', blacklist), false);
  assert.equal(shouldSkipBadProducts('Boating TWS launch offer', blacklist), false);
});

test('finds bounded misspellings and incomplete blacklist words without broad partial matching', () => {
  const fuzzyBlacklist = {
    brands: ['zebronics'],
    products: ['earbuds'],
    rules: [],
  };

  assert.equal(shouldSkipBadProducts('Zebroni earbud deal', fuzzyBlacklist), true);
  assert.equal(shouldSkipBadProducts('Zebra earbud deal', fuzzyBlacklist), false);
});

test('requires exact words before an allow rule overrides fuzzy blacklist detection', () => {
  const policy = {
    brands: ['zebronics'],
    products: ['earbuds'],
    rules: [{ brand: 'zebronics', product: 'earbuds', action: 'allow' as const }],
  };

  assert.equal(shouldSkipBadProducts('Zebronics earbuds deal', policy), false);
  assert.equal(shouldSkipBadProducts('Zebroni earbud deal', policy), true);
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
