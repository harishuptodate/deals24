import DealPriceObservation from '../models/DealPriceObservation';
import TelegramMessage from '../models/TelegramMessage';

export async function syncCurrentDealPrice(dealId: string) {
  const latestObservation = await DealPriceObservation.findOne({
    productId: dealId,
    price: { $ne: null },
  })
    .sort({ observedAt: -1 })
    .select({ price: 1 })
    .lean();

  return TelegramMessage.findByIdAndUpdate(
    dealId,
    { price: latestObservation?.price ? String(latestObservation.price) : null },
    { new: true },
  );
}

export async function getPriceHistory(dealId: string) {
  const deal = await TelegramMessage.findById(dealId)
    .select({ price: 1, date: 1, createdAt: 1, link: 1 })
    .lean();

  if (!deal) return null;

  const observations = await DealPriceObservation.find({
    productId: deal._id,
    price: { $ne: null },
  })
    .sort({ observedAt: 1 })
    .select({ observedAt: 1, price: 1, link: 1 })
    .lean();

  const points = observations.map((observation) => ({
    id: String(observation._id),
    observedAt: observation.observedAt.toISOString(),
    price: observation.price,
    link: observation.link || undefined,
  }));

  if (points.length === 0 && deal.price && Number(deal.price) > 0) {
    points.push({
      id: `legacy-${deal._id}`,
      observedAt: new Date(deal.date || deal.createdAt).toISOString(),
      price: Number(deal.price),
      link: deal.link || undefined,
    });
  }

  const prices = points.map((point) => point.price);
  const storedCurrentPrice = Number(deal.price) || null;
  const currentPrice = prices.at(-1) ?? storedCurrentPrice;
  const previousPrice = prices.at(-2) ?? null;
  const changePercent = currentPrice && previousPrice
    ? Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(1))
    : null;

  return {
    points,
    currentPrice,
    previousPrice,
    lowestPrice: prices.length > 0 ? Math.min(...prices) : currentPrice,
    highestPrice: prices.length > 0 ? Math.max(...prices) : currentPrice,
    changePercent,
  };
}

export async function updatePriceHistoryPoint(input: {
  dealId: string;
  observationId: string;
  price: number;
  observedAt: Date;
}) {
  const { dealId, observationId, price, observedAt } = input;
  let observation;

  if (observationId === `legacy-${dealId}`) {
    const dealExists = await TelegramMessage.exists({ _id: dealId });
    if (!dealExists) return null;
    observation = await DealPriceObservation.findOneAndUpdate(
      { sourceKey: `baseline:${dealId}` },
      {
        productId: dealId,
        sourceKey: `baseline:${dealId}`,
        observedAt,
        price,
        matchMethod: 'baseline',
        matchConfidence: 1,
      },
      { new: true, upsert: true },
    );
  } else {
    observation = await DealPriceObservation.findOneAndUpdate(
      { _id: observationId, productId: dealId },
      { price, observedAt },
      { new: true },
    );
  }

  if (!observation) return null;
  const deal = await syncCurrentDealPrice(dealId);
  return {
    observation,
    currentPrice: deal?.price ? Number(deal.price) : null,
  };
}

export async function deletePriceHistoryPoint(dealId: string, observationId: string) {
  if (observationId === `legacy-${dealId}`) {
    const dealExists = await TelegramMessage.exists({ _id: dealId });
    if (!dealExists) return null;
  } else {
    const observation = await DealPriceObservation.findOneAndDelete({
      _id: observationId,
      productId: dealId,
    });
    if (!observation) return null;
  }

  const deal = await syncCurrentDealPrice(dealId);
  return { currentPrice: deal?.price ? Number(deal.price) : null };
}
