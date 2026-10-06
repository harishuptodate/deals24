import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import MagicLoginToken from '../models/MagicLoginToken';
import User from '../models/User';
import UserSession from '../models/UserSession';

const MAGIC_LINK_LIFETIME_MS = 15 * 60 * 1000;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validOwnerToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 20 && value.length <= 200;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function bearerToken(req: Request): string | null {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

export async function createMagicLoginToken(email: string, ownerToken?: string | null) {
  const recent = await MagicLoginToken.findOne({
    email,
    createdAt: { $gte: new Date(Date.now() - 60_000) },
  }).lean();
  if (recent) return null;

  const token = randomBytes(32).toString('hex');
  await MagicLoginToken.create({
    email,
    tokenHash: hashToken(token),
    ownerToken: validOwnerToken(ownerToken) ? ownerToken : null,
    expiresAt: new Date(Date.now() + MAGIC_LINK_LIFETIME_MS),
  });
  return token;
}

export async function consumeMagicLoginToken(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;

  const loginToken = await MagicLoginToken.findOneAndUpdate({
    tokenHash: hashToken(token),
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }, {
    consumedAt: new Date(),
  }, { new: true });
  if (!loginToken) return null;

  const user = await User.findOneAndUpdate(
    { email: loginToken.email },
    { $set: { emailVerifiedAt: new Date() }, $setOnInsert: { email: loginToken.email } },
    { new: true, upsert: true },
  );
  const sessionToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await UserSession.create({
    userId: user._id,
    tokenHash: hashToken(sessionToken),
    expiresAt,
    lastUsedAt: new Date(),
  });

  return { user, sessionToken, expiresAt, ownerToken: loginToken.ownerToken };
}

export async function getAuthenticatedUser(req: Request) {
  const token = bearerToken(req);
  if (!token) return null;

  const session = await UserSession.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  const user = await User.findById(session.userId);
  if (!user) return null;
  if (Date.now() - session.lastUsedAt.getTime() > 24 * 60 * 60 * 1000) {
    session.lastUsedAt = new Date();
    await session.save();
  }
  return user;
}

export async function deleteCurrentSession(req: Request): Promise<void> {
  const token = bearerToken(req);
  if (token) await UserSession.deleteOne({ tokenHash: hashToken(token) });
}
