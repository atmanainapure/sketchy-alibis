import { expect, test } from 'vitest';
import { gameHarness, syntheticCase } from '../helpers/game-harness';
import { createHash } from 'node:crypto';

test('photo requires the correct started room membership and serves only the neutral pinned asset', async () => {
  const pack = syntheticCase(); pack.photo.publicFilename = 'scene-001.jpg';
  const h = await gameHarness(pack);
  try {
    await h.start(); const view = await h.read(0);
    const path = `/api/rooms/${h.players[0].roomCode}/cases/${view.caseId}/photo`;
    const get = (path: string, cookie?: string) => fetch(h.origin + path, { headers: { Origin: h.origin, ...(cookie ? { Cookie: cookie } : {}) } });
    expect((await get(path)).status).toBe(404);
    const outsider = await h.player(); expect((await get(path, outsider.cookie)).status).toBe(404);
    expect((await get(path.replace(h.players[0].roomCode, 'ABCDEF'), h.players[0].cookie)).status).toBe(404);
    const response = await get(path, h.players[0].cookie);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/jpeg');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toBe('inline; filename="scene-001.jpg"');
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('76a990af93dd289f81797e96146159288e9c7f265fb6a62862b03213ecdfb6c6');
    h.clock.to(255_000 + 3_600_000);
    expect((await get(path, h.players[0].cookie)).status).toBe(404);
  } finally { await h.close(); }
});
