import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { test, expect } from '@playwright/test';

test('actual authority process loss interrupts the approved real case without reconstruction', async ({ browser }) => {
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = (reservation.address() as AddressInfo).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  let child: ChildProcess | undefined;
  async function start() {
    child = spawn(process.execPath, ['dist/server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise<void>((resolve, reject) => {
      child!.once('error', reject);
      child!.once('exit', () => reject(Error('Local test authority exited before readiness')));
      child!.stdout!.on('data', data => { if (String(data).includes(`Sketchy Alibis: ${origin}`)) resolve(); });
    });
  }
  async function stop() { if (child && child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; } }
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext()));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await start();
    for (let i = 0; i < 4; i++) {
      const page = pages[i]; await page.goto(origin);
      await expect(page.getByRole('status')).toHaveText('Connected to the case desk');
      await page.getByLabel('Your name').fill(`Player ${i}`);
      if (i === 0) await page.getByRole('button', { name: 'Create room', exact: true }).click();
      else {
        await page.getByLabel('Code to join').fill((await pages[0].getByLabel('Room code', { exact: true }).textContent())!);
        await page.getByRole('button', { name: 'Join room', exact: true }).click();
      }
      await expect(page.getByLabel('Room code', { exact: true })).toBeVisible();
    }
    for (const p of pages) await p.getByRole('button', { name: 'Ready', exact: true }).click();
    await pages[0].getByRole('button', { name: 'Start case', exact: true }).click();
    for (const p of pages) await expect(p.getByRole('heading', { name: 'Inspect', exact: true })).toBeVisible();
    const metadata = await pages[1].evaluate(() => JSON.parse(sessionStorage.getItem('sketchy-lobby-v1')!));
    expect(Object.keys(metadata.caseRecovery)).toEqual(['expiresAtLocal']);
    const credentials = await contexts[1].cookies(); // Memory only, never output or saved.
    await stop(); await start();
    // One refresh; others recover through their normal reconnect loop.
    await pages[1].reload();
    for (const p of pages) {
      await expect(p.getByText('Case interrupted; results unavailable', { exact: true })).toBeVisible();
      await expect(p.getByRole('region', { name: 'Case result' })).toHaveCount(0);
      await expect(p.getByRole('heading', { name: 'Inspect', exact: true })).toHaveCount(0);
    }
    const replay = await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: credentials.map(c => `${c.name}=${c.value}`).join('; ') }, body: '{}' });
    expect(await replay.json()).toEqual({ hasMembership: false });
    await pages[1].getByLabel('Your name').fill('Player 1');
    await pages[1].getByLabel('Code to join').fill(metadata.roomCode);
    await pages[1].getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(pages[1].getByRole('alert')).toHaveText('Room unavailable.');
  } finally { await Promise.allSettled(contexts.map(c => c.close())); await stop(); }
});
