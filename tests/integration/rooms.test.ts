import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, test } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createApplication } from '../../src/server/application.js';
import { systemRuntime } from '../../src/server/runtime.js';
import type { Reply, LobbyView } from '../../src/shared/lobby.js';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
const id = () => randomUUID();
const HOUR = 3_600_000;

function fixtureGame(approved = true, valid = true) {
  const starts: { roster: readonly { id: string; name: string }[]; contentId: string; contentVersion: string }[] = [];
  return { starts, port: { candidate: () => ({ id: 'synthetic-test-case', contentVersion: 'test-1', review: { approved } }), validate: () => valid, start: (input: typeof starts[number]) => { starts.push(input); } } };
}
async function setup(options: Parameters<typeof createApplication>[0] = {}) {
  const app = await createApplication(options); cleanup.push(() => app.close());
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const origin = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  async function socket(cookie?: string) {
    const client = io(origin, { transports: ['websocket'], reconnection: false, extraHeaders: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) } });
    cleanup.push(async () => { client.disconnect(); });
    await new Promise<void>((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); });
    return client;
  }
  async function player() {
    const response = await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    return { cookie, socket: await socket(cookie), clientId: id(), generation: 1, roomCode: '', playerId: '' };
  }
  return { origin, player, socket };
}
type Player = Awaited<ReturnType<Awaited<ReturnType<typeof setup>>['player']>>;
async function ask(socket: Socket, event: string, data: unknown): Promise<Reply> {
  // A missing handler is an observable protocol failure, not a setup failure.
  return new Promise(resolve => socket.timeout(700).emit(event, data, (error: Error | null, reply: Reply) => resolve(error ? { ok: false, error: 'REQUEST_FAILED' } : reply)));
}
function ok(reply: Reply) { expect(reply.ok, JSON.stringify(reply)).toBe(true); if (!reply.ok) throw Error(reply.error); return reply; }
async function enter(p: Player, type: 'create' | 'join', name: string, code?: string, attemptId = id()) {
  const data = { type, name, clientId: p.clientId, attemptId, ...(code ? { code } : {}) };
  const reply = ok(await ask(p.socket, 'lobby:enter', data));
  p.roomCode = reply.view!.room.code; p.playerId = reply.view!.self.id; p.generation = reply.connection!.generation;
  return data;
}
const action = (p: Player, type: string, fields = {}, requestId = id()) => ask(p.socket, 'lobby:action', { type, requestId, roomCode: p.roomCode, generation: p.generation, ...fields });
async function view(p: Player) { return ok(await ask(p.socket, 'lobby:read', { roomCode: p.roomCode })).view!; }
async function four(options: Parameters<typeof createApplication>[0] = {}) {
  const api = await setup(options); const players = await Promise.all(Array.from({ length: 4 }, () => api.player()));
  await enter(players[0], 'create', 'Host');
  for (let i = 1; i < 4; i++) await enter(players[i], 'join', `Player ${i}`, players[0].roomCode);
  return { ...api, players };
}
async function ready(players: Player[]) { for (const p of players) ok(await action(p, 'ready', { ready: true })); }
const error = (reply: Reply, expected: string) => expect(reply).toEqual({ ok: false, error: expected });

test('four independent credentials join the requested room; fifth, bad code and duplicate names fail', async () => {
  const api = await setup(); const host = await api.player(); await enter(host, 'create', '  Maya  ');
  const other = await api.player(); await enter(other, 'create', 'Different host');
  const a = await api.player();
  error(await ask(a.socket, 'lobby:enter', { type: 'join', name: 'maya', code: host.roomCode, clientId: a.clientId, attemptId: id() }), 'NAME_TAKEN');
  for (const code of ['BAD', 'ZZZZZZ']) error(await ask(a.socket, 'lobby:enter', { type: 'join', name: 'Guest', code, clientId: a.clientId, attemptId: id() }), 'ROOM_UNAVAILABLE');
  await enter(a, 'join', 'Leo', host.roomCode.toLowerCase());
  const b = await api.player(); await enter(b, 'join', 'Sam', host.roomCode);
  const c = await api.player(); await enter(c, 'join', 'You', host.roomCode);
  const fifth = await api.player();
  error(await ask(fifth.socket, 'lobby:enter', { type: 'join', name: 'Fifth', code: host.roomCode, clientId: fifth.clientId, attemptId: id() }), 'ROOM_FULL');
  expect((await view(host)).room.players.map(p => p.name)).toEqual(['Maya', 'Leo', 'Sam', 'You']);
  expect((await view(other)).room.players).toHaveLength(1);
});

