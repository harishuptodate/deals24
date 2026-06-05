const { EventEmitter } = require('events');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { getLogContext, runWithLogContext, updateLogContext } = require('./runtime');

const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(0);

const originalConsole = {
	log: console.log.bind(console),
	info: console.info.bind(console),
	warn: console.warn.bind(console),
	error: console.error.bind(console),
};

const LEVEL_PRIORITY = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

const REDACTED_KEYS = new Set([
	'authorization',
	'cookie',
	'password',
	'token',
	'secret',
	'apiKey',
	'api_key',
	'accessToken',
	'refreshToken',
]);

const RECENT_LOGS_KEY = 'admin:logs:recent';
const RECENT_LOGS_TTL_SECONDS = 60 * 60 * 24;
const RECENT_LOGS_LIMIT = Number(process.env.ADMIN_LOG_RECENT_LIMIT || 300);
const PERSIST_LEVEL = process.env.ADMIN_LOG_PERSIST_LEVEL || 'warn';
const STREAM_LEVEL = process.env.ADMIN_LOG_STREAM_LEVEL || 'info';
const MESSAGE_MAX_LENGTH = Number(process.env.ADMIN_LOG_MESSAGE_MAX_LENGTH || 2000);

let loggerInstalled = false;
let redisClient = null;

function tryGetRedisClient() {
	if (redisClient) {
		return redisClient;
	}

	try {
		const { redis } = require('../redisClient');
		redisClient = redis;
		return redisClient;
	} catch (_error) {
		return null;
	}
}

function shouldEmitLevel(level, minimumLevel) {
	return (LEVEL_PRIORITY[level] || 0) >= (LEVEL_PRIORITY[minimumLevel] || 0);
}

function getRetentionMs(level) {
	switch (level) {
		case 'error':
			return 1000 * 60 * 60 * 24 * 30;
		case 'warn':
			return 1000 * 60 * 60 * 24 * 14;
		case 'info':
			return 1000 * 60 * 60 * 24 * 7;
		default:
			return 1000 * 60 * 60 * 24;
	}
}

function truncateString(value, maxLength = MESSAGE_MAX_LENGTH) {
	if (typeof value !== 'string') {
		return value;
	}

	return value.length > maxLength
		? `${value.slice(0, maxLength)}…[truncated]`
		: value;
}

