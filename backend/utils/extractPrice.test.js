const test = require('node:test');
const assert = require('node:assert/strict');

const { extractPrice, extractAllDealPrices } = require('./extractPrice');

test('extracts @ price without currency symbol', () => {
	assert.deepEqual(
		extractAllDealPrices('EvoFox Katana S Mini Mechanical Keyboards Wireless @1699'),
		[1699],
	);
	assert.equal(
		extractPrice('EvoFox Katana S Mini Mechanical Keyboards Wireless @1699'),
		'1699',
	);
});

test('extracts @ price with rupee symbol', () => {
	assert.deepEqual(
		extractAllDealPrices('Samsung Galaxy 45W Charger Travel Adaptor @ ₹899'),
		[899],
	);
	assert.equal(
		extractPrice('Samsung Galaxy 45W Charger Travel Adaptor @ ₹899'),
		'899',
	);
});

test('extracts deal price label', () => {
	assert.deepEqual(extractAllDealPrices('Deal Price : ₹274'), [274]);
	assert.equal(extractPrice('Deal Price : ₹274'), '274');
});

test('extracts multiple at prices and returns the lowest', () => {
	const input = 'Sony Alpha Camera at ₹87,740\n\nInsta360 Camera at ₹48,990';
	assert.deepEqual(extractAllDealPrices(input), [87740, 48990]);
	assert.equal(extractPrice(input), '48990');
});

test('extracts multiple @ prices with commas and returns the lowest', () => {
	const input =
		'MX Vertical @ ₹3,634\nMX Master 2S @ ₹2,218\nMX Master 3S @ ₹4,106';
	assert.deepEqual(extractAllDealPrices(input), [3634, 2218, 4106]);
	assert.equal(extractPrice(input), '2218');
});

test('extracts prices written with "at"', () => {
	assert.deepEqual(
		extractAllDealPrices('Canon EOS R10 at ₹61,190'),
		[61190],
	);
	assert.equal(extractPrice('Canon EOS R10 at ₹61,190'), '61190');
});

test('extracts prices written with "for"', () => {
	assert.deepEqual(
		extractAllDealPrices('Apple Pencil USB-C for ₹6,990'),
		[6990],
	);
	assert.equal(extractPrice('Apple Pencil USB-C for ₹6,990'), '6990');
});

test('deduplicates repeated prices across patterns', () => {
	const input = 'Deal Price: ₹1,999\nBuy now @ ₹1,999\nAvailable for ₹1,999';
	assert.deepEqual(extractAllDealPrices(input), [1999]);
	assert.equal(extractPrice(input), '1999');
});

test('ignores invalid empty captures and keeps valid matches', () => {
	const input = 'Deal Price : ₹ \nValid price @ 3499';
	assert.deepEqual(extractAllDealPrices(input), [3499]);
	assert.equal(extractPrice(input), '3499');
});

test('ignores zero values', () => {
	const input = 'Deal Price: ₹0\nKeyboard @ ₹1,499';
	assert.deepEqual(extractAllDealPrices(input), [1499]);
	assert.equal(extractPrice(input), '1499');
});

test('supports compact message formats', () => {
	assert.deepEqual(
		extractAllDealPrices('Deal price:₹12,345'),
		[12345],
	);
	assert.equal(extractPrice('Deal price:₹12,345'), '12345');
});

test('extracts prices across mixed supported patterns', () => {
	const input =
		'Monitor @ ₹14,999\nMouse at ₹1,299\nKeyboard for ₹2,499\nDeal Price: ₹999';
	assert.deepEqual(extractAllDealPrices(input), [14999, 1299, 2499, 999]);
	assert.equal(extractPrice(input), '999');
});

test('returns empty results when no supported deal price exists', () => {
	const input = 'Flat 50% off with SBI card and extra cashback available';
	assert.deepEqual(extractAllDealPrices(input), []);
	assert.equal(extractPrice(input), '');
});

test('returns empty results for non-string input', () => {
	assert.deepEqual(extractAllDealPrices(null), []);
	assert.equal(extractPrice(undefined), '');
});

test('does not infer effective prices from discount language', () => {
	const input =
		'MRP ₹2,999\nApply coupon ₹500\nFinal effective price after cashback ₹1,999';
	assert.deepEqual(extractAllDealPrices(input), []);
	assert.equal(extractPrice(input), '');
});

test('extracts supported prices even when other numbers exist nearby', () => {
	const input =
		'65-inch TV 2025 model at ₹54,990\nExchange bonus 3000\nSoundbar @ ₹4,999';
	assert.deepEqual(extractAllDealPrices(input), [54990, 4999]);
	assert.equal(extractPrice(input), '4999');
});
