import { z } from 'zod';

const id = z.string().uuid();
const revision = z.number().int().min(0).max(2_147_483_647);
export const countrySchema = z.enum(['PT', 'ES', 'FR', 'IT', 'NL', 'GB']);
export const captionSchema = z.string().trim().refine(value => [...value].length <= 80 && (value ? value.split(/\s+/u).length : 0) <= 5);
export const strokesSchema = z.array(z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict()).min(1).max(2000)).max(128)
  .refine(strokes => strokes.reduce((n, stroke) => n + stroke.length, 0) <= 2000);
const drawing = { expectedRevision: revision, strokes: strokesSchema, caption: captionSchema };
const choices = { expectedRevision: revision, country: countrySchema.nullable(), suspectId: id.nullable() };
export const gameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('choose-forgery'), option: z.enum(['A', 'B']) }).strict(),
  z.object({ type: z.literal('save-drawing'), ...drawing }).strict(),
  z.object({ type: z.literal('submit-drawing'), ...drawing }).strict(),
  z.object({ type: z.literal('save-initial'), ...choices }).strict(),
  z.object({ type: z.literal('save-final'), ...choices, reason: z.string().trim().refine(value => [...value].length <= 160) }).strict(),
]);
// Authenticate the envelope before validating game-specific input or returning own state.
export const gameRequestSchema = z.object({ roomCode: z.string().max(24), caseId: id, requestId: id, generation: z.number().int().positive(), action: z.unknown() }).strict();
export type GameRequest = z.infer<typeof gameRequestSchema>;
export type GameAction = z.infer<typeof gameActionSchema>;
export type Strokes = z.infer<typeof strokesSchema>;
export type Country = z.infer<typeof countrySchema>;
