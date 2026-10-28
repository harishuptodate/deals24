import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLocalProductIdentity, mergeProductIdentities } from './localProductIdentity';

test('extracts a complete coded product identity from a sparse headline', () => {
  const result = extractLocalProductIdentity('Sony HT-S40R 5.1ch Home Theatre Soundbar @ ₹24,990');
  assert.equal(result.confidence, 'high');
  assert.deepEqual(result.identity, {
    canonicalName: 'Sony HT-S40R',
    brand: 'Sony',
    model: 'HT-S40R',
    productType: 'soundbar',
    variant: [],
  });
});

test('keeps appliance identity partial rather than inventing a model', () => {
  const result = extractLocalProductIdentity('Bosch 302L 3 Star Triple Door Frost Free Refrigerator @ ₹42,990');
  assert.equal(result.confidence, 'medium');
  assert.equal(result.identity?.brand, 'Bosch');
  assert.equal(result.identity?.productType, 'refrigerator');
  assert.equal(result.identity?.model, '');
  assert.deepEqual(result.identity?.variant, ['302L', '3 Star', 'Triple Door', 'Frost Free']);
});

test('extracts phone family, model, and capacity variants', () => {
  const result = extractLocalProductIdentity('OnePlus N6x 5G 4GB RAM 128GB Storage 7000mAh Phone');
  assert.equal(result.identity?.canonicalName, 'OnePlus N6x');
  assert.equal(result.identity?.productType, 'mobile phone');
  assert.deepEqual(result.identity?.variant, ['4GB RAM', '128GB Storage', '7000mAh', '5G']);
});

test('extracts identities from representative projector, laptop, and vehicle messages', () => {
  assert.equal(
    extractLocalProductIdentity('XGIMI Vibe One 1080p Full HD Projector @ 19,949').identity?.model,
    'Vibe One',
  );
  assert.equal(
    extractLocalProductIdentity('ASUS TUF A15 (2026) Gaming Laptop 16GB RAM 512GB SSD').identity?.model,
    'TUF A15',
  );
  assert.equal(
    extractLocalProductIdentity('Bajaj Pulsar N160 SS Single Seat Motorcycle').identity?.model,
    'Pulsar N160 SS',
  );
});

test('does not create identity from generic promotional text', () => {
  assert.deepEqual(
    extractLocalProductIdentity('Lowest price ever. Grab fast before stock ends!'),
    { confidence: 'none' },
  );
});

test('merges generated fields over local fields and retains local variants', () => {
  const local = extractLocalProductIdentity('Canon RF 45mm F1.2 STM Lens').identity;
  const merged = mergeProductIdentities(local, {
    canonicalName: 'Canon RF 45mm F1.2 STM',
    brand: 'Canon',
    model: 'RF 45mm F1.2 STM',
    productType: 'camera lens',
    variant: ['STM'],
  });
  assert.equal(merged?.productType, 'camera lens');
  assert.deepEqual(merged?.variant, ['STM', '45mm']);
});
