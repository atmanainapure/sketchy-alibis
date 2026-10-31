import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Connect, Enter, LobbyAction, LobbyError, LobbyView, Reply } from '../../shared/lobby.js';
import type { ServerRuntime } from '../runtime.js';
import { HOUR, type PlayerSession, type Sessions } from './sessions.js';
import type { CaseAuthority } from '../game/authority.js';
import type { GameRequest } from '../../shared/game.js';

/** Atomic in-process game interface. No network-selected fixtures or overrides. */
export interface GamePort {
  candidate(): unknown;
  validate(candidate: unknown): boolean;
  start(input: { roomCode: string; roster: readonly Readonly<{ id: string; name: string }>[]; contentId: string; contentVersion: string; candidate: unknown }): void;
  caseFor?(roomCode: string): CaseAuthority | undefined;
  forget?(roomCode: string): void;
  close?(): void;
}
const metadata = z.object({ id: z.string().min(1).max(128), contentVersion: z.string().min(1).max(64), review: z.object({ approved: z.boolean() }) });
class RoomError extends Error { constructor(readonly code: LobbyError) { super(code); } }
function deny(code: LobbyError): never { throw new RoomError(code); }
export function roomFailure(error: unknown): Reply { return { ok: false, error: error instanceof RoomError ? error.code : 'REQUEST_FAILED' }; }

interface Receipt { payload: string; reply: Reply }
interface Member {
  id: string; name: string; session: PlayerSession; ready: boolean;
  clientId: string; generation: number; socketId: string | null;
  receipts: Map<string, Receipt>; takeovers: Map<string, { payload: string; generation: number }>;
}
interface Room {
  code: string; ownerId: string; status: 'Lobby' | 'Started' | 'Closed';
  expiresAt: number | null; members: Map<string, Member>;
  content?: { id: string; version: string };
}
type Send = (socketId: string, event: string, payload: unknown) => void;

export class Rooms {
  private rooms = new Map<string, Room>();
  private memberships = new Map<string, { room: Room; member: Member }>();
  private entries = new Map<string, { session: PlayerSession; attempts: Map<string, { payload: string; playerId: string; roomCode: string; generation: number }> }>();

  constructor(private runtime: ServerRuntime, private sessions: Sessions, private send: Send, private game: GamePort) {}

  sweep() {
    const now = this.runtime.now();
    for (const room of this.rooms.values()) {
      const game = this.game.caseFor?.(room.code);
      const changed = game?.catchUp(false);
      if (game?.expiresAt !== null && game?.expiresAt !== undefined) {
        room.expiresAt = game.expiresAt;
        for (const member of room.members.values()) member.session.expiresAt = room.expiresAt;
      }
      if (room.expiresAt !== null && room.expiresAt <= now) {
        for (const member of room.members.values()) {
          if (member.socketId) this.send(member.socketId, 'lobby:ended', { error: 'ROOM_UNAVAILABLE', reason: 'expired' });
          this.memberships.delete(member.session.id); this.entries.delete(member.session.id); this.sessions.revoke(member.session.id);
        }
        this.rooms.delete(room.code);
        this.game.forget?.(room.code);
      } else if (changed) this.publishGame(room);
    }
    for (const [key, entry] of this.entries) if (entry.session.expiresAt <= now) this.entries.delete(key);
    this.sessions.sweep();
  }

