import { test, expect } from '@playwright/test';
import { browserCaseHarness, draw } from '../helpers/browser-case';
import { case001 } from '../../src/server/content/case-001';

test('lost credential clears private case state and explains the interruption', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  try {
    await h.start();
    await h.contexts[1].clearCookies();
    await h.pages[1].reload();
    await expect(h.pages[1].getByText('Case interrupted; results unavailable', { exact: true })).toBeVisible();
    await expect(h.pages[1].getByText('You are innocent.', { exact: true })).toHaveCount(0);
    await expect(h.pages[0].getByRole('heading', { name: 'Inspect', exact: true })).toBeVisible();
  } finally { await h.close(); }
});

test('connected expiry clears the result and explains normal expiration', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  try {
    await h.start(); h.clock.to(255_000);
    await expect(h.pages[1].getByRole('heading', { name: 'Complete', exact: true })).toBeVisible();
    h.clock.to(3_855_000);
    await expect(h.pages[1].getByText('Room expired.', { exact: true })).toBeVisible();
    await expect(h.pages[1].getByRole('region', { name: 'Case result' })).toHaveCount(0);
  } finally { await h.close(); }
});

for (const content of ['synthetic', 'approved real'] as const) test(`${content}: each phase restores the same identity, accepted state, deadline and permitted disclosures`, async ({ browser }) => {
  const h = await browserCaseHarness(browser, false, content === 'approved real' ? { caseSource: () => case001 } : {});
  try {
    await h.start(); const page = h.pages[1], id = h.views[1].at(-1).self.id, card = h.views[1].at(-1).self.card;
    page.setDefaultTimeout(5_000); page.setDefaultNavigationTimeout(10_000);
    const phases = [[0, 'Inspect'], [45_000, 'Sketch'], [85_000, 'Gallery'], [140_000, 'Interrogate'], [205_000, 'Verdict'], [225_000, 'Solution'], [255_000, 'Complete']] as const;
    for (const [at, phase] of phases) {
      await test.step(phase, async () => {
        console.log(`Recovery phase: ${phase}`);
        h.clock.to(at);
        await expect(page.getByRole('heading', { name: phase, exact: true })).toBeVisible();
        if (phase === 'Sketch') {
          await draw(page); await page.getByLabel('Caption', { exact: true }).fill('accepted bicycle');
          await expect(page.getByLabel('Drawing save status')).toHaveText('Saved');
          expect(h.views[1].at(-1).self.drawing.strokes).toHaveLength(1);
        }
        if (phase === 'Gallery' || phase === 'Verdict') {
          await page.getByRole('button', { name: 'Portugal', exact: true }).click();
          await page.getByLabel('Accuse a player').selectOption({ label: 'Maya' });
          await expect(page.getByLabel('Ballot save status')).toHaveText('Saved');
        }
        const before = structuredClone(h.views[1].at(-1));
        await page.goto('about:blank');
        await expect.poll(() => h.views[0].at(-1).public.players.find((p: any) => p.id === id).connected).toBe(false);
        h.clock.to(at + 500);
        await page.goto(h.origin);
        await expect(page.getByRole('heading', { name: phase, exact: true })).toBeVisible();
        const restored = h.views[1].at(-1);
        expect(restored.caseId).toBe(before.caseId); expect(restored.self).toEqual(before.self);
        expect(restored.self.card).toEqual(card); expect(restored.phaseEndsAt).toBe(before.phaseEndsAt);
        expect(restored.public.gallery).toEqual(before.public.gallery);
        expect(restored.public.evidence).toEqual(before.public.evidence);
        expect(restored.public.solution?.result).toEqual(before.public.solution?.result);
        // A second refresh must replace, not concatenate, accepted strokes and roster.
        await page.reload(); await expect(page.getByRole('heading', { name: phase, exact: true })).toBeVisible();
        expect(h.views[1].at(-1).self).toEqual(before.self);
        expect(h.views[1].at(-1).public.players).toHaveLength(4);
        if (phase === 'Sketch') {
          await page.getByRole('button', { name: 'Submit and lock', exact: true }).click();
          await expect(page.getByLabel('Drawing save status')).toHaveText('Locked');
          const locked = structuredClone(h.views[1].at(-1).self.drawing);
          await page.reload();
          await expect(page.getByLabel('Drawing save status')).toHaveText('Locked');
          expect(h.views[1].at(-1).self.drawing).toEqual(locked);
          await expect(page.getByLabel('Caption', { exact: true })).toBeDisabled();
        }
      });
    }
    for (const stream of h.views) for (const v of stream) {
      if (!['Solution', 'Complete'].includes(v.phase)) {
        expect(v.public.solution).toBeUndefined();
        expect(JSON.stringify(v.public)).not.toMatch(/Private geographic|forgeryOptions|guilt|correctCountry/);
      }
      if (v.serverTime < h.clock.start + 85_000) expect(v.public.gallery).toBeUndefined();
      if (v.serverTime < h.clock.start + 140_000) expect(v.public.evidence).toBeUndefined();
      if (v.self.id === id) expect(v.self.forgeryOptions).toBeUndefined();
    }
  } finally { await h.close(); }
});

