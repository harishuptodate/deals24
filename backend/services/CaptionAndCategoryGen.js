const axios = require('axios');
require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

const AVAILABLE_CATEGORIES = [
	'laptops',
	'electronics-home',
	'mobile-phones',
	'gadgets-accessories',
	'fashion',
	'Best-Deals',
	'miscellaneous',
];

/**
 * Detect category based on message content
 * @param {string} text - Message text
 * @returns {string|undefined} - Detected category or undefined
 */
function detectCategory(text) {
	const categories = {
		laptops: [
			'laptop',
			'notebook',
			'ultrabook',
			'macbook',
			'mac',
			'lenovo',
			'hp',
			'dell',
			'asus',
			'msi',
			'razer',
			'apple macbook',
			'chromebook',
			'gaming laptop',
			'surface',
			'surface laptop',
			'thinkpad',
			'ideapad',
			'legion',
			'vivobook',
			'zenbook',
			'spectre',
			'pavilion',
			'omen',
			'inspiron',
			'latitude',
			'rog',
			'tuf',
			'predator',
			'swift',
			'helios',
			'nitro',
			'blade',
			'stealth',
			'probook',
		],
		'electronics-home': [
			'washing machine',
			'tv',
			'television',
			'smart tv',
			'4k',
			'uhd',
			'led',
			'oled',
			'qled',
			'sofa',
			'refrigerator',
			'fridge',
			'air conditioner',
			'ac',
			'microwave',
			'oven',
			'toaster',
			'dishwasher',
			'water purifier',
			'home theatre',
			'home theater',
			'soundbar',
			'speaker',
			'audio',
			'geyser',
			'cooler',
			'vacuum cleaner',
			'vacuum',
			'iron',
			'induction cooktop',
			'blender',
			'mixer grinder',
			'juicer',
			'coffee maker',
			'rice cooker',
			'heater',
			'fan',
			'chimney',
			'deep freezer',
			'air fryer',
			'smart home',
			'alexa',
			'echo',
			'google home',
			'Mattress',
			'bed',
			'pillow',
		],
		'mobile-phones': [
			'iphone',
			'android',
			'smartphone',
			'mobile phone',
			'5g phone',
			'galaxy',
			'oppo',
			'vivo',
			'realme',
			'motorola',
			'nokia',
			'google pixel',
			'pixel',
			'sony xperia',
			'huawei',
			'asus rog phone',
			'infinix',
			'tecno',
			'honor',
			'iqoo',
			'poco',
			'foldable phone',
			'flip phone',
			'flagship phone',
			'budget phone',
			'mid-range phone',
			'flagship killer',
			'phone',
			'mobile',
			'tablet',
		],
		'gadgets-accessories': [
			'power bank',
			'tws',
			'earphones',
			'printer',
			'ipad',
			'smartwatch',
			'earphones',
			'airpods',
			'earbuds',
			'headphones',
			'bluetooth earphones',
			'neckband',
			'chargers',
			'fast charger',
			'usb charger',
			'wireless charger',
			'cable',
			'usb cable',
			'type-c cable',
			'lightning cable',
			'hdmi cable',
			'adapter',
			'moniter',
			'monitor',
			'memory card',
			'sd card',
			'pendrive',
			'usb drive',
			'hdd',
			'ssd',
			'laptop bag',
			'keyboard',
			'mouse',
			'gaming mouse',
			'mouse pad',
			'cooling pad',
			'phone case',
			'screen protector',
			'smartwatch',
			'fitness band',
			'vr headset',
			'gaming controller',
		],
		fashion: [
			'clothing',
			't-shirt',
			'tshirt',
			'shirt',
			'jeans',
			'trousers',
			'pants',
			'shorts',
			'skirt',
			'dress',
			'jacket',
			'blazer',
			'sweater',
			'hoodie',
			'coat',
			'suit',
			'ethnic wear',
			'kurta',
			'saree',
			'lehenga',
			'salwar',
			'leggings',
			'innerwear',
			'nightwear',
			'sportswear',
			'shoes',
			'sneakers',
			'heels',
			'sandals',
			'flip-flops',
			'boots',
			'formal shoes',
			'loafers',
			'running shoes',
			'belts',
			'wallets',
			'watches',
			'watch',
			'sunglasses',
			'jewelry',
			'rings',
			'necklace',
			'bracelet',
			'earrings',
			'bangles',
			'handbag',
			'clutch',
			'backpack',
			'hat',
			'cap',
			'socks',
			'underwear',
			'lingerie',
		],
		'Best-Deals': ['ThisThingShouldNotMatchWithAnything'],
	};

	const lowerText = text.toLowerCase();

	for (let category in categories) {
		for (let keyword of categories[category]) {
			const regex = new RegExp(`\\b${keyword}\\b`, 'i'); // Ensure proper boundary matching
			if (regex.test(lowerText)) {
				console.log(`Matched category: ${category} with keyword: ${keyword}`); // Log the matched category and keyword
				return category;
			}
		}
	}

	return 'miscellaneous'; // Return null if no category matches
}

/**
 * Normalize message and generate caption using Gemini API
 * Also identifies the category of the product
 * @param {string} messageText - Raw message text to process
 * @returns {Promise<{normalizedMessage: string, caption: string, category: string}>}
 */
async function normalizeMessageAndGenerateCaption(messageText) {
	if (!messageText || typeof messageText !== 'string') {
		throw new Error('Message text is required and must be a string');
	}

	const geminiApiKey = process.env.GEMINI_API_KEY;
	if (!geminiApiKey) {
		console.warn(
			'GEMINI_API_KEY not found in environment variables. Falling back to basic processing.',
		);
		return {
			normalizedMessage: messageText.trim(),
			caption: messageText.trim(),
			category: detectCategory(messageText),
		};
	}

	try {
		const prompt = `You are a product deal message processor. Analyze the following product deal message and perform these tasks:

1. Normalize the message: Remove unnecessary emojis, excessive punctuation, promotional noise, and normalize spacing. Keep important product information, prices, and key details.

2. Create a generalized caption: Generate a clean, professional product description caption (max 150 words) that highlights the product name, key features, and deal information. Make it suitable for display.

3. Identify the category: Based on the product described, classify it into ONE of these exact categories:
   - laptops
   - electronics-home
   - mobile-phones
   - gadgets-accessories
   - fashion
   - miscellaneous

Return your response in the following JSON format (no markdown, just valid JSON):
{
  "caption": "generalized product caption",
  "category": "one of the category slugs above"
}

Message to process:
${messageText}`;

		const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash-lite",
			contents: prompt,
			generationConfig: {
				temperature: 0.3,
				topK: 40,
				topP: 0.95,
				maxOutputTokens: 1024,
			},
		});

		// Extract the response text from Gemini API
		const responseText = response.text;

		const result = JSON.parse(responseText);

		// Validate category
		if (!AVAILABLE_CATEGORIES.includes(result.category)) {
			console.warn(
				`Invalid category "${result.category}" returned by Gemini. Using fallback detection.`,
			);
			result.category = detectCategory(messageText);
		}

		// Ensure all required fields are present
		return {
			normalizedMessage: result.normalizedMessage || messageText.trim(),
			caption: result.caption || messageText.trim(),
			category: result.category || detectCategory(messageText),
		};
	} catch (error) {
		console.error('Error calling Gemini API:', error.message);

		// Fallback to basic processing
		return {
			normalizedMessage: messageText.trim(),
			caption: messageText.trim(),
			category: detectCategory(messageText),
		};
	}
}

module.exports = {
	detectCategory,
	normalizeMessageAndGenerateCaption,
};
