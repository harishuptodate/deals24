import { test, expect } from '@playwright/test';
import { buildLogHistory } from '../../src/components/admin/adminLogHistory';
import { screenshotLogs, originalUrl, telegramFileId, imageError as error } from './logHistory.fixtures';
import type { AdminLogEntry } from '../../src/services/api/adminApi';
const record = (index: number, message: string, context = {}, extra = {}): AdminLogEntry => ({ logId: String(index), timestamp: new Date().toISOString(), service: 'telegram-ingest', level: 'info', message, context: { telegramMessageId: 25734, ...context }, ...extra });

test('reduces the screenshot sequence to six steps without modifying or losing raw events', () => {
  const raw = JSON.stringify(screenshotLogs);
  const steps = buildLogHistory(screenshotLogs);
  expect(steps).toHaveLength(6);
  expect(steps.flatMap((step) => step.originals)).toEqual(screenshotLogs);
  expect(JSON.stringify(screenshotLogs)).toBe(raw);
  expect(steps[1].entry.message).toBe(`Amazon image unavailable: ${error}. Used Telegram photo.`);
  expect(steps[1].entry.level).toBe('error');
  expect(steps[1].entry.context?.telegramFileId).toBe(telegramFileId);
  expect(steps[2].entry.context).toMatchObject({ candidateCount: 10, reasons: ['normalize-caption', 'extract-price', 'enrich-identity'] });
  expect(steps[3].entry.message).toContain('Gemini price missing');
  expect(steps[5].entry.message).toBe('Deal saved');
  expect(steps[5].entry.context?.category).toBe('lifestyle');
  const visible = JSON.stringify(steps.map((step) => step.entry));
  expect(visible.split(originalUrl)).toHaveLength(2);
  expect(visible.split(telegramFileId)).toHaveLength(2);
  expect(visible).not.toContain('sourceKey');
  expect(visible).not.toContain('"imageUrl":null');
});

test('keeps distinct failures and unfamiliar messages and does not claim a fallback succeeded prematurely', () => {
  const first = record(1, 'Amazon image fetch failed.', { error: 'Network timeout' }, { level: 'error' });
  const different = record(2, 'Failed to fetch Amazon image: Different error');
  const unknown = record(3, 'Unknown provider failure', { error: { message: 'Unique cause', stack: 'Full stack' } }, { level: 'error' });
  const steps = buildLogHistory([first, different, unknown]);
  expect(steps).toHaveLength(3);
  expect(steps[0].entry.message).not.toContain('Used Telegram photo');
  expect(steps[1].entry.message).toContain('Different error');
  expect(steps[2].entry.context?.error).toEqual(unknown.context?.error);
});

test('keeps changed URLs and file IDs and resets consolidation between unrelated events', () => {
  const records = [
    record(1, `Extracted Telegram file ID: ${telegramFileId}`),
    record(2, 'An unrelated step', { url: 'https://example.com/changed', telegramFileId: 'different-file' }),
    record(3, 'Falling back to Telegram image'),
  ];
  const steps = buildLogHistory(records);
  expect(steps).toHaveLength(3);
  expect(steps[1].entry.context).toMatchObject({ url: 'https://example.com/changed', telegramFileId: 'different-file' });
  expect(steps[2].entry.message).toBe('Falling back to Telegram image.');
});

test('does not consolidate image events from different ingestion sources', () => {
  const steps = buildLogHistory([
    record(1, 'Amazon image fetch failed.', { source: 'webhook', error: 'Timeout' }, { level: 'error' }),
    record(2, 'Falling back to Telegram image', { source: 'polling-message' }),
  ]);
  expect(steps).toHaveLength(2);
  expect(steps[0].entry.context?.source).toBe('webhook');
  expect(steps[1].entry.context?.source).toBe('polling-message');
});

test('preserves a new saved link and a saved link when the received event has not been loaded', () => {
  const changed = 'https://www.amazon.in/dp/NEWPRODUCT';
  const saved = record(2, `Message saved successfully: A normalized caption ${changed}`);
  const withReceived = buildLogHistory([record(1, `Received webhook update: ${JSON.stringify(originalUrl)}`), saved]);
  expect(withReceived[1].entry.context?.savedLinks).toEqual([changed]);
  expect(buildLogHistory([saved])[0].entry.context?.savedLinks).toEqual([changed]);
});
