import { createHash, randomUUID } from 'node:crypto';
import type { ServerRuntime } from '../runtime.js';
import { caseSchema, publicCard, type Alibi, type CasePack } from './content.js';
import { gameActionSchema, type Country, type GameRequest, type Strokes } from '../../shared/game.js';

import type { GameView, Phase } from '../../shared/game-view.js';
export type { Phase } from '../../shared/game-view.js';
export type Roster = readonly Readonly<{ id: string; name: string }>[];
type LockMode = 'submitted' | 'automatic' | 'missing';
interface Drawing { revision: number; strokes: Strokes; caption: string; locked: boolean; lockMode: LockMode | null }
interface Ballot { revision: number; country: Country | null; suspectId: string | null; reason: string; locked: boolean }
interface Receipt { ok: true; receipt: { requestId: string; acceptedAt: number; phase: Phase; revision?: number } }
interface Participant {
  id: string; name: string; connected: boolean; guilt: 'murderer' | 'innocent'; card: Alibi | null;
  drawing: Drawing; initial: Ballot; final: Ballot; receipts: Map<string, { digest: string; reply: Receipt }>;
}
type ActionError = 'INVALID_REQUEST' | 'WRONG_CASE' | 'CONFLICT' | 'FORBIDDEN' | 'ACTION_NOT_AVAILABLE' | 'PHASE_ENDED' | 'LOCKED' | 'STALE_REVISION' | 'EMPTY_DRAWING' | 'TRY_LATER' | 'CASE_INTERRUPTED';
const emptyBallot = (): Ballot => ({ revision: 0, country: null, suspectId: null, reason: '', locked: false });
interface Event { type: string; at: number; playerId?: string; [key: string]: unknown }
const boundaries = [
  { offset: 45_000, phase: 'Sketch' }, { offset: 85_000, phase: 'Gallery' },
  { offset: 115_000, phase: 'Interrogate' }, { offset: 140_000, phase: null },
  { offset: 205_000, phase: 'Verdict' }, { offset: 225_000, phase: 'Solution' }, { offset: 255_000, phase: 'Complete' },
] as const;

export class CaseAuthority {
  readonly caseId = randomUUID();
  readonly startedAt: number;
  expiresAt: number | null = null;
  private phase: Phase = 'Inspect';
  private next = 0;
  private snapshotRevision = 0;
  private participants: Participant[];
  private selected: 'A' | 'B' | null = null;
  private defaulted = false;
  private forgeryLocked = false;
  private evidenceReleased = false;
  private events: Event[];
  private omittedEvents: Record<string, number> = {};
  private cancel?: () => void;
  private result: ReturnType<CaseAuthority['score']> | null = null;

