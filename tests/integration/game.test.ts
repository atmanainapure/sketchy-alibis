import { afterEach, expect, test } from 'vitest';
import { accepted, ask, gameHarness, requestId, syntheticCase } from '../helpers/game-harness';

const running: Awaited<ReturnType<typeof gameHarness>>[] = [];
afterEach(async () => { for (const h of running.splice(0)) await h.close(); });
async function setup(pack = syntheticCase(), murderer = 0) { const h = await gameHarness(pack, murderer); running.push(h); return h; }

test('Start assigns one reproducible murderer, three distinct private alibis and a stable case', async () => {
  const h = await setup(); const startId = requestId();
  for (let i = 0; i < 4; i++) accepted(await h.lobby(i, 'ready', { ready: true }));
  accepted(await h.lobby(0, 'start', {}, startId));
  const views = await Promise.all(h.players.map((_, i) => h.read(i)));
  expect(views.map(v => v.self.guilt)).toEqual(['murderer', 'innocent', 'innocent', 'innocent']);
  expect(new Set(views.slice(1).map(v => v.self.card.id)).size).toBe(3);
  expect(views[0].self.forgeryOptions.map((c: any) => c.option)).toEqual(['A', 'B']);
  expect(views[0].self.card).toBeNull();
  for (const v of views) {
    expect(v.phase).toBe('Inspect'); expect(v.phaseEndsAt).toBe(h.clock.start + 45_000);
    expect(Object.keys(v.public).sort()).toEqual(['countries', 'opening', 'photo', 'players']);
    expect(JSON.stringify(v.public)).not.toMatch(/forgery|correctCountry|Private|guilt|credential|session/);
  }
  accepted(await h.lobby(0, 'start', {}, startId)); expect(await h.read(0)).toEqual(views[0]);
  const innocentSocket = await h.connect(h.players[1].cookie);
  accepted(await ask(innocentSocket, 'lobby:connect', { mode: 'resume', clientId: h.players[1].clientId, generation: 1 }));
  const restored = accepted(await ask(innocentSocket, 'game:read', { roomCode: h.players[1].roomCode })).view;
  expect(restored.self.card).toEqual(views[1].self.card); expect(restored.caseId).toBe(views[1].caseId);
});

test('authority advances without player actions at every deadline, defaults A privately, and expires', async () => {
  const h = await setup(); await h.start();
  const boundaries = [[45_000, 'Inspect', 'Sketch'], [85_000, 'Sketch', 'Gallery'], [115_000, 'Gallery', 'Interrogate'], [205_000, 'Interrogate', 'Verdict'], [225_000, 'Verdict', 'Solution'], [255_000, 'Solution', 'Complete']] as const;
  for (const [time, before, after] of boundaries) {
    h.clock.to(time - 1); expect((await h.read(0)).phase).toBe(before);
    h.clock.to(time); expect((await h.read(0)).phase).toBe(after);
    h.clock.to(time + 1); expect((await h.read(0)).phase).toBe(after);
    if (after === 'Sketch') {
      expect((await h.read(0)).self.forgery).toEqual({ selected: 'A', locked: true, defaulted: true });
      expect((await h.read(1)).self.forgery).toBeUndefined();
    }
  }
  const result = await h.read(0);
  expect(result.public.solution.result.scores.map((s: any) => s.total)).toEqual([3, 0, 0, 0]);
  expect(result.expiresAt).toBe(h.clock.start + 255_000 + 3_600_000);
  expect(result.public.solution.observation.events.filter((e: any) => e.type === 'phase').map((e: any) => e.at - h.clock.start)).toEqual([0, 45_000, 85_000, 115_000, 205_000, 225_000, 255_000]);
  h.clock.to(255_000 + 3_600_000);
  expect(await ask(h.players[0].socket, 'game:read', { roomCode: h.players[0].roomCode })).toMatchObject({ ok: false, error: 'UNAUTHENTICATED' });
});

test('delayed wakeups catch up in order without extending phases or exposing early evidence', async () => {
  const h = await setup(); await h.start();
  h.clock.to(139_999, false); const before = await h.read(1);
  expect(before.phase).toBe('Interrogate'); expect(before.public.evidence).toBeUndefined();
  h.clock.to(140_000, false); const release = await h.read(1);
  expect(release.public.evidence).toEqual(h.pack.evidence);
  h.clock.to(140_001); expect((await h.read(2)).public.evidence).toEqual(h.pack.evidence);
  h.clock.to(256_000, false); const end = await h.read(2);
  expect(end.phase).toBe('Complete');
  expect(end.public.solution.observation.events.filter((e: any) => e.type === 'evidence')).toEqual([{ type: 'evidence', at: h.clock.start + 140_000 }]);
  expect(end.public.solution.cards).toHaveLength(4); expect(end.public.solution.forgeryOptions).toHaveLength(2);
});

