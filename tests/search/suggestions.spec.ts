import { test, expect } from '@playwright/test';

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile suggestions' : 'desktop suggestions', () => {
    test.use({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('deals24:recent-searches', JSON.stringify(['Recent laptop']));
      });
      await page.route('**/api/**', async (route) => {
        if (!['fetch', 'xhr'].includes(route.request().resourceType())) return route.continue();
        const path = new URL(route.request().url()).pathname;
        let body: unknown = { data: [], hasMore: false, totalDealsCount: 0 };
        if (path.endsWith('/search/popular')) body = { queries: ['Popular phone'] };
        if (path.endsWith('/search/suggestions')) body = {
          deals: Array.from({ length: 6 }, (_, index) => ({
            id: `suggestion-${index}`, title: `Laptop model ${index}`, price: 10000,
            imageUrl: null, telegramFileId: null, date: null,
          })),
          products: [{ label: 'Laptop family', query: 'laptop family' }],
          categories: [{ label: 'Laptops & PCs', category: 'laptops' }],
        };
        await route.fulfill({ json: body });
      });
      await page.goto('/categories');
      if (mobile) await page.getByRole('button', { name: 'Search deals', exact: true }).click();
      else await page.getByRole('combobox', { name: 'Search Deals24' }).focus();
    });

    test('limits deals, preserves products and categories, and separates fill from navigation', async ({ page }) => {
      const input = page.getByRole('combobox', { name: 'Search Deals24' });
      await input.fill('laptop');
      await expect(page.getByRole('option').filter({ hasText: /Laptop model/ })).toHaveCount(4);
      await expect(page.getByRole('option', { name: 'Laptop family', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Laptops & PCs', exact: true })).toBeVisible();
      const fill = page.getByRole('button', { name: 'Fill search with Laptop model 0', exact: true });
      const row = page.getByRole('option').first();
      const fillBox = await fill.boundingBox();
      const rowBox = await row.boundingBox();
      expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(fillBox!.x);
      await fill.click();
      await expect(input).toHaveValue('Laptop model 0');
      await expect(input).toBeFocused();
      await expect(page).toHaveURL(/\/categories$/);
      await expect(page.getByRole('listbox')).toBeVisible();
      await page.getByRole('option').first().click();
      await expect(page).toHaveURL(/\/deal\/suggestion-0$/);
    });

    test('keeps search all visible while suggestions scroll', async ({ page }) => {
      await page.setViewportSize({ width: mobile ? 390 : 1280, height: 500 });
      await page.getByRole('combobox', { name: 'Search Deals24' }).fill('laptop');
      await expect(page.getByRole('option', { name: 'Laptop family', exact: true })).toBeVisible();
      const searchAll = page.getByRole('button', { name: 'Search all deals for “laptop”' });
      await expect(searchAll).toBeInViewport();
      const before = await searchAll.boundingBox();
      const scroller = page.getByRole('listbox').locator('..');
      await scroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
      expect(await scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expect(searchAll).toBeInViewport();
      const after = await searchAll.boundingBox();
      expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
      await searchAll.click();
      await expect(page).toHaveURL(/\/deals\?search=laptop$/);
    });

    test('recent and popular arrows fill without committing, while rows search', async ({ page }) => {
      const input = page.getByRole('combobox', { name: 'Search Deals24' });
      for (const term of ['Recent laptop', 'Popular phone']) {
        const fill = page.getByRole('button', { name: `Fill search with ${term}`, exact: true });
        await fill.focus();
        await fill.press('Enter');
        await expect(input).toHaveValue(term);
        await expect(input).toBeFocused();
        await expect(page).toHaveURL(/\/categories$/);
        await input.fill('');
      }
      await page.getByRole('option', { name: 'Recent laptop', exact: true }).click();
      await expect(page).toHaveURL(/\/deals\?search=Recent\+laptop$/);
      await expect(page.getByRole('listbox')).toBeHidden();
    });
  });
}
