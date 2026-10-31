import { expect, test } from 'vitest';
import { gameHarness, accepted, ask, requestId } from '../helpers/game-harness';
import { caseSchema } from '../../src/server/game/content';
import { case001 } from '../../src/server/content/case-001';

// Bounded one-room check, not a stress test or a hosting throughput guarantee.
test('four real-case players save bounded drawings concurrently without exposing private work', async () => {
  const h = await gameHarness(caseSchema.parse(case001));
  try {
    await h.start(); h.clock.to(45000);
    const started = performance.now();
    const strokes = [Array.from({ length: 1900 }, (_, i) => ({ x: (i % 1000) / 1000, y: .999 }))];
    const latencies: number[] = [];
    // Ten rounds spread over the authority's 40-second Sketch phase.
    for (let revision = 0; revision < 10; revision++) {
      h.clock.to(45000 + revision * 3900);
      await Promise.all(h.players.map(async (_, i) => {
        const begin = performance.now();
        accepted(await h.act(i, { type: 'save-drawing', expectedRevision: revision, strokes, caption: `private sketch ${i}` }));
        latencies.push(performance.now() - begin);
      }));
    }
    for (let i = 0; i < 4; i++) {
      const v = await h.read(i);
      expect(v.self.drawing.revision).toBe(10);
      expect(v.self.drawing.strokes).toEqual(strokes);
      expect(v.public.gallery).toBeUndefined();
      expect(v.public.solution).toBeUndefined();
      for (let j = 0; j < 4; j++) if (j !== i) expect(JSON.stringify(v)).not.toContain(`private sketch ${j}`);
    }
    const outsider = await h.player();
    expect(await ask(outsider.socket, 'game:read', { roomCode: h.players[0].roomCode })).toMatchObject({ ok: false });
    h.clock.to(85000);
    const view = await h.read(0);
    expect(view.public.gallery).toHaveLength(4);
    for (const sketch of view.public.gallery) expect(sketch.lockMode).toBe('automatic');
    expect(await h.act(1, { type: 'save-drawing', expectedRevision: 10, strokes, caption: 'late' }, requestId())).toMatchObject({ ok: false, error: 'PHASE_ENDED' });
    console.log(JSON.stringify({ measuredRoomCount: 1, players: 4, acceptedSaves: 40, pointsPerDraft: 1900, elapsedMs: Math.round(performance.now() - started), maxReadAndSaveAckMs: Math.ceil(Math.max(...latencies)), clock: 'controlled' }));
  } finally { await h.close(); }
});