test('runtime schema refuses malformed or unapproved packs without starting the lobby', async () => {
  for (const change of [(p: any) => p.review.approved = false, (p: any) => p.alibis.pop(), (p: any) => p.countries[1].id = 'PT', (p: any) => p.evidence.releaseAtMs = 1000]) {
    const pack = syntheticCase(); change(pack); const h = await setup(pack);
    for (let n = 0; n < 4; n++) accepted(await h.lobby(n, 'ready', { ready: true }));
    const before = accepted(await ask(h.players[0].socket, 'lobby:read', { roomCode: h.players[0].roomCode })).view;
    expect(await h.lobby(0, 'start')).toEqual({ ok: false, error: 'CONTENT_UNAVAILABLE' });
    expect(accepted(await ask(h.players[0].socket, 'lobby:read', { roomCode: h.players[0].roomCode })).view).toEqual(before);
  }
});

const marks = [[{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.7 }]];
const drawing = (expectedRevision = 0, caption = 'one two three four five') => ({ type: 'save-drawing', expectedRevision, strokes: marks, caption });
const ballot = (type = 'save-final', expectedRevision = 0, country: string | null = null, suspectId: string | null = null, reason = '') => ({ type, expectedRevision, country, suspectId, ...(type === 'save-final' ? { reason } : {}) });

test('only murderer selects A/B; exact-boundary actions fail but accepted retries retain their receipt', async () => {
  const h = await setup(); await h.start();
  expect(await h.act(1, { type: 'choose-forgery', option: 'B' })).toMatchObject({ ok: false, error: 'FORBIDDEN' });
  const id = requestId(); const a = { type: 'choose-forgery', option: 'B' };
  accepted(await h.act(0, { type: 'choose-forgery', option: 'A' }));
  h.clock.to(44_999); const original = accepted(await h.act(0, a, id));
  expect(await h.act(0, drawing())).toMatchObject({ ok: false, error: 'ACTION_NOT_AVAILABLE', view: { phase: 'Inspect' } });
  h.clock.to(45_000, false);
  expect(await h.act(0, { type: 'choose-forgery', option: 'A' })).toMatchObject({ ok: false, error: 'PHASE_ENDED', view: { phase: 'Sketch' } });
  h.clock.to(45_001); expect(await h.act(0, a, id)).toEqual(original);
  expect(await h.act(0, { type: 'choose-forgery', option: 'A' }, id)).toMatchObject({ ok: false, error: 'CONFLICT' });
  expect((await h.read(0)).self.card.option).toBe('B');
  h.clock.to(140_000); expect((await h.read(0)).public.evidence).toEqual(h.pack.evidence);
});

test('drawing revisions and caption validation protect accepted work; explicit submission stays private until Gallery', async () => {
  const h = await setup(); await h.start(); h.clock.to(45_000);
  accepted(await h.act(1, drawing()));
  expect(await h.act(1, drawing(0, 'stale'))).toMatchObject({ ok: false, error: 'STALE_REVISION', view: { self: { drawing: { revision: 1 } } } });
  for (const caption of ['one two three four five six', 'x'.repeat(81)]) expect(await h.act(1, drawing(1, caption))).toMatchObject({ ok: false, error: 'INVALID_REQUEST' });
  expect((await h.read(1)).self.drawing.caption).toBe('one two three four five');
  const id = requestId(), submit = { ...drawing(1, '  <b>my sketch</b>  '), type: 'submit-drawing' };
  const receipt = accepted(await h.act(1, submit, id));
  expect((await h.read(1)).self.drawing).toMatchObject({ revision: 2, locked: true, lockMode: 'submitted', caption: '<b>my sketch</b>' });
  for (const type of ['save-drawing', 'submit-drawing']) expect(await h.act(1, { ...drawing(2), type })).toMatchObject({ ok: false, error: 'LOCKED' });
  const peer = await h.read(0); expect(peer.public.gallery).toBeUndefined(); expect(JSON.stringify(peer)).not.toContain('<b>my sketch</b>');
  h.clock.to(84_999); expect((await h.read(1)).phase).toBe('Sketch');
  h.clock.to(85_000); const gallery = (await h.read(0)).public.gallery;
  expect(gallery.find((d: any) => d.playerId === h.players[1].id)).toMatchObject({ strokes: marks, caption: '<b>my sketch</b>', lockMode: 'submitted' });
  expect(await h.act(1, submit, id)).toEqual(receipt);
});

