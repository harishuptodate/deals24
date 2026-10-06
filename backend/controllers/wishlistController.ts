import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import TelegramMessage from '../models/TelegramMessage';
import WishlistItem from '../models/WishlistItem';
import { getAuthenticatedUser } from '../services/userAuthService';

async function requireUser(req: Request, res: Response) {
  const user = await getAuthenticatedUser(req);
  if (!user) res.status(401).json({ error: 'Sign in to manage your wishlist' });
  return user;
}

function serializeWishlistItem(item: any) {
  const deal = item.dealId;
  if (!deal || typeof deal !== 'object') return null;
  return {
    id: String(deal._id),
    title: String(deal.text || 'Deal').split('\n')[0],
    description: String(deal.text || ''),
    link: deal.link || '',
    timestamp: item.createdAt,
    createdAt: deal.date || deal.createdAt,
    category: deal.category || undefined,
    imageUrl: deal.imageUrl || undefined,
    telegramFileId: deal.telegramFileId || undefined,
  };
}

async function listForUser(userId: mongoose.Types.ObjectId) {
  const items = await WishlistItem.find({ userId })
    .sort({ createdAt: -1 })
    .populate('dealId', 'text link date createdAt category imageUrl telegramFileId')
    .lean();
  return items.map(serializeWishlistItem).filter(Boolean);
}

export async function listWishlist(req: Request, res: Response) {
  const user = await requireUser(req, res);
  if (!user) return;
  return res.json(await listForUser(user._id));
}

export async function addWishlistItem(req: Request, res: Response) {
  const user = await requireUser(req, res);
  if (!user) return;
  const dealId = req.body.dealId;
  if (!mongoose.isValidObjectId(dealId)) return res.status(400).json({ error: 'A valid deal is required' });
  if (!await TelegramMessage.exists({ _id: dealId })) return res.status(404).json({ error: 'Deal not found' });

  await WishlistItem.updateOne(
    { userId: user._id, dealId },
    { $setOnInsert: { userId: user._id, dealId } },
    { upsert: true },
  );
  return res.status(201).json((await listForUser(user._id)).find((item: any) => item.id === dealId));
}

export async function importWishlist(req: Request, res: Response) {
  const user = await requireUser(req, res);
  if (!user) return;
  const requestedIds = Array.isArray(req.body.dealIds) ? req.body.dealIds : [];
  const validIds = [...new Set(requestedIds
    .filter((id): id is string => typeof id === 'string' && mongoose.isValidObjectId(id)))]
    .slice(0, 500);
  if (validIds.length) {
    const existingDeals = await TelegramMessage.find({ _id: { $in: validIds } }).select({ _id: 1 }).lean();
    if (existingDeals.length) {
      await WishlistItem.bulkWrite(existingDeals.map((deal) => ({
        updateOne: {
          filter: { userId: user._id, dealId: deal._id },
          update: { $setOnInsert: { userId: user._id, dealId: deal._id } },
          upsert: true,
        },
      })), { ordered: false });
    }
  }
  return res.json(await listForUser(user._id));
}

export async function removeWishlistItem(req: Request, res: Response) {
  const user = await requireUser(req, res);
  if (!user) return;
  const result = await WishlistItem.deleteOne({ userId: user._id, dealId: req.params.dealId });
  if (!result.deletedCount) return res.status(404).json({ error: 'Wishlist item not found' });
  return res.status(204).send();
}

export async function clearWishlist(req: Request, res: Response) {
  const user = await requireUser(req, res);
  if (!user) return;
  await WishlistItem.deleteMany({ userId: user._id });
  return res.status(204).send();
}
