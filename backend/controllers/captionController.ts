import type { Request, Response } from 'express';
import { GenerateCaptionAndCategory } from '../services/CaptionAndCategoryGen';

type CaptionGenerationRequest = Request<unknown, unknown, { message?: string }>;

/**
 * Endpoint for Gemini API message normalization and caption generation
 * POST /api/caption/
 * Body: { message: "your message text here" }
 */
export async function CaptionGeneration(req: CaptionGenerationRequest, res: Response) {
	try {
		// Basic Authentication
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Basic ')) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required',
			});
		}

		// Decode Basic Auth credentials
		const base64Credentials = authHeader.split(' ')[1];
		const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
		const [username, password] = credentials.split(':');

		// Validate credentials against environment variables
		const validUsername = process.env.CAPTION_API_USERNAME;
		const validPassword = process.env.CAPTION_API_PASSWORD;

		if (!validUsername || !validPassword) {
			console.error('CAPTION_API_USERNAME or CAPTION_API_PASSWORD not set in environment variables');
			return res.status(500).json({
				success: false,
				error: 'Server configuration error',
			});
		}

		if (username !== validUsername || password !== validPassword) {
			return res.status(401).json({
				success: false,
				error: 'Invalid credentials',
			});
		}

		const { message } = req.body;

		if (!message || typeof message !== 'string') {
			return res.status(400).json({
				success: false,
				error: 'Message is required and must be a string',
			});
		}

		// Call the Gemini API function
		const result = await GenerateCaptionAndCategory(message);

		return res.status(200).json({
			success: true,
			data: {
				normalizedMessage: result.normalizedMessage,
				category: result.category,
				price: result.price,
			},
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Internal server error';
		console.error('Error in CaptionGeneration:', error);
		return res.status(500).json({
			success: false,
			error: errorMessage,
		});
	}
}
