import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { browserCaseHarness, draw } from '../helpers/browser-case';
import { case001 } from '../../src/server/content/case-001';

for (const width of [1280, 390]) test(`approved case inspection at ${width}px`, async ({ browser }) => {
  const h = await browserCaseHarness(browser, false, { caseSource: () => case001, context: { viewport: { width, height: 900 }, hasTouch: width < 500, isMobile: width < 500 } });
  const folder = `test-results/usability-${width}`;
  await mkdir(folder, { recursive: true });
  const errors: string[] = [];
  h.pages.forEach(p => p.on('pageerror', error => errors.push(error.message)));
  try {
    await h.start(); const page = h.pages[1];
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${folder}/inspect.png`, fullPage: true });
    await page.getByRole('link', { name: 'Photograph', exact: true }).click();
    const inspection = page.getByRole('group', { name: 'Photograph inspection area' });
    for (const [name, cx, cy] of [['tram', 1420, 1645], ['shop', 325, 2335]] as const) {
      const output = page.getByLabel('Photo zoom');
      while (parseInt((await output.textContent())!) < (name === 'tram' ? 300 : 800)) {
        const prior = await output.textContent();
        await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
        await expect(output).not.toHaveText(prior!);
      }
      await inspection.focus();
      const bounds = (await inspection.boundingBox())!, picture = (await inspection.locator('img').boundingBox())!;
      const dx = bounds.x + bounds.width / 2 - (picture.x + picture.width * cx / 3000);
      const dy = bounds.y + bounds.height / 2 - (picture.y + picture.height * cy / 4501);
      for (let n = 0; n < Math.round(Math.abs(dx) / 60); n++) await page.keyboard.press(dx > 0 ? 'ArrowLeft' : 'ArrowRight');
      for (let n = 0; n < Math.round(Math.abs(dy) / 60); n++) await page.keyboard.press(dy > 0 ? 'ArrowUp' : 'ArrowDown');
      await page.screenshot({ path: `${folder}/clue-${name}.png` });
    }
    await page.getByRole('button', { name: 'Reset photo' }).click();
    await page.getByRole('link', { name: 'Your panel' }).click();
    await page.screenshot({ path: `${folder}/private-viewport.png` });
    h.clock.to(45_000);
    await expect(page.getByRole('heading', { name: 'Sketch', exact: true })).toBeVisible();
    await draw(page); await page.getByLabel('Caption', { exact: true }).fill('my accepted alibi');
    await expect(page.getByLabel('Drawing save status')).toHaveText('Saved');
    expect(h.views[1].at(-1).self.drawing.strokes).toHaveLength(1);
    await page.getByRole('region', { name: 'Your private panel' }).screenshot({ path: `${folder}/sketch.png` });
    await page.getByRole('button', { name: 'Submit and lock' }).click();
    await expect(page.getByLabel('Drawing save status')).toHaveText('Locked');
    h.clock.to(85_000);
    await expect(page.getByRole('heading', { name: 'Gallery', exact: true })).toBeVisible();
    await page.getByRole('region', { name: 'Everyone’s sketches' }).screenshot({ path: `${folder}/gallery.png` });
    h.clock.to(140_000);
    await expect(page.getByRole('region', { name: 'Evidence sheet' })).toBeVisible();
    await page.getByRole('link', { name: 'Evidence', exact: true }).click();
    await page.screenshot({ path: `${folder}/evidence-viewport.png` });
    await page.getByRole('region', { name: 'Evidence sheet' }).screenshot({ path: `${folder}/evidence.png` });
    h.clock.to(205_000);
    await expect(page.getByRole('heading', { name: 'Verdict', exact: true })).toBeVisible();
    const portugal = page.getByRole('button', { name: 'Portugal', exact: true });
    await portugal.focus(); await page.keyboard.press('Space');
    await expect(portugal).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Accuse a player').selectOption({ label: 'Maya' });
    await expect(page.getByLabel('Ballot save status')).toHaveText('Saved');
    await page.getByRole('region', { name: 'Your final verdict' }).screenshot({ path: `${folder}/verdict.png` });
    h.clock.to(225_000);
    await expect(page.getByRole('region', { name: 'Case result' })).toBeVisible();
    await page.getByRole('link', { name: 'Results', exact: true }).click();
    await page.screenshot({ path: `${folder}/result-viewport.png` });
    await page.getByRole('region', { name: 'Case result' }).screenshot({ path: `${folder}/solution.png` });
    h.clock.to(255_000);
    for (const p of h.pages) await expect(p.getByRole('heading', { name: 'Complete', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await h.close(); }
});

test('photo can be inspected with keyboard and released sections have direct access', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  try {
    await h.start(); const page = h.pages[1];
    const nav = page.getByRole('navigation', { name: 'Case sections' });
    await expect(nav.getByRole('link', { name: 'Evidence', exact: true })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Your panel' }).click();
    await expect(page.getByRole('region', { name: 'Your private panel' })).toBeFocused();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    const photo = page.getByRole('group', { name: 'Photograph inspection area' });
    const img = photo.locator('img');
    const before = await img.evaluate(el => getComputedStyle(el).transform);
    await photo.focus(); await page.keyboard.press('ArrowRight');
    await expect.poll(() => img.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
    await page.getByRole('button', { name: 'Reset photo' }).click();
    await expect(page.getByLabel('Photo zoom')).toHaveText('100%');
    await expect(page.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
    h.clock.to(140_000);
    await nav.getByRole('link', { name: 'Evidence', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Evidence sheet' })).toBeFocused();
  } finally { await h.close(); }
});

test('phone touch scroll, photo pan and drawing gestures remain separate', async ({ browser }) => {
  const h = await browserCaseHarness(browser, false, { context: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } });
  try {
    await h.start(); const page = h.pages[1], cdp = await h.contexts[1].newCDPSession(page);
    async function swipe(x: number, y: number, dx: number, dy: number) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 10, y: y + dy * i / 10 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await page.getByRole('link', { name: 'Photograph', exact: true }).click();
    const photo = page.getByRole('group', { name: 'Photograph inspection area' });
    await photo.scrollIntoViewIfNeeded();
    let box = (await photo.boundingBox())!;
    const beforeScroll = await page.evaluate(() => scrollY);
    await swipe(box.x + box.width / 2, Math.min(box.y + box.height * .7, 700), 0, -120);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeScroll + 30);
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await photo.scrollIntoViewIfNeeded(); box = (await photo.boundingBox())!;
    const beforePan = await photo.locator('img').evaluate(el => getComputedStyle(el).transform);
    await swipe(box.x + box.width / 2, box.y + box.height * .6, 50, -30);
    await expect.poll(() => photo.locator('img').evaluate(el => getComputedStyle(el).transform)).not.toBe(beforePan);
    h.clock.to(45_000);
    const surface = page.getByLabel('Drawing surface', { exact: true }); await surface.scrollIntoViewIfNeeded(); box = (await surface.boundingBox())!;
    const scroll = await page.evaluate(() => scrollY);
    await swipe(box.x + box.width * .3, box.y + box.height * .4, 70, 50);
    await expect.poll(() => h.views[1].at(-1).self.drawing.strokes.length).toBe(1);
    expect(Math.abs(await page.evaluate(() => scrollY) - scroll)).toBeLessThan(3);
    await page.getByRole('button', { name: 'Undo stroke' }).click();
    await expect.poll(() => h.views[1].at(-1).self.drawing.strokes.length).toBe(0);
  } finally { await h.close(); }
});

test('oversized save reports failure and retains the previously accepted drawing', async ({ browser }) => {
  const h = await browserCaseHarness(browser); let oversized = false;
  await h.pages[1].routeWebSocket('**/socket.io/**', route => {
    const server = route.connectToServer();
    route.onMessage(message => {
      if (oversized && typeof message === 'string' && /^42\d+\[/.test(message)) {
        const data = JSON.parse(message.slice(message.indexOf('[')));
        if (data[0] === 'game:action' && data[1].action.type === 'save-drawing') {
          data[1].action.caption = 'x'.repeat(49000);
          server.send(message.slice(0, message.indexOf('[')) + JSON.stringify(data)); return;
        }
      }
      server.send(message);
    }); server.onMessage(message => route.send(message));
  });
  try {
    await h.start(); h.clock.to(45000); const page = h.pages[1]; await draw(page);
    await expect(page.getByLabel('Drawing save status')).toHaveText('Saved');
    const accepted = structuredClone(h.views[1].at(-1).self.drawing);
    oversized = true; await page.getByLabel('Caption', { exact: true }).fill('changed caption');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Drawing save status')).toHaveText('Unsaved');
    expect(h.views[1].at(-1).self.drawing).toEqual(accepted);
    h.clock.to(85000);
    await expect(page.getByRole('heading', { name: 'Gallery', exact: true })).toBeVisible();
    expect(h.views[1].at(-1).public.gallery.find((d: any) => d.playerId === h.views[1].at(-1).self.id).strokes).toEqual(accepted.strokes);
  } finally { await h.close(); }
});
