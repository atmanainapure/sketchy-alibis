import { afterEach, expect, test } from 'vitest';
import { gameHarness, ask, accepted, requestId } from '../helpers/game-harness';
const running: Awaited<ReturnType<typeof gameHarness>>[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(h => h.close())); });
async function setup() { const h = await gameHarness(); running.push(h); await h.start(); return h; }
const strokes = [[{ x: .2, y: .3 }, { x: .8, y: .7 }]];

test.each([
  { type: 'choose-forgery', at: 44_999, end: 45_000, fields: { option: 'B' } },
  { type: 'save-drawing', at: 84_999, end: 85_000, fields: { expectedRevision: 0, strokes, caption: 'accepted draft' } },
  { type: 'submit-drawing', at: 84_999, end: 85_000, fields: { expectedRevision: 0, strokes, caption: 'accepted submission' } },
  { type: 'save-initial', at: 114_999, end: 115_000, fields: { expectedRevision: 0, country: 'PT', suspectId: null } },
  { type: 'save-final', at: 224_999, end: 225_000, fields: { expectedRevision: 0, country: 'PT', suspectId: null, reason: 'accepted reason' } },
])('$type lost ACK retries keep the original receipt across reconnect and the exact deadline', async ({ type, at, end, fields }) => {
  const h = await setup(), p = h.players[0], initial = await h.read(0);
  const request = { roomCode: p.roomCode, generation: 1, caseId: initial.caseId, requestId: requestId(), action: { type, ...fields } };
  h.clock.to(at, false);
  const receipt = accepted(await ask(p.socket, 'game:action', request)); // Held away from the simulated client.
  p.socket.disconnect(); h.clock.to(end, false);
  p.socket = await h.connect(p.cookie);
  accepted(await ask(p.socket, 'lobby:connect', { mode: 'resume', clientId: p.clientId, generation: 1 }));
  const before = await h.read(0);
  expect(await ask(p.socket, 'game:action', request)).toEqual(receipt);
  expect(await ask(p.socket, 'game:action', { ...request, requestId: requestId() })).toMatchObject({ ok: false, error: 'PHASE_ENDED' });
  const after = await h.read(0);
  expect(after.self).toEqual(before.self);
  expect(after.public.solution?.result).toEqual(before.public.solution?.result);
  if (type.includes('drawing')) expect(after.public.gallery[0]).toMatchObject({ strokes, caption: fields.caption, lockMode: type === 'save-drawing' ? 'automatic' : 'submitted' });
  // Revocation is checked before the receipt cache. Old sockets cannot replay it.
  const takeover = await h.connect(p.cookie);
  accepted(await ask(takeover, 'lobby:connect', { mode: 'takeover', clientId: requestId(), attemptId: requestId() }));
  expect(await ask(p.socket, 'game:action', request)).toMatchObject({ ok: false, error: 'SESSION_ELSEWHERE' });
  expect(await ask(p.socket, 'game:read', { roomCode: p.roomCode })).toMatchObject({ ok: false, error: 'SESSION_ELSEWHERE' });
});

test.each([false, true])('autosave/submission race is atomic (submit first: %s)', async submitFirst => {
  const h = await setup(); h.clock.to(45_000);
  const draft = { type: 'save-drawing', expectedRevision: 0, strokes, caption: 'draft' };
  const submit = { ...draft, type: 'submit-drawing', caption: 'submitted' };
  const replies = await Promise.all((submitFirst ? [submit, draft] : [draft, submit]).map(a => h.act(1, a)));
  expect(replies[0].ok).toBe(true);
  expect(replies[1]).toMatchObject({ ok: false, error: submitFirst ? 'LOCKED' : 'STALE_REVISION' });
  h.clock.to(85_000);
  expect((await h.read(1)).self.drawing).toMatchObject({ revision: 1, caption: submitFirst ? 'submitted' : 'draft', locked: true, lockMode: submitFirst ? 'submitted' : 'automatic' });
});

test('all offline through Verdict retains one result; newcomer, expired credential and old subscriptions cannot recover secrets', async () => {
  const h = await setup(), caseId = (await h.read(0)).caseId;
  for (const p of h.players) p.socket.disconnect();
  h.clock.to(255_000);
  const stranger = await h.player();
  expect(await ask(stranger.socket, 'lobby:enter', { type: 'join', name: 'Player 0', code: h.players[0].roomCode, clientId: stranger.clientId, attemptId: requestId() })).toMatchObject({ error: 'CASE_STARTED' });
  for (const p of h.players) {
    p.socket = await h.connect(p.cookie);
    accepted(await ask(p.socket, 'lobby:connect', { mode: 'resume', clientId: p.clientId, generation: 1 }));
  }
  const restored = await h.read(0);
  expect(restored).toMatchObject({ phase: 'Complete', caseId });
  expect(restored.public.solution.result.scores.map((p: any) => p.total)).toEqual([3, 0, 0, 0]);
  expect(restored.public.solution.observation.events.filter((e: any) => e.type === 'phase' && e.phase === 'Solution')).toHaveLength(1);
  expect((await h.read(3)).public.solution.result).toEqual(restored.public.solution.result);
  h.clock.to(3_855_000);
  for (const p of h.players) {
    expect(await ask(p.socket, 'game:read', { roomCode: p.roomCode })).toMatchObject({ error: 'UNAUTHENTICATED' });
    expect(await ask(p.socket, 'lobby:connect', { mode: 'resume', clientId: p.clientId, generation: 1 })).toMatchObject({ error: 'UNAUTHENTICATED' });
    const photo = await fetch(`${h.origin}/api/rooms/${p.roomCode}/cases/${caseId}/photo`, { headers: { Cookie: p.cookie } });
    expect(photo.status).toBe(404);
  }
});
