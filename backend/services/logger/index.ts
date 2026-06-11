import { EventEmitter } from 'node:events';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import AdminLog from '../../models/AdminLog';
import { redis } from '../redisClient';
import { getLogContext, runWithLogContext, updateLogContext } from './runtime';

const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(0);

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContextData = Record<string, unknown>;

type LoggerPayload = {
	service?: string;
	event?: string | null;
	message?: string;
	requestId?: string | null;
	correlationId?: string | null;
	context?: LogContextData;
	mirrorToConsole?: boolean;
};

type LogEvent = {
	logId: string;
	timestamp: Date;
	level: LogLevel;
	service: string;
	event: string | null;
	message: string;
	requestId: string | null;
	correlationId: string | null;
	context: unknown;
	expiresAt: Date;
};

type LogFilters = {
	search?: string;
	levels?: string[];
	service?: string;
	event?: string;
	correlationId?: string;
	requestId?: string;
	before?: string | Date;
	limit?: number | string;
};

type LogEntryRecord = Record<string, unknown> & {
	logId?: string;
	id?: string;
	_id?: { toString?: () => string };
	timestamp?: string | Date;
	level?: string;
	message?: string;
	service?: string;
	event?: string;
	correlationId?: string;
	requestId?: string;
};

type LogQuery = Record<string, unknown> & {
	level?: { $in: string[] };
	service?: string;
	event?: string;
	correlationId?: string;
	requestId?: string;
	timestamp?: { $lt: Date };
	$or?: Array<Record<string, unknown>>;
};

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
let redisClient: typeof redis | null = null;

function tryGetRedisClient() {
	if (redisClient) {
		return redisClient;
	}

	try {
		redisClient = redis;
		return redisClient;
	} catch (_error) {
		return null;
	}
}

function shouldEmitLevel(level: string, minimumLevel: string) {
	return (LEVEL_PRIORITY[level] || 0) >= (LEVEL_PRIORITY[minimumLevel] || 0);
}

function getRetentionMs(level: string) {
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

function truncateString(value: unknown, maxLength = MESSAGE_MAX_LENGTH) {
	if (typeof value !== 'string') {
		return value;
	}

	return value.length > maxLength
		? `${value.slice(0, maxLength)}…[truncated]`
		: value;
}

function redactValue(value: unknown, depth = 0): unknown {
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
		const sanitized: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value)) {
			sanitized[key] = REDACTED_KEYS.has(key)
				? '[REDACTED]'
				: redactValue(nestedValue, depth + 1);
		}
		return sanitized;
	}

	return truncateString(String(value));
}

function stringifyArgument(value: unknown): string {
	if (typeof value === 'string') {
		return String(truncateString(value));
	}

	if (value instanceof Error) {
		return value.message;
	}

	try {
		return String(truncateString(JSON.stringify(redactValue(value))));
	} catch (_error) {
		return String(truncateString(String(value)));
	}
}

function normalizeArgs(args: unknown[]) {
	if (!args || args.length === 0) {
		return { message: '', context: {} };
	}

	const context: LogContextData = {};
	const messageParts: string[] = [];

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
		message: String(truncateString(messageParts.join(' '))),
		context,
	};
}

function createEvent(level: LogLevel, payload: LoggerPayload): LogEvent {
	const logContext = getLogContext();
	const timestamp = new Date();

	return {
		logId: randomUUID(),
		timestamp,
		level,
		service: String(payload.service || logContext.service || 'app'),
		event: payload.event || null,
		message: String(truncateString(payload.message || '')),
		requestId: payload.requestId ? String(payload.requestId) : logContext.requestId ? String(logContext.requestId) : null,
		correlationId: payload.correlationId ? String(payload.correlationId) : logContext.correlationId ? String(logContext.correlationId) : null,
		context: redactValue({
			...((logContext.context as Record<string, unknown>) || {}),
			...((payload.context as Record<string, unknown>) || {}),
		}),
		expiresAt: new Date(timestamp.getTime() + getRetentionMs(level)),
	};
}

function normalizeComparableTimestamp(timestamp: unknown) {
	const parsedTimestamp =
		timestamp instanceof Date
			? timestamp.getTime()
			: new Date(typeof timestamp === 'string' || typeof timestamp === 'number' ? timestamp : 0).getTime();
	return Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0;
}

function shouldSkipAdminLog(event: LogEvent) {
	const message = (event.message || '').toLowerCase();

	if (event.service === 'amazon-image') {
		return !['amazon_image_fetch_succeeded', 'amazon_image_fetch_failed'].includes(
			event.event,
		);
	}

	if (
		event.event === 'gemini_rate_limit_retry' ||
		event.event === 'gemini_transient_retry'
	) {
		return true;
	}

	if (
		message.includes('serving image from redis cache') ||
		message.includes('retrying in') ||
		message.includes('rate limiting: waiting') ||
		message.includes('redis cache')
	) {
		return true;
	}

	return false;
}

async function persistRecentLog(event: LogEvent) {
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
		originalConsole.error('Failed to persist recent admin log:', error instanceof Error ? error.message : error);
	}
}

