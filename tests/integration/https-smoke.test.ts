import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { get, request as httpsRequest } from 'node:https';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { io } from 'socket.io-client';
import { createApplication } from '../../src/server/application.js';

test('HTTPS and WSS share a port with certificate validation enabled', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sketchy-alibis-tls-'));
  let application: Awaited<ReturnType<typeof createApplication>> | undefined;
  let socket: ReturnType<typeof io> | undefined;
  try {
    const keyPath = join(directory, 'key.pem');
    const certPath = join(directory, 'cert.pem');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-keyout', keyPath, '-out', certPath], { stdio: 'ignore' });
    const cert = await readFile(certPath);
    application = await createApplication({ tls: { key: await readFile(keyPath), cert } });
    application.server.listen(0, '127.0.0.1');
    await once(application.server, 'listening');
    const origin = `https://127.0.0.1:${(application.server.address() as AddressInfo).port}`;
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const request = get(`${origin}/api/health`, { ca: cert }, response => { response.resume(); resolve(response.statusCode); });
      request.on('error', reject);
    });
    expect(status).toBe(200);
    const cookie = await new Promise<string>((resolve, reject) => {
      const request = httpsRequest(`${origin}/api/session`, { method: 'POST', ca: cert, headers: { Origin: origin, 'Content-Type': 'application/json' } }, response => {
        response.resume();
        if (response.statusCode !== 200) { reject(Error('HTTPS session creation failed')); return; }
        resolve(response.headers['set-cookie']![0].split(';')[0]);
      });
      request.on('error', reject); request.end('{}');
    });
    socket = io(origin, { transports: ['websocket'], ca: cert.toString(), extraHeaders: { Origin: origin, Cookie: cookie }, reconnection: false });
    await new Promise<void>((resolve, reject) => {
      socket!.once('connect', resolve);
      socket!.once('connect_error', reject);
    });
    expect(socket.connected).toBe(true);
    const entry = await socket.timeout(2_000).emitWithAck('lobby:enter', { type: 'create', name: 'TLS host', clientId: randomUUID(), attemptId: randomUUID() });
    expect(entry.ok).toBe(true);
    expect(entry.view.room.players[0].name).toBe('TLS host');
  } finally {
    socket?.disconnect();
    await application?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
