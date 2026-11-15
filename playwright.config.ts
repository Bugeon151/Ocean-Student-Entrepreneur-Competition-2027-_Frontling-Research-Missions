import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e', timeout: 60_000, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4173', launchOptions: { executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' } },
  webServer: { command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1', port: 4173, reuseExistingServer: true },
});