test('lost create/join receipts retry without allocation; changed payload conflicts', async () => {
  const api = await setup(), host = await api.player(); const create = await enter(host, 'create', 'Host');
  const repeated = ok(await ask(host.socket, 'lobby:enter', create));
  expect(repeated.view!.self.id).toBe(host.playerId); expect(repeated.view!.room.code).toBe(host.roomCode);
  error(await ask(host.socket, 'lobby:enter', { ...create, name: 'Changed' }), 'CONFLICT');
  const p = await api.player(); const join = await enter(p, 'join', 'Guest', host.roomCode);
  ok(await ask(p.socket, 'lobby:enter', join));
  error(await ask(p.socket, 'lobby:enter', { ...join, attemptId: id() }), 'ALREADY_IN_ROOM');
  error(await ask(p.socket, 'lobby:enter', { ...join, name: 'Changed' }), 'CONFLICT');
  expect((await view(host)).room.players).toHaveLength(2);
  ok(await action(p, 'leave'));
  error(await ask(p.socket, 'lobby:enter', join), 'ROOM_UNAVAILABLE');
});

test('membership, not supplied IDs or room knowledge, authorizes reads and owner actions', async () => {
  const { players: [host, p, q], ...api } = await four();
  const outsider = await api.player(); await enter(outsider, 'create', 'Outsider');
  error(await ask(outsider.socket, 'lobby:read', { roomCode: host.roomCode }), 'FORBIDDEN');
  error(await action(outsider, 'ready', { roomCode: host.roomCode, ready: true }), 'FORBIDDEN');
  for (const type of ['start', 'close']) error(await action(p, type), 'FORBIDDEN');
  error(await action(p, 'remove', { targetId: q.playerId }), 'FORBIDDEN');
  error(await action(host, 'remove', { targetId: outsider.playerId }), 'FORBIDDEN');
  error(await action(p, 'ready', { ready: true, playerId: host.playerId }), 'INVALID_REQUEST');
  const guest = await api.socket();
  error(await ask(guest, 'lobby:read', { roomCode: host.roomCode }), 'UNAUTHENTICATED');
  const projected = await view(p);
  expect(Object.keys(projected).sort()).toEqual(['room', 'self']);
  expect(projected.self).toEqual({ id: p.playerId });
  for (const seat of projected.room.players) expect(Object.keys(seat).sort()).toEqual(['connected', 'id', 'name', 'ready']);
  expect(JSON.stringify(projected)).not.toMatch(/credential|sessionId|correctCountry|forgery|receiving/);
});

test('membership changes clear ready status, remove/leave revoke seats, owner must close explicitly', async () => {
  const { players } = await four(); const [host, p, q] = players;
  await ready(players);
  error(await action(host, 'leave'), 'FORBIDDEN');
  error(await action(host, 'remove', { targetId: host.playerId }), 'FORBIDDEN');
  ok(await action(host, 'remove', { targetId: p.playerId }));
  expect((await view(host)).room.players.every(p => !p.ready)).toBe(true);
  error(await action(p, 'ready', { ready: true }), 'ROOM_UNAVAILABLE');
  error(await ask(p.socket, 'lobby:read', { roomCode: host.roomCode }), 'ROOM_UNAVAILABLE');
  ok(await action(q, 'leave')); expect((await view(host)).room.players).toHaveLength(2);
  ok(await action(host, 'close'));
  error(await action(players[3], 'ready', { ready: true }), 'ROOM_UNAVAILABLE');
  expect((await view(host)).room.status).toBe('Closed');
});

test('disconnect clears only that readiness; credential resumes the same owner without migration', async () => {
  const { players, socket } = await four(); const [host, p] = players; await ready(players);
  const seen = new Promise<LobbyView>(resolve => p.socket.on('lobby:snapshot', (v: LobbyView) => { if (v.room.players.some(x => x.id === host.playerId && !x.connected)) resolve(v); }));
  host.socket.disconnect(); const disconnected = await seen;
  expect(disconnected.room.ownerId).toBe(host.playerId); expect(disconnected.room.status).toBe('Lobby');
  expect(disconnected.room.players.find(x => x.id === host.playerId)!.ready).toBe(false);
  expect(disconnected.room.players.find(x => x.id === p.playerId)!.ready).toBe(true);
  host.socket = await socket(host.cookie);
  const resumed = ok(await ask(host.socket, 'lobby:connect', { mode: 'resume', clientId: host.clientId, generation: host.generation }));
  expect(resumed.view!.self.id).toBe(host.playerId); expect(resumed.view!.room.players).toHaveLength(4);
  expect(resumed.connection!.generation).toBe(host.generation);
});

