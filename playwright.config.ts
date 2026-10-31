import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/search',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:8080', channel: 'chrome', headless: true, trace: 'retain-on-failure' },
  outputDir: 'tmp/search-qa/browser-results',
  reporter: [['list']],
});
