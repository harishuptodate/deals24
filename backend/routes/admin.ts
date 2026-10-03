import express, { type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { issueAdminToken, verifyAdminCredentials } from '../services/adminAuth';
import { createLogger, fetchRecentLogs, logEmitter, queryLogs } from '../services/logger';
import { requireAdminAuth } from '../middleware/adminAuth';
import type { BlacklistEntryType } from '../models/BlacklistEntry';
import type { BlacklistRuleAction } from '../models/BlacklistRule';
import {
	addBlacklistEntry,
	listBlacklistEntries,
	listBlacklistRules,
	normalizeBlacklistValue,
	removeBlacklistEntry,
	removeBlacklistRule,
	upsertBlacklistRule,
} from '../services/blacklistService';
import { saveMessage } from '../services/telegramService';

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
type BlacklistRuleRequest = Request<
	unknown,
	unknown,
	{ brand?: string; product?: string; action?: string }
>;
type PostDealRequest = Request<unknown, unknown, { message?: string }>;

router.post('/deals', requireAdminAuth, async (req: PostDealRequest, res: Response) => {
	const messageText = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
	if (!messageText || messageText.length > 10_000) {
		return res.status(400).json({
			success: false,
			error: 'Deal message must be between 1 and 10,000 characters.',
		});
	}

	try {
		const deal = await saveMessage({
			message_id: `admin-${randomUUID()}`,
			chat: { id: 'admin-frontend' },
			date: Math.floor(Date.now() / 1000),
			text: messageText,
		});

		if (!deal) {
			return res.status(422).json({
				success: false,
				error: 'The message was rejected by the deal ingestion filters.',
			});
		}

		logger.info(
			'Admin deal message processed',
			{ dealId: String(deal._id) },
			{ event: 'admin_deal_posted' },
		);
		return res.status(201).json({ success: true, deal });
	} catch (error) {
		logger.error('Failed to process admin deal message', { error }, { event: 'admin_deal_post_failed' });
		return res.status(500).json({ success: false, error: 'Failed to process deal message.' });
	}
});

router.get('/blacklist', requireAdminAuth, async (_req: Request, res: Response) => {
	try {
		const [entries, rules] = await Promise.all([
			listBlacklistEntries(),
			listBlacklistRules(),
		]);
		return res.json({ success: true, entries, rules });
	} catch (error) {
		logger.error('Failed to list blacklist entries', { error }, { event: 'blacklist_list_failed' });
		return res.status(500).json({ success: false, error: 'Failed to load blacklist.' });
	}
});

router.post('/blacklist/rules', requireAdminAuth, async (req: BlacklistRuleRequest, res: Response) => {
	const { brand, product, action } = req.body || {};
	const normalizedBrand = typeof brand === 'string' ? normalizeBlacklistValue(brand) : '';
	const normalizedProduct = typeof product === 'string' ? normalizeBlacklistValue(product) : '';

	if (
		(action !== 'allow' && action !== 'block')
		|| !normalizedBrand
		|| !normalizedProduct
		|| normalizedBrand.length > 100
		|| normalizedProduct.length > 100
	) {
		return res.status(400).json({
			success: false,
			error: 'Brand and product must be 1-100 characters, and action must be allow or block.',
		});
	}

	try {
		const rule = await upsertBlacklistRule(
			brand as string,
			product as string,
			action as BlacklistRuleAction,
		);
		logger.info(
			'Brand-product rule saved',
			{ brand: normalizedBrand, product: normalizedProduct, action },
			{ event: 'blacklist_rule_saved' },
		);
		return res.json({ success: true, rule });
	} catch (error) {
		logger.error('Failed to save blacklist rule', { error }, { event: 'blacklist_rule_save_failed' });
		return res.status(500).json({ success: false, error: 'Failed to save brand-product rule.' });
	}
});

router.delete('/blacklist/rules/:id', requireAdminAuth, async (req: Request<{ id: string }>, res: Response) => {
	if (!mongoose.isValidObjectId(req.params.id)) {
		return res.status(400).json({ success: false, error: 'Invalid rule ID.' });
	}

	try {
		const rule = await removeBlacklistRule(req.params.id);
		if (!rule) {
			return res.status(404).json({ success: false, error: 'Rule not found.' });
		}
		logger.info('Brand-product rule removed', { id: req.params.id }, { event: 'blacklist_rule_removed' });
		return res.json({ success: true });
	} catch (error) {
		logger.error('Failed to remove blacklist rule', { error }, { event: 'blacklist_rule_remove_failed' });
		return res.status(500).json({ success: false, error: 'Failed to remove brand-product rule.' });
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
