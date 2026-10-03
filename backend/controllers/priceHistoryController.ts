import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { invalidateDealCaches } from '../services/redisClient';
import {
  deletePriceHistoryPoint,
  getPriceHistory,
  updatePriceHistoryPoint,
} from '../services/priceHistoryService';

type MessageIdParams = { id: string };
type PriceObservationParams = MessageIdParams & { observationId: string };
type UpdatePriceObservationBody = { price?: number | string; observedAt?: string };

export async function getDealPriceHistory(req: Request<MessageIdParams>, res: Response) {
  try {
    const history = await getPriceHistory(req.params.id);
    if (!history) return res.status(404).json({ error: 'Message not found' });

    res.setHeader('Cache-Control', 'no-store');
    return res.json(history);
  } catch (error) {
    console.error('Error fetching price history:', error);
    return res.status(500).json({ error: 'Failed to fetch price history' });
  }
}

export async function updateDealPriceHistory(
  req: Request<PriceObservationParams, unknown, UpdatePriceObservationBody>,
  res: Response,
) {
  const { id, observationId } = req.params;
  const numericPrice = Number(req.body?.price);
  const observedAt = new Date(req.body?.observedAt || '');

  if (
    !mongoose.isValidObjectId(id)
    || (observationId !== `legacy-${id}` && !mongoose.isValidObjectId(observationId))
    || !Number.isFinite(numericPrice)
    || numericPrice <= 0
    || Number.isNaN(observedAt.getTime())
  ) {
    return res.status(400).json({ error: 'A valid price and observation date are required' });
  }

  try {
    const result = await updatePriceHistoryPoint({
      dealId: id,
      observationId,
      price: numericPrice,
      observedAt,
    });
    if (!result) return res.status(404).json({ error: 'Price history entry not found' });

    await invalidateDealCaches(id);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating price history:', error);
    return res.status(500).json({ error: 'Failed to update price history' });
  }
}

export async function deleteDealPriceHistory(
  req: Request<PriceObservationParams>,
  res: Response,
) {
  const { id, observationId } = req.params;
  if (
    !mongoose.isValidObjectId(id)
    || (observationId !== `legacy-${id}` && !mongoose.isValidObjectId(observationId))
  ) {
    return res.status(400).json({ error: 'Invalid price history ID' });
  }

  try {
    const result = await deletePriceHistoryPoint(id, observationId);
    if (!result) return res.status(404).json({ error: 'Price history entry not found' });

    await invalidateDealCaches(id);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting price history:', error);
    return res.status(500).json({ error: 'Failed to delete price history' });
  }
}
