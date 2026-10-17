import { defineConfig, devices } from '@playwright/test';

// Optional: a pre-installed Chromium to use instead of `npx playwright install chromium`
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

// Browser tests run against the production build, served by `vite preview` on its own port
// (not the default 4173, so a preview server started by hand is never mistaken for it)
const PORT = 4174;
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/mayastack/`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(executablePath ? { launchOptions: { executablePath } } : {}) },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/mayastack/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
