import { expect, test } from 'vitest';
import { caseSchema } from '../../src/server/game/content';
import { case001 } from '../../src/server/content/case-001';

test('the real authoring pack fits the runtime schema with recorded A10 approval for rehearsal', () => {
  const result = caseSchema.safeParse(case001);
  expect(result.success).toBe(true);
  if (!result.success) throw Error('Runtime content schema mismatch');
  expect(result.data.review.approved).toBe(true);
  expect(result.data.alibis).toHaveLength(5);
  expect(result.data.evidence.releaseAtMs).toBe(140_000);
});