  hasMembership(session: PlayerSession) { this.sweep(); return this.memberships.has(session.id); }
  private membership(session: PlayerSession) { return this.memberships.get(session.id) ?? deny('ROOM_UNAVAILABLE'); }
  private writable(member: Member, socketId: string, generation?: number) {
    if (member.socketId !== socketId || (generation !== undefined && generation !== member.generation)) deny('SESSION_ELSEWHERE');
  }
  private projection(room: Room, member: Member): LobbyView {
    return { room: { code: room.code, status: room.status, ownerId: room.ownerId, expiresAt: room.expiresAt,
      players: [...room.members.values()].map(p => ({ id: p.id, name: p.name, ready: p.ready, connected: p.socketId !== null })) }, self: { id: member.id } };
  }
  private publish(room: Room) {
    for (const member of room.members.values()) if (member.socketId) this.send(member.socketId, 'lobby:snapshot', this.projection(room, member));
    this.publishGame(room);
  }
  private publishGame(room: Room) {
    const game = this.game.caseFor?.(room.code);
    if (game && !game.expired) for (const member of room.members.values()) if (member.socketId) this.send(member.socketId, 'game:snapshot', game.view(member.id));
  }
  gameChanged(code: string) { this.sweep(); const room = this.rooms.get(code); if (room) this.publishGame(room); }
  gameRead(session: PlayerSession, socketId: string, code: string) {
    const { room, member } = this.membership(session);
    if (code !== room.code) deny('FORBIDDEN');
    this.writable(member, socketId);
    const game = this.game.caseFor?.(room.code);
    if (!game) deny('ROOM_UNAVAILABLE');
    return { ok: true as const, view: game.view(member.id) };
  }
  photo(session: PlayerSession, code: string, caseId: string) {
    const { room, member } = this.membership(session);
    if (code !== room.code || room.status !== 'Started') deny('ROOM_UNAVAILABLE');
    const game = this.game.caseFor?.(room.code);
    if (!game || game.caseId !== caseId || game.expired) deny('ROOM_UNAVAILABLE');
    // HTTP image reads derive identity from the cookie, never a supplied player ID.
    return game.view(member.id).public.photo.publicFilename;
  }
  gameAct(session: PlayerSession, socketId: string, input: GameRequest) {
    const { room, member } = this.membership(session);
    if (input.roomCode !== room.code) deny('FORBIDDEN');
    this.writable(member, socketId, input.generation);
    const game = this.game.caseFor?.(room.code);
    if (!game) deny('ROOM_UNAVAILABLE');
    return game.act(member.id, input);
  }
  close() { this.game.close?.(); }
  private clearReady(room: Room) { for (const p of room.members.values()) p.ready = false; }
  private attach(room: Room, member: Member, socketId: string): Reply {
    if (member.socketId && member.socketId !== socketId) this.send(member.socketId, 'lobby:replaced', { error: 'SESSION_ELSEWHERE' });
    member.socketId = socketId; this.game.caseFor?.(room.code)?.connection(member.id, true); this.publish(room);
    return { ok: true, view: this.projection(room, member), connection: { clientId: member.clientId, generation: member.generation } };
  }
  private code() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = Array.from({ length: 6 }, () => alphabet[this.runtime.randomInt(alphabet.length)]).join('');
      if (!this.rooms.has(code)) return code;
    }
    return deny('TRY_LATER');
  }

  enter(session: PlayerSession, socketId: string, input: Enter): Reply {
    const payload = JSON.stringify(input);
    let entry = this.entries.get(session.id);
    const old = entry?.attempts.get(input.attemptId);
    if (old) {
      if (old.payload !== payload) deny('CONFLICT');
      const current = this.membership(session);
      if (current.member.id !== old.playerId || current.room.code !== old.roomCode || current.room.status === 'Closed') deny('ROOM_UNAVAILABLE');
      if (current.member.generation !== old.generation || current.member.clientId !== input.clientId) deny('SESSION_ELSEWHERE');
      return this.attach(current.room, current.member, socketId);
    }
    if (this.memberships.has(session.id)) deny('ALREADY_IN_ROOM');
    if ((entry?.attempts.size ?? 0) >= 32) deny('TRY_LATER');
    let room: Room;
    if (input.type === 'create') {
      if (this.rooms.size >= 128) deny('TRY_LATER');
      room = { code: this.code(), ownerId: '', status: 'Lobby', expiresAt: this.runtime.now() + HOUR, members: new Map() };
    } else {
      room = this.rooms.get(input.code) ?? deny('ROOM_UNAVAILABLE');
      if (room.status === 'Closed') deny('ROOM_UNAVAILABLE');
      if (room.status !== 'Lobby') deny('CASE_STARTED');
      if (room.members.size >= 4) deny('ROOM_FULL');
      if ([...room.members.values()].some(p => p.name.toLowerCase() === input.name.toLowerCase())) deny('NAME_TAKEN');
    }
    const member: Member = { id: randomUUID(), name: input.name, session, ready: false, clientId: input.clientId, generation: 1, socketId: null, receipts: new Map(), takeovers: new Map() };
    session.expiresAt = room.expiresAt!;
    if (input.type === 'create') { room.ownerId = member.id; this.rooms.set(room.code, room); }
    room.members.set(member.id, member); this.memberships.set(session.id, { room, member }); this.clearReady(room);
    if (!entry) { entry = { session, attempts: new Map() }; this.entries.set(session.id, entry); }
    entry.attempts.set(input.attemptId, { payload, playerId: member.id, roomCode: room.code, generation: 1 });
    return this.attach(room, member, socketId);
  }

  connect(session: PlayerSession, socketId: string, input: Connect): Reply {
    const { room, member } = this.membership(session);
    if (input.mode === 'resume') {
      if (input.clientId !== member.clientId || input.generation !== member.generation) deny('SESSION_ELSEWHERE');
    } else {
      const payload = JSON.stringify(input), old = member.takeovers.get(input.attemptId);
      if (old) {
        if (old.payload !== payload) deny('CONFLICT');
        if (old.generation !== member.generation || input.clientId !== member.clientId) deny('SESSION_ELSEWHERE');
      } else {
        if (member.takeovers.size >= 128) deny('TRY_LATER');
        member.generation++; member.clientId = input.clientId;
        member.takeovers.set(input.attemptId, { payload, generation: member.generation });
      }
    }
    return this.attach(room, member, socketId);
  }

  read(session: PlayerSession, socketId: string, code: string): Reply {
    const { room, member } = this.membership(session);
    if (code !== room.code) deny('FORBIDDEN');
    this.writable(member, socketId);
    return { ok: true, view: this.projection(room, member) };
  }

  act(session: PlayerSession, socketId: string, input: LobbyAction): Reply {
    const { room, member } = this.membership(session);
    if (room.code !== input.roomCode) deny('FORBIDDEN');
    this.writable(member, socketId, input.generation);
    const owner = member.id === room.ownerId;
    if (['start', 'remove', 'close'].includes(input.type) && !owner) deny('FORBIDDEN');
    const payload = JSON.stringify(input), prior = member.receipts.get(input.requestId);
    if (prior) { if (prior.payload !== payload) deny('CONFLICT'); return prior.reply; }
    if (room.status === 'Closed') deny('ROOM_UNAVAILABLE');
    if (room.status !== 'Lobby') deny('CASE_STARTED');
    if (member.receipts.size >= 256) deny('TRY_LATER');

    switch (input.type) {
      case 'ready': member.ready = input.ready; break;
      case 'leave':
        if (owner) deny('FORBIDDEN');
        this.remove(room, member); break;
      case 'remove': {
        const target = room.members.get(input.targetId);
        if (!target || target.id === room.ownerId) deny('FORBIDDEN');
        this.remove(room, target); break;
      }
      case 'close':
        room.status = 'Closed'; room.expiresAt = this.runtime.now() + HOUR;
        this.clearReady(room);
        for (const p of room.members.values()) p.session.expiresAt = room.expiresAt;
        break;
      case 'start': {
        if (room.members.size !== 4 || [...room.members.values()].some(p => !p.ready || !p.socketId)) deny('NOT_READY');
        const candidate = this.game.candidate(), parsed = metadata.safeParse(candidate);
        if (!parsed.success || !parsed.data.review.approved || !this.game.validate(candidate)) deny('CONTENT_UNAVAILABLE');
        const { id: contentId, contentVersion } = parsed.data;
        const roster = Object.freeze([...room.members.values()].map(p => Object.freeze({ id: p.id, name: p.name })));
        this.game.start({ roomCode: room.code, roster, contentId, contentVersion, candidate });
        room.content = { id: contentId, version: contentVersion }; room.status = 'Started'; room.expiresAt = null;
        for (const p of room.members.values()) p.session.expiresAt = Infinity;
        break;
      }
    }
    const reply: Reply = { ok: true, receipt: { requestId: input.requestId } };
    member.receipts.set(input.requestId, { payload, reply }); this.publish(room); return reply;
  }

  private remove(room: Room, member: Member) {
    room.members.delete(member.id); this.memberships.delete(member.session.id);
    member.session.expiresAt = this.runtime.now() + HOUR;
    if (member.socketId) this.send(member.socketId, 'lobby:ended', { error: 'ROOM_UNAVAILABLE' });
    this.clearReady(room);
  }

  disconnect(socketId: string) {
    for (const { room, member } of this.memberships.values()) if (member.socketId === socketId) {
      member.socketId = null;
      this.game.caseFor?.(room.code)?.connection(member.id, false);
      if (room.status === 'Lobby') member.ready = false;
      this.publish(room);
    }
  }
}
