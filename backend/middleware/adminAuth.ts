import type { NextFunction, Request, Response } from 'express';
import { verifyAdminToken } from '../services/adminAuth';

type AdminRequest = Request & {
	admin?: unknown;
};

export function requireAdminAuth(req: AdminRequest, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization || '';
	const [, bearerToken] = authHeader.split(' ');
	const token = bearerToken || req.query.token;

	const verification = verifyAdminToken(token);
	if (!verification.ok) {
		const errorReason = 'reason' in verification ? verification.reason : 'Unauthorized';
		return res.status(401).json({
			success: false,
			error: errorReason,
		});
	}

	req.admin = verification.payload;
	return next();
}
