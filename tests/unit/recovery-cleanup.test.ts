import { expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Sessions, SESSION_COOKIE } from '../../src/server/rooms/sessions';
import { Rooms } from '../../src/server/rooms/authority';
import { CaseGames } from '../../src/server/game/authority';
import { controlledClock, syntheticCase } from '../helpers/case-fixture';

test('expiry forgets the authority, receipts, observation records, room memberships and credentials', () => {
  const clock = controlledClock(), sessions = new Sessions(clock.runtime);
  const games = new CaseGames(clock.runtime, syntheticCase, () => {});
  const delivered: { socket: string; event: string }[] = [];
  const rooms = new Rooms(clock.runtime, sessions, (socket, event) => delivered.push({ socket, event }), games);
  const players = [0, 1, 2, 3].map(i => ({ ...sessions.create()!, socket: `socket-${i}`, clientId: randomUUID() }));
  let code = '', ownerId = '';
  players.forEach((p, i) => {
    const reply = rooms.enter(p.session, p.socket, { type: i ? 'join' : 'create', ...(i ? { code } : {}), name: `Player ${i}`, clientId: p.clientId, attemptId: randomUUID() } as any);
    if (!reply.ok || !reply.view) throw Error('Test setup failed'); code = reply.view.room.code; if (i === 0) ownerId = reply.view.self.id;
    rooms.act(p.session, p.socket, { roomCode: code, generation: 1, requestId: randomUUID(), type: 'ready', ready: true });
  });
  // Joins reset readiness: restore all four before Start.
  for (const p of players) rooms.act(p.session, p.socket, { roomCode: code, generation: 1, requestId: randomUUID(), type: 'ready', ready: true });
  rooms.act(players[0].session, players[0].socket, { roomCode: code, generation: 1, requestId: randomUUID(), type: 'start' });
  expect(games.caseFor(code)).toBeDefined();
  clock.to(255_000); rooms.sweep();
  expect(games.caseFor(code)?.view(ownerId).phase).toBe('Complete');
  clock.to(3_855_000); rooms.sweep();
  expect(games.caseFor(code)).toBeUndefined();
  for (const p of players) {
    expect(rooms.hasMembership(p.session)).toBe(false);
    expect(sessions.get(`${SESSION_COOKIE}=${p.token}`)).toBeUndefined();
    expect(() => rooms.read(p.session, p.socket, code)).toThrow();
  }
  expect(delivered.filter(d => d.event === 'lobby:ended')).toHaveLength(4);
  const count = delivered.length; rooms.gameChanged(code); rooms.sweep();
  expect(delivered).toHaveLength(count);
  rooms.close();
});
