import test from 'node:test';
import assert from 'node:assert/strict';
import {
	detectCategory,
	detectCategoryDecision,
	isSupportingCategoryDetection,
} from './detectCategory';

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

test('classifies home and office furniture under electronics-home', () => {
	const products = [
		'Ergonomic gaming chair',
		'Executive office chair',
		'Height adjustable standing desk',
		'Study table & vanity desk',
		'Wooden coffee table',
		'Leather boss chair',
	];

	for (const product of products) {
		assert.equal(detectCategory(product), 'electronics-home');
	}
});

test('does not use broad laptop brands or Best Deals as automatic categories', () => {
	assert.equal(detectCategory('MAC lipstick'), 'lifestyle');
	assert.equal(detectCategory('Best Deals available today'), 'miscellaneous');
});

test('handles ambiguous product words without assigning the wrong category', () => {
	assert.equal(
		detectCategory('Classmate Notebook Regular Notebook Single Line 172 Pages'),
		'miscellaneous',
	);
	assert.equal(
		detectCategory('Carbamide Forte Multivitamin Tablet For Men'),
		'miscellaneous',
	);
	assert.equal(detectCategory('Huggies Wonder Pants XL'), 'miscellaneous');
	assert.equal(
		detectCategory('MILTON Lunch Box with Insulated Fabric Jacket'),
		'electronics-home',
	);
	assert.equal(
		detectCategory('Home Centre Helios Fabric Recliner'),
		'electronics-home',
	);
});

test('routes common miscellaneous aliases into the existing six categories', () => {
	assert.equal(detectCategory('Redmi Buds 5 Truly Wireless Ear Buds'), 'gadgets-accessories');
	assert.equal(detectCategory('OnePlus Pad Go Wi-Fi 8GB'), 'gadgets-accessories');
	assert.equal(detectCategory('OnePlus Nord 5 8GB RAM'), 'mobile-phones');
	assert.equal(detectCategory('boAt Aavante Bluetooth Sound Bar'), 'gadgets-accessories');
	assert.equal(detectCategory('HRX Trackpants for Men'), 'fashion');
	assert.equal(detectCategory('Pack of Men Polo Shirts'), 'fashion');
	assert.equal(detectCategory('Havells Beard Trimmer'), 'lifestyle');
	assert.equal(detectCategory('20kg Home Gym Set'), 'lifestyle');
	assert.equal(detectCategory('Non-Stick Cookware Set'), 'electronics-home');
});

test('keeps non-product promotional messages miscellaneous', () => {
	assert.equal(
		detectCategory('Open IndusInd Zero Balance Account and enter your mobile number'),
		'miscellaneous',
	);
	assert.equal(
		detectCategory('Apply for a lifetime free IndusInd credit card'),
		'miscellaneous',
	);
	assert.equal(
		detectCategory('Get one month Amazon Prime membership free'),
		'miscellaneous',
	);
	assert.equal(
		detectCategory('Samsung Smart TV @ 25000 with HDFC credit card discount'),
		'electronics-home',
	);
});

test('prioritizes the main product over specifications, brands and bundles', () => {
	assert.deepEqual(detectCategoryDecision('ASUS laptop with 1TB SSD'), {
		category: 'laptops',
		confidence: 'high',
		matchedBy: 'laptop',
	});
	assert.equal(detectCategory('Redmi 55-inch Smart TV'), 'electronics-home');
	assert.equal(detectCategory('Gaming laptop bundled with a wireless mouse'), 'laptops');
	assert.equal(detectCategory('Samsung 1TB SSD'), 'gadgets-accessories');
	assert.equal(detectCategory('Protective laptop bag'), 'gadgets-accessories');
});

test('reports weak brand-only matches without auto-classifying them', () => {
	assert.deepEqual(detectCategoryDecision('Latest Redmi deal'), {
		category: 'mobile-phones',
		confidence: 'medium',
		matchedBy: 'redmi',
	});
	assert.equal(detectCategory('Latest Redmi deal'), 'miscellaneous');
});

test('identifies supporting-only matches for migration safety', () => {
	const detection = detectCategoryDecision('MSI Modern 14 16GB/512GB NVMe SSD');
	assert.deepEqual(detection, {
		category: 'gadgets-accessories',
		confidence: 'high',
		matchedBy: 'ssd',
	});
	assert.equal(isSupportingCategoryDetection(detection), true);
});

test('handles conflict cases found in the live migration preview', () => {
	assert.equal(detectCategory('Samsung 25W Type-C Mobile Charger'), 'gadgets-accessories');
	assert.equal(detectCategory('AI Auto Tracking Tripod Phone Holder'), 'gadgets-accessories');
	assert.equal(detectCategory('Redmi Watch 5 Active Bluetooth Calling'), 'gadgets-accessories');
	assert.equal(detectCategory('Amazon Fire TV Stick HD'), 'gadgets-accessories');
	assert.equal(detectCategory('Razer RGB All-In-One Liquid Cooler'), 'gadgets-accessories');
	assert.equal(detectCategory('HP Pavilion USB-C to HDMI Adapter'), 'gadgets-accessories');
	assert.equal(
		detectCategory('DJI Osmo Mobile Gimbal Stabilizer for iPhone'),
		'gadgets-accessories',
	);
	assert.equal(detectCategory('USB Type-C 65W Laptop Charger'), 'gadgets-accessories');
	assert.equal(detectCategory('ZEBRONICS Laptop Stand with Fans'), 'gadgets-accessories');
	assert.equal(
		detectCategory('Bluetooth Keyboard & Mouse Combo for Laptop'),
		'gadgets-accessories',
	);
	assert.equal(detectCategory('Rechargeable Car Vacuum Cleaner'), 'gadgets-accessories');
	assert.equal(
		detectCategory('CMF by Nothing Watch Pro with Bluetooth Calling'),
		'gadgets-accessories',
	);
	assert.equal(
		detectCategory('Portable Vacuum Cleaner for Car Use'),
		'gadgets-accessories',
	);
	assert.equal(
		detectCategory('Wireless Ergonomic Mouse for PC Mac Laptop'),
		'gadgets-accessories',
	);
	assert.equal(detectCategory('Cimoni Laptop Bags'), 'gadgets-accessories');
	assert.equal(detectCategory('70W Laptop Powerbank'), 'gadgets-accessories');
	assert.equal(
		detectCategory('AI-Powered Gimbal for Smartphone'),
		'gadgets-accessories',
	);
	assert.equal(
		detectCategory('Wireless CarPlay Adapter for iPhone'),
		'gadgets-accessories',
	);
	assert.equal(
		detectCategory('Wireless Keyboard compatible with Smartphone'),
		'gadgets-accessories',
	);
	assert.equal(
		detectCategory('Wireless Mechanical Gaming Keyboard for laptop'),
		'gadgets-accessories',
	);
	assert.equal(
		detectCategory('240GB SATA III SSD Upgrade Kit for MacBook Pro'),
		'gadgets-accessories',
	);
	assert.equal(
		detectCategory('Apple 20W USB-C Power Adapter for iPhone'),
		'gadgets-accessories',
	);
	assert.equal(
		detectCategory('Open IndusInd Zero Balance Acc. and enter your mobile number'),
		'miscellaneous',
	);
});
