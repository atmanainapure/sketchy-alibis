import { test, expect } from '@playwright/test';
import { browserCaseHarness, draw } from '../helpers/browser-case';

test('four players complete a case with private cards, sketches, evidence, ballots and reveal', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  try {
    await h.start();
    for (const page of h.pages) await expect(page.getByRole('heading', { name: 'Inspect', exact: true })).toBeVisible();
    await expect(h.pages[0].getByText('You are the murderer.', { exact: true })).toBeVisible();
    for (const page of h.pages.slice(1)) await expect(page.getByText('You are innocent.', { exact: true })).toBeVisible();
    await h.pages[0].getByRole('button', { name: 'Choose forgery A', exact: true }).click();
    await expect(h.pages[0].getByRole('button', { name: 'Choose forgery A', exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (const page of h.pages) await expect(page.getByRole('img', { name: 'Earlier daytime street photograph near the fictional scene.' })).toBeVisible();
    await h.pages[0].getByRole('button', { name: 'Zoom in' }).click();
    await expect(h.pages[0].getByLabel('Photo zoom')).not.toHaveText('100%');
    h.clock.to(45_000);
    for (const page of h.pages) await expect(page.getByRole('heading', { name: 'Sketch', exact: true })).toBeVisible();
    await draw(h.pages[0]); await draw(h.pages[0]);
    await h.pages[0].getByRole('button', { name: 'Undo stroke' }).click();
    await h.pages[0].getByLabel('Caption', { exact: true }).fill('<b>tram</b> on rails');
    await h.pages[0].getByRole('button', { name: 'Submit and lock', exact: true }).click();
    await expect(h.pages[0].getByLabel('Drawing save status')).toContainText('Locked');
    expect(h.views[0].at(-1).self.drawing.strokes).toHaveLength(1);
    await expect(h.pages[0].getByLabel('Caption', { exact: true })).toBeDisabled();
    await draw(h.pages[2]); await expect(h.pages[2].getByLabel('Drawing save status')).toHaveText('Saved');
    expect(h.views[2].at(-1).self.drawing.strokes).toHaveLength(1);
    await h.pages[2].getByRole('button', { name: 'Clear sketch' }).click();
    await expect(h.pages[2].getByLabel('Drawing save status')).toHaveText('Saved');
    expect(h.views[2].at(-1).self.drawing.strokes).toEqual([]);
    await draw(h.pages[1]); await h.pages[1].getByLabel('Caption', { exact: true }).fill('A suspicious bicycle');
    await expect(h.pages[1].getByLabel('Drawing save status')).toHaveText('Saved');
    const acceptedDrawing = structuredClone(h.views[1].at(-1).self.drawing);
    await h.pages[1].reload();
    await expect(h.pages[1].getByLabel('Caption', { exact: true })).toHaveValue('A suspicious bicycle');
    expect(h.views[1].at(-1).self.drawing).toEqual(acceptedDrawing);
    await expect(h.pages[1].getByLabel('Drawing surface', { exact: true }).locator('svg path')).not.toHaveCount(0);
    for (const page of h.pages) await expect(page.getByRole('region', { name: 'Everyone’s sketches' })).toHaveCount(0);
    h.clock.to(85_000);
    for (const page of h.pages) {
      await expect(page.getByRole('heading', { name: 'Gallery', exact: true })).toBeVisible();
      const gallery = page.getByRole('region', { name: 'Everyone’s sketches' });
      await expect(gallery.getByRole('article')).toHaveCount(4);
      await expect(gallery.getByText('<b>tram</b> on rails', { exact: true })).toBeVisible();
      await expect(gallery.locator('b')).toHaveCount(0);
      await expect(gallery.getByText('No sketch submitted', { exact: true })).toHaveCount(2);
    }
    expect(h.views[0].at(-1).public.gallery.find((d: any) => d.playerId === h.views[1].at(-1).self.id)).toMatchObject({ strokes: acceptedDrawing.strokes, caption: acceptedDrawing.caption, lockMode: 'automatic' });
    await h.pages[1].getByRole('button', { name: 'Spain', exact: true }).click();
    await h.pages[1].getByLabel('Accuse a player').selectOption({ label: 'Maya' });
    await expect(h.pages[1].getByLabel('Ballot save status')).toHaveText('Saved');
    h.clock.to(115_000);
    await expect(h.pages[0].getByRole('heading', { name: 'Interrogate', exact: true })).toBeVisible();
    await expect(h.pages[0].getByRole('region', { name: 'Evidence sheet' })).toHaveCount(0);
    h.clock.to(140_000);
    for (const page of h.pages) await expect(page.getByRole('region', { name: 'Evidence sheet' })).toContainText('PT delivery open');
    h.clock.to(205_000);
    for (const page of h.pages) {
      await expect(page.getByRole('heading', { name: 'Verdict', exact: true })).toBeVisible();
      await expect(page.getByLabel('Accuse a player')).toHaveValue('');
      await expect(page.getByRole('button', { name: 'Spain', exact: true })).toHaveAttribute('aria-pressed', 'false');
    }
    for (let i = 1; i < 4; i++) {
      await h.pages[i].getByRole('button', { name: 'Portugal', exact: true }).click();
      await h.pages[i].getByLabel('Accuse a player').selectOption({ label: 'Maya' });
      await expect(h.pages[i].getByLabel('Ballot save status')).toHaveText('Saved');
    }
    h.clock.to(225_000);
    for (const page of h.pages) {
      await expect(page.getByRole('heading', { name: 'Solution', exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Case result' })).toContainText('Maya was the murderer');
      await expect(page.getByRole('region', { name: 'Case result' })).toContainText('Arrested: Maya');
      await expect(page.getByRole('table', { name: 'Scores' }).getByRole('row')).toHaveCount(5);
      await expect(page.getByRole('region', { name: 'Case result' })).toContainText('Private geographic explanation');
      await expect(page.getByText('Photo by Paul Keiffer on Unsplash.', { exact: true })).toBeVisible();
    }
    h.clock.to(255_000);
    await expect(h.pages[0].getByRole('heading', { name: 'Complete', exact: true })).toBeVisible();
    for (const stream of h.views) for (const view of stream) {
      if (!['Solution', 'Complete'].includes(view.phase)) {
        expect(view.public.solution).toBeUndefined();
        expect(JSON.stringify(view.public)).not.toMatch(/Private geographic explanation|forgeryOptions|guilt|correctCountry/);
      }
      if (['Inspect', 'Sketch'].includes(view.phase)) expect(view.public.gallery).toBeUndefined();
      if (view.serverTime < h.clock.start + 140_000) expect(view.public.evidence).toBeUndefined();
    }
    for (let i = 0; i < 4; i++) for (const view of h.views[i]) {
      expect(view.self.id).toBe(h.views[i][0].self.id);
      if (i !== 0) expect(view.self.forgeryOptions).toBeUndefined();
    }
  } finally { await h.close(); }
});

test('caption normalization and invalid edits preserve the last accepted draft and ballot', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  try {
    await h.start(); h.clock.to(45_000);
    await expect(h.pages[0].getByText('No choice was saved in Inspect. Forgery A was assigned to you.', { exact: true })).toBeVisible();
    const page = h.pages[1];
    await expect(page.getByRole('heading', { name: 'Sketch', exact: true })).toBeVisible();
    await draw(page); await page.getByLabel('Caption', { exact: true }).fill('  one two three four five  ');
    await expect(page.getByLabel('Drawing save status')).toHaveText('Saved');
    const accepted = structuredClone(h.views[1].at(-1).self.drawing);
    expect(accepted.caption).toBe('one two three four five');
    await page.getByLabel('Caption', { exact: true }).fill('one two three four five six');
    await expect(page.getByRole('alert')).toContainText('at most five words');
    await expect(page.getByRole('button', { name: 'Submit and lock' })).toBeDisabled();
    await page.getByLabel('Caption', { exact: true }).fill('x'.repeat(81));
    await expect(page.getByRole('alert')).toContainText('80 characters');
    h.clock.to(85_000);
    await expect(page.getByRole('region', { name: 'Everyone’s sketches' })).toContainText('one two three four five');
    expect(h.views[1].at(-1).public.gallery.find((d: any) => d.playerId === h.views[1].at(-1).self.id)).toMatchObject({ strokes: accepted.strokes, caption: accepted.caption });
    h.clock.to(205_000);
    await page.getByRole('button', { name: 'Portugal', exact: true }).click();
    await page.getByLabel('Accuse a player').selectOption({ label: 'Maya' });
    await page.getByLabel('Reason (optional)').fill('  <b>rails</b>  ');
    await expect(page.getByLabel('Ballot save status')).toHaveText('Saved');
    await expect(page.locator('path[data-country="PT"]')).toHaveAttribute('data-selected', 'true');
    await page.getByRole('button', { name: 'Spain', exact: true }).click();
    await page.getByLabel('Reason (optional)').fill('x'.repeat(161));
    await expect(page.getByRole('alert')).toContainText('at most 160 characters');
    h.clock.to(225_000);
    await expect(page.getByRole('heading', { name: 'Solution', exact: true })).toBeVisible();
    const ballot = h.views[1].at(-1).public.solution.ballots.find((b: any) => b.playerId === h.views[1].at(-1).self.id).final;
    expect(ballot).toMatchObject({ country: 'PT', reason: '<b>rails</b>' });
    await expect(page.getByRole('table', { name: 'Revealed ballots' })).toContainText('<b>rails</b>');
    await expect(page.getByRole('table', { name: 'Revealed ballots' }).locator('b')).toHaveCount(0);
  } finally { await h.close(); }
});

test('forgery B, lost drawing and vote ACKs, and photo retry retain the authoritative result', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  const dropped: string[] = [];
  await h.pages[1].routeWebSocket('**/socket.io/**', route => {
    const server = route.connectToServer(); const acknowledgements = new Map<string, string>();
    route.onMessage(message => {
      if (typeof message === 'string' && /^42\d+\[/.test(message)) {
        const [event, payload] = JSON.parse(message.slice(message.indexOf('[')));
        if (event === 'game:action' && ['save-drawing', 'save-final'].includes(payload.action.type) && !dropped.includes(payload.action.type)) acknowledgements.set(/^42(\d+)\[/.exec(message)![1], payload.action.type);
      }
      server.send(message);
    });
    server.onMessage(message => {
      const id = typeof message === 'string' ? /^43(\d+)\[/.exec(message)?.[1] : undefined;
      if (id && acknowledgements.has(id)) { dropped.push(acknowledgements.get(id)!); acknowledgements.delete(id); return; }
      route.send(message);
    });
  });
  let failedPhoto = false;
  await h.pages[2].route('**/api/rooms/*/cases/*/photo?*', route => { if (!failedPhoto) { failedPhoto = true; return route.abort(); } return route.continue(); });
  try {
    await h.start();
    await h.pages[0].getByRole('button', { name: 'Choose forgery B' }).click();
    await expect(h.pages[0].getByRole('button', { name: 'Choose forgery B' })).toHaveAttribute('aria-pressed', 'true');
    await expect(h.pages[2].getByRole('alert')).toContainText('photograph could not load');
    const endsAt = h.views[2].at(-1).phaseEndsAt;
    await h.pages[2].getByRole('button', { name: 'Retry photograph' }).click();
    await expect(h.pages[2].getByRole('button', { name: 'Zoom in' })).toBeEnabled();
    expect(h.views[2].at(-1).phaseEndsAt).toBe(endsAt);
    h.clock.to(45_000); await draw(h.pages[1]);
    await h.pages[1].getByLabel('Caption', { exact: true }).fill('Saved despite lost reply');
    await expect.poll(() => dropped).toContain('save-drawing');
    h.clock.to(85_000);
    const gallery = h.pages[0].getByRole('region', { name: 'Everyone’s sketches' });
    await expect(gallery).toContainText('Saved despite lost reply');
    await expect(gallery.getByText('Automatically locked', { exact: true })).toHaveCount(1);
    h.clock.to(139_999); await expect(h.pages[0].getByRole('region', { name: 'Evidence sheet' })).toHaveCount(0);
    h.clock.to(140_000); await expect(h.pages[0].getByRole('region', { name: 'Evidence sheet' })).toContainText('PT sales closed');
    h.clock.to(205_000);
    await expect(h.pages[1].getByLabel('Ballot save status')).not.toHaveText('Saving…');
    await h.pages[1].getByRole('button', { name: 'Portugal', exact: true }).click();
    await h.pages[1].getByLabel('Accuse a player').selectOption({ label: 'Maya' });
    await expect.poll(() => dropped).toContain('save-final');
    h.clock.to(225_000);
    await expect(h.pages[1].getByRole('region', { name: 'Case result' })).toContainText('Forgery B');
    await expect(h.pages[1].getByRole('table', { name: 'Scores' }).getByRole('row').filter({ hasText: 'Leo' })).toContainText('5');
    await expect(h.pages[1].getByRole('region', { name: 'Case result' })).toContainText('Arrested: Maya');
    await expect(h.pages[2].getByText('Photo access failed during this session. Note this when discussing the result.', { exact: true })).toBeVisible();
    const solution = h.views[1].at(-1).public.solution;
    await h.pages[1].reload();
    await expect(h.pages[1].getByRole('heading', { name: 'Solution', exact: true })).toBeVisible();
    expect(h.views[1].at(-1).public.solution.result).toEqual(solution.result);
  } finally { await h.close(); }
});
