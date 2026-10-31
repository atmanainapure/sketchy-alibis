import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { z } from 'zod';
import { actionSchema, connectSchema, enterSchema, type LobbyError, type LobbyView, type Reply } from '../shared/lobby';
import { CaseChannel, type CaseState, type CaseControls } from './case-channel';
import type { GameView, GameReply } from '../shared/game-view';

const pendingSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('lobby:enter'), payload: enterSchema }),
  z.object({ event: z.literal('lobby:connect'), payload: connectSchema }),
  z.object({ event: z.literal('lobby:action'), payload: actionSchema }),
]);
const deviceSchema = z.object({ clientId: z.string().uuid(), roomCode: z.string().optional(), generation: z.number().int().positive().optional(), superseded: z.boolean().optional(), pending: pendingSchema.optional(), caseRecovery: z.object({ expiresAtLocal: z.number().finite().nullable() }).optional() });
type Device = z.infer<typeof deviceSchema>;
type Pending = z.infer<typeof pendingSchema>;
const key = 'sketchy-lobby-v1';
const messages: Record<LobbyError, string> = {
  INVALID_REQUEST: 'Check your entry. Names must contain 1–20 characters.',
  UNAUTHENTICATED: 'Room unavailable. Your session may have expired or the server restarted.',
  ROOM_UNAVAILABLE: 'Room unavailable.', ROOM_FULL: 'Room full.', NAME_TAKEN: 'That name is already taken in this room.',
  ALREADY_IN_ROOM: 'You already have a seat. Resume it here.', FORBIDDEN: 'That action is not allowed for your seat.',
  SESSION_ELSEWHERE: 'Session opened elsewhere.', CONFLICT: 'This request conflicts with an earlier request. Please try again.',
  NOT_READY: 'Start needs four connected players who are ready.', CONTENT_UNAVAILABLE: 'The case is not ready to play yet. Your lobby is saved.',
  CASE_STARTED: 'Case already started.', TRY_LATER: 'Too many requests. Try again in a minute.', REQUEST_FAILED: 'The request could not be completed.',
};
interface State { connected: boolean; busy: boolean; view: LobbyView | null; message: string; needsResume: boolean; pending: boolean }
interface Controls { enter(type: 'create' | 'join', name: string, code: string): void; act(type: 'ready' | 'remove' | 'leave' | 'close' | 'start', fields?: { ready?: boolean; targetId?: string }): void; resume(): void; retry(): void }

