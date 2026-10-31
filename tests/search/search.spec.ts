import { test, expect } from '@playwright/test';

const api = 'http://127.0.0.1:8091';

test('real API filters, stable cursors, fallback and stale-cursor responses', async ({ request }) => {
  const params = { search: 'samung s25 ultra', category: 'mobile-phones', minPrice: '10000', maxPrice: '150000', limit: '2' };
  const firstResponse = await request.get(`${api}/api/telegram/messages`, { params });
  expect(firstResponse.ok()).toBeTruthy();
  const first = await firstResponse.json();
  expect(first.data).toHaveLength(2);
  expect(first.nextCursor).toBeTruthy();
  for (const row of first.data) {
    expect(row.category).toBe('mobile-phones');
    expect(row.price).toBeGreaterThanOrEqual(10000);
    expect(row.price).toBeLessThanOrEqual(150000);
  }
  await request.post(`${api}/__qa/fallback`);
  const nextResponse = await request.get(`${api}/api/telegram/messages`, { params: { ...params, cursor: first.nextCursor } });
  expect(nextResponse.ok()).toBeTruthy();
  const second = await nextResponse.json();
  expect(second.totalDealsCount).toBe(first.totalDealsCount);
  expect(second.data.every((row: { id: string }) => !first.data.some((old: { id: string }) => old.id === row.id))).toBeTruthy();
  const old = await request.get(`${api}/api/telegram/messages`, { params: { search: 'samsung', cursor: 'legacy|cursor' } });
  expect(old.status()).toBe(409);
  expect((await old.json()).code).toBe('SEARCH_CURSOR_EXPIRED');
});

test('browser search previews, keyboard commit, filters and pagination use the real API', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/deals?search=samsung');
  const input = page.getByRole('combobox', { name: 'Search Deals24' });
  await input.fill('samung s25 ultra');
  await expect(page.getByRole('listbox', { name: 'Search suggestions' })).toBeVisible();
  await expect(page.getByRole('option').first()).toBeVisible();
  const preview = page.waitForResponse((response) => response.url().includes('/search/suggestions?') && response.url().includes('samung') && response.ok());
  await input.fill('samung s25 ultr');
  await preview;
  await input.press('Enter');
  await expect(page).toHaveURL(/search=samung/);
  await input.press('Escape');
  const response = await page.request.get(`${api}/api/telegram/messages`, { params: { search: 'samung s25 ultr', limit: '12' } });
  const data = await response.json();
  expect(data.data.length).toBeGreaterThan(0);
  await expect(page.getByText(/Search Results:/).first()).toBeVisible();
  const filteredResponse = page.waitForResponse((response) => response.url().includes('/telegram/messages?') && response.url().includes('sort=price_asc') && response.ok());
  await page.goto('/deals?search=samsung&category=mobile-phones&minPrice=10000&maxPrice=150000&sort=price_asc');
  const filtered = await (await filteredResponse).json();
  expect(filtered.data.every((row: { category: string; price: number }) => row.category === 'mobile-phones' && row.price >= 10000 && row.price <= 150000)).toBeTruthy();
  const prices = filtered.data.map((row: { price: number }) => row.price);
  expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
  await expect(page.getByRole('combobox', { name: 'Search Deals24' })).toHaveValue('samsung');
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
  const nextPage = page.waitForResponse((response) => response.url().includes('/telegram/messages?') && response.url().includes('cursor=') && response.ok());
  await page.mouse.wheel(0, 5000);
  const next = await (await nextPage).json();
  expect(next.data.every((row: { id: string }) => !filtered.data.some((old: { id: string }) => row.id === old.id))).toBeTruthy();
  await expect.poll(async () => page.getByRole('heading', { level: 3 }).count()).toBeGreaterThan(12);
  await page.screenshot({ path: 'tmp/search-qa/desktop.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('mobile search sheet commits a query and displays results', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/deals');
  await page.getByRole('button', { name: 'Search deals', exact: true }).click();
  const input = page.getByRole('combobox', { name: 'Search Deals24' });
  await input.fill('samsung');
  await expect(page.getByRole('option').first()).toBeVisible();
  await input.press('Enter');
  await expect(page).toHaveURL(/search=samsung/);
  await expect(page.getByRole('heading', { name: 'Search Results: samsung' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
  await page.screenshot({ path: 'tmp/search-qa/mobile.png', fullPage: false });
});

for (const path of ['/deals', '/']) test(`browser clears expired pages without document reload on ${path}`, async ({ page }) => {
  let rejected = false;
  let recovered = false;
  await page.route('**/api/telegram/messages?**', async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('cursor') && !rejected) {
      rejected = true;
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'SEARCH_CURSOR_EXPIRED', error: 'Refresh results' }) });
    } else {
      if (rejected && !url.searchParams.has('cursor')) recovered = true;
      await route.continue();
    }
  });
  await page.goto(`${path}?search=samsung`);
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
  const documentStartedAt = await page.evaluate(() => performance.timeOrigin);
  await page.getByTestId('deal-scroll-sentinel').scrollIntoViewIfNeeded();
  await expect.poll(() => rejected).toBeTruthy();
  await expect.poll(() => recovered).toBeTruthy();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStartedAt);
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
});
