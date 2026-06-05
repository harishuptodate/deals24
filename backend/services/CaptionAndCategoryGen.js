require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { detectCategory } = require('./detectCategory');
const { buildCaptionPrompt } = require('./captionPrompt');
const { createLogger } = require('./logger');

const logger = createLogger('gemini-caption');

const AVAILABLE_CATEGORIES = [
	'laptops',
	'electronics-home',
	'mobile-phones',
	'gadgets-accessories',
	'fashion',
	'Best-Deals',
	'miscellaneous',
];

function isQuotaOrRateLimitError(error) {
	if (!error) return false;

	const errorMessage = error.message || '';

	if (
		error.status === 'RESOURCE_EXHAUSTED' ||
		error.code === 429 ||
		errorMessage.includes('RESOURCE_EXHAUSTED') ||
		errorMessage.includes('"code":429') ||
		errorMessage.toLowerCase().includes('quota exceeded') ||
		errorMessage.toLowerCase().includes('rate limit')
	) {
		return true;
	}

	// Some SDK errors wrap API payload in a string; detect quota/rate-limit from that payload too.
	try {
		const parsed = JSON.parse(errorMessage);
		const apiError = parsed && parsed.error ? parsed.error : parsed;
		const apiMessage = (
			apiError && apiError.message ? apiError.message : ''
		).toLowerCase();
		return (
			apiError?.status === 'RESOURCE_EXHAUSTED' ||
			apiError?.code === 429 ||
			apiMessage.includes('quota exceeded') ||
			apiMessage.includes('rate limit')
		);
	} catch (_parseError) {
		return false;
	}
}

function isTransientServiceError(error) {
	if (!error) return false;

	const errorMessage = error.message || '';
	const lowerMessage = errorMessage.toLowerCase();

	if (
		error.status === 'UNAVAILABLE' ||
		error.code === 503 ||
		lowerMessage.includes('"status":"unavailable"') ||
		lowerMessage.includes('"code":503') ||
		lowerMessage.includes('high demand') ||
		lowerMessage.includes('try again later')
	) {
		return true;
	}

	try {
		const parsed = JSON.parse(errorMessage);
		const apiError = parsed && parsed.error ? parsed.error : parsed;
		const apiMessage = (
			apiError && apiError.message ? apiError.message : ''
		).toLowerCase();
		return (
			apiError?.status === 'UNAVAILABLE' ||
			apiError?.code === 503 ||
			apiMessage.includes('high demand') ||
			apiMessage.includes('try again later')
		);
	} catch (_parseError) {
		return false;
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize message and generate caption using Gemini API
 * Also identifies the category of the product
 * @param {string} messageText - Raw message text to process
 * @returns {Promise<{normalizedMessage: string, category: string, price: string}>}
 */
async function GenerateCaptionAndCategory(messageText) {
	if (!messageText || typeof messageText !== 'string') {
		throw new Error('Message text is required and must be a string');
	}

	const primaryGeminiApiKey = process.env.GEMINI_API_KEY;
	const secondaryGeminiApiKey = process.env.GEMINI_API_KEY_2;
	const geminiApiKeys = [primaryGeminiApiKey, secondaryGeminiApiKey].filter(
		Boolean,
	);

	if (geminiApiKeys.length === 0) {
		logger.warn(
			'No Gemini API key found in environment variables. Falling back to basic processing.',
			{},
			{ event: 'gemini_missing_api_key' },
		);
		return {
			normalizedMessage: messageText.trim(),
			category: detectCategory(messageText),
			price: '',
			usedFallback: true,
		};
	}

	try {
		const prompt = buildCaptionPrompt(messageText);

		let response;
		let lastError;
		const maxAttempts = geminiApiKeys.length;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const keyIndex = attempt;
			const apiKey = geminiApiKeys[keyIndex];
			const ai = new GoogleGenAI({ apiKey });

			try {
				response = await ai.models.generateContent({
					model: 'gemini-2.5-flash',
					contents: prompt,
					generationConfig: {
						temperature: 0.3,
						topK: 40,
						topP: 0.95,
						maxOutputTokens: 1024,
					},
				});
				lastError = null;
				break;
			} catch (error) {
				lastError = error;
				const hasMoreAttempts = attempt < maxAttempts - 1;

				if (hasMoreAttempts && isQuotaOrRateLimitError(error)) {
					logger.warn(
						`Gemini quota/rate limit hit for key ${keyIndex + 1}. Rotating to next available key.`,
						{
							attempt: attempt + 1,
							keyIndex: keyIndex + 1,
						},
						{ event: 'gemini_rate_limit_retry' },
					);
					continue;
				}
				if (hasMoreAttempts && isTransientServiceError(error)) {
					logger.warn(
						`Gemini service temporarily unavailable for key ${keyIndex + 1}. Retrying once with the next key.`,
						{
							attempt: attempt + 1,
							keyIndex: keyIndex + 1,
							waitMs: 500,
						},
						{ event: 'gemini_transient_retry' },
					);
					await sleep(500);
					continue;
				}

				throw error;
			}
		}

		if (!response && lastError) {
			throw lastError;
		}

		// Extract the response text from Gemini API
		let responseText = response.text;

		// Parse JSON from response (remove markdown code blocks if present)
		let jsonText = responseText.trim();

		// Remove markdown code blocks
		if (jsonText.startsWith('```json')) {
			jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
		} else if (jsonText.startsWith('```')) {
			jsonText = jsonText.replace(/```\n?/g, '');
		}

		// Try to extract JSON if there's extra text before/after
		const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			jsonText = jsonMatch[0];
		}

		const result = JSON.parse(jsonText);

		// Validate category
		if (!AVAILABLE_CATEGORIES.includes(result.category)) {
			logger.warn(
				`Invalid category "${result.category}" returned by Gemini. Using fallback detection.`,
				{ invalidCategory: result.category },
				{ event: 'gemini_invalid_category' },
			);
			result.category = detectCategory(messageText);
		}

		// Ensure all required fields are present
		return {
			normalizedMessage: result.normalizedMessage || messageText.trim(),
			category: result.category || detectCategory(messageText),
			price:
				typeof result.price === 'string'
					? result.price.replace(/[^\d]/g, '')
					: '',
			usedFallback: false,
		};
	} catch (error) {
		logger.error(
			'Error calling Gemini API.',
			{ error: error.message },
			{ event: 'gemini_request_failed' },
		);

		// Fallback to basic processing
		return {
			normalizedMessage: messageText.trim(),
			category: detectCategory(messageText),
			price: '',
			usedFallback: true,
		};
	}
}

module.exports = {
	detectCategory,
	GenerateCaptionAndCategory,
};
