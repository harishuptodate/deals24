import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDealSearchFields,
  buildDealSearchPlan,
  stripSearchUrls,
  tokenizeDealSearchValue,
} from './dealSearch';

test('removes full and bare links from searchable content', () => {
  const value = 'Samsung TV https://amazon.in/dp/B0ABC12345?tag=test and amzn.to/xyz';
  assert.equal(stripSearchUrls(value).includes('amazon'), false);
  assert.equal(stripSearchUrls(value).includes('amzn'), false);
  assert.deepEqual(tokenizeDealSearchValue(value), ['samsung', 'tv', 'and']);
});

test('builds searchable fields from clean text and product identity', () => {
  const fields = buildDealSearchFields({
    text: 'Sony WH-1000XM5 headphones https://example.com/sony',
    identity: {
      canonicalName: 'Sony WH-1000XM5',
      brand: 'Sony',
      model: 'WH-1000XM5',
      productType: 'Headphones',
      variant: ['Black'],
    },
  });

  assert.equal(fields.searchText.includes('example'), false);
  assert.equal(fields.searchTokens.includes('wh1000xm5'), true);
  assert.equal(fields.searchTokens.includes('black'), true);
});

test('normalizes plus models and attached measurement units', () => {
  assert.deepEqual(tokenizeDealSearchValue('Galaxy S24+ 256GB 6.7-inch'), [
    'galaxy', 's24', 'plus', '256gb', '6', '7', 'inch', '256', 'gb', '7inch',
  ]);
});

test('drops filler words and groups synonyms as one search concept', () => {
  assert.deepEqual(buildDealSearchPlan('best Samsung mobile deals'), {
    textSearch: 'samsung mobile smartphone phone',
    tokenGroups: [['samsung'], ['mobile', 'smartphone', 'phone']],
  });
  assert.deepEqual(buildDealSearchPlan('TWS earbuds'), {
    textSearch: 'tws earbud earphone',
    tokenGroups: [['tws', 'earbud', 'earphone']],
  });
});

test('returns an empty plan for URL-only and punctuation-only searches', () => {
  assert.deepEqual(buildDealSearchPlan('https://amazon.in/dp/B0ABC12345 !!!'), {
    textSearch: '',
    tokenGroups: [],
  });
});
