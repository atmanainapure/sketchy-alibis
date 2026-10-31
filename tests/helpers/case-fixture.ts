import { systemRuntime, type ServerRuntime } from '../../src/server/runtime.js';

// Synthetic game fixture only. It does not approve or reuse the human review pack.
export function syntheticCase() {
  const innocent = ['delivery', 'bicycle', 'parcel'].map(id => ({ id, kind: 'innocent', story: `Synthetic ${id} story`, requiredDetails: [id, 'activity'], relevantRecordId: id === 'delivery' ? 'receiving' : null }));
  const forged = ['A', 'B'].map(option => ({ id: `forgery-${option.toLowerCase()}`, kind: 'forgery', option, story: `Synthetic forgery ${option}`, requiredDetails: ['object', 'action'], relevantRecordId: option === 'A' ? 'tram' : 'sales' }));
  const alibis = [...innocent, ...forged];
  return {
    id: 'synthetic-only', contentVersion: 'test-1', review: { approved: true },
    opening: { title: 'Synthetic case', story: 'Fictional test setup', photoContext: 'Synthetic image reference', fictionNotice: 'Test fixture only', alibiTime: '21:00', discoveryTime: '21:05' },
    countries: ['PT', 'ES', 'FR', 'IT', 'NL', 'GB'].map(id => ({ id, name: id })),
    photo: { publicFilename: 'scene-test.jpg', alt: 'Synthetic scene', width: 100, height: 100 },
    alibis,
    evidence: { releaseAtMs: 140_000, title: 'Private future sheet', introduction: 'PT and ES fictional locations', columns: ['PT', 'ES'], records: [
      { id: 'tram', label: 'Tram', PT: { event: 'closed-from', time: '20:45', text: 'PT tram closed' }, ES: { event: 'open-until', time: '21:30', text: 'ES tram open' } },
      { id: 'sales', label: 'Sales', PT: { event: 'closed-from', time: '20:30', text: 'PT sales closed' }, ES: { event: 'open-until', time: '21:30', text: 'ES sales open' } },
      { id: 'receiving', label: 'Receiving', PT: { event: 'deliveries-until', time: '21:15', text: 'PT delivery open' }, ES: { event: 'deliveries-ended', time: '20:45', text: 'ES delivery closed' } },
    ] },
    solution: { correctCountry: 'PT', geography: 'Private geographic explanation', wrongColumnExplanation: 'Private column explanation', alibiExplanations: alibis.map(a => ({ alibiId: a.id, recordId: a.relevantRecordId, text: `Explanation for ${a.id}` })) },
    clues: [1, 2].map(i => ({ id: `clue-${i}`, kind: 'test', visibleText: `clue ${i}`, bounds: { x: 0, y: 0, width: 1, height: 1 }, interpretation: `Private clue ${i}`, sourceIds: ['test-source'] })),
    provenance: { credit: 'Synthetic test credit', sourcePage: 'https://example.invalid/test', creditRelease: 'Solution', license: { name: 'Synthetic fixture', url: 'https://example.invalid/license', attributionRequired: false } },
  };
}

export function controlledClock(murderer = 0) {
  const start = 1_000_000;
  let now = start, sequence = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const runtime: ServerRuntime = {
    now: () => now,
    randomInt: maximum => maximum === 32 ? systemRuntime.randomInt(maximum) : maximum === 4 ? murderer : 0,
    schedule(callback, delay) { const id = ++sequence; timers.set(id, { at: now + delay, callback }); return () => { timers.delete(id); }; },
  };
  function to(offset: number, wake = true) {
    now = start + offset;
    if (!wake) return;
    for (let n = 0; n < 100; n++) {
      const due = [...timers].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) return;
      timers.delete(due[0]); due[1].callback();
    }
    throw Error('Timer failed to make progress');
  }
  return { runtime, to, start };
}
