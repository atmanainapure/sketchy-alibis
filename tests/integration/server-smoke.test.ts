import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, test } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createApplication } from '../../src/server/application.js';
import { healthSchema } from '../../src/shared/connection.js';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

async function start(dev = false) {
  const application = await createApplication({ dev });
  cleanup.push(() => application.close());
  application.server.listen(0, '127.0.0.1');
  await once(application.server, 'listening');
  return `http://127.0.0.1:${(application.server.address() as AddressInfo).port}`;
}

async function connect(origin: string, transport: 'websocket' | 'polling') {
  const socket: Socket = io(origin, { transports: [transport], reconnection: false, extraHeaders: { Origin: origin } });
  cleanup.push(async () => { socket.disconnect(); });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return socket;
}

describe('single-origin foundation smoke checks', () => {
  test('production serves public HTML, health and four socket clients from one server', async () => {
    const origin = await start();
    const html = await fetch(origin);
    expect(html.status).toBe(200);
    expect(await html.text()).toContain('<title>Sketchy Alibis</title>');
    const health = await fetch(`${origin}/api/health`);
    expect(health.headers.get('cache-control')).toBe('no-store');
    expect(healthSchema.parse(await health.json()).status).toBe('ok');
    const clients = await Promise.all(['websocket', 'polling', 'websocket', 'polling'].map(transport => connect(origin, transport as 'websocket' | 'polling')));
    expect(new Set(clients.map(client => client.id)).size).toBe(4);
  });

  test('production does not serve server source, tests, configuration or arbitrary paths', async () => {
    const origin = await start();
    for (const path of ['/src/server/runtime.ts', '/server/runtime.js', '/src/server/content/case-001.ts', '/server/content/case-001.js', '/assets/private/case-001/scene-001.jpg', '/docs/cases/case-001-review.md', '/tests/integration/client-boundary.test.ts', '/package.json', '/.env', '/missing']) {
      const response = await fetch(`${origin}${path}`);
      expect(response.status, path).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not found' });
    }
  });

  test('development serves transformed HTML and keeps server files outside the Vite allowlist', async () => {
    const origin = await start(true);
    const response = await fetch(origin);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('/@vite/client');
    for (const path of ['/main.tsx', '/@vite/client']) {
      const module = await fetch(`${origin}${path}`);
      expect(module.status, path).toBe(200);
      expect(module.headers.get('content-type')).toContain('javascript');
    }
    await connect(origin, 'websocket');
    for (const path of ['/src/server/runtime.ts', '/src/server/content/case-001.ts', '/assets/private/case-001/scene-001.jpg', '/docs/cases/case-001-review.md']) {
      const privateFile = await fetch(`${origin}/@fs${process.cwd()}${path}`);
      expect([403, 404], path).toContain(privateFile.status);
      const body = await privateFile.text();
      expect(body).not.toContain('randomInt');
      expect(body).not.toContain('correctCountry');
      expect(body).not.toContain('Am61s2Rya2Y');
    }
  });
});
