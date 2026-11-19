import { test, expect } from '@playwright/test';
import { groupAdminLogs } from '../../src/components/admin/adminLogGroups';
import type { AdminLogEntry } from '../../src/services/api/adminApi';

const log = (index: number, message: string, extra: Partial<AdminLogEntry> = {}): AdminLogEntry => ({
  logId: `event-${index}`, timestamp: new Date(1_790_000_000_000 + index * 1000).toISOString(),
  level: 'info', service: 'telegram-ingest', message, context: { telegramMessageId: 25407 }, ...extra,
});

test('groups numeric/string message IDs, deduplicates replay, and orders paginated events chronologically', () => {
  const received = log(1, 'Received webhook update: "A product"');
  const saved = log(3, 'Message saved successfully: A product', { context: { telegramMessageId: '25407' } });
  const result = groupAdminLogs([saved, log(2, 'Enriching product'), received, saved]);
  expect(result).toHaveLength(1);
  expect(result[0].entries.map((entry) => entry.logId)).toEqual(['event-1', 'event-2', 'event-3']);
  expect(result[0].status).toBe('Saved');
  expect(result[0].summary).toBe('A product');
});

test('does not mix chats, infers Telegram identity from correlation IDs, and leaves other logs separate', () => {
  const result = groupAdminLogs([
    log(1, 'Chat A', { correlationId: 'tg:-1001:25407' }),
    log(2, 'Chat B', { correlationId: 'tg:-1002:25407', context: {} }),
    log(3, 'No Telegram ID', { context: {} }),
    log(4, 'Another request', { context: {} }),
  ]);
  expect(result).toHaveLength(4);
  expect(result.filter((group) => group.telegramId === '25407')).toHaveLength(2);
});

test('keeps a specific update or duplicate outcome instead of a generic trailing log', () => {
  expect(groupAdminLogs([
    log(3, 'Message saved successfully: A product'),
    log(2, 'Updated existing product price history: product-id'),
    log(1, 'Received webhook update: "A product"'),
  ])[0].status).toBe('Updated');
  const skipped = groupAdminLogs([
    log(2, 'Message was not saved (filtered out by criteria)'),
    log(1, 'Skipping duplicate Telegram source observation'),
  ])[0];
  expect(skipped.status).toBe('Skipped');
  expect(skipped.summary).toBe('Skipping duplicate Telegram source observation');
});

test('retains issues after recovery and does not infer success from an intermediate log', () => {
  const result = groupAdminLogs([
    log(3, 'Message saved successfully: A product'),
    log(2, 'Temporary provider error', { level: 'error' }),
    log(1, 'Provider retry', { level: 'warn' }),
  ])[0];
  expect(result.status).toBe('Saved · 2 issues');
  expect(result.entry.level).toBe('warn');
  expect(groupAdminLogs([log(1, 'Saving new message with category: fashion')])[0].status).toBe('Processing');
  expect(groupAdminLogs([log(1, 'Error saving message: unavailable', { level: 'error' })])[0].status).toBe('Failed · 1 issue');
});

test('a new ingestion attempt resumes progress instead of retaining an old completion', () => {
  const result = groupAdminLogs([
    log(3, 'Received webhook update: "Retry"'),
    log(2, 'Message saved successfully: Previous attempt'),
    log(1, 'Updated existing product price history: product-id'),
  ])[0];
  expect(result.status).toBe('Processing');
  expect(result.entries).toHaveLength(3);
});
