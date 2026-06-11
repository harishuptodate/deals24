import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithLogContext } from '../services/logger';

type RequestContextRequest = Request & {
	requestId?: string;
	correlationId?: string;
};

export function attachRequestContext(req: RequestContextRequest, res: Response, next: NextFunction) {
	const requestIdHeader = req.headers['x-request-id'];
	const correlationIdHeader = req.headers['x-correlation-id'];
	const requestId = typeof requestIdHeader === 'string' ? requestIdHeader : randomUUID();
	const correlationId = typeof correlationIdHeader === 'string' ? correlationIdHeader : requestId;

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
		next,
	);
}
