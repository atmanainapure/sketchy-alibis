# Case 001 content review

**Spoilers: facilitator and content reviewer only.** Candidate `case-001`, content version `1.0.0-rc.1`, photo asset version `1`. Prepared 14 October 2026. **A10 approved by Atman Ainapure on 15 October 2026 for prototype rehearsal only.** This is content approval, not a completed human playtest or device test.

The machine-readable source is [case-001.ts](../../src/server/content/case-001.ts). The saved [photograph](../../assets/private/case-001/scene-001.jpg) is part of the project. Open it in an image viewer at native resolution to inspect the clues below. SB-05 serves the photograph through verified room membership and delivers phase-specific views. This review document and the full private authoring pack are not public assets.

## Opening and drawing cards

**The Last Take.** A travel-show host has been found dead behind a café at 9:05 p.m. Everyone must account for where they were at 9:00 p.m. Find the country and the fabricated alibi.

Show these qualifications from Inspect: the photograph is an earlier daytime image of the area near the fictional scene, not evidence of opening hours or presence at 9 p.m. The victim, café, hotel, fountain, stop, alibis and records are fictional. Real people and businesses in the photograph are unrelated to the story. Do not identify a pictured real shop as the crime venue.

The six country choices remain Portugal, Spain, France, Italy, the Netherlands and the United Kingdom. Portugal is correct. SB-04 assigns the three innocent cards once each and let the murderer choose A or B; assignment is performed by the server authority.

| Card | Private story at 9 p.m. | Two required drawing details |
| --- | --- | --- |
| Delivery, innocent | Delivering pastries to the café receiving entrance | Pastries; handing over a delivery |
| Bicycle, innocent | Repairing a bicycle beside the fountain | Bicycle; repair activity |
| Parcel, innocent | Collecting a parcel from the hotel desk | Parcel; collection at a desk |
| Forgery A | Boarding a tram at the café stop | Tram; boarding |
| Forgery B | Buying pastries at the café sales counter | Pastries; paying |

The original private stories include no closure times or explanation of their weaknesses. The two pastry cards deliberately differ by receiving a delivery versus making a purchase. Human review should check that this distinction is understandable and drawable; drawing quality is never automatically judged.

## Shared evidence

At elapsed **140 seconds**, 25 seconds into Interrogate, release this entire sheet for either forgery choice:

> The photographed scene belongs to one of the show’s two filming locations: Portugal or Spain. These records are genuine within this fictional case. Use the photograph to choose the relevant column. All times are local to that location.

| Production location record | Portugal | Spain |
| --- | --- | --- |
| Boarding at the café tram stop | Closed from 8:45 p.m. | Open until 9:30 p.m. |
| Café sales counter | Closed from 8:30 p.m. | Open until 9:30 p.m. |
| Café receiving entrance | Deliveries accepted until 9:15 p.m. | Deliveries ended at 8:45 p.m. |

These invented times are not taken from CARRIS schedules or actual business hours. The late disclosure intentionally narrows six countries to two; geography still determines the applicable column.

## Alibi review matrix

| Story at 9 p.m. | Portugal interpretation | Spain interpretation | Decisive record |
| --- | --- | --- | --- |
| Delivery | Permitted | Contradicted | Receiving entrance |
| Bicycle | Not addressed; no contradiction | Not addressed; no contradiction | None |
| Parcel | Not addressed; no contradiction | Not addressed; no contradiction | None |
| Forgery A | Contradicted | Permitted | Tram boarding |
| Forgery B | Contradicted | Permitted | Sales counter |

Solution reveals the assigned murderer and all original cards, including both alternatives, with the same record references. It introduces no extra closing time, receipt or witness. The Portugal receiving entrance is still accepting deliveries even though the sales counter is closed. A bicycle sketch resembling a motorbike is suspicious conversation material, not a separate fact in the case. The Spain column would make the innocent delivery look inconsistent while permitting either forgery.

## Photograph and clues

