import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import { createApplication } from '../../src/server/application';
import { systemRuntime } from '../../src/server/runtime';
import { controlledClock } from './case-fixture';
import { browserCase } from './browser-case-pack';

export async function browserCaseHarness(browser: Browser, normalTime = false, options: { caseSource?: () => unknown; context?: BrowserContextOptions } = {}) {
  const clock = controlledClock();
  const runtime = normalTime ? { ...systemRuntime, randomInt: clock.runtime.randomInt } : clock.runtime;
  const app = await createApplication({ runtime, caseSource: options.caseSource ?? browserCase });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const origin = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext(options.context)));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const views: any[][] = pages.map(() => []);
  pages.forEach((page, i) => page.on('websocket', ws => ws.on('framereceived', frame => {
    const value = String(frame.payload);
    if (!/^4[23]/.test(value)) return;
    try {
      const data = JSON.parse(value.slice(value.indexOf('[')));
      const view = data[0] === 'game:snapshot' ? data[1] : data[0]?.view;
      if (view?.caseId) views[i].push(view);
    } catch { /* Other transport frames have no game projection. */ }
  })));
  async function start() {
    for (let i = 0; i < 4; i++) {
      await pages[i].goto(origin);
      await expect(pages[i].getByRole('status')).toHaveText('Connected to the case desk');
      await pages[i].getByLabel('Your name').fill(['Maya', 'Leo', 'Sam', 'You'][i]);
      if (i === 0) await pages[i].getByRole('button', { name: 'Create room', exact: true }).click();
      else {
        await pages[i].getByLabel('Code to join').fill((await pages[0].getByLabel('Room code', { exact: true }).textContent())!);
        await pages[i].getByRole('button', { name: 'Join room', exact: true }).click();
      }
      await expect(pages[i].getByLabel('Room code', { exact: true })).toBeVisible();
    }
    for (const page of pages) await page.getByRole('button', { name: 'Ready', exact: true }).click();
    await pages[0].getByRole('button', { name: 'Start case', exact: true }).click();
    await expect.poll(() => views[0].at(-1)?.phase).toBe('Inspect');
  }
  return { clock, origin, contexts, pages, views, start, close: async () => { await Promise.allSettled(contexts.map(c => c.close())); await app.close(); } };
}

export async function draw(page: Page) {
  const surface = page.getByLabel('Drawing surface', { exact: true });
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  if (!box) throw Error('Drawing surface unavailable');
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .6, { steps: 5 });
  await page.mouse.up();
}
