import { z } from 'zod';

const text = z.string().min(1).max(12_000);
const id = z.string().min(1).max(128);
const recordId = z.enum(['tram', 'sales', 'receiving']);
const card = { id, story: text, requiredDetails: z.tuple([text, text]), relevantRecordId: recordId.nullable() };
const entry = z.object({ event: z.enum(['closed-from', 'open-until', 'deliveries-until', 'deliveries-ended']), time: z.string().regex(/^\d{2}:\d{2}$/), text });

// This validates runtime structure/consistency. It cannot perform A10 human review.
export const caseSchema = z.object({
  id, contentVersion: z.string().min(1).max(64), review: z.object({ approved: z.boolean() }),
  opening: z.object({ title: text, story: text, photoContext: text, fictionNotice: text, alibiTime: z.literal('21:00'), discoveryTime: z.literal('21:05') }),
  countries: z.array(z.object({ id: z.enum(['PT', 'ES', 'FR', 'IT', 'NL', 'GB']), name: text })).length(6),
  photo: z.object({ publicFilename: z.string().regex(/^[a-zA-Z0-9_-]+\.jpg$/), alt: text, width: z.number().int().positive(), height: z.number().int().positive() }),
  alibis: z.array(z.discriminatedUnion('kind', [
    z.object({ ...card, kind: z.literal('innocent') }),
    z.object({ ...card, kind: z.literal('forgery'), option: z.enum(['A', 'B']) }),
  ])).length(5),
  evidence: z.object({ releaseAtMs: z.literal(140_000), title: text, introduction: text, columns: z.tuple([z.literal('PT'), z.literal('ES')]), records: z.array(z.object({ id: recordId, label: text, PT: entry, ES: entry })).length(3) }),
  solution: z.object({ correctCountry: z.literal('PT'), geography: text, wrongColumnExplanation: text, alibiExplanations: z.array(z.object({ alibiId: id, recordId: recordId.nullable(), text })).length(5) }),
  clues: z.array(z.object({ id, kind: text, visibleText: text, bounds: z.object({ x: z.number().nonnegative(), y: z.number().nonnegative(), width: z.number().positive(), height: z.number().positive() }), interpretation: text, sourceIds: z.array(id).min(1) })).min(2).max(20),
  provenance: z.object({ credit: text, sourcePage: z.url(), creditRelease: z.literal('Solution'), license: z.object({ name: text, url: z.url(), attributionRequired: z.literal(false) }) }),
}).superRefine((pack, ctx) => {
  const invalid = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (new Set(pack.countries.map(c => c.id)).size !== 6) invalid('Countries must be distinct');
  const innocents = pack.alibis.filter(a => a.kind === 'innocent');
  const forgeries = pack.alibis.filter(a => a.kind === 'forgery');
  if (innocents.length !== 3 || forgeries.length !== 2 || new Set(forgeries.map(a => a.option)).size !== 2 || new Set(pack.alibis.map(a => a.id)).size !== 5) invalid('Three distinct innocent cards and forgeries A/B required');
  if (new Set(pack.evidence.records.map(r => r.id)).size !== 3) invalid('All records required');
  const explanations = pack.solution.alibiExplanations;
  if (new Set(explanations.map(e => e.alibiId)).size !== 5 || pack.alibis.some(a => !explanations.some(e => e.alibiId === a.id && e.recordId === a.relevantRecordId))) invalid('Explanation/card references must agree');
});
export type CasePack = z.infer<typeof caseSchema>;
export type Alibi = CasePack['alibis'][number];
export const publicCard = (a: Alibi) => ({ id: a.id, story: a.story, requiredDetails: [...a.requiredDetails], ...(a.kind === 'forgery' ? { option: a.option } : {}) });
