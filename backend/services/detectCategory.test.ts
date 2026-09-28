import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCategory } from './detectCategory';

test('classifies lifestyle products separately from clothing', () => {
	assert.equal(detectCategory("Titan Men's Classic Analog Wrist Watch"), 'lifestyle');
	assert.equal(detectCategory('Safari hard-side trolley bag'), 'lifestyle');
	assert.equal(detectCategory('Nike running shoes for men'), 'lifestyle');
	assert.equal(detectCategory('Luxury eau de parfum'), 'lifestyle');
	assert.equal(detectCategory("Men's cotton T-shirt"), 'fashion');
});

test('prioritizes specific electronic accessories over broad product words', () => {
	assert.equal(detectCategory('Samsung Galaxy S24 phone case'), 'gadgets-accessories');
	assert.equal(detectCategory('Dell laptop bag'), 'gadgets-accessories');
	assert.equal(detectCategory('Apple smart watch'), 'gadgets-accessories');
	assert.equal(detectCategory('65W AC adapter'), 'gadgets-accessories');
});

test('classifies the remaining primary product categories', () => {
	assert.equal(detectCategory('ASUS TUF Gaming A15 laptop'), 'laptops');
	assert.equal(detectCategory('OnePlus 13R 5G'), 'mobile-phones');
	assert.equal(detectCategory('Daikin inverter split AC'), 'electronics-home');
});

test('does not use broad laptop brands or Best Deals as automatic categories', () => {
	assert.equal(detectCategory('MAC lipstick'), 'miscellaneous');
	assert.equal(detectCategory('Best Deals available today'), 'miscellaneous');
});
