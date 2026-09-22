import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanAmazonImageUrl,
  cleanAmazonProductUrl,
  replaceLastAmazonUrl,
} from './amazonLink';

test('cleans an Amazon India product URL and keeps only the configured affiliate tag', () => {
  const input = 'https://www.amazon.in/dp/B0FH1WPYMX?psc=1&th=1&smid=AXOGFIT0PZZ7G&linkCode=sl2&tag=other-21';

  assert.equal(
    cleanAmazonProductUrl(input, 'harishch-21'),
    'https://www.amazon.in/dp/B0FH1WPYMX?tag=harishch-21',
  );
});

test('accepts an Amazon.com ASIN link and canonicalizes it to Amazon India', () => {
  assert.equal(
    cleanAmazonProductUrl('https://www.amazon.com/gp/product/b08n5wrwnw/ref=something', 'harishch-21'),
    'https://www.amazon.in/dp/B08N5WRWNW?tag=harishch-21',
  );
});

test('rejects lookalike hosts and links without an ASIN', () => {
  assert.throws(() => cleanAmazonProductUrl('https://amazon.in.example.com/dp/B0FH1WPYMX'), /valid Amazon/);
  assert.throws(() => cleanAmazonProductUrl('https://www.amazon.in/s?k=phone'), /ASIN/);
});

test('replaces only the selected final Amazon link in message text', () => {
  const text = 'Source https://amazon.in/dp/B000000001 deal https://amazon.in/dp/B000000002?tag=old';

  assert.equal(
    replaceLastAmazonUrl(text, 'https://www.amazon.in/dp/B000000002?tag=harishch-21'),
    'Source https://amazon.in/dp/B000000001 deal https://www.amazon.in/dp/B000000002?tag=harishch-21',
  );
});

test('removes Amazon image size transformations', () => {
  assert.equal(
    cleanAmazonImageUrl('https://m.media-amazon.com/images/I/example._AC_SL1500_.jpg'),
    'https://m.media-amazon.com/images/I/example.jpg',
  );
});
