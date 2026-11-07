import { test, expect, type Page } from '@playwright/test';

const caption = 'Samsung Galaxy S25 Ultra\n\nPrice: ₹79,999\nhttps://example.com/deals/' + 'a'.repeat(180);
const logs = Array.from({ length: 30 }, (_, index) => ({
  logId: `log-${index}`,
  timestamp: new Date(Date.now() - index * 60_000).toISOString(),
  level: index === 1 ? 'error' : index === 2 ? 'warn' : 'info',
  service: index === 1 ? 'amazon' : 'telegram-ingest',
  message: index === 0 ? `Received webhook update: ${JSON.stringify(caption)}`
    : index === 3 ? 'Updated existing product price history: 6ac693f095eb543d0ebf30f9' : `Processed deal ${index}`,
  correlationId: 'internal-trace',
  requestId: 'internal-request',
  context: index === 0
    ? { telegramMessageId: 25407, source: 'webhook', response: { text: 'First paragraph\n\nSecond paragraph', retries: 0, cached: false } }
    : index === 1 ? { error: { message: 'Request failed', stack: 'Error: Request failed\n    at fetchProduct (amazon.ts:10)' } }
      : index === 2 ? { telegramMessageId: '25405' } : index === 3 ? { source: 'webhook' } : {},
}));

async function openLogs(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('adminAuthToken', 'logs-test-token');
    localStorage.setItem('theme', 'light');
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => localStorage.setItem('copied-log', value) } });
    // Keep streaming deterministic while exercising the page's real event handler and lifecycle.
    class TestEventSource {
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      receive = (event: Event) => this.onmessage?.(new MessageEvent('message', { data: JSON.stringify((event as CustomEvent).detail) }));
      constructor() {
        window.addEventListener('test-log', this.receive);
        queueMicrotask(() => this.onopen?.(new Event('open')));
      }
      close() { window.removeEventListener('test-log', this.receive); }
    }
    Object.defineProperty(window, 'EventSource', { value: TestEventSource });
  });
  await page.route('**/api/admin/logs?**', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    let result = params.has('before') ? [{ ...logs[3], logId: 'older-log', message: 'An older deal' }] : logs;
    if (params.get('levels')) result = result.filter((entry) => entry.level === params.get('levels'));
    if (params.get('service')) result = result.filter((entry) => entry.service === params.get('service'));
    if (params.get('search')) result = result.filter((entry) => `${entry.message} ${entry.service}`.toLowerCase().includes(params.get('search')!.toLowerCase()));
    await route.fulfill({ json: { logs: result, hasMore: !params.has('before'), nextBefore: logs.at(-1)!.timestamp } });
  });
  await page.goto('/admin/logs');
  await expect(page.getByRole('list', { name: 'Operational log events' }).locator(':scope > li')).toHaveCount(30);
}

