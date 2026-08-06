import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // e2e/integration has its own config (playwright.integration.config.ts) — it needs
  // the real backend running and is invoked separately via npm run test:e2e:integration.
  testIgnore: '**/integration/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
