import { expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CaseChannel, type CaseState } from '../../src/client/case-channel';
import type { GameReply } from '../../src/shared/game-view';
import { CaseAuthority } from '../../src/server/game/authority';
import { caseSchema } from '../../src/server/game/content';
import { controlledClock, syntheticCase } from '../helpers/case-fixture';

test('a delayed game acknowledgement cannot recreate pending state after the seat is cleared', async () => {
  const clock = controlledClock(), roster = [0, 1, 2, 3].map(i => ({ id: randomUUID(), name: `Player ${i}` }));
  const authority = new CaseAuthority(caseSchema.parse(syntheticCase()), roster, clock.runtime, () => {});
  let epoch = 1, resolveAction!: (reply: GameReply) => void;
  let state: CaseState = { caseView: null, caseReceivedAt: 0, gameBusy: false, gamePending: false, gameMessage: '' };
  const channel = new CaseChannel(() => new Promise(resolve => { resolveAction = resolve; }),
    () => ({ roomCode: 'ABCDEF', generation: 1, epoch, writable: epoch === 1 }), next => { state = { ...state, ...next }; });
  channel.receive(authority.view(roster[0].id));
  const action = channel.act({ type: 'choose-forgery', option: 'B' });
  expect(state.gameBusy).toBe(true);
  epoch++; channel.clear();
  resolveAction({ ok: true });
  await action;
  expect(state).toMatchObject({ caseView: null, gameBusy: false, gamePending: false, gameMessage: '' });
  authority.dispose();
});

test('out-of-order full snapshots at the same server time cannot undo a forgery or connection change', () => {
  const clock = controlledClock(), roster = [0, 1, 2, 3].map(i => ({ id: randomUUID(), name: `Player ${i}` }));
  const authority = new CaseAuthority(caseSchema.parse(syntheticCase()), roster, clock.runtime, () => {});
  let state: Partial<CaseState> = {};
  const channel = new CaseChannel(async () => null, () => ({ epoch: 1, writable: true }), next => { state = { ...state, ...next }; });
  const old = authority.view(roster[0].id);
  authority.act(roster[0].id, { roomCode: 'ABCDEF', generation: 1, caseId: old.caseId, requestId: randomUUID(), action: { type: 'choose-forgery', option: 'B' } });
  authority.connection(roster[1].id, false);
  const current = authority.view(roster[0].id);
  channel.receive(current); channel.receive(old);
  expect(state.caseView?.self.forgery?.selected).toBe('B');
  expect(state.caseView?.public.players[1].connected).toBe(false);
  authority.dispose();
});

test('a stale read completion cannot clear a new seat action busy state', async () => {
  const clock = controlledClock(), roster = [0, 1, 2, 3].map(i => ({ id: randomUUID(), name: `Player ${i}` }));
  const authority = new CaseAuthority(caseSchema.parse(syntheticCase()), roster, clock.runtime, () => {});
  let epoch = 1;
  const deferred: ((reply: GameReply | null) => void)[] = [];
  let state: Partial<CaseState> = {};
  const channel = new CaseChannel(() => new Promise(resolve => deferred.push(resolve)),
    () => ({ roomCode: 'ABCDEF', generation: 1, epoch, writable: true }), next => { state = { ...state, ...next }; });
  channel.receive(authority.view(roster[0].id));
  const old = channel.act({ type: 'choose-forgery', option: 'A' });
  deferred.shift()!({ ok: true }); await Promise.resolve();
  const oldRead = deferred.shift()!;
  epoch++; channel.clear(); channel.receive(authority.view(roster[0].id));
  const current = channel.act({ type: 'choose-forgery', option: 'B' });
  oldRead({ ok: true, view: authority.view(roster[0].id) }); await old;
  expect(state.gameBusy).toBe(true);
  // The public state and the internal gate must both still block a retry.
  const retry = channel.retry();
  expect(deferred).toHaveLength(1);
  expect(await retry).toBe(false);
  deferred.shift()!({ ok: true }); await Promise.resolve();
  deferred.shift()!({ ok: true, view: authority.view(roster[0].id) }); await current;
  authority.dispose();
});
