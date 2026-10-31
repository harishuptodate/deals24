import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDealSearchFields,
  buildDealSearchPlan,
  DEAL_ATLAS_SEARCH_INDEX_DEFINITION,
  DEAL_ATLAS_SEARCH_INDEX_NAME,
  stripSearchUrls,
  tokenizeDealSearchValue,
  buildSearchConceptPattern,
  buildAtlasSearchStage,
  buildMongoSearchMatch,
} from './dealSearch';

test('defines the Atlas Search index used by deal queries', () => {
  assert.equal(DEAL_ATLAS_SEARCH_INDEX_NAME, 'deal_search_atlas_v2');
  assert.equal(DEAL_ATLAS_SEARCH_INDEX_DEFINITION.mappings.fields.searchTokens[0].analyzer, 'lucene.keyword');
  assert.deepEqual(DEAL_ATLAS_SEARCH_INDEX_DEFINITION.mappings.fields.category, {
    type: 'token',
  });
  assert.deepEqual(DEAL_ATLAS_SEARCH_INDEX_DEFINITION.mappings.fields.price, {
    type: 'number',
  });
});

test('concept coverage recognizes lexical typos and final prefixes without changing model numbers', () => {
  const samsung = new RegExp(buildSearchConceptPattern(['samsung'], false));
  for (const token of ['samsung', 'samung', 'samsnug', 'samsxung', 'samsunx']) assert.ok(samsung.test(token), token);
  for (const token of ['sams', 'xsamsung', 'samxng', 'samsungtv']) assert.ok(!samsung.test(token), token);
  const prefix = new RegExp(buildSearchConceptPattern(['sams'], true));
  assert.ok(prefix.test('samsung'));
  const model = new RegExp(buildSearchConceptPattern(['s25'], true));
  assert.ok(model.test('s25'));
  for (const token of ['s24', 's25fe', 's2']) assert.ok(!model.test(token));
  const tv = new RegExp(buildSearchConceptPattern(['tv', 'television'], false));
  assert.ok(tv.test('television'));
});

test('Atlas matching uses shared token patterns and autocomplete only for final word prefixes', () => {
  const plan = buildDealSearchPlan('samung s25 ultra');
  const stage = buildAtlasSearchStage({ textSearch: plan.textSearch, tokenGroups: plan.tokenGroups });
  const clauses = stage.$search.compound.should as any[];
  assert.equal(clauses.filter((clause) => clause.compound).length, 1);
  assert.equal(clauses.find((clause) => clause.regex?.query === 's25').regex.path, 'searchTokens');
  assert.ok(!('filter' in stage.$search.compound));
  for (const token of ['s25', '256gb']) {
    const numericStage = buildAtlasSearchStage({ textSearch: token });
    assert.ok(!JSON.stringify(numericStage).includes('autocomplete'));
  }
});

test('token fallback and coverage use the same typo and prefix rules', () => {
  const plan = buildDealSearchPlan('samung s25 ultr');
  const patterns = buildMongoSearchMatch(plan).searchTokens.$in;
  const matches = (token: string) => patterns.some((value) => typeof value === 'string' ? value === token : value.test(token));
  assert.ok(matches('samsung'));
  assert.ok(matches('s25'));
  assert.ok(!matches('s24'));
  assert.ok(matches('ultra'));
});

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
    tokenGroups: [['samsung'], ['mobile', 'smartphone', 'phone']], prefixToken: null,
  });
  assert.deepEqual(buildDealSearchPlan('TWS earbuds'), {
    textSearch: 'tws earbud earphone',
    tokenGroups: [['tws', 'earbud', 'earphone']], prefixToken: 'earbud',
  });
});

test('returns an empty plan for URL-only and punctuation-only searches', () => {
  assert.deepEqual(buildDealSearchPlan('https://amazon.in/dp/B0ABC12345 !!!'), {
    textSearch: '',
    tokenGroups: [], prefixToken: null,
  });
});
