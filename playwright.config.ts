import { defineConfig, devices } from '@playwright/test';

const port = 4317;
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  // Room tests establish credentials. Keep raw headers/storage out of artifacts.
  use: { baseURL: origin, trace: 'off', screenshot: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'npm start',
    url: `${origin}/api/health`,
    env: { HOST: '127.0.0.1', PORT: String(port) },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