**Photo:** “A yellow tram travels down a lisbon street,” Paul Keiffer, [Unsplash source](https://unsplash.com/photos/a-yellow-tram-travels-down-a-lisbon-street-Am61s2Rya2Y), published 2 August 2025; source identifies Lisbon, Portugal. Retrieved 14 October 2026. This is a real photograph, not a generated replacement for geographic evidence.

Two independently useful clue families are present. Rectangles below are `(x, y, width, height)` in the unrotated **3000 × 4501** JPEG, with origin at its upper left. They are answer annotations for Solution, not early hints.

| Clue | Rectangle in pixels | Interpretation and primary sources |
| --- | --- | --- |
| Tram destination **PRAZERES 28E** | `(970, 1550, 900, 190)` | [CARRIS route 28E](https://www.carris.pt/en/travel/carreiras/28e/) lists Campo Ourique (Prazeres); [CARRIS company information](https://www.carris.pt/en/carris/company/who-we-are/) locates its operations in Lisbon. [EU Portugal facts](https://european-union.europa.eu/principles-countries-history/eu-countries/portugal_en) identifies Lisbon as Portugal’s capital. The CARRIS wordmark on the tram reinforces this same transit clue; it is not counted as an independent second clue. |
| Portuguese jewelry-shop lettering, especially **RELÓGIOS** | `(215, 2190, 220, 290)` | The white/green strip reads OURO – PRATAS – JÓIAS – RELÓGIOS. [Priberam](https://dicionario.priberam.org/rel%C3%B3gios) identifies relógios as a Portuguese word for timekeeping instruments; the [EU country page](https://european-union.europa.eu/principles-countries-history/eu-countries/portugal_en) identifies Portuguese as Portugal’s official language. This supports Portugal among the six options, but language by itself does not prove a country. |

Agent visual inspection found both text areas readable at native resolution. No `.pt` domain or telephone-prefix clue is claimed. Yellow trams, tiled facades and paving are atmosphere, not conclusive evidence. Whether unfamiliar players can discover and use the two clues within Inspect remains untested. The narrower language clue and portrait photo need human review now and testing in the built zoom viewer in SB-05/07.

## Rights and asset integrity

The [Unsplash License](https://unsplash.com/license), accessed 14 October 2026, permits downloading, using, modifying and distributing this free photograph, including commercial uses. Attribution is appreciated but not required. Its exclusions include selling substantially unchanged images by themselves and creating a competing image service. The planned use is an embedded game photograph, not either excluded use. The website license has no numbered version; this record does not invent one.

Credit at Solution: **Photo by Paul Keiffer on Unsplash.** Link the photographer’s source page and license then. Because attribution is not mandatory before play, withhold the location-bearing source title, URL, creator metadata, clue annotations and answer explanation until Solution. The browser’s photo URL and download name must stay neutral (`scene-001.jpg`), with alt text “Earlier daytime street photograph near the fictional scene.” Deliberate reverse-image searching is outside the prototype’s anti-cheating scope.

The provider supplied a 3000-pixel-wide JPEG rendition; it was only renamed locally. No local cropping, retouching or sign replacement occurred. The exact downloaded bytes are pinned:

- File: `assets/private/case-001/scene-001.jpg`
- Dimensions: 3000 × 4501; size: 2,229,889 bytes
- SHA-256: `76a990af93dd289f81797e96146159288e9c7f265fb6a62862b03213ecdfb6c6`
- Metadata audit: JFIF and ICC color profile only; no EXIF/GPS, XMP, IPTC or JPEG comments. No unnecessary location metadata was present to remove.

Keep the source pack and this review out of public static directories. SB-05 must deliberately serve only the photograph and allowed phase projections. Any photo change requires a new asset/content version, fresh clue coordinates and rights review. Automated integrity checks are not a substitute for that review.

## Required human sign-off

The user explicitly approved the exact package as presented: “I approve A10 for case-001@1.0.0-rc.1 as presented, for prototype rehearsal. Record this approval against that exact version.” This accepts the five review items below; it does not claim a human playtest or physical-device result.

- [x] Rights/source/credit are documented and suitable for the proposed use.
- [x] Both marked clue regions are visible and the Portugal inference is sound.
- [x] All five cards, the two-column matrix and receiving-versus-sales distinction are coherent.
- [x] The reveal relies only on evidence already available during the case.
- [x] The fiction notice prevents implying a real person or business was involved in a murder.

Reviewer: **Atman Ainapure**. Date: **15 October 2026 (America/New_York)**. Decision: **Approved as presented for prototype rehearsal, no content revisions requested**. Real-content technical rehearsal is recorded separately; physical-device testing and human playtesting remain pending.

Approval applies only to `case-001@1.0.0-rc.1` and the SHA-256 above. Record the review outcome in this file, the pack’s review metadata, and the canonical blueprint. A requested content change must be validated before approval. Four-player playtesting and in-viewer readability remain separate later gates.
