const express = require('express');
const { createLogger, fetchRecentLogs, logEmitter, queryLogs } = require('../services/logger');
const { issueAdminToken, verifyAdminCredentials } = require('../services/adminAuth');
const { requireAdminAuth } = require('../middleware/adminAuth');
export {};

const router = express.Router();
const logger = createLogger('admin-api');

router.post('/auth/login', async (req: any, res: any) => {
	const { username, password } = req.body || {};
	const verification = verifyAdminCredentials(username, password);

	if (!verification.ok) {
		logger.warn('Admin login failed', { username }, { event: 'admin_login_failed' });
		return res.status(401).json({
			success: false,
			error: verification.reason,
		});
	}

	const token = issueAdminToken(username);
	logger.info('Admin login succeeded', { username }, { event: 'admin_login_succeeded' });

	return res.json({
		success: true,
		token,
	});
});

router.get('/logs', requireAdminAuth, async (req: any, res: any) => {
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

router.get('/logs/stream', requireAdminAuth, async (req: any, res: any) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders?.();

	const initialLimit = Math.min(Number(req.query.recent) || 25, 100);
	const recentLogs = await fetchRecentLogs(initialLimit);
	for (const logEntry of recentLogs) {
		res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
	}

	const onLog = (logEntry: any) => {
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

module.exports = router;