function redactValue(value, depth = 0) {
	if (value === null || value === undefined) {
		return value;
	}

	if (depth > 4) {
		return '[MaxDepth]';
	}

	if (typeof value === 'string') {
		return truncateString(value);
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (value instanceof Error) {
		return {
			name: value.name,
			message: truncateString(value.message),
			stack: truncateString(value.stack || '', 4000),
		};
	}

	if (Array.isArray(value)) {
		return value.slice(0, 20).map((item) => redactValue(item, depth + 1));
	}

	if (typeof value === 'object') {
		const sanitized = {};
		for (const [key, nestedValue] of Object.entries(value)) {
			sanitized[key] = REDACTED_KEYS.has(key)
				? '[REDACTED]'
				: redactValue(nestedValue, depth + 1);
		}
		return sanitized;
	}

	return truncateString(String(value));
}

function stringifyArgument(value) {
	if (typeof value === 'string') {
		return truncateString(value);
	}

	if (value instanceof Error) {
		return value.message;
	}

	try {
		return truncateString(JSON.stringify(redactValue(value)));
	} catch (_error) {
		return truncateString(String(value));
	}
}

function normalizeArgs(args) {
	if (!args || args.length === 0) {
		return { message: '', context: {} };
	}

	const context = {};
	const messageParts = [];

	for (const arg of args) {
		if (arg instanceof Error) {
			messageParts.push(arg.message);
			context.error = redactValue(arg);
			continue;
		}

		if (typeof arg === 'object' && arg !== null) {
			Object.assign(context, redactValue(arg));
			messageParts.push(stringifyArgument(arg));
			continue;
		}

		messageParts.push(stringifyArgument(arg));
	}

	return {
		message: truncateString(messageParts.join(' ')),
		context,
	};
}

function createEvent(level, payload) {
	const logContext = getLogContext();
	const timestamp = new Date();

	return {
		id: randomUUID(),
		timestamp,
		level,
		service: payload.service || logContext.service || 'app',
		event: payload.event || null,
		message: truncateString(payload.message || ''),
		requestId: payload.requestId || logContext.requestId || null,
		correlationId: payload.correlationId || logContext.correlationId || null,
		context: redactValue({
			...(logContext.context || {}),
			...(payload.context || {}),
		}),
		expiresAt: new Date(timestamp.getTime() + getRetentionMs(level)),
	};
}

async function persistRecentLog(event) {
	const redis = tryGetRedisClient();
	if (!redis) {
		return;
	}

	const payload = JSON.stringify({
		...event,
		timestamp: event.timestamp.toISOString(),
		expiresAt: event.expiresAt.toISOString(),
	});

	try {
		await redis.lpush(RECENT_LOGS_KEY, payload);
		await redis.ltrim(RECENT_LOGS_KEY, 0, RECENT_LOGS_LIMIT - 1);
		await redis.expire(RECENT_LOGS_KEY, RECENT_LOGS_TTL_SECONDS);
	} catch (error) {
		originalConsole.error('Failed to persist recent admin log:', error.message);
	}
}

async function persistLogHistory(event) {
	if (!shouldEmitLevel(event.level, PERSIST_LEVEL)) {
		return;
	}

	if (mongoose.connection.readyState !== 1) {
		return;
	}

	try {
		const AdminLog = require('../../models/AdminLog');
		await AdminLog.create(event);
	} catch (error) {
		originalConsole.error('Failed to persist admin log history:', error.message);
	}
}

function publishEvent(event) {
	if (shouldEmitLevel(event.level, STREAM_LEVEL)) {
		logEmitter.emit('log', event);
	}

	void persistRecentLog(event);
	void persistLogHistory(event);
}

function writeLog(level, payload) {
	const event = createEvent(level, payload);
	publishEvent(event);
	return event;
}

function createLogger(service, baseContext = {}) {
	return {
		debug(message, context = {}, meta = {}) {
			return writeLog('debug', {
				service,
				message,
				context: { ...baseContext, ...context },
				...meta,
			});
		},
		info(message, context = {}, meta = {}) {
			return writeLog('info', {
				service,
				message,
				context: { ...baseContext, ...context },
				...meta,
			});
		},
		warn(message, context = {}, meta = {}) {
			return writeLog('warn', {
				service,
				message,
				context: { ...baseContext, ...context },
				...meta,
			});
		},
		error(message, context = {}, meta = {}) {
			return writeLog('error', {
				service,
				message,
				context: { ...baseContext, ...context },
				...meta,
			});
		},
		child(childContext = {}) {
			return createLogger(service, {
				...baseContext,
				...childContext,
			});
		},
	};
}

function installConsoleLogger() {
	if (loggerInstalled) {
		return;
	}

	loggerInstalled = true;

	for (const [method, level] of Object.entries({
		log: 'info',
		info: 'info',
		warn: 'warn',
		error: 'error',
	})) {
		console[method] = (...args) => {
			originalConsole[method](...args);
			const normalized = normalizeArgs(args);
			writeLog(level, normalized);
		};
	}
}

async function fetchRecentLogs(limit = 50) {
	const redis = tryGetRedisClient();
	if (!redis) {
		return [];
	}

	try {
		const recentLogs = await redis.lrange(RECENT_LOGS_KEY, 0, Math.max(limit - 1, 0));
		return recentLogs
			.map((entry) => {
				try {
					return JSON.parse(entry);
				} catch (_error) {
					return null;
				}
			})
			.filter(Boolean)
			.reverse();
	} catch (error) {
		originalConsole.error('Failed to fetch recent admin logs:', error.message);
		return [];
	}
}

async function queryLogs(filters = {}) {
	const AdminLog = require('../../models/AdminLog');
	const limit = Math.min(Number(filters.limit) || 50, 200);
	const query = {};

	if (filters.levels && filters.levels.length > 0) {
		query.level = { $in: filters.levels };
	}

	if (filters.service) {
		query.service = filters.service;
	}

	if (filters.event) {
		query.event = filters.event;
	}

	if (filters.correlationId) {
		query.correlationId = filters.correlationId;
	}

	if (filters.requestId) {
		query.requestId = filters.requestId;
	}

	if (filters.before) {
		const beforeDate = new Date(filters.before);
		if (!Number.isNaN(beforeDate.getTime())) {
			query.timestamp = { $lt: beforeDate };
		}
	}

	if (filters.search) {
		query.$or = [
			{ message: { $regex: filters.search, $options: 'i' } },
			{ event: { $regex: filters.search, $options: 'i' } },
			{ service: { $regex: filters.search, $options: 'i' } },
		];
	}

	const logs = await AdminLog.find(query)
		.sort({ timestamp: -1, _id: -1 })
		.limit(limit + 1)
		.lean();

	const hasMore = logs.length > limit;
	const slicedLogs = hasMore ? logs.slice(0, limit) : logs;
	const nextBefore = hasMore ? slicedLogs[slicedLogs.length - 1].timestamp : null;

	return {
		logs: slicedLogs,
		hasMore,
		nextBefore,
	};
}

module.exports = {
	createLogger,
	fetchRecentLogs,
	getLogContext,
	installConsoleLogger,
	logEmitter,
	queryLogs,
	runWithLogContext,
	updateLogContext,
	writeLog,
};