  constructor(private pack: CasePack, roster: Roster, private runtime: ServerRuntime, private changed: () => void) {
    if (!pack.review.approved || roster.length !== 4 || new Set(roster.map(p => p.id)).size !== 4) throw Error('Invalid start');
    this.startedAt = runtime.now();
    const murderer = runtime.randomInt(4);
    if (!Number.isInteger(murderer) || murderer < 0 || murderer >= 4) throw Error('Invalid random source');
    const cards = pack.alibis.filter(a => a.kind === 'innocent');
    // Fisher–Yates; uniform bounded crypto randomInt in production, controlled in tests.
    for (let i = cards.length - 1; i > 0; i--) {
      const j = runtime.randomInt(i + 1);
      if (!Number.isInteger(j) || j < 0 || j > i) throw Error('Invalid random source');
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    let cardIndex = 0;
    this.participants = roster.map((p, i) => ({ ...p, connected: true, guilt: i === murderer ? 'murderer' : 'innocent', card: i === murderer ? null : cards[cardIndex++],
      drawing: { revision: 0, strokes: [], caption: '', locked: false, lockMode: null }, initial: emptyBallot(), final: emptyBallot(), receipts: new Map() }));
    this.events = [{ type: 'phase', at: this.startedAt, phase: 'Inspect' }];
    this.schedule();
  }

  private schedule() {
    this.cancel?.();
    const due = this.expiresAt ?? (this.next < boundaries.length ? this.startedAt + boundaries[this.next].offset : null);
    if (due !== null) this.cancel = this.runtime.schedule(() => { this.catchUp(); }, Math.max(0, due - this.runtime.now()));
  }

  catchUp(notify = true) {
    let changed = false;
    try {
      while (this.phase !== 'Aborted' && this.next < boundaries.length && this.runtime.now() >= this.startedAt + boundaries[this.next].offset) {
        const boundary = boundaries[this.next++], at = this.startedAt + boundary.offset;
        if (boundary.phase === null) { this.evidenceReleased = true; this.record({ type: 'evidence', at }); }
        else {
          this.phase = boundary.phase;
          if (this.phase === 'Sketch') {
            if (!this.selected) { this.selected = 'A'; this.defaulted = true; }
            this.forgeryLocked = true;
            this.participants.find(p => p.guilt === 'murderer')!.card = this.pack.alibis.find(a => a.kind === 'forgery' && a.option === this.selected)!;
            this.record({ type: this.defaulted ? 'forgery-default' : 'forgery-lock', at, selected: this.selected });
          }
          if (this.phase === 'Gallery') for (const p of this.participants) if (!p.drawing.locked) {
            p.drawing.locked = true; p.drawing.lockMode = p.drawing.strokes.length ? 'automatic' : 'missing';
            this.record({ type: 'drawing-lock', at, playerId: p.id, mode: p.drawing.lockMode });
          }
          if (this.phase === 'Interrogate') for (const p of this.participants) p.initial.locked = true;
          if (this.phase === 'Solution') { for (const p of this.participants) p.final.locked = true; this.result = this.score(); }
          if (this.phase === 'Complete') this.expiresAt = at + 3_600_000;
          this.record({ type: 'phase', at, phase: this.phase });
        }
        changed = true;
      }
      if (changed) this.schedule();
    } catch { this.abort(); changed = true; }
    if (notify && (changed || this.expired)) this.changed();
    return changed;
  }

  get expired() { return this.expiresAt !== null && this.runtime.now() >= this.expiresAt; }
  private abort() {
    this.cancel?.(); this.phase = 'Aborted'; this.result = null; this.expiresAt = this.runtime.now() + 3_600_000;
    this.record({ type: 'phase', at: this.runtime.now(), phase: 'Aborted' });
  }
  dispose() { this.cancel?.(); }
  connection(playerId: string, connected: boolean) {
    this.catchUp(false);
    const player = this.participants.find(p => p.id === playerId);
    if (player && player.connected !== connected) { player.connected = connected; this.record({ type: connected ? 'reconnect' : 'disconnect', at: this.runtime.now(), playerId }); }
  }

  private record(event: Event) {
    this.snapshotRevision++;
    // Preserve all phase boundaries; cap diagnostic detail, recording overflow counts.
    if (this.events.length < 4096 || event.type === 'phase' || event.type === 'evidence') this.events.push(event);
    else this.omittedEvents[event.type] = (this.omittedEvents[event.type] ?? 0) + 1;
  }

  act(playerId: string, request: GameRequest) {
    const player = this.participants.find(p => p.id === playerId);
    if (!player || this.expired) throw Error('Case unavailable');
    this.catchUp();
    const reject = (error: ActionError) => {
      this.record({ type: 'rejected', at: this.runtime.now(), playerId, error });
      return { ok: false as const, error, view: this.view(playerId) };
    };
    if (request.caseId !== this.caseId) return reject('WRONG_CASE');
    const raw = JSON.stringify(request.action);
    if (!raw || Buffer.byteLength(raw) > 48_000) return reject('INVALID_REQUEST');
    const parsed = gameActionSchema.safeParse(request.action);
    if (!parsed.success) return reject('INVALID_REQUEST');
    const action = parsed.data;
    const digest = createHash('sha256').update(JSON.stringify(action)).digest('hex');
    const prior = player.receipts.get(request.requestId);
    if (prior) {
      if (prior.digest !== digest) return reject('CONFLICT');
      this.record({ type: 'duplicate', at: this.runtime.now(), playerId });
      return structuredClone(prior.reply);
    }
    if (this.phase === 'Aborted') return reject('CASE_INTERRUPTED');
    if (action.type === 'choose-forgery' && player.guilt !== 'murderer') return reject('FORBIDDEN');
    const required = action.type === 'choose-forgery' ? 'Inspect' : action.type === 'save-initial' ? 'Gallery' : action.type === 'save-final' ? 'Verdict' : 'Sketch';
    const order: Phase[] = ['Inspect', 'Sketch', 'Gallery', 'Interrogate', 'Verdict', 'Solution', 'Complete'];
    if (this.phase !== required) return reject(order.indexOf(this.phase) < order.indexOf(required) ? 'ACTION_NOT_AVAILABLE' : 'PHASE_ENDED');
    if (player.receipts.size >= 256) return reject('TRY_LATER');
    let revision: number | undefined;
    if (action.type === 'choose-forgery') {
      this.selected = action.option;
      player.card = this.pack.alibis.find(a => a.kind === 'forgery' && a.option === action.option)!;
      this.record({ type: 'forgery-selection', at: this.runtime.now(), playerId, selected: this.selected });
    } else if (action.type === 'save-drawing' || action.type === 'submit-drawing') {
      if (player.drawing.locked) return reject('LOCKED');
      if (action.expectedRevision !== player.drawing.revision) return reject('STALE_REVISION');
      if (action.type === 'submit-drawing' && !action.strokes.length) return reject('EMPTY_DRAWING');
      revision = player.drawing.revision + 1;
      player.drawing = { revision, strokes: action.strokes, caption: action.caption, locked: action.type === 'submit-drawing', lockMode: action.type === 'submit-drawing' ? 'submitted' : null };
      if (player.drawing.locked) this.record({ type: 'drawing-lock', at: this.runtime.now(), playerId, mode: 'submitted' });
    } else {
      if (action.suspectId !== null && (action.suspectId === player.id || !this.participants.some(p => p.id === action.suspectId))) return reject('INVALID_REQUEST');
      const field = action.type === 'save-initial' ? 'initial' : 'final';
      if (action.expectedRevision !== player[field].revision) return reject('STALE_REVISION');
      revision = player[field].revision + 1;
      player[field] = { revision, country: action.country, suspectId: action.suspectId, reason: action.type === 'save-final' ? action.reason : '', locked: false };
      this.record({ type: field, at: this.runtime.now(), playerId, country: action.country, suspectId: action.suspectId });
    }
    const reply: Receipt = { ok: true, receipt: { requestId: request.requestId, acceptedAt: this.runtime.now(), phase: this.phase, ...(revision === undefined ? {} : { revision }) } };
    player.receipts.set(request.requestId, { digest, reply });
    this.snapshotRevision++;
    return structuredClone(reply);
  }

  private score() {
    const murdererId = this.participants.find(p => p.guilt === 'murderer')!.id;
    const tally = this.participants.map(p => ({ playerId: p.id, votes: this.participants.filter(v => v.final.suspectId === p.id).length }));
    const highest = Math.max(...tally.map(t => t.votes));
    const leaders = tally.filter(t => t.votes === highest);
    const arrestedId = highest > 0 && leaders.length === 1 ? leaders[0].playerId : null;
    const scores = this.participants.map(p => {
      const country = p.final.country === this.pack.solution.correctCountry ? 2 : 0;
      const accusation = p.guilt === 'innocent' && p.final.suspectId === murdererId ? 3 : 0;
      const escape = p.guilt === 'murderer' && arrestedId !== murdererId ? 3 : 0;
      return { playerId: p.id, country, accusation, escape, total: country + accusation + escape };
    });
    const maximum = Math.max(...scores.map(s => s.total));
    return { arrestedId, tally, scores, winnerIds: scores.filter(s => s.total === maximum).map(s => s.playerId) };
  }

  private reveal() {
    return {
      murdererId: this.participants.find(p => p.guilt === 'murderer')!.id, selectedForgery: this.selected,
      cards: this.participants.map(p => ({ playerId: p.id, guilt: p.guilt, card: p.card && publicCard(p.card) })),
      forgeryOptions: this.pack.alibis.filter(a => a.kind === 'forgery').map(publicCard),
      ...this.pack.solution, clues: this.pack.clues, provenance: this.pack.provenance,
      ballots: this.participants.map(p => ({ playerId: p.id, initial: p.initial, final: p.final })),
      result: this.result, observation: { events: this.events, omittedEvents: this.omittedEvents },
    };
  }

  view(playerId: string): GameView {
    const player = this.participants.find(p => p.id === playerId);
    if (!player || this.expired) throw Error('Case unavailable');
    const phaseEnd = boundaries.slice(this.next).find(b => b.phase !== null);
    return structuredClone({
      snapshotRevision: this.snapshotRevision, caseId: this.caseId, contentVersion: this.pack.contentVersion, phase: this.phase, serverTime: this.runtime.now(),
      phaseEndsAt: this.phase === 'Aborted' ? null : phaseEnd ? this.startedAt + phaseEnd.offset : null, expiresAt: this.expiresAt,
      public: {
        opening: this.pack.opening, countries: this.pack.countries, photo: this.pack.photo,
        players: this.participants.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
        ...(this.next >= 2 ? { gallery: this.participants.map(p => ({ playerId: p.id, strokes: p.drawing.strokes, caption: p.drawing.caption, lockMode: p.drawing.lockMode })) } : {}),
        ...(this.evidenceReleased ? { evidence: this.pack.evidence } : {}),
        ...(this.result && this.phase !== 'Aborted' ? { solution: this.reveal() } : {}),
        ...(this.phase === 'Aborted' ? { interruption: 'Case interrupted; results unavailable' } : {}),
      },
      self: {
        id: player.id, guilt: player.guilt, card: player.card && publicCard(player.card),
        drawing: player.drawing, initial: player.initial, final: player.final,
        ...(player.guilt === 'murderer' ? { forgeryOptions: this.pack.alibis.filter(a => a.kind === 'forgery').map(publicCard), forgery: { selected: this.selected, locked: this.forgeryLocked, defaulted: this.defaulted } } : {}),
      },
    });
  }
}

export class CaseGames {
  private cases = new Map<string, CaseAuthority>();
  constructor(private runtime: ServerRuntime, readonly candidate: () => unknown, private changed: (roomCode: string) => void) {}
  validate(candidate: unknown) { return caseSchema.safeParse(candidate).success; }
  start(input: { roomCode: string; roster: Roster; contentId: string; contentVersion: string; candidate: unknown }) {
    if (this.cases.has(input.roomCode)) throw Error('Case already exists');
    const pack = caseSchema.parse(input.candidate);
    if (!pack.review.approved || pack.id !== input.contentId || pack.contentVersion !== input.contentVersion) throw Error('Content unavailable');
    // Zod produces a detached runtime pack. Authoring edits cannot change a running case.
    const game = new CaseAuthority(pack, input.roster, this.runtime, () => this.changed(input.roomCode));
    this.cases.set(input.roomCode, game);
  }
  caseFor(roomCode: string) { return this.cases.get(roomCode); }
  forget(roomCode: string) { this.cases.get(roomCode)?.dispose(); this.cases.delete(roomCode); }
  close() { for (const game of this.cases.values()) game.dispose(); this.cases.clear(); }
}
