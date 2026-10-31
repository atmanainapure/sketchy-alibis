import { z } from 'zod';

const id = z.string().uuid();
const name = z.string().trim().refine(value => [...value].length >= 1 && [...value].length <= 20 && !/[\u0000-\u001f\u007f]/.test(value));
export const enterSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), attemptId: id, clientId: id, name }).strict(),
  z.object({ type: z.literal('join'), attemptId: id, clientId: id, name, code: z.string().max(24).trim().toUpperCase() }).strict(),
]);
export const connectSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('resume'), clientId: id, generation: z.number().int().positive() }).strict(),
  z.object({ mode: z.literal('takeover'), clientId: id, attemptId: id }).strict(),
]);
const action = { requestId: id, roomCode: z.string().max(24), generation: z.number().int().positive() };
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ ...action, type: z.literal('ready'), ready: z.boolean() }).strict(),
  z.object({ ...action, type: z.literal('remove'), targetId: id }).strict(),
  z.object({ ...action, type: z.literal('leave') }).strict(),
  z.object({ ...action, type: z.literal('close') }).strict(),
  z.object({ ...action, type: z.literal('start') }).strict(),
]);
export const readSchema = z.object({ roomCode: z.string().max(24) }).strict();
export type Enter = z.infer<typeof enterSchema>;
export type Connect = z.infer<typeof connectSchema>;
export type LobbyAction = z.infer<typeof actionSchema>;
export interface LobbyView {
  room: { code: string; status: 'Lobby' | 'Started' | 'Closed'; ownerId: string; expiresAt: number | null; players: { id: string; name: string; ready: boolean; connected: boolean }[] };
  self: { id: string };
}
export type LobbyError = 'INVALID_REQUEST' | 'UNAUTHENTICATED' | 'ROOM_UNAVAILABLE' | 'ROOM_FULL' | 'NAME_TAKEN' | 'ALREADY_IN_ROOM' | 'FORBIDDEN' | 'SESSION_ELSEWHERE' | 'CONFLICT' | 'NOT_READY' | 'CONTENT_UNAVAILABLE' | 'CASE_STARTED' | 'TRY_LATER' | 'REQUEST_FAILED';
export type Reply = { ok: false; error: LobbyError } | { ok: true; view?: LobbyView; connection?: { clientId: string; generation: number }; receipt?: { requestId: string } };
