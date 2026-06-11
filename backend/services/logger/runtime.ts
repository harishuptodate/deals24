import { AsyncLocalStorage } from 'node:async_hooks';

type LogContext = Record<string, unknown>;

const logContextStorage = new AsyncLocalStorage<LogContext>();

function getLogContext(): LogContext {
	return logContextStorage.getStore() || {};
}

function runWithLogContext<T>(context: LogContext, callback: () => T): T {
	const currentContext = getLogContext();
	return logContextStorage.run(
		{
			...currentContext,
			...context,
		},
		callback,
	);
}

function updateLogContext(partialContext: LogContext): LogContext {
	const currentContext = getLogContext();
	Object.assign(currentContext, partialContext);
	return currentContext;
}

module.exports = {
	getLogContext,
	runWithLogContext,
	updateLogContext,
};
