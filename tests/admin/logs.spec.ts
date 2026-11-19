import { test, expect, type Page } from '@playwright/test';
import { screenshotLogs, originalUrl, telegramFileId } from './logHistory.fixtures';

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
  const trigger = first.getByRole('button', { name: /Telegram message 25407:/ });
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

for (const width of [320, 375, 390, 768, 1024, 1440]) {
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
  await expect(page.locator('.log-entry')).toHaveCount(31);
  await page.getByRole('button', { name: 'Pause live updates' }).click();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), { ...live, logId: 'paused-entry' });
  await expect(page.locator('.log-entry')).toHaveCount(31);
  await page.getByRole('button', { name: 'Resume live updates' }).click();
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
});

test('labels, focus, touch targets, contrast and enlarged text remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openLogs(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to logs' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'System logs', exact: true })).toBeFocused();

  for (const label of ['Search logs', 'Service']) {
    const controlId = await page.locator('.logs-field label').filter({ hasText: label }).getAttribute('for');
    expect(await page.locator(`[id="${controlId}"]`).count()).toBe(1);
  }
  for (const selector of ['.logs-toolbar-actions button', '.logs-search-submit', '.logs-control', '.logs-severity-button', '.log-entry-telegram']) {
    for (const bounds of await page.locator(selector).evaluateAll((elements) => elements.map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })))) {
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
  }

  const trigger = page.locator('.log-entry-trigger').first();
  await trigger.focus();
  await expect(trigger).toHaveAccessibleDescription(/Info.*telegram-ingest/);
  expect(await trigger.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  expect(await page.locator('.log-entry-chevron').first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');

  for (const dark of [false, true]) {
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
    const contrasts = await page.locator('.admin-logs-page').evaluate((element) => {
      const styles = getComputedStyle(element);
      const color = (token: string) => styles.getPropertyValue(`--log-${token}`).trim();
      const luminance = (hex: string) => {
        const channels = hex.replace('#', '').match(/.{2}/g)!.map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      return [['ink', 'surface'], ['muted', 'surface'], ['muted', 'raised'], ['primary', 'surface'], ['info', 'info-bg'], ['warn', 'warn-bg'], ['error', 'error-bg'], ['debug', 'debug-bg'], ['live', 'live-bg'], ['#ffffff', 'primary-fill']].map(([foreground, background]) => {
        const values = [luminance(foreground.startsWith('#') ? foreground : color(foreground)), luminance(color(background))].sort((a, b) => b - a);
        return { pair: `${foreground}/${background}`, ratio: (values[0] + 0.05) / (values[1] + 0.05) };
      });
    });
    for (const { pair, ratio } of contrasts) expect(ratio, `${dark ? 'Dark' : 'Light'} ${pair}`).toBeGreaterThanOrEqual(4.5);
  }

  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await page.locator('.logs-main').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const messageBounds = (await trigger.boundingBox())!;
    const telegramBounds = (await page.locator('.log-entry-telegram').first().boundingBox())!;
    expect(messageBounds.x + messageBounds.width <= telegramBounds.x || messageBounds.y + messageBounds.height <= telegramBounds.y).toBe(true);
    await page.screenshot({ path: `tmp/search-qa/admin-logs/${width}-large-text.png`, animations: 'disabled' });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Sign out', exact: true }).focus();
  await trigger.focus();
  const focused = await trigger.boundingBox();
  const navigationBottom = await page.locator('.admin-logs-page > header').evaluate((element) => element.getBoundingClientRect().bottom);
  expect(focused!.y).toBeGreaterThanOrEqual(navigationBottom);
  expect(focused!.y + focused!.height).toBeLessThanOrEqual(390);
});

test('handles truncated captions, structured messages, and logs without context', async ({ page }) => {
  await openLogs(page);
  for (const [message, expected] of [
    ['Caption: "First line\\n\\nSecond line…[truncated]', 'First line\n\nSecond line…[truncated]'],
    ['Response: {"message":"First line\\nSecond line","status":200}', 'First line\nSecond line'],
    ['A plain message\nwith two lines', 'A plain message\nwith two lines'],
  ]) {
    await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), { ...logs[3], logId: message, message, timestamp: new Date().toISOString() });
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

test('Telegram history updates in one open row and preserves the final outcome and issues', async ({ page }) => {
  await openLogs(page);
  const rows = page.getByRole('list', { name: 'Operational log events' }).locator(':scope > li');
  const group = rows.filter({ has: page.getByRole('button', { name: 'Copy Telegram message ID 25407' }) });
  const trigger = group.locator('.log-entry-trigger');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const emit = async (index: number, message: string, level = 'info') => {
    await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), {
      ...logs[0], logId: `group-event-${index}`, message, level,
      timestamp: new Date(Date.now() + index * 1000).toISOString(),
    });
  };
  await emit(1, 'Enriching deal in one combined Gemini operation');
  await expect(rows).toHaveCount(30);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(group.locator('.log-entry-preview')).toContainText('Processing');
  await emit(2, 'Image lookup failed; using Telegram image', 'warn');
  await emit(3, 'Updated existing product price history: product-id');
  await emit(4, 'Message saved successfully: Samsung Galaxy S25 Ultra');
  await expect(group.locator('.log-entry-preview')).toHaveText('Updated · 1 issueSamsung Galaxy S25 Ultra');
  await expect(group.getByRole('list', { name: 'History for Telegram message 25407' }).locator(':scope > li')).toHaveCount(5);
  await group.getByRole('button', { name: 'Copy history' }).click();
  const history = JSON.parse((await page.evaluate(() => localStorage.getItem('copied-log')))!);
  expect(history.map((entry: { logId: string }) => entry.logId)).toEqual(['log-0', 'group-event-1', 'group-event-2', 'group-event-3', 'group-event-4']);
  // Trailing diagnostic output must not overwrite the actual outcome.
  await emit(5, 'Cleanup complete', 'debug');
  await expect(group.locator('.log-entry-preview')).toContainText('Updated · 1 issue');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  // An older matching event joins the same row without changing the latest summary.
  await page.route('**/api/admin/logs?**', (route) => route.fulfill({ json: {
    logs: [{ ...logs[0], logId: 'older-group-event', timestamp: new Date(Date.now() - 60_000).toISOString(), message: 'Earlier processing context' }],
    hasMore: false, nextBefore: null,
  } }));
  await page.getByRole('button', { name: 'Load older logs' }).click();
  await expect(rows).toHaveCount(30);
  await expect(group.getByRole('list', { name: 'History for Telegram message 25407' }).locator(':scope > li')).toHaveCount(7);
  await expect(group.locator('.log-entry-preview')).toContainText('Updated · 1 issue');
});

