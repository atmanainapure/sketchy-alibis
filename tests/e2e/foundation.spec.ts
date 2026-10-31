import { test, expect } from '@playwright/test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createApplication } from '../../src/server/application.js';

test('four isolated browser contexts reach the same-origin server', async ({ browser, baseURL }) => {
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext()));
  try {
    await Promise.all(contexts.map(async (context) => {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const origins = new Set<string>();
      page.on('request', request => origins.add(new URL(request.url()).origin));
      await page.goto(baseURL!);
      await expect(page).toHaveTitle('Sketchy Alibis');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Sketchy');
      await expect(page.getByRole('status')).toHaveText('Connected to the case desk');
      expect(origins).toEqual(new Set([baseURL!]));
      expect(errors).toEqual([]);
    }));
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});

test('disconnected state remains visible and reconnects when the server returns', async ({ page }) => {
  let application = await createApplication();
  try {
    application.server.listen(0, '127.0.0.1');
    await once(application.server, 'listening');
    const port = (application.server.address() as AddressInfo).port;
    await page.goto(`http://127.0.0.1:${port}`);
    await expect(page.getByRole('status')).toHaveText('Connected to the case desk');
    await application.close();
    await expect(page.getByRole('status')).toContainText('Disconnected');
    application = await createApplication();
    application.server.listen(port, '127.0.0.1');
    await once(application.server, 'listening');
    await expect(page.getByRole('status')).toHaveText('Connected to the case desk', { timeout: 15_000 });
  } finally {
    await application.close();
  }
});
