const {
	normalizeMessageAndGenerateCaption,
} = require('../services/CaptionAndCategoryGen');

/**
 * Test endpoint for Gemini API message normalization and caption generation
 * POST /api/caption/test
 * Body: { message: "your message text here" }
 */
async function testCaptionGeneration(req, res) {
	try {
		const { message } = req.body;

		if (!message || typeof message !== 'string') {
			return res.status(400).json({
				success: false,
				error: 'Message is required and must be a string',
			});
		}

		// Call the Gemini API function
		const result = await normalizeMessageAndGenerateCaption(message);

		return res.status(200).json({
			success: true,
			data: {
				originalMessage: message,
				normalizedMessage: result.normalizedMessage,
				caption: result.caption,
				category: result.category,
			},
		});
	} catch (error) {
		console.error('Error in testCaptionGeneration:', error);
		return res.status(500).json({
			success: false,
			error: error.message || 'Internal server error',
		});
	}
}

module.exports = {
	testCaptionGeneration,
};