test('shares repeated history metadata, keeps exceptions, and uses the available width for links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openLogs(page);
  const url = `https://example.com/deal/${'a'.repeat(82)}`;
  for (const [index, event] of [
    { message: `Full caption\n${url}`, level: 'info', service: 'telegram-ingest', source: 'webhook' },
    { message: 'Saved successfully', level: 'info', service: 'telegram-ingest', source: 'webhook' },
    { message: 'Provider warning', level: 'warn', service: 'amazon', source: 'polling-message' },
    { message: 'Source unavailable', level: 'info', service: 'telegram-ingest', source: undefined },
  ].entries()) {
    await page.evaluate((entry) => window.dispatchEvent(new CustomEvent('test-log', { detail: entry })), {
      ...logs[0], ...event, logId: `metadata-${index}`,
      timestamp: new Date(Date.now() + index * 1000).toISOString(),
      context: { telegramMessageId: 25407, source: event.source, ...(index === 0 ? { reasons: ['missing identity', 'low confidence', 'missing price'] } : {}) },
    });
  }
  const group = page.locator('.log-entry').filter({ has: page.getByRole('button', { name: 'Copy Telegram message ID 25407' }) });
  await group.locator('.log-entry-trigger').click();
  const defaults = group.locator('.log-history-defaults');
  await expect(defaults).toContainText('Unless noted:');
  await expect(defaults).toContainText('Info');
  await expect(defaults).toContainText('telegram-ingest');
  await expect(defaults).toContainText('Source: webhook');
  const history = group.getByRole('list', { name: 'History for Telegram message 25407' });
  await expect(history.getByText('telegram-ingest', { exact: true })).toHaveCount(0);
  await expect(history.getByText('Info', { exact: true })).toHaveCount(0);
  await expect(history.getByText('webhook', { exact: true })).toHaveCount(0);
  await expect(history.getByText('Warn', { exact: true })).toBeVisible();
  await expect(history.getByText('amazon', { exact: true })).toBeVisible();
  await expect(history.getByText('polling-message', { exact: true })).toBeVisible();
  await expect(history.getByText('Not provided', { exact: true })).toBeVisible();
  const caption = history.locator('.log-value').filter({ hasText: 'Full caption' });
  const layout = await caption.evaluate((element, link) => {
    const text = element.querySelector('.log-url')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, link.length);
    return { width: element.parentElement!.getBoundingClientRect().width, lines: range.getClientRects().length };
  }, url);
  expect(layout.width).toBeGreaterThan(900);
  expect(layout.lines).toBe(1);
  const reasons = history.locator('.log-reasons');
  await expect(reasons.locator(':scope > li')).toHaveCount(3);
  const reasonBounds = await reasons.locator(':scope > li').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()));
  expect(Math.max(...reasonBounds.map((item) => item.y)) - Math.min(...reasonBounds.map((item) => item.y))).toBeLessThan(2);
  expect(reasonBounds[1].x).toBeGreaterThan(reasonBounds[0].x);
  for (const width of [1440, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await caption.evaluate((element) => element.parentElement!.scrollWidth <= element.parentElement!.clientWidth)).toBe(true);
    const copyHistory = await group.getByRole('button', { name: 'Copy history', exact: true }).boundingBox();
    await expect(group.getByRole('button', { name: 'Copy history', exact: true })).toBeVisible();
    for (const actions of await history.locator('.log-entry-actions').all()) {
      const messageBounds = await actions.locator('..').locator('.log-message').boundingBox();
      const timeBounds = await actions.locator('time').boundingBox();
      expect(timeBounds!.y).toBeLessThan(messageBounds!.y + 20);
      expect(timeBounds!.y + timeBounds!.height).toBeGreaterThan(messageBounds!.y);
      expect(messageBounds!.x + messageBounds!.width).toBeLessThanOrEqual(timeBounds!.x);
      if (width < 768) {
        await expect(actions.locator('.logs-copy')).toBeHidden();
        await expect(actions.getByRole('button', { name: 'Copy log', exact: true })).toHaveCount(0);
        await expect(actions.locator('time')).toBeVisible();
        continue;
      }
      const copyLog = await actions.getByRole('button', { name: 'Copy log', exact: true }).boundingBox();
      const timestamp = await actions.locator('time').boundingBox();
      expect(Math.abs(copyHistory!.x + copyHistory!.width - copyLog!.x - copyLog!.width)).toBeLessThan(2);
      expect(timestamp!.x + timestamp!.width).toBeLessThanOrEqual(copyLog!.x);
      expect(Math.abs(timestamp!.y + timestamp!.height / 2 - copyLog!.y - copyLog!.height / 2)).toBeLessThan(2);
      if (width >= 768) {
        const message = await actions.locator('..').locator('.log-message').boundingBox();
        expect(timestamp!.y).toBeLessThan(message!.y + 20);
        expect(timestamp!.y + timestamp!.height).toBeGreaterThan(message!.y);
        expect(message!.x + message!.width).toBeLessThanOrEqual(timestamp!.x);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const received = history.locator('.log-message').first();
  const heading = await received.getByText('Received webhook update:', { exact: true }).boundingBox();
  const captionTop = await received.locator('.log-value').evaluate((element) => {
    const range = document.createRange();
    range.setStart(element.firstChild!, 0);
    range.setEnd(element.firstChild!, 1);
    return range.getBoundingClientRect().y;
  });
  expect(Math.abs(heading!.y - captionTop)).toBeLessThan(2);
});

test('consolidates the screenshot history while preserving raw copies and essential diagnostics', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openLogs(page);
  for (const entry of screenshotLogs) {
    await page.evaluate((event) => window.dispatchEvent(new CustomEvent('test-log', { detail: event })), entry);
  }
  const group = page.locator('.log-entry').filter({ has: page.getByRole('button', { name: 'Copy Telegram message ID 25734' }) });
  await group.locator('.log-entry-trigger').click();
  const history = group.getByRole('list', { name: 'History for Telegram message 25734' });
  await expect(history.locator(':scope > li')).toHaveCount(6);
  await expect(group.getByText(/11 events in 6 steps/)).toBeVisible();
  await expect(group.locator('.log-entry-preview')).not.toContainText('https://');
  expect((await history.textContent())!.split(originalUrl)).toHaveLength(2);
  await expect(history.getByText(/Amazon image unavailable:.*Used Telegram photo/)).toBeVisible();
  await expect(history.getByText(/Gemini price missing/)).toBeVisible();
  await expect(history.getByText('Deal saved', { exact: true })).toBeVisible();
  await expect(history.getByText('lifestyle', { exact: true })).toBeVisible();
  await expect(history.getByText(/Source Key|Not provided|Amazon image fetch failed|Gemini deal enrichment/)).toHaveCount(0);
  const imageMessage = history.locator(':scope > li').nth(1).locator('.log-message');
  const enrichmentMessage = history.locator(':scope > li').nth(2).locator('.log-message');
  for (const [message, label] of [[imageMessage, 'Error'], [imageMessage, 'amazon-image'], [enrichmentMessage, 'deal-enrichment'], [enrichmentMessage, 'Candidate Count']] as const) {
    const labelBounds = await message.getByText(label, { exact: true }).boundingBox();
    const textTop = await message.locator(':scope > .log-value').evaluate((element) => {
      const range = document.createRange();
      range.setStart(element.firstChild!, 0);
      range.setEnd(element.firstChild!, 1);
      return range.getBoundingClientRect().y;
    });
    expect(Math.abs(labelBounds!.y - textTop)).toBeLessThan(5);
  }
  const fileCopy = history.getByRole('button', { name: 'Copy Telegram file ID', exact: true });
  await expect(fileCopy).toHaveCount(1);
  expect((await fileCopy.textContent())!.length).toBeLessThan(40);
  await fileCopy.click();
  expect(await page.evaluate(() => localStorage.getItem('copied-log'))).toBe(telegramFileId);
  for (const time of await history.locator('.log-entry-actions time').allTextContents()) expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  await history.locator(':scope > li').nth(1).getByRole('button', { name: 'Copy log', exact: true }).click();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('copied-log')))!)).toEqual(screenshotLogs.slice(1, 6));
  await group.getByRole('button', { name: 'Copy history', exact: true }).click();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('copied-log')))!)).toEqual(screenshotLogs);
  await group.screenshot({ path: 'tmp/search-qa/admin-logs/consolidated-desktop.png' });
  const link = history.locator('a.log-url');
  await expect(link).toHaveText(`\u{1F517} ${originalUrl}`);
  await expect(link).toHaveAttribute('href', originalUrl);
  await expect(link).toHaveAttribute('target', '_blank');
  await link.focus();
  await expect(link).toBeFocused();
  const destination = page.waitForEvent('popup');
  await page.context().route('https://www.amazon.in/**', (route) => route.fulfill({ body: 'Link destination' }));
  await page.keyboard.press('Enter');
  const popup = await destination;
  await popup.waitForLoadState();
  expect(popup.url()).toBe(originalUrl);
  await popup.close();
  for (const width of [768, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const linkLayout = await link.evaluate((element) => ({
      width: element.clientWidth, contentWidth: element.scrollWidth,
      height: element.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(element).lineHeight),
      overflow: getComputedStyle(element).textOverflow,
    }));
    expect(linkLayout.contentWidth).toBeGreaterThan(linkLayout.width);
    expect(linkLayout.height).toBeLessThanOrEqual(linkLayout.lineHeight + 1);
    expect(linkLayout.overflow).toBe('ellipsis');
    expect(await group.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 375) {
      const wrappedMetadata = await enrichmentMessage.locator('.log-inline-details > div').boundingBox();
      const contentBounds = await enrichmentMessage.boundingBox();
      expect(Math.abs(wrappedMetadata!.x - contentBounds!.x)).toBeLessThan(1);
      const reasonRow = history.locator('.log-reasons-detail');
      const reasonBounds = await reasonRow.boundingBox();
      const lastReason = await reasonRow.getByRole('listitem').last().boundingBox();
      expect(Math.abs(lastReason!.x - reasonBounds!.x)).toBeLessThan(1);
      const caption = history.locator(':scope > li').first().locator('.log-message > .log-value');
      expect(await caption.textContent()).not.toContain('\n\n');
      await expect(history.getByRole('button', { name: 'Copy log', exact: true })).toHaveCount(0);
      await expect(group.getByRole('button', { name: 'Copy history', exact: true })).toBeVisible();
      expect((await group.locator('.log-history-defaults').boundingBox())!.width).toBeGreaterThan(240);
      expect((await fileCopy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await group.screenshot({ path: 'tmp/search-qa/admin-logs/consolidated-mobile.png' });
});