test('host interruption, missed evidence and all-offline Verdict catch up without replacing seats or scores', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  try {
    await h.start(); h.clock.to(45_000);
    const page = h.pages[1], id = h.views[1].at(-1).self.id;
    await draw(page); await page.getByLabel('Caption', { exact: true }).fill('survives disconnect');
    await expect(page.getByLabel('Drawing save status')).toHaveText('Saved');
    const accepted = structuredClone(h.views[1].at(-1).self.drawing);
    await h.pages[0].goto('about:blank');
    await page.goto('about:blank');
    await expect.poll(() => h.views[2].at(-1).public.players.filter((p: any) => !p.connected).length).toBe(2);
    h.clock.to(140_000);
    await page.goto(h.origin);
    await expect(page.getByRole('region', { name: 'Evidence sheet' })).toBeVisible();
    expect(h.views[1].at(-1).self.drawing).toMatchObject({ ...accepted, locked: true, lockMode: 'automatic' });
    expect(h.views[1].at(-1).public.gallery.find((p: any) => p.playerId === id).strokes).toEqual(accepted.strokes);
    for (const p of h.pages) await p.goto('about:blank');
    h.clock.to(255_000);
    for (const p of h.pages) { await p.goto(h.origin); await expect(p.getByRole('heading', { name: 'Complete', exact: true })).toBeVisible(); }
    const result = h.views[0].at(-1).public.solution.result;
    expect(result.scores.map((s: any) => s.total)).toEqual([3, 0, 0, 0]);
    for (const stream of h.views) expect(stream.at(-1).public.solution.result).toEqual(result);
  } finally { await h.close(); }
});

test('superseded case tab cannot reclaim automatically on repeated refresh or receive later secrets', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  try {
    await h.start(); const original = h.pages[0], second = await h.contexts[0].newPage();
    await second.goto(h.origin); await second.getByRole('button', { name: 'Resume here' }).click();
    await expect(second.getByRole('heading', { name: 'Inspect', exact: true })).toBeVisible();
    await expect(original.getByRole('alert')).toHaveText('Session opened elsewhere.');
    for (let i = 0; i < 3; i++) {
      await original.reload(); await expect(original.getByRole('alert')).toHaveText('Session opened elsewhere.');
      await expect(second.getByRole('button', { name: 'Choose forgery B' })).toBeEnabled();
    }
    await second.getByRole('button', { name: 'Choose forgery B' }).click();
    await expect(second.getByRole('button', { name: 'Choose forgery B' })).toHaveAttribute('aria-pressed', 'true');
    const oldCount = h.views[0].length;
    h.clock.to(225_000);
    await expect(second.getByRole('heading', { name: 'Solution', exact: true })).toBeVisible();
    await expect(original.getByRole('region', { name: 'Case result' })).toHaveCount(0);
    expect(h.views[0]).toHaveLength(oldCount);
  } finally { await h.close(); }
});

test('lost ACK and read reply can be retried after the drawing deadline with the same request ID', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  let hiding = false, dropped = false;
  const requests: any[] = [];
  await h.pages[1].routeWebSocket('**/socket.io/**', route => {
    const server = route.connectToServer(); const acknowledgements = new Map<string, string>();
    route.onMessage(message => {
      if (typeof message === 'string' && /^42\d+\[/.test(message)) {
        const [event, payload] = JSON.parse(message.slice(message.indexOf('[')));
        if (event === 'game:action') { requests.push(payload); if (!dropped) hiding = true; }
        acknowledgements.set(/^42(\d+)\[/.exec(message)![1], event);
      }
      server.send(message);
    });
    server.onMessage(message => {
      const id = typeof message === 'string' ? /^43(\d+)\[/.exec(message)?.[1] : undefined;
      if (hiding && typeof message === 'string' && (message.startsWith('42["game:snapshot"') || (id && ['game:action', 'game:read'].includes(acknowledgements.get(id)!)))) { dropped = true; return; }
      route.send(message);
    });
  });
  try {
    await h.start(); h.clock.to(45_000);
    await draw(h.pages[1]); await h.pages[1].getByLabel('Caption', { exact: true }).fill('receipt survives deadline');
    await expect(h.pages[1].getByRole('button', { name: 'Retry unconfirmed change' })).toBeVisible({ timeout: 10_000 });
    expect(requests).toHaveLength(1);
    h.clock.to(85_000);
    await expect(h.pages[0].getByRole('region', { name: 'Everyone’s sketches' })).toContainText('receipt survives deadline');
    hiding = false;
    await h.pages[1].getByRole('button', { name: 'Retry unconfirmed change' }).click();
    await expect(h.pages[1].getByRole('heading', { name: 'Gallery', exact: true })).toBeVisible();
    await expect(h.pages[1].getByRole('button', { name: 'Retry unconfirmed change' })).toHaveCount(0);
    expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0]);
    expect(h.views[1].at(-1).self.drawing).toMatchObject({ revision: 1, locked: true, lockMode: 'automatic' });
  } finally { await h.close(); }
});

test('known terminal expiry survives an offline refresh using timing metadata only', async ({ browser }) => {
  const h = await browserCaseHarness(browser);
  try {
    await h.start(); h.clock.to(255_000);
    const page = h.pages[1]; await expect(page.getByRole('heading', { name: 'Complete', exact: true })).toBeVisible();
    const expires = await page.evaluate(() => JSON.parse(sessionStorage.getItem('sketchy-lobby-v1')!).caseRecovery.expiresAtLocal);
    await page.clock.setFixedTime(expires + 1);
    await page.goto('about:blank'); h.clock.to(3_855_000);
    await page.goto(h.origin);
    await expect(page.getByText('Room expired.', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Case result' })).toHaveCount(0);
  } finally { await h.close(); }
});
