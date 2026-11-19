import type { AdminLogEntry } from '../../src/services/api/adminApi';

export const originalUrl = `https://www.amazon.in/s?k=french-connection-watch&tracking=${'a'.repeat(120)}`;
export const telegramFileId = `AgACAgQAAyEFAASP${'x'.repeat(100)}DPQQ`;
export const imageError = 'Could not find a valid product ASIN in the Amazon link';
const record = (index: number, message: string, context = {}, extra = {}): AdminLogEntry => ({
  logId: `screenshot-${index}`, timestamp: `2026-11-19T16:00:${index < 7 ? '49' : '53'}.000Z`,
  service: 'telegram-ingest', level: 'info', message,
  context: { telegramMessageId: 25734, source: 'webhook', ...context }, ...extra,
});
export const screenshotLogs: AdminLogEntry[] = [
  record(0, `Received webhook update: ${JSON.stringify(`Upto 70% Off On French Connection Watches\n\n\u{1F517} ${originalUrl}`)}`),
  record(1, 'Amazon image fetch failed.', { amazonUrl: originalUrl, error: imageError }, { level: 'error', service: 'amazon-image', event: 'amazon_image_fetch_failed' }),
  record(2, `Extracted Telegram file ID: ${telegramFileId}`),
  record(3, 'Message contains Telegram photo, extracting file ID'),
  record(4, 'Falling back to Telegram image'),
  record(5, `Failed to fetch Amazon image: ${imageError}`),
  record(6, 'Enriching deal in one combined Gemini operation', { reasons: ['normalize-caption', 'extract-price', 'enrich-identity'], candidateCount: 10, sourceKey: '-1002404809832:25734' }, { service: 'deal-enrichment', event: 'gemini_deal_enrichment' }),
  record(7, 'Gemini price missing. Fallback extracted price:'),
  record(8, 'Successfully generated caption and category using Gemini API'),
  record(9, `Saving new message with category: lifestyle and image data: ${JSON.stringify({ imageUrl: null, telegramFileId })}`, { imageUrl: null, telegramFileId }),
  record(10, `Message saved successfully: Upto 70% Off On French Connection Watches ${originalUrl}`),
];

