import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import { expect } from 'vitest';
import { createApplication } from '../../src/server/application.js';
import { controlledClock, syntheticCase } from './case-fixture.js';
export { controlledClock, syntheticCase } from './case-fixture.js';

export const requestId = () => randomUUID();
export async function ask(socket: Socket, event: string, payload: unknown): Promise<any> {
  return new Promise(resolve => socket.timeout(1000).emit(event, payload, (error: Error | null, reply: unknown) => resolve(error ? { ok: false, error: 'NO_ACK' } : reply)));
}
export function accepted(reply: any) { expect(reply.ok, JSON.stringify(reply)).toBe(true); return reply; }

export async function gameHarness(pack = syntheticCase(), murderer = 0, caseSource = () => pack) {
  const clock = controlledClock(murderer);
  const app = await createApplication({ runtime: clock.runtime, caseSource });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const origin = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const sockets: Socket[] = [];
  async function connect(cookie: string) {
    const socket = io(origin, { transports: ['websocket'], reconnection: false, extraHeaders: { Origin: origin, Cookie: cookie } });
    sockets.push(socket); await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); }); return socket;
  }
  async function player() {
    const response = await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    return { socket: await connect(cookie), cookie, clientId: requestId(), generation: 1, id: '', roomCode: '' };
  }
  const players: Awaited<ReturnType<typeof player>>[] = [];
  for (let n = 0; n < 4; n++) {
    const p = await player();
    const entered = accepted(await ask(p.socket, 'lobby:enter', { type: n ? 'join' : 'create', ...(n ? { code: players[0].roomCode } : {}), name: `Player ${n}`, clientId: p.clientId, attemptId: requestId() }));
    p.id = entered.view.self.id; p.roomCode = entered.view.room.code; players.push(p);
  }
  const lobby = (n: number, type: string, fields = {}, id = requestId()) => ask(players[n].socket, 'lobby:action', { roomCode: players[n].roomCode, generation: players[n].generation, requestId: id, type, ...fields });
  async function start() { for (let n = 0; n < 4; n++) accepted(await lobby(n, 'ready', { ready: true })); return accepted(await lobby(0, 'start')); }
  const read = async (n: number) => accepted(await ask(players[n].socket, 'game:read', { roomCode: players[n].roomCode })).view;
  const act = async (n: number, action: unknown, id = requestId()) => {
    const v = await read(n);
    return ask(players[n].socket, 'game:action', { roomCode: players[n].roomCode, generation: players[n].generation, caseId: v.caseId, requestId: id, action });
  };
  return { clock, origin, players, pack, connect, player, start, read, act, lobby, close: async () => { sockets.forEach(s => s.disconnect()); await app.close(); } };
}