test('shows Telegram IDs directly and expands captions, context and errors as readable text', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openLogs(page);
  const rows = page.getByRole('list', { name: 'Operational log events' }).locator(':scope > li');
  const first = rows.first();
  const trigger = first.getByRole('button', { name: 'Full log: Received webhook update', exact: true });
  await expect(first.getByText('#25407', { exact: true })).toBeVisible();
  await expect(rows.nth(1).getByText('Telegram', { exact: true })).toHaveCount(0);
  await expect(rows.nth(2).getByText('#25405', { exact: true })).toBeVisible();
  await first.getByRole('button', { name: 'Copy Telegram message ID 25407' }).click();
  expect(await page.evaluate(() => localStorage.getItem('copied-log'))).toBe('25407');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const detail = first.locator('.log-entry-details');
  expect(await detail.locator('p').filter({ hasText: 'Samsung Galaxy' }).textContent()).toBe(caption);
  expect(await detail.locator('p').filter({ hasText: 'First paragraph' }).textContent()).toBe('First paragraph\n\nSecond paragraph');
  await expect(detail.getByText('0', { exact: true })).toBeVisible();
  await expect(detail.getByText('No', { exact: true })).toBeVisible();
  await expect(detail.getByText(/internal-trace|internal-request|Trace ID|Request ID/)).toHaveCount(0);
  await expect(detail.locator('pre')).toHaveCount(0);
  await first.getByRole('button', { name: 'Copy log', exact: true }).click();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('copied-log')))!)).toEqual(logs[0]);
  await trigger.focus();
  await page.keyboard.press('Space');
  await expect(detail).not.toBeVisible();
  await rows.nth(1).getByRole('button', { name: /Full log:/ }).click();
  expect(await rows.nth(1).getByText('Error: Request failed', { exact: false }).textContent()).toContain('\n    at fetchProduct');
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 768, 1440]) {
  test(`compact layout and expanded content fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openLogs(page);
    const rows = page.locator('.log-entry-summary');
    const visibleRows = await rows.evaluateAll((items) => items.filter((item) => item.getBoundingClientRect().bottom <= innerHeight).length);
    expect(visibleRows).toBeGreaterThanOrEqual(width < 760 ? 7 : 8);
    const bounds = await rows.first().boundingBox();
    expect(bounds!.height).toBeLessThanOrEqual(width < 800 ? 60 : 46);
    const idBounds = await page.getByRole('button', { name: 'Copy Telegram message ID 25407' }).boundingBox();
    expect(idBounds!.x + idBounds!.width).toBeGreaterThan(width - 50);
    await page.locator('.log-entry-trigger').first().click();
    for (const dark of [false, true]) {
      await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll('body *')].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map((element) => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })),
      }));
      expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(width);
      const content = page.locator('.log-entry-details').first();
      expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await page.screenshot({ path: `tmp/search-qa/admin-logs/${width}-expanded.png`, animations: 'disabled' });
    await page.locator('.log-entry-trigger').first().click();
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.screenshot({ path: `tmp/search-qa/admin-logs/${width}-compact.png`, animations: 'disabled' });
    const shortLog = page.locator('.log-entry').nth(3);
    await shortLog.getByRole('button', { name: /Full log:/ }).click();
    const shortDetails = shortLog.locator('.log-entry-details');
    await expect(shortDetails.getByText('webhook', { exact: true })).toBeVisible();
    expect((await shortDetails.boundingBox())!.height).toBeLessThanOrEqual(width < 760 ? 140 : 80);
    await page.screenshot({ path: `tmp/search-qa/admin-logs/${width}-short-expanded.png`, animations: 'disabled' });
  });
}

test('filters, older logs, streaming, and pause/resume keep working', async ({ page }) => {
  await openLogs(page);
  await page.getByRole('button', { name: /Errors/ }).click();
  await expect(page.locator('.log-entry')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Errors/ })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), { ...logs[0], logId: 'excluded' });
  await expect(page.locator('.log-entry')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('.log-entry')).toHaveCount(30);
  await page.getByRole('textbox', { name: 'Search logs' }).fill('nonexistent');
  await page.getByRole('button', { name: 'Apply log search' }).click();
  await expect(page.getByRole('heading', { name: 'No matching activity' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click();
  await page.getByRole('combobox', { name: 'Filter by service' }).click();
  await page.getByRole('option', { name: 'amazon', exact: true }).click();
  await expect(page.locator('.log-entry')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('button', { name: 'Load older logs' }).click();
  await expect(page.locator('.log-entry')).toHaveCount(31);
  const live = { ...logs[0], logId: 'live-entry', message: 'New live deal' };
  await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), live);
  await expect(page.locator('.log-entry').first()).toContainText('New live deal');
  await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), live);
  await expect(page.locator('.log-entry')).toHaveCount(32);
  await page.getByRole('button', { name: 'Pause live updates' }).click();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), { ...live, logId: 'paused-entry' });
  await expect(page.locator('.log-entry')).toHaveCount(32);
  await page.getByRole('button', { name: 'Resume live updates' }).click();
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
});

test('handles truncated captions, structured messages, and logs without context', async ({ page }) => {
  await openLogs(page);
  for (const [message, expected] of [
    ['Caption: "First line\\n\\nSecond line…[truncated]', 'First line\n\nSecond line…[truncated]'],
    ['Response: {"message":"First line\\nSecond line","status":200}', 'First line\nSecond line'],
    ['A plain message\nwith two lines', 'A plain message\nwith two lines'],
  ]) {
    await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), { ...logs[3], logId: message, message });
    const first = page.locator('.log-entry').first();
    await first.getByRole('button', { name: /Full log:/ }).click();
    expect(await first.locator('.log-entry-details p').filter({ hasText: expected.split('\n')[0] }).last().textContent()).toBe(expected);
  }
});

test('shows a recoverable loading error', async ({ page }) => {
  await openLogs(page);
  await page.route('**/api/admin/logs?**', (route) => route.fulfill({ status: 500, json: { error: 'Unavailable' } }));
  await page.getByRole('button', { name: 'Refresh logs' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'We could not load logs' })).toBeVisible();
  await expect(page.locator('.log-entry')).toHaveCount(30);
  await page.unroute('**/api/admin/logs?**');
  await page.route('**/api/admin/logs?**', (route) => route.fulfill({ json: { logs, hasMore: false, nextBefore: null } }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('We could not load logs', { exact: false })).toHaveCount(0);
});
