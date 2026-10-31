import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, test } from 'vitest';
import { createApplication } from '../../src/server/application.js';

const apps: Awaited<ReturnType<typeof createApplication>>[] = [];
afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });
async function server() {
  const app = await createApplication(); apps.push(app);
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  return `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
}

test('issues a private secure cookie, reuses it, and never puts the credential in JSON', async () => {
  const origin = await server();
  expect((await fetch(`${origin}/api/health`)).status).toBe(200);
  const response = await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
  expect(response.status).toBe(200);
  const cookie = response.headers.get('set-cookie')!;
  expect(cookie).toMatch(/^__Host-sketchy-session=[\w-]{43};/);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) expect(cookie).toContain(flag);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ hasMembership: false });
  const retry = await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: origin, Cookie: cookie.split(';')[0], 'Content-Type': 'application/json' }, body: '{}' });
  expect(await retry.json()).toEqual({ hasMembership: false });
  expect(retry.headers.get('set-cookie')).toBeNull();
});

test('rejects missing/cross-site origins and non-JSON session requests', async () => {
  const origin = await server();
  const variations: Record<string, string>[] = [{}, { Origin: 'https://attacker.example' }, { Origin: 'null' }, { Origin: origin, 'Content-Type': 'text/plain' }];
  for (const headers of variations) {
    const response = await fetch(`${origin}/api/session`, { method: 'POST', headers, body: '{}' });
    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  }
});

test('origin configuration rejects non-HTTP schemes even on loopback', async () => {
  const application = createApplication({ publicOrigin: 'ftp://localhost' });
  void application.then(app => apps.push(app), () => {});
  await expect(application).rejects.toThrow(/APP_ORIGIN/);
});

test('browser cookie does not expire before a late-created lobby and its closed-room retention', async () => {
  const origin = await server();
  const response = await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
  const maxAge = Number(/Max-Age=(\d+)/.exec(response.headers.get('set-cookie')!)![1]);
  // Nearly one hour before creation, nearly one hour in Lobby, one hour Closed.
  expect(maxAge).toBeGreaterThanOrEqual(3 * 60 * 60);
});
