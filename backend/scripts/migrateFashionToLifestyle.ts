import 'dotenv/config';
import mongoose from 'mongoose';
import TelegramMessage from '../models/TelegramMessage';

const SOURCE_CATEGORY = 'fashion';
const TARGET_CATEGORY = 'lifestyle';
const NON_WATCH_PRODUCT_PATTERN = /\b(?:shoes?|trolley\s+bags?|perfumes?)\b/i;
const WATCH_PATTERN = /\bwatches?\b/i;
const SMARTWATCH_PATTERN = /\b(?:smart\s*-?\s*watch(?:es)?|smartwatch(?:es)?)\b/i;
const shouldApply = process.argv.includes('--apply');

const migrationFilter = {
	category: SOURCE_CATEGORY,
	$or: [
		{ text: { $regex: NON_WATCH_PRODUCT_PATTERN } },
		{
			$and: [
				{ text: { $regex: WATCH_PATTERN } },
				{ text: { $not: SMARTWATCH_PATTERN } },
			],
		},
	],
};

async function migrateFashionDeals() {
	const mongoUri = process.env.MONGODB_URI;

	if (!mongoUri) {
		throw new Error('MONGODB_URI is required');
	}

	await mongoose.connect(mongoUri);

	const matchingDeals = await TelegramMessage.find(migrationFilter)
		.select({ messageId: 1, text: 1, category: 1 })
		.lean();

	console.log(
		`Found ${matchingDeals.length} fashion deal(s) to move to Lifestyle & Accessories.`,
	);

	for (const deal of matchingDeals.slice(0, 20)) {
		console.log(`- ${deal.messageId}: ${deal.text.replace(/\s+/g, ' ').slice(0, 120)}`);
	}

	if (matchingDeals.length > 20) {
		console.log(`...and ${matchingDeals.length - 20} more.`);
	}

	if (!shouldApply) {
		console.log('Preview only. Run again with --apply to update these deals.');
		return;
	}

	const result = await TelegramMessage.updateMany(migrationFilter, {
		$set: { category: TARGET_CATEGORY },
	});

	console.log(`Updated ${result.modifiedCount} deal(s) to category "${TARGET_CATEGORY}".`);
}

migrateFashionDeals()
	.catch((error: unknown) => {
		console.error('Fashion category migration failed:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.disconnect();
	});
