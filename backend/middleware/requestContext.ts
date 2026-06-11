import { randomUUID } from 'node:crypto';
const { runWithLogContext } = require('../services/logger');

function attachRequestContext(req: any, res: any, next: any) {
	const requestId = req.headers['x-request-id'] || randomUUID();
	const correlationId = req.headers['x-correlation-id'] || requestId;

	req.requestId = requestId;
	req.correlationId = correlationId;
	res.setHeader('x-request-id', requestId);

	runWithLogContext(
		{
			service: 'api',
			requestId,
			correlationId,
			context: {
				method: req.method,
				path: req.originalUrl,
			},
		},
		() => next(),
	);
}

module.exports = {
	attachRequestContext,
};
