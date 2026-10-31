/** Authoring pack only. Never import into client/shared code or serialize wholesale.
 * SB-04 owns runtime validation; SB-05 owns phase-specific delivery.
 * Approved by Atman Ainapure on 2026-10-15 for prototype rehearsal only.
 */
export const case001 = {
  id: 'case-001',
  contentVersion: '1.0.0-rc.1',
  review: { status: 'approved-for-prototype-rehearsal', approved: true, reviewer: 'Atman Ainapure', reviewedAt: '2026-10-15', scope: 'Prototype rehearsal only', approvedContentVersion: '1.0.0-rc.1', approvedPhotoSha256: '76a990af93dd289f81797e96146159288e9c7f265fb6a62862b03213ecdfb6c6' },
  opening: {
    title: 'The Last Take',
    story: 'A travel-show host has been found dead behind a café at 9:05 p.m. Everyone must account for where they were at 9:00 p.m. Find the country and the fabricated alibi.',
    photoContext: 'This earlier daytime street photograph shows the area near the fictional scene. It is not a record of what was open or who was present at 9:00 p.m.',
    fictionNotice: 'The victim, café, hotel, fountain, stop, alibis and records belong to a fictional case. Real people and businesses pictured are unrelated to the story.',
    alibiTime: '21:00',
    discoveryTime: '21:05',
  },
  countries: [
    { id: 'PT', name: 'Portugal' },
    { id: 'ES', name: 'Spain' },
    { id: 'FR', name: 'France' },
    { id: 'IT', name: 'Italy' },
    { id: 'NL', name: 'Netherlands' },
    { id: 'GB', name: 'United Kingdom' },
  ],
  photo: {
    assetPath: 'assets/private/case-001/scene-001.jpg',
    publicFilename: 'scene-001.jpg',
    alt: 'Earlier daytime street photograph near the fictional scene.',
    width: 3000,
    height: 4501,
    bytes: 2229889,
    sha256: '76a990af93dd289f81797e96146159288e9c7f265fb6a62862b03213ecdfb6c6',
    assetVersion: '1',
  },
  alibis: [
    {
      id: 'delivery', kind: 'innocent',
      story: 'At 9:00 p.m., you were delivering pastries to the café receiving entrance.',
      requiredDetails: ['Pastries', 'Handing over a delivery'],
      relevantRecordId: 'receiving',
    },
    {
      id: 'bicycle', kind: 'innocent',
      story: 'At 9:00 p.m., you were repairing a bicycle beside the fountain.',
      requiredDetails: ['A bicycle', 'Repair activity'],
      relevantRecordId: null,
    },
    {
      id: 'parcel', kind: 'innocent',
      story: 'At 9:00 p.m., you were collecting a parcel from the hotel desk.',
      requiredDetails: ['A parcel', 'Collection at a desk'],
      relevantRecordId: null,
    },
    {
      id: 'forgery-a', kind: 'forgery', option: 'A',
      story: 'At 9:00 p.m., you boarded a tram at the café stop.',
      requiredDetails: ['A tram', 'Boarding'],
      relevantRecordId: 'tram',
    },
    {
      id: 'forgery-b', kind: 'forgery', option: 'B',
      story: 'At 9:00 p.m., you bought pastries at the café sales counter.',
      requiredDetails: ['Pastries', 'Paying'],
      relevantRecordId: 'sales',
    },
  ],
  // One shared sheet for both forgery choices. No alternative-specific release.
  evidence: {
    releaseAtMs: 140_000,
    title: 'Production location records',
    introduction: 'The photographed scene belongs to one of the show’s two filming locations: Portugal or Spain. These records are genuine within this fictional case. Use the photograph to choose the relevant column. All times are local to that location.',
    columns: ['PT', 'ES'],
    records: [
      {
        id: 'tram', label: 'Boarding at the café tram stop',
        PT: { event: 'closed-from', time: '20:45', text: 'Closed from 8:45 p.m.' },
        ES: { event: 'open-until', time: '21:30', text: 'Open until 9:30 p.m.' },
      },
      {
        id: 'sales', label: 'Café sales counter',
        PT: { event: 'closed-from', time: '20:30', text: 'Closed from 8:30 p.m.' },
        ES: { event: 'open-until', time: '21:30', text: 'Open until 9:30 p.m.' },
      },
      {
        id: 'receiving', label: 'Café receiving entrance',
        PT: { event: 'deliveries-until', time: '21:15', text: 'Deliveries accepted until 9:15 p.m.' },
        ES: { event: 'deliveries-ended', time: '20:45', text: 'Deliveries ended at 8:45 p.m.' },
      },
    ],
  },
  solution: {
    correctCountry: 'PT',
    geography: 'The destination PRAZERES and route 28E match a Lisbon tram route. Portuguese shop lettering, including RELÓGIOS, supports Portugal among the six options. Together they identify the setting; yellow trams, tiles or paving alone do not establish a country.',
    // Explanations refer to the already released sheet; no new decisive record.
    alibiExplanations: [
      { alibiId: 'delivery', recordId: 'receiving', text: 'At the Portugal location, deliveries were still accepted at 9:00 p.m. The sales counter and receiving entrance are different parts of the café.' },
      { alibiId: 'bicycle', recordId: null, text: 'The records do not contradict repairing a bicycle beside the fountain. An unclear sketch is not proof of guilt.' },
      { alibiId: 'parcel', recordId: null, text: 'The records do not contradict collecting a parcel at the hotel desk. An unclear sketch is not proof of guilt.' },
      { alibiId: 'forgery-a', recordId: 'tram', text: 'The Portugal stop was already closed at 9:00 p.m., so the boarding story conflicts with the record. A tram in an earlier photograph does not prove boarding was possible later.' },
      { alibiId: 'forgery-b', recordId: 'sales', text: 'The Portugal sales counter was already closed at 9:00 p.m., so the purchase story conflicts with the record. Delivery access does not imply that the sales counter was open.' },
    ],
    wrongColumnExplanation: 'The Spain column would permit both forgeries and make the innocent delivery look inconsistent. That is why identifying the photographed country changes the accusation.',
  },
  // Pixel rectangles use the unrotated 3000 × 4501 asset, origin at top left.
  // These annotations and all provenance are withheld until Solution.
  clues: [
    {
      id: 'route', kind: 'transit',
      visibleText: 'PRAZERES 28E',
      bounds: { x: 970, y: 1550, width: 900, height: 190 },
      interpretation: 'CARRIS lists route 28E between Martim Moniz and Campo Ourique (Prazeres); CARRIS serves Lisbon. The operator wordmark on the right side of the tram is corroboration, not a separate independent clue.',
      sourceIds: ['carris-route', 'carris-company', 'eu-portugal'],
    },
    {
      id: 'language', kind: 'language',
      visibleText: 'OURO - PRATAS - JÓIAS - RELÓGIOS',
      bounds: { x: 215, y: 2190, width: 220, height: 290 },
      interpretation: 'The shop lettering is Portuguese. RELÓGIOS is the plural of relógio, a clock or watch. Portuguese is Portugal’s official language. This supports Portugal among the choices, but language alone cannot prove a location.',
      sourceIds: ['priberam', 'eu-portugal'],
    },
  ],
  provenance: {
    creator: 'Paul Keiffer',
    title: 'A yellow tram travels down a lisbon street',
    sourcePage: 'https://unsplash.com/photos/a-yellow-tram-travels-down-a-lisbon-street-Am61s2Rya2Y',
    sourceId: 'Am61s2Rya2Y',
    publishedDate: '2025-08-02',
    retrievedDate: '2026-10-14',
    sourceLocation: 'Lisbon, Portugal',
    downloadUrl: 'https://images.unsplash.com/photo-1754151630904-da4334bddfbf?auto=format&fit=crop&fm=jpg&ixid=NHwxMjA3fDA%3D&ixlib=rb-4.1.0&q=60&w=3000',
    license: {
      name: 'Unsplash License',
      version: 'Unversioned web license, accessed 2026-10-14',
      url: 'https://unsplash.com/license',
      attributionRequired: false,
      use: 'Downloaded photograph embedded in the game; no standalone image sale or competing image collection.',
    },
    credit: 'Photo by Paul Keiffer on Unsplash.',
    creditRelease: 'Solution',
    modifications: 'Downloaded the provider’s 3000-pixel-wide JPEG rendition. Locally renamed only; no crop, retouching, fabricated signs or image edits.',
    metadata: 'Inspected JPEG application segments: JFIF and ICC color profile only. No EXIF, GPS, XMP, IPTC or comment segments to remove.',
    sources: [
      { id: 'carris-route', url: 'https://www.carris.pt/en/travel/carreiras/28e/', supports: 'Route 28E and Prazeres destination only; not fictional service hours.' },
      { id: 'carris-company', url: 'https://www.carris.pt/en/carris/company/who-we-are/', supports: 'CARRIS operates in Lisbon and its metropolitan area.' },
      { id: 'eu-portugal', url: 'https://european-union.europa.eu/principles-countries-history/eu-countries/portugal_en', supports: 'Lisbon is Portugal’s capital; Portuguese is the official language.' },
      { id: 'priberam', url: 'https://dicionario.priberam.org/rel%C3%B3gios', supports: 'Portuguese relógios is the plural of relógio, a timekeeping instrument.' },
    ],
  },
} as const;
