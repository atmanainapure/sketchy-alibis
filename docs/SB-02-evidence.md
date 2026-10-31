# SB-02 case content evidence

Current status update, 15 October 2026: see [approved real-case rehearsal](SB-05-real-case-rehearsal.md). The results and pending statements below describe the earlier checkpoint; A10 and the technical real-case rehearsal are now completed, while physical-device testing and human playtesting remain pending.
**Date:** 14 October 2026. **Status: Blocked only on required human content sign-off.** The complete `case-001@1.0.0-rc.1` candidate, licensed photograph and review pack are saved. SB-02 is not marked Verified because A10 explicitly requires a human review. No human review, playtest, game session or public deployment occurred.

## Entry gate and scope

Rechecked the previous milestone before advancing. SB-01’s exact matching Chromium installation was recovered and `npm run check` passed: typecheck, build, 9 integration tests and 2 browser journeys. See [SB-01 evidence](SB-01-evidence.md) for the historical failed download and successful recovery. The original source archive comparison found no intervening changes. The dependency manifest, lockfile and selected stack remain unchanged.

SB-02 adds `src/server/content/case-001.ts`, the neutral photograph at `assets/private/case-001/scene-001.jpg`, [the human review pack](cases/case-001-review.md), five authoring checks, and private-path regression probes. All five stories, the six countries, three evidence rows, shared release offset and both-country interpretation matrix follow the saved specification. No room, assignment, phase engine, drawing, vote, scoring or recovery behavior was implemented early.

## Verification approach

This milestone authors static case material and licenses an asset. It adds **no application runtime behavior**, so it does not manufacture a failing test or claim a new RED/GREEN cycle. The ECC TDD workflow applies to substantive behavior in later milestones; direct content, asset and existing-boundary checks are the appropriate verification here. The previous milestone’s genuine import-boundary RED/GREEN evidence is retained.

The content checks exercise the scenario and integrity constraints rather than drawing quality: six choices/five distinct cards/two details, the 9 p.m. cross-country contradiction matrix derived from cutoff times, explanation references to the already released records, exact asset hash/dimensions/metadata, and source-backed in-bounds clue rectangles. A passing reference check cannot establish that prose is fair or a clue is discoverable. Those remain human review and later viewer/playtest questions.

## Actual commands and results

| Command or check | Actual result |
| --- | --- |
| `npm test -- tests/unit/case-content.test.ts` | Exit **0**, **1 file / 5 tests passed** on the candidate pack |
| `npm run check` | Exit **0**: TypeScript checks pass; Vite and server builds pass; **4 Vitest files / 14 tests passed**; **2 Chromium journeys passed**, no retries/skips |
| Production/private-file HTTP checks in `tests/integration/server-smoke.test.ts` | Source, compiled case module, private JPEG and review document return safe **404** responses; development `@fs` requests to the private paths return **403/404** |
| Existing `tests/integration/client-boundary.test.ts` | All **5** tests still pass: public import allowed; direct, transitive, raw and symlinked server imports rejected |
| Browser-output inspection | Only HTML/CSS/JS in `dist/client`; no source maps, photo, case ID, answer-key marker, forgery ID, photo source ID, creator or private cutoff-time markers |
| Asset byte/hash and JPEG inspection | **2,229,889 bytes**, **3000 × 4501**; SHA-256 `76a990af93dd289f81797e96146159288e9c7f265fb6a62862b03213ecdfb6c6`. Only JFIF and ICC application metadata; no EXIF/GPS, XMP, IPTC or comment segments |
| Source-page and official-reference inspection | Unsplash creator/location/license recorded; route/destination verified against CARRIS, Portuguese word against Priberam, capital/language against EU country facts; links are in the review pack |
| Agent visual inspection | Full photo and native-resolution shop lettering inspected. Both clue rectangles identify readable text. This is **not** human review or proof of novice discoverability |

No new dependencies were installed for SB-02. No coverage percentage was measured or inferred. npm’s environment-owned `http-proxy` warning and the browser runner’s color-environment warning did not fail the checks.

## Acceptance and remaining gate

| SB-02 requirement | Evidence and status |
| --- | --- |
| Real licensed photograph, pinned source/version/credit | Documented in private pack, THIRD_PARTY and review pack; saved asset hash verified |
| Two useful visible geography clue families | Transit destination and Portuguese shop text; coordinates and independent official references recorded; agent visually checked |
| Five cards and two visual details each | Authored and validated; no closure spoilers in private story text |
| Shared Portugal/Spain evidence; no new decisive reveal fact | One sheet, matrix checked at 21:00, explanation record references checked; human semantic review still pending |
| Neutral asset and protected answer/provenance | Neutral filename/alt; no unnecessary location metadata; HTTP/build-boundary checks pass. Future SB-05 payload projection still needs its own tests |
| Fiction clearly separated from real photograph | Opening and review explain earlier daytime context and unrelated real people/businesses |
| Human A10 sign-off | **NOT RUN.** Reviewer/date/decision are unset; pack remains `approved: false` |

The human reviewer should inspect [the concrete pack](cases/case-001-review.md), complete its five review items and record any required corrections before approving this content version. SB-05’s completion remains blocked until that gate passes. In-viewer zoom readability, caption/drawing interpretation, private state delivery and fresh four-player playtests are not established by these checks.

## Resume and recovery

Continue from the sole [canonical blueprint](https://chatgpt.com/space/page_e4db0c79734c8191b236365ff40e44d3). The next implementation milestone is **SB-03 private rooms and player identity**, whose SB-01 prerequisite is now satisfied; stop this request at SB-02. SB-03 does not require content approval, so the review need not block room development in a later request.

If content review rejects a clue or photograph, retain the current candidate as unapproved, revise with a new content version, recheck the asset license/hash/coordinates and rerun content checks. Do not change the agreed two-column mechanics to make a weak photograph appear valid. If the remote image disappears, use the licensed, pinned local copy; never silently fetch a substitute. Do not package dependencies, browser binaries, test screenshots, certificates or private helper files in the source archive.
