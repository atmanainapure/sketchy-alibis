import { test, expect } from '@playwright/test';
import { browserCaseHarness, draw } from '../helpers/browser-case';

test('normal-time technical rehearsal completes all six phases in four isolated sessions', async ({ browser }) => {
  test.setTimeout(290_000);
  const h = await browserCaseHarness(browser, true);
  try {
    await h.start();
    const started = h.views[0][0].phaseEndsAt - 45_000;
    for (const page of h.pages) await expect(page.getByRole('heading', { name: 'Inspect', exact: true })).toBeVisible();
    await h.pages[0].getByRole('button', { name: 'Choose forgery A' }).click();
    await expect(h.pages[0].getByRole('button', { name: 'Choose forgery A' })).toHaveAttribute('aria-pressed', 'true');
    await expect(h.pages[0].getByRole('heading', { name: 'Sketch', exact: true })).toBeVisible({ timeout: 50_000 });
    for (const page of h.pages) {
      await draw(page); await page.getByRole('button', { name: 'Submit and lock' }).click();
      await expect(page.getByLabel('Drawing save status')).toHaveText('Locked');
    }
    await expect(h.pages[0].getByRole('heading', { name: 'Gallery', exact: true })).toBeVisible({ timeout: 45_000 });
    for (const page of h.pages) {
      await expect(page.getByRole('region', { name: 'Everyone’s sketches' }).getByRole('article')).toHaveCount(4);
      await page.getByRole('button', { name: 'Spain', exact: true }).click();
      await expect(page.getByLabel('Ballot save status')).toHaveText('Saved');
    }
    await expect(h.pages[0].getByRole('heading', { name: 'Interrogate', exact: true })).toBeVisible({ timeout: 35_000 });
    await expect(h.pages[0].getByRole('region', { name: 'Evidence sheet' })).toHaveCount(0);
    await expect(h.pages[0].getByRole('region', { name: 'Evidence sheet' })).toBeVisible({ timeout: 30_000 });
    await expect(h.pages[0].getByRole('heading', { name: 'Verdict', exact: true })).toBeVisible({ timeout: 70_000 });
    for (let i = 0; i < 4; i++) {
      const page = h.pages[i];
      await expect(page.getByRole('button', { name: 'Spain', exact: true })).toHaveAttribute('aria-pressed', 'false');
      await page.getByRole('button', { name: 'Portugal', exact: true }).click();
      if (i > 0) await page.getByLabel('Accuse a player').selectOption({ label: 'Maya' });
      await expect(page.getByLabel('Ballot save status')).toHaveText('Saved');
    }
    await expect(h.pages[0].getByRole('heading', { name: 'Solution', exact: true })).toBeVisible({ timeout: 25_000 });
    for (const page of h.pages) await expect(page.getByRole('region', { name: 'Case result' })).toContainText('Shared winners: Leo, Sam, You');
    await expect(h.pages[0].getByRole('heading', { name: 'Complete', exact: true })).toBeVisible({ timeout: 35_000 });
    for (const stream of h.views) {
      expect(new Set(stream.map(view => view.phase))).toEqual(new Set(['Inspect', 'Sketch', 'Gallery', 'Interrogate', 'Verdict', 'Solution', 'Complete']));
      const solution = stream.at(-1).public.solution;
      expect(solution.observation.events.filter((e: any) => e.type === 'phase').map((e: any) => e.at - started)).toEqual([0, 45_000, 85_000, 115_000, 205_000, 225_000, 255_000]);
      expect(solution.observation.events.filter((e: any) => e.type === 'evidence').map((e: any) => e.at - started)).toEqual([140_000]);
      expect(solution.result.scores.map((s: any) => s.total)).toEqual([2, 5, 5, 5]);
    }
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(255_000);
    console.info(`Automated normal-time rehearsal: ${elapsed}ms; four isolated sessions; no clock acceleration.`);
  } finally { await h.close(); }
});
