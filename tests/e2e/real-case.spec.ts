import { test, expect } from '@playwright/test';
import { case001 as pack } from '../../src/server/content/case-001';
import { draw } from '../helpers/browser-case';

// The configured webServer runs npm start. No fixture pack, injected clock,
// role assignment override, or approval override is used by this journey.
test('approved real case completes through normal Start with four private sessions', async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext()));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const names = ['Maya', 'Leo', 'Sam', 'You'];
  const views: any[][] = pages.map(() => []);
  const pageErrors: string[] = [];
  const assets: string[] = [];
  const responses: Promise<void>[] = [];
  pages.forEach((page, i) => {
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => {
      if (response.url().endsWith('.js')) responses.push(response.text().then(text => { assets.push(text); }));
    });
    page.on('websocket', ws => ws.on('framereceived', frame => {
      const raw = String(frame.payload);
      if (!/^4[23]/.test(raw)) return;
      try {
        const data = JSON.parse(raw.slice(raw.indexOf('[')));
        const view = data[0] === 'game:snapshot' ? data[1] : data[0]?.view;
        if (view?.caseId) views[i].push(view);
      } catch { /* Transport frame is not a case projection. */ }
    }));
  });
  try {
    expect(pack.review.approved).toBe(true);
    for (let i = 0; i < 4; i++) {
      const page = pages[i];
      await page.goto(baseURL!);
      await expect(page.getByRole('status')).toHaveText('Connected to the case desk');
      await page.getByLabel('Your name').fill(names[i]);
      if (i === 0) await page.getByRole('button', { name: 'Create room', exact: true }).click();
      else {
        await page.getByLabel('Code to join').fill((await pages[0].getByLabel('Room code', { exact: true }).textContent())!);
        await page.getByRole('button', { name: 'Join room', exact: true }).click();
      }
      await expect(page.getByLabel('Room code', { exact: true })).toBeVisible();
    }
    for (const page of pages) {
      await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveCount(4);
      await page.getByRole('button', { name: 'Ready', exact: true }).click();
    }
    await pages[0].getByRole('button', { name: 'Start case', exact: true }).click();
    for (const page of pages) await expect(page.getByRole('heading', { name: 'Inspect', exact: true })).toBeVisible();
    const started = views[0][0].phaseEndsAt - 45_000;
    const murderer = views.findIndex(stream => stream.at(-1).self.guilt === 'murderer');
    expect(views.filter(stream => stream.at(-1).self.guilt === 'murderer')).toHaveLength(1);
    const murdererId = views[murderer].at(-1).self.id;
    const innocent = names.findIndex((_, i) => i !== murderer);
    for (let i = 0; i < 4; i++) {
      const page = pages[i], view = views[i].at(-1);
      expect(view.contentVersion).toBe('1.0.0-rc.1');
      await expect(page.getByText('The Last Take', { exact: true })).toBeVisible();
      await expect(page.getByText(pack.opening.fictionNotice, { exact: true })).toBeVisible();
      if (i !== murderer) {
        const card = pack.alibis.find(c => c.id === view.self.card.id)!;
        expect(card.kind).toBe('innocent');
        await expect(page.getByRole('region', { name: 'Your private panel' })).toContainText(card.story);
        for (const detail of card.requiredDetails) await expect(page.getByRole('region', { name: 'Your private panel' })).toContainText(detail);
      }
      const photo = page.getByRole('img', { name: pack.photo.alt });
      await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(3000);
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await expect(page.getByLabel('Photo zoom')).not.toHaveText('100%');
      await page.getByRole('button', { name: 'Reset photo', exact: true }).click();
      await expect(page.getByLabel('Photo zoom')).toHaveText('100%');
      await expect(page.getByRole('link', { name: 'Photograph source' })).toHaveCount(0);
    }
    expect(new Set(views.filter((_, i) => i !== murderer).map(s => s.at(-1).self.card.id)).size).toBe(3);
    await pages[murderer].getByRole('button', { name: 'Choose forgery B' }).click();
    await expect(pages[murderer].getByRole('button', { name: 'Choose forgery B' })).toHaveAttribute('aria-pressed', 'true');
    await expect(pages[0].getByRole('heading', { name: 'Sketch', exact: true })).toBeVisible({ timeout: 50_000 });
    const drawings: any[] = [];
    for (let i = 0; i < 4; i++) {
      const page = pages[i];
      await draw(page);
      await page.getByLabel('Caption', { exact: true }).fill(`Sketch from ${names[i]}`);
      await expect(page.getByLabel('Drawing save status')).toHaveText('Saved');
      if (i < 3) {
        await page.getByRole('button', { name: 'Submit and lock' }).click();
        await expect(page.getByLabel('Drawing save status')).toHaveText('Locked');
        await expect(page.getByLabel('Caption', { exact: true })).toBeDisabled();
      }
      drawings.push(structuredClone(views[i].at(-1).self.drawing));
      await expect(page.getByRole('region', { name: 'Everyone’s sketches' })).toHaveCount(0);
    }
    await expect(pages[0].getByRole('heading', { name: 'Gallery', exact: true })).toBeVisible({ timeout: 45_000 });
    for (const page of pages) {
      await expect(page.getByRole('region', { name: 'Everyone’s sketches' }).getByRole('article')).toHaveCount(4);
      for (const name of names) await expect(page.getByText(`Sketch from ${name}`, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Spain', exact: true }).click();
      await expect(page.getByLabel('Ballot save status')).toHaveText('Saved');
    }
    await expect(pages[0].getByRole('heading', { name: 'Interrogate', exact: true })).toBeVisible({ timeout: 35_000 });
    for (const page of pages) await expect(page.getByRole('region', { name: 'Evidence sheet' })).toHaveCount(0);
    await expect(pages[0].getByRole('region', { name: 'Evidence sheet' })).toBeVisible({ timeout: 30_000 });
    for (const page of pages) {
      const sheet = page.getByRole('region', { name: 'Evidence sheet' });
      await expect(sheet).toContainText(pack.evidence.introduction);
      for (const record of pack.evidence.records) {
        const row = sheet.getByRole('article').filter({ hasText: record.label });
        await expect(row.getByText('Portugal location', { exact: true })).toBeVisible();
        await expect(row.getByText('Spain location', { exact: true })).toBeVisible();
        await expect(row).toContainText(record.PT.text);
        await expect(row).toContainText(record.ES.text);
      }
    }
    await expect(pages[0].getByRole('heading', { name: 'Verdict', exact: true })).toBeVisible({ timeout: 70_000 });
    for (let i = 0; i < 4; i++) {
      const page = pages[i];
      await expect(page.getByLabel('Accuse a player')).toHaveValue('');
      await expect(page.getByRole('button', { name: 'Spain', exact: true })).toHaveAttribute('aria-pressed', 'false');
      await page.getByRole('button', { name: 'Portugal', exact: true }).click();
      await page.getByLabel('Accuse a player').selectOption({ label: names[i === murderer ? innocent : murderer] });
      await expect(page.getByLabel('Ballot save status')).toHaveText('Saved');
      await expect(page.getByRole('region', { name: 'Case result' })).toHaveCount(0);
    }
    await expect(pages[0].getByRole('heading', { name: 'Solution', exact: true })).toBeVisible({ timeout: 25_000 });
    for (const page of pages) {
      const result = page.getByRole('region', { name: 'Case result' });
      await expect(result).toContainText(`${names[murderer]} was the murderer`);
      await expect(result).toContainText(`Arrested: ${names[murderer]}`);
      await expect(result).toContainText(pack.solution.geography);
      await expect(result).toContainText(pack.solution.wrongColumnExplanation);
      for (const explanation of pack.solution.alibiExplanations) await expect(result).toContainText(explanation.text);
      for (const card of pack.alibis) await expect(result).toContainText(card.story);
      await expect(result).toContainText(pack.provenance.credit);
      await expect(page.getByRole('link', { name: 'Photograph source' })).toHaveAttribute('href', pack.provenance.sourcePage);
      await expect(page.getByRole('table', { name: 'Scores' }).getByRole('row')).toHaveCount(5);
    }
    const resultAtSolution = structuredClone(views[0].at(-1).public.solution.result);
    for (const page of pages) await expect(page.getByRole('heading', { name: 'Complete', exact: true })).toBeVisible({ timeout: 35_000 });
    for (let i = 0; i < 4; i++) {
      const stream = views[i], final = stream.at(-1), solution = final.public.solution;
      expect(new Set(stream.map(v => v.phase))).toEqual(new Set(['Inspect', 'Sketch', 'Gallery', 'Interrogate', 'Verdict', 'Solution', 'Complete']));
      expect(solution.result).toEqual(resultAtSolution);
      expect(solution.selectedForgery).toBe('B');
      expect(solution.result.arrestedId).toBe(murdererId);
      expect(solution.result.scores.map((s: any) => s.total)).toEqual(names.map((_, n) => n === murderer ? 2 : 5));
      expect(solution.result.winnerIds).toHaveLength(3);
      expect(solution.observation.events.filter((e: any) => e.type === 'phase').map((e: any) => e.at - started)).toEqual([0, 45_000, 85_000, 115_000, 205_000, 225_000, 255_000]);
      expect(solution.observation.events.filter((e: any) => e.type === 'evidence').map((e: any) => e.at - started)).toEqual([140_000]);
      for (let j = 0; j < 4; j++) expect(final.public.gallery[j]).toMatchObject({ strokes: drawings[j].strokes, caption: drawings[j].caption, lockMode: j < 3 ? 'submitted' : 'automatic' });
      for (const view of stream) {
        expect(view.self.id).toBe(stream[0].self.id);
        if (i !== murderer) expect(view.self.forgeryOptions).toBeUndefined();
        if (view.serverTime < started + 85_000) expect(view.public.gallery).toBeUndefined();
        if (view.serverTime < started + 140_000) expect(view.public.evidence).toBeUndefined();
        if (view.serverTime < started + 225_000) {
          expect(view.public.solution).toBeUndefined();
          expect(JSON.stringify(view.public)).not.toMatch(/guilt|forgeryOptions|correctCountry|alibiExplanations|ballots|provenance/);
          for (const card of pack.alibis) expect(JSON.stringify(view.public)).not.toContain(card.story);
          // Own ballots legitimately contain another player's public ID. Cards do not.
          for (const card of pack.alibis) if (card.id !== view.self.card?.id && !(i === murderer && card.kind === 'forgery')) expect(JSON.stringify(view.self)).not.toContain(card.story);
        }
      }
    }
    await Promise.all(responses);
    expect(assets.length).toBeGreaterThan(0);
    for (const text of assets) {
      for (const card of pack.alibis) expect(text).not.toContain(card.story);
      expect(text).not.toContain(pack.provenance.sourcePage);
    }
    expect(pageErrors).toEqual([]);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(255_000);
    console.info(`Approved real case: ${elapsed}ms; four isolated contexts; normal server clock and random roles; forgery B; three submissions and one automatic lock; zero page errors.`);
  } finally { await Promise.allSettled(contexts.map(c => c.close())); }
});
