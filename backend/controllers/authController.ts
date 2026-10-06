import type { Request, Response } from 'express';
import DealAlert from '../models/DealAlert';
import {
  consumeMagicLoginToken,
  createMagicLoginToken,
  deleteCurrentSession,
  EMAIL_PATTERN,
  getAuthenticatedUser,
  normalizeEmail,
  validOwnerToken,
} from '../services/userAuthService';
import { sendMagicLoginEmail } from '../services/emailService';

export async function requestMagicLink(req: Request, res: Response) {
  const email = normalizeEmail(req.body.email);
  const ownerToken = validOwnerToken(req.body.ownerToken) ? req.body.ownerToken : null;
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const token = await createMagicLoginToken(email, ownerToken);
  if (token) {
    const appUrl = (process.env.PUBLIC_APP_URL || 'https://deals24.vercel.app').replace(/\/$/, '');
    await sendMagicLoginEmail({ email, loginUrl: `${appUrl}/auth/verify?token=${token}` });
  }

  return res.status(202).json({ message: 'If the address is valid, a sign-in link is on its way.' });
}

export async function verifyMagicLink(req: Request, res: Response) {
  const token = typeof req.body.token === 'string' ? req.body.token : '';
  const result = await consumeMagicLoginToken(token);
  if (!result) return res.status(400).json({ error: 'This sign-in link is invalid or has expired.' });

  if (result.ownerToken) {
    await DealAlert.updateMany({
      ownerToken: result.ownerToken,
      email: result.user.email,
      userId: null,
    }, { userId: result.user._id, ownerToken: null });
  }

  return res.json({
    sessionToken: result.sessionToken,
    expiresAt: result.expiresAt,
    user: { id: String(result.user._id), email: result.user.email },
  });
}

export async function currentUser(req: Request, res: Response) {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  return res.json({ id: String(user._id), email: user.email });
}

export async function logout(req: Request, res: Response) {
  await deleteCurrentSession(req);
  return res.status(204).send();
}
