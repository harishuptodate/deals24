import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { issueAdminToken, verifyAdminCredentials } from '../services/adminAuth';
import { createLogger, fetchRecentLogs, logEmitter, queryLogs } from '../services/logger';
import { requireAdminAuth } from '../middleware/adminAuth';
import type { BlacklistEntryType } from '../models/BlacklistEntry';
import {
	addBlacklistEntry,
	listBlacklistEntries,
	normalizeBlacklistValue,
	removeBlacklistEntry,
} from '../services/blacklistService';

const router = express.Router();
const logger = createLogger('admin-api');

type AdminLoginRequest = Request<unknown, unknown, { username?: string; password?: string }>;
type AdminLogsRequest = Request<
	unknown,
	unknown,
	unknown,
	{
		levels?: string;
		service?: string;
		event?: string;
		search?: string;
		correlationId?: string;
		requestId?: string;
		before?: string;
		limit?: string;
		recent?: string;
	}
>;

type BlacklistRequest = Request<unknown, unknown, { type?: string; value?: string }>;

router.get('/blacklist', requireAdminAuth, async (_req: Request, res: Response) => {
	try {
		const entries = await listBlacklistEntries();
		return res.json({ success: true, entries });
	} catch (error) {
		logger.error('Failed to list blacklist entries', { error }, { event: 'blacklist_list_failed' });
		return res.status(500).json({ success: false, error: 'Failed to load blacklist.' });
	}
});

router.post('/blacklist', requireAdminAuth, async (req: BlacklistRequest, res: Response) => {
	const { type, value } = req.body || {};
	const normalizedValue = typeof value === 'string' ? normalizeBlacklistValue(value) : '';

	if ((type !== 'brand' && type !== 'product') || !normalizedValue || normalizedValue.length > 100) {
		return res.status(400).json({
			success: false,
			error: 'Type must be brand or product, and value must be 1-100 characters.',
		});
	}

	try {
		const entry = await addBlacklistEntry(type as BlacklistEntryType, value as string);
		logger.info('Blacklist entry added', { type, value: normalizedValue }, { event: 'blacklist_entry_added' });
		return res.status(201).json({ success: true, entry });
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
			return res.status(409).json({ success: false, error: 'That entry is already blacklisted.' });
		}
		logger.error('Failed to add blacklist entry', { error }, { event: 'blacklist_add_failed' });
		return res.status(500).json({ success: false, error: 'Failed to add blacklist entry.' });
	}
});

router.delete('/blacklist/:id', requireAdminAuth, async (req: Request<{ id: string }>, res: Response) => {
	if (!mongoose.isValidObjectId(req.params.id)) {
		return res.status(400).json({ success: false, error: 'Invalid blacklist entry ID.' });
	}

	try {
		const entry = await removeBlacklistEntry(req.params.id);
		if (!entry) {
			return res.status(404).json({ success: false, error: 'Blacklist entry not found.' });
		}
		logger.info('Blacklist entry removed', { id: req.params.id }, { event: 'blacklist_entry_removed' });
		return res.json({ success: true });
	} catch (error) {
		logger.error('Failed to remove blacklist entry', { error }, { event: 'blacklist_remove_failed' });
		return res.status(500).json({ success: false, error: 'Failed to remove blacklist entry.' });
	}
});

router.post('/auth/login', async (req: AdminLoginRequest, res: Response) => {
	const { username, password } = req.body || {};
	const verification = verifyAdminCredentials(username, password);

	if (!verification.ok) {
		const errorReason = 'reason' in verification ? verification.reason : 'Invalid credentials.';
		logger.warn('Admin login failed', { username }, { event: 'admin_login_failed' });
		return res.status(401).json({
			success: false,
			error: errorReason,
		});
	}

	const token = issueAdminToken(username);
	logger.info('Admin login succeeded', { username }, { event: 'admin_login_succeeded' });

	return res.json({
		success: true,
		token,
	});
});

router.get('/logs', requireAdminAuth, async (req: AdminLogsRequest, res: Response) => {
	try {
		const levels = req.query.levels
			? String(req.query.levels)
					.split(',')
					.map((level) => level.trim())
					.filter(Boolean)
			: [];

		const result = await queryLogs({
			levels,
			service: req.query.service ? String(req.query.service) : '',
			event: req.query.event ? String(req.query.event) : '',
			search: req.query.search ? String(req.query.search) : '',
			correlationId: req.query.correlationId
				? String(req.query.correlationId)
				: '',
			requestId: req.query.requestId ? String(req.query.requestId) : '',
			before: req.query.before ? String(req.query.before) : '',
			limit: req.query.limit ? Number(req.query.limit) : 50,
		});

		return res.json({
			success: true,
			...result,
		});
	} catch (error) {
		logger.error('Failed to query admin logs', { error }, { event: 'admin_logs_query_failed' });
		return res.status(500).json({
			success: false,
			error: 'Failed to query admin logs.',
		});
	}
});

router.get('/logs/stream', requireAdminAuth, async (req: AdminLogsRequest, res: Response) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders?.();

	const initialLimit = Math.min(Number(req.query.recent) || 25, 100);
	const recentLogs = await fetchRecentLogs(initialLimit);
	for (const logEntry of recentLogs) {
		res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
	}

	const onLog = (logEntry: unknown) => {
		res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
	};

	const keepAlive = setInterval(() => {
		res.write(': keep-alive\n\n');
	}, 15000);

	logEmitter.on('log', onLog);

	req.on('close', () => {
		clearInterval(keepAlive);
		logEmitter.off('log', onLog);
		res.end();
	});
});

export default router;
