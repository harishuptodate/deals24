import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import DealAlert from '../models/DealAlert';
import TelegramMessage from '../models/TelegramMessage';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validOwnerToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 20 && value.length <= 200;
}

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((keyword): keyword is string => typeof keyword === 'string')
    .map((keyword) => keyword.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter((keyword) => keyword.length >= 2 && keyword.length <= 80))]
    .slice(0, 10)
    .sort();
}

function parseTargetPrice(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100000000) return undefined;
  return Math.round(parsed);
}

export async function createAlert(req: Request, res: Response) {
  const { ownerToken, email, type, dealId } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const targetPrice = parseTargetPrice(req.body.targetPrice);
  const keywords = normalizeKeywords(req.body.keywords);

  if (!validOwnerToken(ownerToken)) return res.status(400).json({ error: 'Invalid browser token' });
  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (targetPrice === undefined) return res.status(400).json({ error: 'Enter a valid target price' });
  if (type !== 'deal' && type !== 'keyword') return res.status(400).json({ error: 'Invalid alert type' });
  if (type === 'keyword' && keywords.length === 0) {
    return res.status(400).json({ error: 'Add at least one keyword' });
  }
  if (type === 'deal' && !mongoose.isValidObjectId(dealId)) {
    return res.status(400).json({ error: 'A valid deal is required' });
  }

  let dealTitle: string | null = null;
  if (type === 'deal') {
    const deal = await TelegramMessage.findById(dealId).select({ text: 1 }).lean();
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    dealTitle = String(deal.text || 'Saved deal').split('\n')[0].slice(0, 160);
  }

  const duplicateQuery = type === 'deal'
    ? { ownerToken, email: normalizedEmail, type, dealId }
    : { ownerToken, email: normalizedEmail, type, keywords };
  const existing = await DealAlert.findOne(duplicateQuery);
  if (existing) {
    existing.active = true;
    existing.targetPrice = targetPrice;
    await existing.save();
    return res.json(existing);
  }

  const alert = await DealAlert.create({
    ownerToken,
    email: normalizedEmail,
    type,
    dealId: type === 'deal' ? dealId : null,
    dealTitle,
    keywords: type === 'keyword' ? keywords : [],
    targetPrice,
    active: true,
    unsubscribeToken: randomBytes(24).toString('hex'),
  });
  return res.status(201).json(alert);
}

export async function listAlerts(req: Request, res: Response) {
  const ownerToken = req.get('x-alert-owner-token');
  if (!validOwnerToken(ownerToken)) return res.status(400).json({ error: 'Invalid browser token' });
  const alerts = await DealAlert.find({ ownerToken }).sort({ createdAt: -1 }).lean();
  return res.json(alerts);
}

export async function updateAlert(req: Request, res: Response) {
  const { ownerToken } = req.body;
  if (!validOwnerToken(ownerToken)) return res.status(400).json({ error: 'Invalid browser token' });
  const update: { active?: boolean; targetPrice?: number | null } = {};
  if (typeof req.body.active === 'boolean') update.active = req.body.active;
  if ('targetPrice' in req.body) {
    const targetPrice = parseTargetPrice(req.body.targetPrice);
    if (targetPrice === undefined) return res.status(400).json({ error: 'Enter a valid target price' });
    update.targetPrice = targetPrice;
  }
  if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No changes supplied' });

  const alert = await DealAlert.findOneAndUpdate(
    { _id: req.params.id, ownerToken },
    update,
    { new: true },
  );
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  return res.json(alert);
}

export async function deleteAlert(req: Request, res: Response) {
  const ownerToken = req.get('x-alert-owner-token');
  if (!validOwnerToken(ownerToken)) return res.status(400).json({ error: 'Invalid browser token' });
  const result = await DealAlert.deleteOne({ _id: req.params.id, ownerToken });
  if (!result.deletedCount) return res.status(404).json({ error: 'Alert not found' });
  return res.status(204).send();
}

export async function unsubscribeAlert(req: Request, res: Response) {
  const alert = await DealAlert.findOneAndUpdate(
    { unsubscribeToken: req.params.token },
    { active: false },
    { new: true },
  );
  const message = alert
    ? 'This Deals24 alert has been turned off.'
    : 'This alert link is no longer valid.';
  return res.type('html').send(`<!doctype html><html><body style="font-family:Arial,sans-serif;text-align:center;padding:64px 20px;background:#fafafa;color:#18181b"><h1>${message}</h1><p>You can manage your alerts from the Deals24 wishlist.</p><a href="${process.env.PUBLIC_APP_URL || 'https://deals24.vercel.app'}/wishlist">Return to Deals24</a></body></html>`);
}
