type DealPricePattern = {
	pattern: RegExp;
	supportsThousandsSuffix?: boolean;
};

const DEAL_PRICE_PATTERNS: DealPricePattern[] = [
	{
		pattern: /@\s*₹?\s*([\d,]+)([ \t]*[kK]\b)?(?![\d,]|[ \t]*[kK]\b)/g,
		supportsThousandsSuffix: true,
	},
	{
		pattern: /\bat\s*₹?\s*([\d,]+)([ \t]*[kK]\b)?(?![\d,]|[ \t]*[kK]\b)/gi,
		supportsThousandsSuffix: true,
	},
	{ pattern: /\bfor\s*₹?\s*([\d,]+)(?![\d,]|[ \t]*[kK]\b)/gi },
	{
		pattern:
			/\bdeal(?:\s+price)?[^\p{L}\p{N}\r\n]*₹?\s*([\d,]+)(?![\d,]|[ \t]*[kK]\b)/giu,
	},
];

const hasRegularPriceContext = (text: string, matchIndex: number): boolean => {
	const prefix = text.slice(Math.max(0, matchIndex - 40), matchIndex);
	return /\b(?:mrp|reg(?:ular)?(?:\s+price)?)\s*[:\-]?\s*$/i.test(prefix);
};

/**
 * Normalize a captured price string into a valid number.
 * Commas are removed before conversion so values like "87,740" become 87740.
 *
 * Invalid, empty, zero, negative, or non-numeric values return null.
 *
 * @param {string} rawPrice
 * @returns {number|null}
 */
function normalizeExtractedPrice(
	rawPrice: string,
	isThousands: boolean,
): number | null {
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

	return isThousands ? numericPrice * 1000 : numericPrice;
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
 * - "Deal ➡️ 75"
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
export function extractAllDealPrices(text: string): number[] {
	if (typeof text !== 'string' || !text.trim()) {
		return [];
	}

	const matchedPrices: Array<{ index: number; price: number | null }> = [];

	for (const { pattern, supportsThousandsSuffix } of DEAL_PRICE_PATTERNS) {
		pattern.lastIndex = 0;

		let match = pattern.exec(text);
		while (match) {
			if (!hasRegularPriceContext(text, match.index)) {
				matchedPrices.push({
					index: match.index,
					price: normalizeExtractedPrice(
						match[1],
						Boolean(supportsThousandsSuffix && match[2]),
					),
				});
			}
			match = pattern.exec(text);
		}
	}

	matchedPrices.sort((left, right) => left.index - right.index);

	const extractedPrices: number[] = [];
	const seenPrices = new Set<number>();

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
export function extractPrice(text: string): string {
	const extractedPrices = extractAllDealPrices(text);

	if (extractedPrices.length === 0) {
		return '';
	}

	return String(Math.min(...extractedPrices));
}