export function useLobby() {
  const [state, setState] = useState<State>({ connected: false, busy: false, view: null, message: '', needsResume: false, pending: false });
  const controls = useRef<Controls | null>(null);
  const gameControls = useRef<CaseControls | null>(null);
  const [game, setGame] = useState<CaseState>({ caseView: null, caseReceivedAt: 0, gameBusy: false, gamePending: false, gameMessage: '' });
  useEffect(() => {
    let device: Device;
    try {
      const saved = sessionStorage.getItem(key);
      const parsed = saved ? deviceSchema.safeParse(JSON.parse(saved)) : null;
      device = parsed?.success ? parsed.data : { clientId: crypto.randomUUID() };
      sessionStorage.setItem(key, JSON.stringify(device));
    } catch {
      setState(s => ({ ...s, message: 'Browser storage is unavailable. Enable it to create or resume a room.' }));
      return;
    }
    const socket = io({ autoConnect: false, reconnection: false, transports: ['websocket'] });
    let disposed = false, busy = false, hasMembership = false, booting = false, connectionEpoch = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const update = (next: Partial<State>) => { if (!disposed) setState(s => ({ ...s, ...next })); };
    const channel = new CaseChannel(
      (event, payload) => new Promise(resolve => socket.timeout(3_000).emit(event, payload, (error: Error | null, reply: GameReply) => resolve(error ? null : reply))),
      () => ({ roomCode: device.roomCode, generation: device.generation, epoch: connectionEpoch, writable: socket.connected && !device.superseded && !disposed }),
      next => {
        if (disposed) return;
        // Only accepted timing metadata is retained for an unavailable-room message.
        // It is never sent to the authority or used to restore private game state.
        if (next.caseView) {
          const view = next.caseView;
          device.caseRecovery = { expiresAtLocal: view.expiresAt === null ? null : Date.now() + view.expiresAt - view.serverTime };
          save();
        }
        setGame(s => ({ ...s, ...next }));
      },
    );
    gameControls.current = channel;
    const save = () => sessionStorage.setItem(key, JSON.stringify(device));
    function unavailableMessage() {
      if (!device.caseRecovery) return messages.ROOM_UNAVAILABLE;
      return device.caseRecovery.expiresAtLocal !== null && Date.now() >= device.caseRecovery.expiresAtLocal
        ? 'Room expired.' : 'Case interrupted; results unavailable';
    }
    function clearSeat() { delete device.caseRecovery; delete device.roomCode; delete device.generation; delete device.pending; delete device.superseded; channel.clear(); save(); update({ view: null, needsResume: false, pending: false }); }

    function send(request: Pending, retain = true, accepted?: () => void) {
      if (busy || !socket.connected || disposed) return;
      if (retain) {
        device.pending = request;
        try { save(); } catch { update({ message: 'Could not save the retry information. No request was sent.' }); return; }
      }
      busy = true; update({ busy: true, message: '', pending: retain });
      const sentEpoch = connectionEpoch;
      socket.timeout(3_000).emit(request.event, request.payload, (timeout: Error | null, reply: Reply) => {
        if (disposed || sentEpoch !== connectionEpoch) return;
        busy = false; update({ busy: false });
        if (timeout) { update({ message: 'No confirmation received. Retry the pending request after reconnecting.', pending: !!device.pending }); return; }
        if (retain) delete device.pending;
        if (reply.ok) {
          if (reply.connection) { device.generation = reply.connection.generation; device.superseded = false; update({ needsResume: false }); }
          if (reply.view) { device.roomCode = reply.view.room.code; update({ view: reply.view }); }
          update({ message: '', pending: !!device.pending });
        } else {
          if (reply.error === 'SESSION_ELSEWHERE') { device.superseded = true; delete device.pending; channel.clear(); update({ view: null, needsResume: true }); }
          const unavailable = reply.error === 'ROOM_UNAVAILABLE' || reply.error === 'UNAUTHENTICATED';
          const message = unavailable ? unavailableMessage() : messages[reply.error];
          if (unavailable) clearSeat();
          if (reply.error === 'ALREADY_IN_ROOM') update({ needsResume: true });
          update({ message, pending: false });
          if (reply.error === 'UNAUTHENTICATED') { socket.disconnect(); schedule(); }
        }
        save();
        if (reply.ok) accepted?.();
      });
    }
    function restore() {
      if (hasMembership && device.pending?.event === 'lobby:action' && device.generation && !device.superseded) {
        const pending = device.pending;
        send({ event: 'lobby:connect', payload: { mode: 'resume', clientId: device.clientId, generation: device.generation } }, false, () => send(pending));
        return;
      }
      if (device.pending && (hasMembership || device.pending.event === 'lobby:enter')) { send(device.pending); return; }
      if (hasMembership) {
        if (device.superseded) update({ needsResume: true, message: messages.SESSION_ELSEWHERE });
        else if (device.generation) send({ event: 'lobby:connect', payload: { mode: 'resume', clientId: device.clientId, generation: device.generation } }, false);
        else update({ needsResume: true });
      } else if (device.roomCode || device.generation || device.pending) {
        const message = unavailableMessage(); clearSeat(); update({ message });
      }
    }
    function schedule() { if (!disposed && !retryTimer) retryTimer = setTimeout(() => { retryTimer = undefined; void boot(); }, 750); }
    async function boot() {
      if (disposed || booting || socket.connected) return;
      booting = true;
      try {
        const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        if (!response.ok) { update({ message: response.status === 429 ? messages.TRY_LATER : 'Unable to establish a private session.' }); schedule(); return; }
        const result = await response.json(); hasMembership = result.hasMembership === true;
        if (!disposed) socket.connect();
      } catch { update({ connected: false }); schedule(); }
      finally { booting = false; }
    }
    socket.on('connect', () => { connectionEpoch++; update({ connected: true }); restore(); });
    socket.on('disconnect', () => { connectionEpoch++; busy = false; update({ connected: false, busy: false }); schedule(); });
    socket.on('connect_error', () => { update({ connected: false }); schedule(); });
    socket.on('lobby:snapshot', (view: LobbyView) => { device.roomCode = view.room.code; update({ view }); });
    socket.on('game:snapshot', (view: GameView) => { if (!device.superseded) channel.receive(view); });
    socket.on('lobby:replaced', () => { connectionEpoch++; busy = false; device.superseded = true; delete device.pending; channel.clear(); save(); update({ view: null, needsResume: true, pending: false, busy: false, message: messages.SESSION_ELSEWHERE }); });
    socket.on('lobby:ended', (event: { reason?: string }) => { connectionEpoch++; busy = false; const message = event?.reason === 'expired' ? 'Room expired.' : unavailableMessage(); clearSeat(); update({ busy: false, message }); });
    controls.current = {
      enter(type, name, code) {
        send({ event: 'lobby:enter', payload: type === 'create' ? { type, name, clientId: device.clientId, attemptId: crypto.randomUUID() } : { type, name, code, clientId: device.clientId, attemptId: crypto.randomUUID() } });
      },
      act(type, fields = {}) {
        if (!device.roomCode || !device.generation || device.superseded) return;
        const parsed = actionSchema.safeParse({ type, ...fields, roomCode: device.roomCode, generation: device.generation, requestId: crypto.randomUUID() });
        if (parsed.success) send({ event: 'lobby:action', payload: parsed.data });
      },
      resume() { send({ event: 'lobby:connect', payload: { mode: 'takeover', clientId: device.clientId, attemptId: crypto.randomUUID() } }); },
      retry() { if (device.pending) send(device.pending); },
    };
    void boot();
    return () => { disposed = true; clearTimeout(retryTimer); controls.current = null; gameControls.current = null; socket.disconnect(); };
  }, []);
  return { ...state, ...game, controls, gameControls };
}