async function persistLogHistory(event: LogEvent) {
	if (!shouldEmitLevel(event.level, PERSIST_LEVEL)) {
		return;
	}

	if (mongoose.connection.readyState !== 1) {
		return;
	}

	try {
		await AdminLog.create({
			logId: event.logId,
			timestamp: event.timestamp,
			level: event.level,
			service: event.service,
			event: event.event,
			message: event.message,
			requestId: event.requestId,
			correlationId: event.correlationId,
			context: event.context,
			expiresAt: event.expiresAt,
		});
	} catch (error) {
		originalConsole.error('Failed to persist admin log history:', error instanceof Error ? error.message : error);
	}
}

function publishEvent(event: LogEvent) {
	if (shouldSkipAdminLog(event)) {
		return;
	}

	if (shouldEmitLevel(event.level, STREAM_LEVEL)) {
		logEmitter.emit('log', event);
	}

	void persistRecentLog(event);
	void persistLogHistory(event);
}

function writeLog(level: LogLevel, payload: LoggerPayload) {
	if (payload.mirrorToConsole) {
		const consoleMethod = level === 'debug' ? 'log' : level;
		originalConsole[consoleMethod](payload.message, payload.context || {});
	}

	const event = createEvent(level, payload);
	publishEvent(event);
	return event;
}

function createLogger(service: string, baseContext: Record<string, unknown> = {}) {
	return {
		debug(message: string, context: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) {
			return writeLog('debug', {
				service,
				message,
				context: { ...baseContext, ...context },
				mirrorToConsole: true,
				...meta,
			});
		},
		info(message: string, context: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) {
			return writeLog('info', {
				service,
				message,
				context: { ...baseContext, ...context },
				mirrorToConsole: true,
				...meta,
			});
		},
		warn(message: string, context: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) {
			return writeLog('warn', {
				service,
				message,
				context: { ...baseContext, ...context },
				mirrorToConsole: true,
				...meta,
			});
		},
		error(message: string, context: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) {
			return writeLog('error', {
				service,
				message,
				context: { ...baseContext, ...context },
				mirrorToConsole: true,
				...meta,
			});
		},
		child(childContext: Record<string, unknown> = {}) {
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
	} as const)) {
		console[method as 'log' | 'info' | 'warn' | 'error'] = (...args: unknown[]) => {
			originalConsole[method](...args);
			const normalized = normalizeArgs(args);
			writeLog(level as LogLevel, normalized);
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
		originalConsole.error('Failed to fetch recent admin logs:', error instanceof Error ? error.message : error);
		return [];
	}
}

function filterLogEntries(entries: Record<string, unknown>[], filters: LogFilters = {}) {
	const searchTerm = String(filters.search || '').trim().toLowerCase();
	const requestedLevels = Array.isArray(filters.levels) ? filters.levels : [];
	const requestedService = String(filters.service || '').trim();
	const requestedEvent = String(filters.event || '').trim();
	const requestedCorrelationId = String(filters.correlationId || '').trim();
	const requestedRequestId = String(filters.requestId || '').trim();
	const beforeTimestamp = filters.before
		? normalizeComparableTimestamp(filters.before)
		: null;

	return entries.filter((entry) => {
		if (requestedLevels.length > 0 && !requestedLevels.includes(String(entry.level || ''))) {
			return false;
		}

		if (requestedService && entry.service !== requestedService) {
			return false;
		}

		if (requestedEvent && entry.event !== requestedEvent) {
			return false;
		}

		if (requestedCorrelationId && entry.correlationId !== requestedCorrelationId) {
			return false;
		}

		if (requestedRequestId && entry.requestId !== requestedRequestId) {
			return false;
		}

		if (
			beforeTimestamp &&
			normalizeComparableTimestamp(entry.timestamp) >= beforeTimestamp
		) {
			return false;
		}

		if (searchTerm) {
			const haystack = `${entry.message || ''} ${entry.event || ''} ${entry.service || ''}`.toLowerCase();
			if (!haystack.includes(searchTerm)) {
				return false;
			}
		}

		return true;
	});
}

function dedupeLogs(entries: LogEntryRecord[]) {
	const seen = new Set();
	return entries.filter((entry) => {
		const key =
			entry.logId ||
			entry.id ||
			entry._id?.toString?.() ||
			`${entry.timestamp}-${entry.level}-${entry.message}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

async function queryLogs(filters: LogFilters = {}) {
	const limit = Math.min(Number(filters.limit) || 50, 200);
	const query: LogQuery = {};

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

	if (filters.before) {
		const hasMore = logs.length > limit;
		const slicedLogs = hasMore ? logs.slice(0, limit) : logs;
		const nextBefore = hasMore ? slicedLogs[slicedLogs.length - 1].timestamp : null;

		return {
			logs: slicedLogs,
			hasMore,
			nextBefore,
		};
	}

	const recentLogs = await fetchRecentLogs(Math.min(limit * 3, RECENT_LOGS_LIMIT));
	const filteredRecentLogs = filterLogEntries(recentLogs, filters);
	const mergedLogs = dedupeLogs([...filteredRecentLogs, ...logs]).sort((left, right) => {
		return normalizeComparableTimestamp(right.timestamp) - normalizeComparableTimestamp(left.timestamp);
	});
	const hasMore = mergedLogs.length > limit || logs.length > limit;
	const slicedLogs = mergedLogs.slice(0, limit);
	const nextBefore = slicedLogs.length > 0 ? slicedLogs[slicedLogs.length - 1].timestamp : null;

	return {
		logs: slicedLogs,
		hasMore,
		nextBefore,
	};
}

export {
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
