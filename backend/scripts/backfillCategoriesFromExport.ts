import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import TelegramMessage from '../models/TelegramMessage';
import { detectCategoryDecision } from '../services/detectCategory';

type ExportedMessage = {
	_id?: { $oid?: string } | string;
	messageId?: string;
	text?: string;
	category?: string;
};

const applyChanges = process.argv.includes('--apply');
const fileArgument = process.argv.find((argument) => !argument.startsWith('--') && argument !== process.argv[0] && argument !== process.argv[1]);
const exportPath = path.resolve(fileArgument || '../deals.telegrammessages-category-fault.json');

async function run() {
	if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');

	const exportedMessages = JSON.parse(fs.readFileSync(exportPath, 'utf8')) as ExportedMessage[];
	const exportedById = new Map(exportedMessages.flatMap((message) => {
		const id = typeof message._id === 'string' ? message._id : message._id?.$oid;
		if (!id || !mongoose.isValidObjectId(id) || !message.text || message.category !== 'miscellaneous') {
			return [];
		}
		return [[id, message.text] as const];
	}));
	const exportedIds = [...exportedById.keys()];

	await mongoose.connect(process.env.MONGODB_URI);

	const storedMessages = await TelegramMessage.find({
		_id: { $in: exportedIds },
		category: 'miscellaneous',
	})
		.select({ _id: 1, text: 1, category: 1 })
		.lean();

	const plannedUpdates = storedMessages.flatMap((message) => {
		const exportedText = exportedById.get(String(message._id));
		if (message.text !== exportedText) return [];

		const detection = detectCategoryDecision(message.text);
		if (detection.confidence !== 'high' || detection.category === 'miscellaneous') return [];

		return [{
			id: message._id,
			text: message.text,
			category: detection.category,
			matchedBy: detection.matchedBy,
		}];
	});

	const categoryCounts = plannedUpdates.reduce<Record<string, number>>((counts, update) => {
		counts[update.category] = (counts[update.category] || 0) + 1;
		return counts;
	}, {});

	console.log(JSON.stringify({
		mode: applyChanges ? 'apply' : 'dry-run',
		exportRecords: exportedMessages.length,
		validExportIds: exportedIds.length,
		miscellaneousRecordsFound: storedMessages.length,
		plannedUpdates: plannedUpdates.length,
		categoryCounts,
	}, null, 2));

	if (!applyChanges || plannedUpdates.length === 0) return;

	const result = await TelegramMessage.bulkWrite(plannedUpdates.map((update) => ({
		updateOne: {
			filter: { _id: update.id, text: update.text, category: 'miscellaneous' },
			update: { $set: { category: update.category } },
		},
	})));

	console.log(JSON.stringify({
		matchedCount: result.matchedCount,
		modifiedCount: result.modifiedCount,
	}, null, 2));
}

run()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.disconnect();
	});