test('explicit takeover is idempotent; stale generations and automatic retry cannot take ownership back', async () => {
  const api = await setup(), p = await api.player(); await enter(p, 'create', 'Host');
  const second = await api.socket(p.cookie); const clientId = id(), attemptId = id();
  const takeover = { mode: 'takeover', clientId, attemptId };
  const result = ok(await ask(second, 'lobby:connect', takeover)); expect(result.connection!.generation).toBe(2);
  expect(ok(await ask(second, 'lobby:connect', takeover)).connection!.generation).toBe(2);
  error(await action(p, 'ready', { ready: true }), 'SESSION_ELSEWHERE');
  error(await ask(p.socket, 'lobby:connect', { mode: 'resume', clientId: p.clientId, generation: 1 }), 'SESSION_ELSEWHERE');
  error(await ask(p.socket, 'lobby:connect', { mode: 'resume', clientId: p.clientId }), 'INVALID_REQUEST');
  const reclaimed = ok(await ask(p.socket, 'lobby:connect', { mode: 'takeover', clientId: p.clientId, attemptId: id() }));
  expect(reclaimed.connection!.generation).toBe(3);
  error(await ask(second, 'lobby:connect', takeover), 'SESSION_ELSEWHERE');
  expect((await view(p)).room.players).toHaveLength(1);
});

test('Start checks readiness, pins a validated version and hands off exactly once; started roster is frozen', async () => {
  const game = fixtureGame(); const { players, player } = await four({ game: game.port }); const host = players[0];
  error(await action(host, 'start'), 'NOT_READY'); await ready(players);
  const requestId = id(); ok(await action(host, 'start', {}, requestId)); ok(await action(host, 'start', {}, requestId));
  expect(game.starts).toHaveLength(1); expect(game.starts[0].contentVersion).toBe('test-1');
  expect(game.starts[0].roster.map(p => p.id)).toEqual(players.map(p => p.playerId));
  expect(Object.isFrozen(game.starts[0].roster)).toBe(true);
  error(await action(host, 'ready', { ready: false }, requestId), 'CONFLICT');
  error(await action(players[1], 'leave'), 'CASE_STARTED');
  const late = await player(); error(await ask(late.socket, 'lobby:enter', { type: 'join', name: 'Late', code: host.roomCode, clientId: late.clientId, attemptId: id() }), 'CASE_STARTED');
});

test('absent, unapproved and invalid content each reject Start with unchanged lobby', async () => {
  for (const game of [undefined, fixtureGame(false).port, fixtureGame(true, false).port, { ...fixtureGame().port, candidate: () => undefined }]) {
    const { players } = await four(game ? { game } : { caseSource: () => undefined }); await ready(players); const before = await view(players[0]);
    error(await action(players[0], 'start'), 'CONTENT_UNAVAILABLE'); expect(await view(players[0])).toEqual(before);
  }
});

test('a processed leave invalidates Start and concurrent start/leave never produces a partial roster', async () => {
  const game = fixtureGame(); const { players } = await four({ game: game.port }); await ready(players);
  const results = await Promise.all([action(players[1], 'leave'), action(players[0], 'start')]);
  if (results[0].ok) { error(results[1], 'NOT_READY'); expect(game.starts).toHaveLength(0); expect((await view(players[0])).room.players).toHaveLength(3); }
  else { error(results[0], 'CASE_STARTED'); ok(results[1]); expect(game.starts[0].roster).toHaveLength(4); }
});

test('lobby expiry revokes credentials and room codes; room-code collisions never overwrite a lobby', async () => {
  let now = 1_000;
  const api = await setup({ runtime: { ...systemRuntime, now: () => now, randomInt: () => 0 } });
  const host = await api.player(); await enter(host, 'create', 'Host'); const second = await api.player();
  error(await ask(second.socket, 'lobby:enter', { type: 'create', name: 'Second', clientId: second.clientId, attemptId: id() }), 'TRY_LATER');
  expect((await view(host)).room.players).toHaveLength(1);
  now += HOUR;
  error(await ask(host.socket, 'lobby:read', { roomCode: host.roomCode }), 'UNAUTHENTICATED');
  const newcomer = await api.player();
  error(await ask(newcomer.socket, 'lobby:enter', { type: 'join', name: 'New', code: host.roomCode, clientId: newcomer.clientId, attemptId: id() }), 'ROOM_UNAVAILABLE');
});

