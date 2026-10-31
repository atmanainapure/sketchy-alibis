import { case001 } from '../../src/server/content/case-001';
import { syntheticCase } from './case-fixture';

// Only test code selects this synthetic pack. The real case is never approved.
// Reuse the licensed asset and its actual credit to exercise the built viewer.
export function browserCase() {
  return { ...syntheticCase(), photo: { ...case001.photo }, provenance: { ...case001.provenance },
    countries: case001.countries.map(c => ({ ...c })),
    opening: { ...syntheticCase().opening, title: 'Synthetic rehearsal', fictionNotice: 'Synthetic software test. This does not approve the real case or count as a human playtest.' } };
}