test('deadline auto-locks partial work, retains blank captions, rejects newly late input and never pauses', async () => {
  const h = await setup(); await h.start(); h.clock.to(45_000);
  expect(await h.act(0, { ...drawing(), type: 'submit-drawing', strokes: [] })).toMatchObject({ ok: false, error: 'EMPTY_DRAWING' });
  accepted(await h.act(1, drawing()));
  accepted(await h.act(2, { ...drawing(0, 'caption without marks'), strokes: [] }));
  h.clock.to(84_999); accepted(await h.act(3, { ...drawing(), type: 'submit-drawing' }));
  h.clock.to(85_000, false);
  expect(await h.act(1, drawing(1, 'late work'))).toMatchObject({ ok: false, error: 'PHASE_ENDED', view: { phase: 'Gallery' } });
  h.clock.to(85_001);
  expect((await h.read(0)).public.gallery.map((d: any) => d.lockMode)).toEqual(['missing', 'automatic', 'missing', 'submitted']);
  expect((await h.read(2)).self.drawing).toMatchObject({ strokes: [], caption: 'caption without marks', locked: true });
  h.clock.to(205_000); accepted(await h.act(0, ballot('save-final', 0, 'PT', h.players[1].id)));
  h.clock.to(225_000); expect((await h.read(0)).public.solution.result.scores[0].total).toBe(5);
});

test('initial choices freeze separately; final ballots validate targets, revisions, reason length and clearing', async () => {
  const h = await setup(); await h.start(); h.clock.to(85_000);
  accepted(await h.act(1, ballot('save-initial', 0, 'PT', h.players[0].id)));
  h.clock.to(114_999); accepted(await h.act(1, ballot('save-initial', 1, 'ES', h.players[2].id)));
  h.clock.to(115_000, false); expect(await h.act(1, ballot('save-initial', 2, 'PT'))).toMatchObject({ ok: false, error: 'PHASE_ENDED' });
  h.clock.to(115_001); expect(await h.act(1, ballot())).toMatchObject({ ok: false, error: 'ACTION_NOT_AVAILABLE' });
  h.clock.to(205_000);
  expect((await h.read(1)).self.final).toMatchObject({ revision: 0, country: null, suspectId: null, reason: '', locked: false });
  for (const invalid of [ballot('save-final', 0, 'XX'), ballot('save-final', 0, null, h.players[1].id), ballot('save-final', 0, null, requestId()), ballot('save-final', 0, 'PT', null, 'x'.repeat(161))]) {
    expect(await h.act(1, invalid)).toMatchObject({ ok: false, error: 'INVALID_REQUEST' });
  }
  accepted(await h.act(1, ballot('save-final', 0, 'PT', h.players[0].id, 'private reason')));
  expect(await h.act(1, ballot('save-final', 0, 'ES'))).toMatchObject({ ok: false, error: 'STALE_REVISION' });
  expect(JSON.stringify(await h.read(0))).not.toContain('private reason');
  h.clock.to(224_999); const id = requestId(), clear = ballot('save-final', 1, null, null, 'cleared');
  const original = accepted(await h.act(1, clear, id));
  h.clock.to(225_000, false); expect(await h.act(1, ballot('save-final', 2, 'PT'))).toMatchObject({ ok: false, error: 'PHASE_ENDED' });
  h.clock.to(225_001); expect(await h.act(1, clear, id)).toEqual(original);
  const solution = (await h.read(0)).public.solution;
  expect(solution.ballots[1]).toMatchObject({ initial: { country: 'ES', suspectId: h.players[2].id }, final: { country: null, suspectId: null, reason: 'cleared' } });
});

test.each([
  { name: '2–1–1 arrests murderer; murderer vote counts', votes: [1, 0, 0, 2], arrest: 0, totals: [2, 5, 3, 0], winners: [1] },
  { name: '2–2 tie preserves personal correct accusations', votes: [1, 0, 0, 1], arrest: null, totals: [5, 5, 3, 0], winners: [0, 1] },
  { name: 'zero votes means escape', votes: [null, null, null, null], arrest: null, totals: [5, 2, 0, 0], winners: [0] },
  { name: 'one vote can arrest an innocent without a majority', votes: [1, null, null, null], arrest: 1, totals: [5, 2, 0, 0], winners: [0] },
  { name: 'one innocent vote catches murderer; partial fields count', votes: [null, 0, null, null], arrest: 0, totals: [2, 5, 0, 0], winners: [1] },
])('$name', async ({ votes, arrest, totals, winners }) => {
  const h = await setup(); await h.start(); h.clock.to(205_000);
  for (let n = 0; n < 4; n++) accepted(await h.act(n, ballot('save-final', 0, ['PT', 'PT', 'ES', null][n], votes[n] === null ? null : h.players[votes[n]!].id)));
  h.clock.to(225_000); const solution = (await h.read(0)).public.solution;
  const result = solution.result;
  expect(result.arrestedId).toBe(arrest === null ? null : h.players[arrest].id);
  expect(result.scores.map((s: any) => s.total)).toEqual(totals);
  expect(result.winnerIds).toEqual(winners.map(n => h.players[n].id));
  expect(result.scores[0].accusation).toBe(0);
  expect(result.tally.reduce((sum: number, p: any) => sum + p.votes, 0)).toBe(votes.filter(v => v !== null).length);
  h.clock.to(300_000); expect((await h.read(3)).public.solution.result).toEqual(result);
});