test('entry bounds reject malformed input and cap repeated guesses', async () => {
  const api = await setup(), p = await api.player();
  for (const name of ['', 'x'.repeat(21), 'name\u0000']) error(await ask(p.socket, 'lobby:enter', { type: 'create', name, clientId: p.clientId, attemptId: id() }), 'INVALID_REQUEST');
  for (let i = 0; i < 20; i++) error(await ask(p.socket, 'lobby:enter', { type: 'join', name: 'Guest', code: 'ZZZZZZ', clientId: p.clientId, attemptId: id() }), 'ROOM_UNAVAILABLE');
  error(await ask(p.socket, 'lobby:enter', { type: 'join', name: 'Guest', code: 'ZZZZZZ', clientId: p.clientId, attemptId: id() }), 'TRY_LATER');
});

test('concurrent duplicate joins allocate one seat; competing last-seat requests admit only one player', async () => {
  const api = await setup(), host = await api.player(), a = await api.player(); await enter(host, 'create', 'Host');
  const join = { type: 'join', name: 'Guest', code: host.roomCode, clientId: a.clientId, attemptId: id() };
  const repeated = await Promise.all([ask(a.socket, 'lobby:enter', join), ask(a.socket, 'lobby:enter', join)]);
  expect(ok(repeated[0]).view!.self.id).toBe(ok(repeated[1]).view!.self.id);
  const b = await api.player(); await enter(b, 'join', 'Third', host.roomCode);
  const [c, d] = await Promise.all([api.player(), api.player()]);
  const last = await Promise.all([c, d].map((p, i) => ask(p.socket, 'lobby:enter', { type: 'join', name: `Last ${i}`, code: host.roomCode, clientId: p.clientId, attemptId: id() })));
  expect(last.filter(r => r.ok)).toHaveLength(1); error(last.find(r => !r.ok)!, 'ROOM_FULL');
  expect((await view(host)).room.players).toHaveLength(4);
});

test('a processed guest disconnect blocks Start without changing the remaining lobby state', async () => {
  const game = fixtureGame(), { players } = await four({ game: game.port }); await ready(players);
  const [host, guest] = players;
  const seen = new Promise<void>(resolve => host.socket.on('lobby:snapshot', (v: LobbyView) => { if (v.room.players.some(p => p.id === guest.playerId && !p.connected)) resolve(); }));
  guest.socket.disconnect(); await seen; const before = await view(host);
  error(await action(host, 'start'), 'NOT_READY'); expect(await view(host)).toEqual(before); expect(game.starts).toHaveLength(0);
});

test('invalid case metadata and a failed game handoff leave the lobby unchanged', async () => {
  for (const port of [
    { ...fixtureGame().port, candidate: () => ({ id: 9, contentVersion: '', review: { approved: true } }) },
    { ...fixtureGame().port, start: () => { throw Error('private internal failure'); } },
  ]) {
    const { players } = await four({ game: port }); await ready(players); const before = await view(players[0]);
    const reply = await action(players[0], 'start'); expect(reply.ok).toBe(false);
    expect(JSON.stringify(reply)).not.toContain('private internal failure'); expect(await view(players[0])).toEqual(before);
  }
});

test('missing Origin or a fabricated credential cannot read a room even with its code', async () => {
  const api = await setup(), host = await api.player(); await enter(host, 'create', 'Host');
  const variations: Record<string, string>[] = [{ Cookie: host.cookie }, { Cookie: '__Host-sketchy-session=' + 'x'.repeat(43), Origin: api.origin }];
  for (const headers of variations) {
    const socket = io(api.origin, { transports: ['websocket'], reconnection: false, extraHeaders: headers });
    cleanup.push(async () => { socket.disconnect(); }); await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    error(await ask(socket, 'lobby:read', { roomCode: host.roomCode }), 'UNAUTHENTICATED');
  }
});

test('malformed requests cannot bypass the per-connection request bound', async () => {
  const api = await setup(), p = await api.player();
  for (let i = 0; i < 120; i++) error(await ask(p.socket, 'lobby:enter', { name: 5 }), 'INVALID_REQUEST');
  error(await ask(p.socket, 'lobby:enter', { name: 5 }), 'TRY_LATER');
});
