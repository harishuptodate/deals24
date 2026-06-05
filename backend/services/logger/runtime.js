const { AsyncLocalStorage } = require('async_hooks');

const logContextStorage = new AsyncLocalStorage();

function getLogContext() {
	return logContextStorage.getStore() || {};
}

function runWithLogContext(context, callback) {
	const currentContext = getLogContext();
	return logContextStorage.run(
		{
			...currentContext,
			...context,
		},
		callback,
	);
}

function updateLogContext(partialContext) {
	const currentContext = getLogContext();
	Object.assign(currentContext, partialContext);
	return currentContext;
}

module.exports = {
	getLogContext,
	runWithLogContext,
	updateLogContext,
};