test('authority uses verified membership and current socket, never supplied actor, role, phase or score', async () => {
  const h = await setup(); await h.start(); const outsider = await h.player();
  const other = accepted(await ask(outsider.socket, 'lobby:enter', { type: 'create', name: 'Other', clientId: outsider.clientId, attemptId: requestId() }));
  expect(await ask(outsider.socket, 'game:read', { roomCode: h.players[0].roomCode })).toEqual({ ok: false, error: 'FORBIDDEN' });
  const v = await h.read(0);
  const request = { roomCode: h.players[0].roomCode, generation: 1, caseId: v.caseId, requestId: requestId(), action: { type: 'choose-forgery', option: 'B' } };
  expect(await ask(outsider.socket, 'game:action', request)).toMatchObject({ ok: false, error: 'FORBIDDEN' });
  expect(await ask(h.players[1].socket, 'game:action', { ...request, playerId: h.players[0].id })).toMatchObject({ ok: false, error: 'INVALID_REQUEST' });
  for (const action of [{ type: 'advance', phase: 'Solution' }, { type: 'score', score: 5 }, { type: 'choose-forgery', option: 'B', guilt: 'murderer' }]) expect(await h.act(0, action)).toMatchObject({ ok: false, error: 'INVALID_REQUEST' });
  expect(await ask(h.players[0].socket, 'game:read', { roomCode: other.view.room.code })).toMatchObject({ ok: false, error: 'FORBIDDEN' });
  const second = await h.connect(h.players[0].cookie);
  accepted(await ask(second, 'lobby:connect', { mode: 'takeover', clientId: requestId(), attemptId: requestId() }));
  expect(await ask(h.players[0].socket, 'game:action', request)).toMatchObject({ ok: false, error: 'SESSION_ELSEWHERE' });
  expect(await ask(second, 'game:action', { ...request, generation: 2, caseId: requestId() })).toMatchObject({ ok: false, error: 'WRONG_CASE' });
});

test('concurrent saves cannot overwrite newer work; first final drawing wins and all submissions do not advance time', async () => {
  const h = await setup(); await h.start(); h.clock.to(45_000);
  const saves = await Promise.all([h.act(1, drawing(0, 'first')), h.act(1, drawing(0, 'second'))]);
  expect(saves.filter(r => r.ok)).toHaveLength(1);
  expect(saves.find(r => !r.ok)).toMatchObject({ error: 'STALE_REVISION' });
  const finals = await Promise.all(['first final', 'second final'].map(caption => h.act(1, { ...drawing(1, caption), type: 'submit-drawing' })));
  expect(finals.filter(r => r.ok)).toHaveLength(1); expect(finals.find(r => !r.ok)).toMatchObject({ error: 'LOCKED' });
  for (const n of [0, 2, 3]) accepted(await h.act(n, { ...drawing(), type: 'submit-drawing' }));
  expect((await h.read(0)).phase).toBe('Sketch'); expect((await h.read(0)).public.gallery).toBeUndefined();
  h.clock.to(85_000); expect((await h.read(0)).public.gallery.every((d: any) => d.lockMode === 'submitted')).toBe(true);
});

test('timers publish Complete with no further player requests; roster and private data survive disconnected players', async () => {
  const h = await setup(); await h.start();
  const terminal = new Promise<any>(resolve => h.players[3].socket.on('game:snapshot', view => { if (view.phase === 'Complete') resolve(view); }));
  for (const p of h.players.slice(0, 3)) p.socket.disconnect();
  h.clock.to(255_000);
  const complete = await terminal;
  expect(complete.public.solution.result.scores.map((s: any) => s.total)).toEqual([3, 0, 0, 0]);
  expect(complete.public.solution.cards).toHaveLength(4);
  expect(complete.expiresAt).toBe(h.clock.start + 3_855_000);
});

