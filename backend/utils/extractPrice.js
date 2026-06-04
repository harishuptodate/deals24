const DEAL_PRICE_PATTERNS = [
	/@\s*₹?\s*([\d,]+)/gi,
	/\bat\s*₹?\s*([\d,]+)/gi,
	/\bfor\s*₹?\s*([\d,]+)/gi,
	/deal\s*price\s*:?\s*₹?\s*([\d,]+)/gi,
];

/**
 * Normalize a captured price string into a valid number.
 * Commas are removed before conversion so values like "87,740" become 87740.
 *
 * Invalid, empty, zero, negative, or non-numeric values return null.
 *
 * @param {string} rawPrice
 * @returns {number|null}
 */
function normalizeExtractedPrice(rawPrice) {
	if (typeof rawPrice !== 'string') {
		return null;
	}

	const digitsOnly = rawPrice.replace(/,/g, '').trim();
	if (!digitsOnly) {
		return null;
	}

	const numericPrice = Number(digitsOnly);
	if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
		return null;
	}

	return numericPrice;
}

/**
 * Extract every explicitly written deal price from a Telegram message.
 *
 * Supported formats:
 * - "@1699"
 * - "@ ₹3,549"
 * - "at ₹87,740"
 * - "for ₹61,190"
 * - "Deal Price : ₹274"
 *
 * The function:
 * - scans the text with the supported patterns
 * - removes commas from matched prices
 * - converts valid matches to numbers
 * - deduplicates them while preserving first-seen order
 *
 * @param {string} text
 * @returns {number[]}
 */
function extractAllDealPrices(text) {
	if (typeof text !== 'string' || !text.trim()) {
		return [];
	}

	const matchedPrices = [];

	for (const pattern of DEAL_PRICE_PATTERNS) {
		pattern.lastIndex = 0;

		let match = pattern.exec(text);
		while (match) {
			matchedPrices.push({
				index: match.index,
				price: normalizeExtractedPrice(match[1]),
			});
			match = pattern.exec(text);
		}
	}

	matchedPrices.sort((left, right) => left.index - right.index);

	const extractedPrices = [];
	const seenPrices = new Set();

	for (const match of matchedPrices) {
		if (match.price !== null && !seenPrices.has(match.price)) {
			seenPrices.add(match.price);
			extractedPrices.push(match.price);
		}
	}

	return extractedPrices;
}

/**
 * Return the lowest valid explicitly written deal price from the message.
 *
 * This is intentionally a lightweight fallback extractor:
 * - no discount math
 * - no coupon math
 * - no cashback math
 * - no inferred/effective prices
 *
 * If no supported deal price pattern is found, an empty string is returned.
 *
 * @param {string} text
 * @returns {string}
 */
function extractPrice(text) {
	const extractedPrices = extractAllDealPrices(text);

	if (extractedPrices.length === 0) {
		return '';
	}

	return String(Math.min(...extractedPrices));
}

module.exports = {
	extractPrice,
	extractAllDealPrices,
};
