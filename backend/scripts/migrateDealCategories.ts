import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import TelegramMessage from '../models/TelegramMessage';
import {
	detectCategoryDecision,
	isSupportingCategoryDetection,
} from '../services/detectCategory';

const BATCH_SIZE = 500;
const shouldApply = process.argv.includes('--apply');

type CategoryChange = {
	id: mongoose.Types.ObjectId;
	messageId: string;
	text: string;
	from: string;
	to: string;
	matchedBy: string;
};

const increment = (counts: Map<string, number>, key: string) => {
	counts.set(key, (counts.get(key) ?? 0) + 1);
};

async function clearCategoryCaches() {
	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) {
		console.log('REDIS_URL is not set; category caches will expire normally.');
		return;
	}

	const redis = new Redis(redisUrl);

	try {
		let deleted = 0;
		for (const pattern of ['categories:*', 'messages:*']) {
			let cursor = '0';
			do {
				const [nextCursor, keys] = await redis.scan(
					cursor,
					'MATCH',
					pattern,
					'COUNT',
					200,
				);
				cursor = nextCursor;
				if (keys.length > 0) {
					deleted += await redis.del(...keys);
				}
			} while (cursor !== '0');
		}
		console.log(`Cleared ${deleted} category/message cache key(s).`);
	} finally {
		await redis.quit();
	}
}

async function migrateDealCategories() {
	const mongoUri = process.env.MONGODB_URI;
	if (!mongoUri) {
		throw new Error('MONGODB_URI is required');
	}

	await mongoose.connect(mongoUri);

	const deals = await TelegramMessage.find({ category: { $ne: 'Best-Deals' } })
		.select({ messageId: 1, text: 1, category: 1 })
		.lean();

	const changes: CategoryChange[] = [];
	const transitionCounts = new Map<string, number>();
	let preservedUncertain = 0;

	for (const deal of deals) {
		const currentCategory = deal.category || 'miscellaneous';
		const detection = detectCategoryDecision(deal.text || '');

		if (detection.confidence !== 'high') {
			preservedUncertain += 1;
			continue;
		}

		if (
			currentCategory !== 'miscellaneous' &&
			currentCategory !== detection.category &&
			isSupportingCategoryDetection(detection)
		) {
			preservedUncertain += 1;
			continue;
		}

		// A high-confidence promotional guard may intentionally move a record to
		// miscellaneous. An ordinary no-match must never erase a useful category.
		if (
			detection.category === 'miscellaneous' &&
			detection.matchedBy !== 'promotional-only'
		) {
			preservedUncertain += 1;
			continue;
		}

		if (detection.category === currentCategory) {
			continue;
		}

		changes.push({
			id: deal._id,
			messageId: deal.messageId,
			text: deal.text,
			from: currentCategory,
			to: detection.category,
			matchedBy: detection.matchedBy || 'promotional-only',
		});
		increment(transitionCounts, `${currentCategory} -> ${detection.category}`);
	}

	console.log(`Scanned ${deals.length} non-Best-Deals record(s).`);
	console.log(`Proposed ${changes.length} category change(s).`);
	console.log(
		`Preserved ${preservedUncertain} categorization(s) where confidence was insufficient.`,
	);

	const sortedTransitions = [...transitionCounts].sort(
		(left, right) => right[1] - left[1],
	);

	for (const [transition, count] of sortedTransitions) {
		console.log(`- ${transition}: ${count}`);
	}

	for (const [transition] of sortedTransitions) {
		console.log(`Samples for ${transition}:`);
		for (const change of changes
			.filter((candidate) => `${candidate.from} -> ${candidate.to}` === transition)
			.slice(0, 3)) {
			console.log(
				`- ${change.messageId} (${change.matchedBy}) | ${change.text.replace(/\s+/g, ' ').slice(0, 120)}`,
			);
		}
	}

	if (!shouldApply) {
		console.log('Preview only. Run again with --apply to update the database.');
		return;
	}

	const backupDirectory = path.resolve(process.cwd(), 'backups');
	const backupPath = path.join(
		backupDirectory,
		`category-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
	);
	await mkdir(backupDirectory, { recursive: true });
	await writeFile(
		backupPath,
		JSON.stringify(
			changes.map(({ id, messageId, from, to, matchedBy }) => ({
				id,
				messageId,
				from,
				to,
				matchedBy,
			})),
			null,
			2,
		),
		'utf8',
	);
	console.log(`Saved rollback data to ${backupPath}.`);

	let modifiedCount = 0;
	for (let index = 0; index < changes.length; index += BATCH_SIZE) {
		const batch = changes.slice(index, index + BATCH_SIZE);
		const result = await TelegramMessage.bulkWrite(
			batch.map((change) => ({
				updateOne: {
					filter: {
						_id: change.id,
						...(change.from === 'miscellaneous'
							? { category: { $in: ['miscellaneous', null, ''] } }
							: { category: change.from }),
					},
					update: { $set: { category: change.to } },
				},
			})),
			{ ordered: false },
		);
		modifiedCount += result.modifiedCount;
	}

	console.log(`Updated ${modifiedCount} deal categorization(s).`);
	await clearCategoryCaches();
}

migrateDealCategories()
	.catch((error: unknown) => {
		console.error('Deal category migration failed:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.disconnect();
	});
