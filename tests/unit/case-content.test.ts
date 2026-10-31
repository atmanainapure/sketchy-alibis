import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { case001 as pack } from '../../src/server/content/case-001.js';

// Authoring checks, not the future runtime case schema or drawing evaluation.
function minutes(time: string) {
  expect(time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  const [hours, remainder] = time.split(':').map(Number);
  return hours * 60 + remainder;
}

describe('case-001 authoring contract', () => {
  test('contains the six choices and five distinct cards required by the prototype', () => {
    expect(pack.countries.map(country => country.id)).toEqual(['PT', 'ES', 'FR', 'IT', 'NL', 'GB']);
    expect(pack.solution.correctCountry).toBe('PT');
    expect(pack.alibis.filter(card => card.kind === 'innocent')).toHaveLength(3);
    expect(pack.alibis.filter(card => card.kind === 'forgery').map(card => card.option)).toEqual(['A', 'B']);
    expect(new Set(pack.alibis.map(card => card.id)).size).toBe(5);
    for (const card of pack.alibis) {
      expect(card.requiredDetails).toHaveLength(2);
      expect(new Set(card.requiredDetails).size).toBe(2);
      expect(card.story).toContain('9:00 p.m.');
      expect(card.story).not.toMatch(/Portugal|Spain|closed|8:45|8:30|9:15|9:30/);
    }
  });

  test('the shared record sheet reverses the delivery and forgery implications by country', () => {
    expect(pack.opening.alibiTime).toBe('21:00');
    expect(pack.evidence.releaseAtMs).toBe(140_000);
    expect(pack.evidence.columns).toEqual(['PT', 'ES']);
    expect(pack.evidence.records).toHaveLength(3);
    // Every supplied record describes an end of availability, in local time.
    // Evaluate the claim against the actual cutoff instead of storing an answer matrix.
    const inferred = pack.alibis.map(card => {
      const record = pack.evidence.records.find(row => row.id === card.relevantRecordId);
      const result = (country: 'PT' | 'ES') => {
        if (!record) return 'not-addressed';
        expect(['closed-from', 'open-until', 'deliveries-until', 'deliveries-ended']).toContain(record[country].event);
        return minutes(pack.opening.alibiTime) < minutes(record[country].time) ? 'permitted' : 'contradicted';
      };
      return [card.id, result('PT'), result('ES')];
    });
    expect(inferred).toEqual([
      ['delivery', 'permitted', 'contradicted'],
      ['bicycle', 'not-addressed', 'not-addressed'],
      ['parcel', 'not-addressed', 'not-addressed'],
      ['forgery-a', 'contradicted', 'permitted'],
      ['forgery-b', 'contradicted', 'permitted'],
    ]);
  });

  test('every explanation references an existing card and its already released record', () => {
    expect(pack.solution.alibiExplanations.map(item => item.alibiId).sort()).toEqual(pack.alibis.map(card => card.id).sort());
    for (const item of pack.solution.alibiExplanations) {
      const card = pack.alibis.find(candidate => candidate.id === item.alibiId)!;
      expect(item.recordId).toBe(card.relevantRecordId);
      if (item.recordId) expect(pack.evidence.records.some(row => row.id === item.recordId)).toBe(true);
    }
    // This checks reference integrity. A human must still review the prose for fairness.
    expect(pack.review.approved).toBe(true);
    expect(pack.review.approvedContentVersion).toBe(pack.contentVersion);
    expect(pack.review.approvedPhotoSha256).toBe(pack.photo.sha256);
    expect(pack.review.reviewer).toBe('Atman Ainapure');
    expect(pack.review.reviewedAt).toBe('2026-10-15');
  });

  test('the exact licensed asset has the documented dimensions and no location metadata segments', async () => {
    const jpeg = await readFile(pack.photo.assetPath);
    expect(jpeg.length).toBe(pack.photo.bytes);
    expect(createHash('sha256').update(jpeg).digest('hex')).toBe(pack.photo.sha256);
    expect(jpeg.readUInt16BE(0)).toBe(0xffd8);
    const applicationMarkers: number[] = [];
    let dimensions: number[] | undefined;
    for (let offset = 2; offset < jpeg.length;) {
      expect(jpeg[offset]).toBe(0xff);
      while (jpeg[offset] === 0xff) offset++;
      const marker = jpeg[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      const length = jpeg.readUInt16BE(offset);
      expect(length).toBeGreaterThanOrEqual(2);
      expect(offset + length).toBeLessThanOrEqual(jpeg.length);
      if (marker >= 0xe0 || marker === 0xfe) applicationMarkers.push(marker);
      if (marker === 0xc0 || marker === 0xc2) dimensions = [jpeg.readUInt16BE(offset + 5), jpeg.readUInt16BE(offset + 3)];
      offset += length;
    }
    expect(dimensions).toEqual([pack.photo.width, pack.photo.height]);
    // APP0/JFIF and APP2/ICC are present. EXIF/XMP (APP1), IPTC (APP13)
    // and JPEG comments are absent; this is not an arbitrary metadata scrubber.
    expect(applicationMarkers).toEqual([0xe0, 0xe2]);
    expect(pack.photo.publicFilename).toBe('scene-001.jpg');
    expect(pack.photo.alt).not.toMatch(/Portugal|Lisbon|Keiffer|Unsplash/);
  });

  test('two distinct clue families have reproducible in-bounds locations and source references', () => {
    expect(new Set(pack.clues.map(clue => clue.kind)).size).toBeGreaterThanOrEqual(2);
    const sources = new Set<string>(pack.provenance.sources.map(source => source.id));
    for (const clue of pack.clues) {
      const { x, y, width, height } = clue.bounds;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(x + width).toBeLessThanOrEqual(pack.photo.width);
      expect(y + height).toBeLessThanOrEqual(pack.photo.height);
      for (const sourceId of clue.sourceIds) expect(sources.has(sourceId)).toBe(true);
    }
    expect(pack.provenance.license.attributionRequired).toBe(false);
    expect(pack.provenance.creditRelease).toBe('Solution');
  });
});
