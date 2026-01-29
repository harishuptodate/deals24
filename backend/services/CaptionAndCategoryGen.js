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
			category: detectCategory(messageText),
		};
	}

	try {
		const prompt = `You are a product deal message processor. Analyze the following product deal message and understand the intent properly from the below instructions and examples and perform these tasks:

1. Normalize the message: Remove ALL promotional noise, unnecessary text, and keep ONLY essential product information. Specifically:

REMOVE these types of promotional text:
- Promotional words/phrases: "mahaa looot🚀", "loot🚀", "mahaa", "looot", "Lowest⚡️", "FLAT X OFF", "Sale Ends Today", "[Back]", etc.
- Promotional emojis: 🚀, 🔥, 🤩, ⚡️, etc. (keep only essential ones like 🔗 for links)
- Promotional phrases: "check review in our channel", "highly recommended", "its full hd tv" (when redundant), "Very Premium Brand", etc.
- Hashtags: #Deals24, #AnyHashtag, etc.
- Redundant promotional text that doesn't add product value

KEEP these:
- Product name and specifications (model, size, features, etc.)
- Price information (₹X,XXX format)
- Product links (Amazon URLs, etc.)
- Essential deal information (discounts, coupon codes, bank offers)
- Essential emojis for structure (🔗 for links, ❌ for regular price, 💡 for offers)

Do not touch or remove the links. Keep the message clean and professional. Do not add any other text or formatting.

Few examples:
Example 1:
Message:
"Looot🚀🚀ZEBRONICS Juke Bar 700 5.1 Dolby Audio @ ₹8,999

🔗https://fkrt.site/BfxXuEU

❌Regular price @ ₹15,999

💡Flat ₹1,000 off with HDFC CC"

Normalized message:
"ZEBRONICS Juke Bar 700 5.1 Dolby Audio @ ₹8,999

🔗https://fkrt.site/BfxXuEU

❌Regular price @ ₹15,999

💡Flat ₹1,000 off with HDFC CC"

Example 2:
Message:
"Flast 10K off🔥Mahaa laptop loot @ 53K

ASUS TUF Gaming A15, AMD Ryzen 7 7435HS Gaming Laptop(NVIDIA RTX 3050-4GB/60W TGP/16GB RAM/512GB

🔗https://www.amazon.in/dp/B0D5DFR78J/ref=cm_sw_r_as_gl_api_gl_i_dl_5N6TRF3366E5QGKNYRXB?linkCode=ml1&linkId=32ba368a4ce329e7c99e34aed8bdfec0&tag=harishch-21"

Normalized message:
"ASUS TUF Gaming A15, AMD Ryzen 7 7435HS Gaming Laptop(NVIDIA RTX 3050-4GB/60W TGP/16GB RAM/512GB @ 53K

🔗https://www.amazon.in/dp/B0D5DFR78J/ref=cm_sw_r_as_gl_api_gl_i_dl_5N6TRF3366E5QGKNYRXB?linkCode=ml1&linkId=32ba368a4ce329e7c99e34aed8bdfec0&tag=harishch-21"

Example 3:
Message:
"[Back] FLAT 13K OFF 🤩Mahaa Side by Side Refrigerator Loot🔥

Lowest⚡️Haier 602 L, 3 Star, Expert Inverter, Frost Free Side by Side Refrigerator @ ₹50,240

🔗www.amazon.in

❌ Regular price @ ₹62,990

💡 Apply ₹2000 Off Coupon + Flat ₹9,750 Off With SBI/ICICI Cc"

Normalized message:
"Haier 602 L, 3 Star, Expert Inverter, Frost Free Side by Side Refrigerator @ ₹50,240

🔗https://www.amazon.in/dp/B0B8ZMLRH4?th=1&linkCode=sl1&linkId=9cfcffe1bb058c61d34512f82b9b77d8&language=en_IN&ref_=as_li_ss_tl&tag=harishch-21

❌ Regular price @ ₹62,990

💡 Apply ₹2000 Off Coupon + Flat ₹9,750 Off With SBI/ICICI CC"

Example 4:
Message:
"[‼️Sale Ends Today] 

Mahaa AC Looot🚀🚀40K AC @ 34K 🤩 

Daikin 1.5 Ton 3 Star Inverter Split AC

🔗https://amzn.to/4jRElqG

💡 Flat ₹3,250 Off With HDFC Cc

✅ Daikin Very Premium Brand"

Normalized message:
"Daikin 1.5 Ton 3 Star Inverter Split AC @ 34K

🔗https://amzn.to/4jRElqG

💡 Flat ₹3,250 Off With HDFC CC"

2. Identify the category: Based on the product described, classify it into ONE of these exact categories:
   - laptops
   - electronics-home
   - mobile-phones
   - gadgets-accessories
   - fashion
   - miscellaneous

Return your response in the following JSON format (no markdown, just valid JSON):
{
	"normalizedMessage": "the normalized message",
  "category": "one of the category slugs above"
}

Message to process:
${messageText}`;

		const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
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
			category: result.category || detectCategory(messageText),
		};
	} catch (error) {
		console.error('Error calling Gemini API:', error.message);

		// Fallback to basic processing
		return {
			normalizedMessage: messageText.trim(),
			category: detectCategory(messageText),
		};
	}
}

module.exports = {
	detectCategory,
	normalizeMessageAndGenerateCaption,
};