test('owner has no privileged secrets and new content mutations cannot alter a running version', async () => {
  const h = await setup(syntheticCase(), 2); await h.start();
  const before = await h.read(0); expect(before.self.guilt).toBe('innocent');
  expect(before.self.forgeryOptions).toBeUndefined(); expect(before.public.solution).toBeUndefined();
  h.pack.alibis[0].story = 'Modified after start'; h.pack.evidence.records[0].PT.text = 'Modified after start';
  h.pack.solution.geography = 'Modified after start'; h.pack.contentVersion = 'test-2';
  h.clock.to(140_000); expect(JSON.stringify(await h.read(0))).not.toContain('Modified after start');
  h.clock.to(225_000); const result = await h.read(0);
  expect(result.contentVersion).toBe('test-1'); expect(JSON.stringify(result)).not.toContain('Modified after start');
  expect(result.public.solution.murdererId).toBe(h.players[2].id);
});

test('malformed drawing data is rejected without replacing accepted work or interpreting markup', async () => {
  const h = await setup(); await h.start(); h.clock.to(45_000); accepted(await h.act(1, drawing()));
  for (const strokes of [[[{ x: -1, y: 0 }]], [[{ x: 0, y: 0, script: 'alert(1)' }]], '<svg onload=alert(1)>', [Array.from({ length: 2001 }, () => ({ x: 0, y: 0 }))]]) {
    expect(await h.act(1, { ...drawing(1), strokes })).toMatchObject({ ok: false, error: 'INVALID_REQUEST' });
  }
  expect((await h.read(1)).self.drawing.revision).toBe(1);
});

test('an authority scheduling failure aborts without awarding a result or changing the deadline into a fresh case', async () => {
  const h = await setup(); await h.start();
  const schedule = h.clock.runtime.schedule;
  h.clock.runtime.schedule = () => { throw Error('private scheduler failure'); };
  h.clock.to(45_000, false);
  const aborted = await h.read(0); h.clock.runtime.schedule = schedule;
  expect(aborted.phase).toBe('Aborted'); expect(aborted.public.solution).toBeUndefined();
  expect(aborted.public.interruption).toBe('Case interrupted; results unavailable');
  expect(JSON.stringify(aborted)).not.toContain('private scheduler failure');
  expect(await h.act(0, drawing())).toMatchObject({ ok: false, error: 'CASE_INTERRUPTED' });
  h.clock.to(45_000 + 3_600_000);
  expect(await ask(h.players[0].socket, 'game:read', { roomCode: h.players[0].roomCode })).toMatchObject({ ok: false, error: 'UNAUTHENTICATED' });
});

test('Start pins the exact candidate it validated rather than fetching a second authoring pack', async () => {
  const first = syntheticCase(), second = syntheticCase(); let reads = 0;
  second.solution.geography = 'Unvalidated replacement from second source read';
  const h = await gameHarness(first, 0, () => ++reads === 1 ? first : second); running.push(h);
  await h.start(); h.clock.to(225_000);
  expect((await h.read(0)).public.solution.geography).toBe(first.solution.geography);
  expect(reads).toBe(1);
});

test('an action itself catches up exact deadlines without a preceding read or timer callback', async () => {
  const h = await setup(); await h.start(); const view = await h.read(0);
  const send = (action: unknown, id = requestId()) => ask(h.players[0].socket, 'game:action', { roomCode: h.players[0].roomCode, generation: 1, caseId: view.caseId, requestId: id, action });
  const id = requestId(), choice = { type: 'choose-forgery', option: 'B' };
  h.clock.to(44_999, false); const receipt = accepted(await send(choice, id));
  h.clock.to(45_000, false);
  expect(await send({ type: 'choose-forgery', option: 'A' })).toMatchObject({ ok: false, error: 'PHASE_ENDED', view: { phase: 'Sketch', self: { card: { option: 'B' } } } });
  expect(await send(choice, id)).toEqual(receipt);
  h.clock.to(85_000, false);
  expect(await send({ ...drawing(), type: 'submit-drawing' })).toMatchObject({ ok: false, error: 'PHASE_ENDED', view: { phase: 'Gallery', self: { drawing: { locked: true, lockMode: 'missing' } } } });
  h.clock.to(225_000, false);
  const late = await send(ballot('save-final', 0, 'PT', h.players[1].id));
  expect(late).toMatchObject({ ok: false, error: 'PHASE_ENDED', view: { phase: 'Solution' } });
  expect(late.view.public.solution.result.scores[0].total).toBe(3);
});
