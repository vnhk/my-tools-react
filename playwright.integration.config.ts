import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/integration',
  // Serial execution — tests share a real database and must not conflict
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report-integration' }]],
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
  // No webServer — the shell script starts the React dev server before invoking Maven
})
