import 'dotenv/config';
import mongoose from 'mongoose';
import DealPriceObservation from '../models/DealPriceObservation';
import TelegramMessage from '../models/TelegramMessage';
import { extractAmazonAsin } from '../services/amazon/amazonLink';

async function migratePriceHistory() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15_000 });

  let migrated = 0;
  let observationsCreated = 0;
  const total = await TelegramMessage.countDocuments();
  console.log(`Connected to MongoDB. Migrating ${total} deals...`);
  const cursor = TelegramMessage.find({}).cursor();

  for await (const deal of cursor) {
    const observedAt = deal.date || deal.createdAt || new Date();
    const numericPrice = Number(deal.price);
    const asin = extractAmazonAsin(deal.link);

    if (Number.isFinite(numericPrice) && numericPrice > 0) {
      const observation = await DealPriceObservation.updateOne(
        { sourceKey: `baseline:${deal._id}` },
        {
          $setOnInsert: {
            productId: deal._id,
            sourceKey: `baseline:${deal._id}`,
            observedAt,
            price: numericPrice,
            link: deal.link || null,
            matchMethod: 'baseline',
            matchConfidence: 1,
          },
        },
        { upsert: true },
      );
      if (observation.upsertedCount > 0) observationsCreated += 1;
    }

    await TelegramMessage.collection.updateOne(
      { _id: deal._id },
      {
        $set: {
          firstSeenAt: deal.firstSeenAt || observedAt,
          lastSeenAt: deal.lastSeenAt || observedAt,
          ...(asin ? { amazonAsin: asin } : {}),
        },
        $unset: {
          amazonImageHash: '',
          previousPrice: '',
          lowestObservedPrice: '',
          highestObservedPrice: '',
          observationCount: '',
          matchMethod: '',
          matchConfidence: '',
        },
      },
    );
    migrated += 1;
    if (migrated % 100 === 0 || migrated === total) {
      console.log(`Processed ${migrated}/${total} deals`);
    }
  }

  const indexes = await TelegramMessage.collection.indexes();
  if (indexes.some((index) => index.name === 'messageId_1')) {
    await TelegramMessage.collection.dropIndex('messageId_1');
  }
  if (indexes.some((index) => index.name === 'amazonImageHash_1')) {
    await TelegramMessage.collection.dropIndex('amazonImageHash_1');
  }

  console.log(JSON.stringify({ migrated, observationsCreated }, null, 2));
}

migratePriceHistory()
  .catch((error) => {
    console.error('Price-history migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
