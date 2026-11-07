import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import baseConfig from '../../playwright.config';

export default defineConfig(baseConfig, {
  testDir: '.',
  outputDir: '../../tmp/search-qa/admin-logs/results',
  use: { baseURL: 'http://127.0.0.1:8082', screenshot: 'only-on-failure' },
  webServer: {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 8082 --strictPort --mode test',
    url: 'http://127.0.0.1:8082',
    env: { VITE_API_BASE_URL: '/api' },
    reuseExistingServer: false,
  },
});
