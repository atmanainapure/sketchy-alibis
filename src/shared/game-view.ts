import type { Country, Strokes } from './game.js';

// Wire types only. No content, answer key or server implementation is imported.
export type Phase = 'Inspect' | 'Sketch' | 'Gallery' | 'Interrogate' | 'Verdict' | 'Solution' | 'Complete' | 'Aborted';
export type LockMode = 'submitted' | 'automatic' | 'missing';
export interface Card { id: string; story: string; requiredDetails: string[]; option?: 'A' | 'B' }
export interface Drawing { revision: number; strokes: Strokes; caption: string; locked: boolean; lockMode: LockMode | null }
export interface Ballot { revision: number; country: Country | null; suspectId: string | null; reason: string; locked: boolean }
export interface Evidence {
  releaseAtMs: number; title: string; introduction: string; columns: ['PT', 'ES'];
  records: { id: string; label: string; PT: { text: string }; ES: { text: string } }[];
}
export interface Result {
  arrestedId: string | null; tally: { playerId: string; votes: number }[];
  scores: { playerId: string; country: number; accusation: number; escape: number; total: number }[]; winnerIds: string[];
}
export interface Solution {
  murdererId: string; selectedForgery: 'A' | 'B' | null;
  cards: { playerId: string; guilt: 'murderer' | 'innocent'; card: Card | null }[];
  forgeryOptions: Card[]; correctCountry: Country; geography: string; wrongColumnExplanation: string;
  alibiExplanations: { alibiId: string; recordId: string | null; text: string }[];
  clues: { id: string; kind: string; visibleText: string; bounds: { x: number; y: number; width: number; height: number }; interpretation: string; sourceIds: string[] }[];
  provenance: { credit: string; sourcePage: string; creditRelease: 'Solution'; license: { name: string; url: string; attributionRequired: false } };
  ballots: { playerId: string; initial: Ballot; final: Ballot }[]; result: Result | null;
  observation: { events: { type: string; at: number; playerId?: string; [key: string]: unknown }[]; omittedEvents: Record<string, number> };
}
export interface GameView {
  snapshotRevision: number; caseId: string; contentVersion: string; phase: Phase; serverTime: number; phaseEndsAt: number | null; expiresAt: number | null;
  public: {
    opening: { title: string; story: string; photoContext: string; fictionNotice: string; alibiTime: string; discoveryTime: string };
    countries: { id: Country; name: string }[];
    photo: { publicFilename: string; alt: string; width: number; height: number };
    players: { id: string; name: string; connected: boolean }[];
    gallery?: { playerId: string; strokes: Strokes; caption: string; lockMode: LockMode | null }[];
    evidence?: Evidence; solution?: Solution; interruption?: string;
  };
  self: {
    id: string; guilt: 'murderer' | 'innocent'; card: Card | null; drawing: Drawing; initial: Ballot; final: Ballot;
    forgeryOptions?: Card[]; forgery?: { selected: 'A' | 'B' | null; locked: boolean; defaulted: boolean };
  };
}
export type GameReply = { ok: true; receipt?: { requestId: string; acceptedAt: number; phase: Phase; revision?: number }; view?: GameView } | { ok: false; error: string; view?: GameView };
