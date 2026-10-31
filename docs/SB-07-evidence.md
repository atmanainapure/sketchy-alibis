# SB-07 Readability and interaction refinement

**Later decision, 15 October 2026:** Atman explicitly deferred the human/device gates below and authorized a private technical demo. They remain unperformed, not passed. See [current handoff](SB-09-private-demo.md); the historical evidence and original gate status below are retained.

15 October 2026. Prerequisite: the canonical blueprint marks SB-06 Verified on its recovery/authority/privacy evidence. The saved version 7 source, capability contract, SB-06 report and current UI were reviewed before changes. No repository instructions or Git remote were present. The stack, four-player/one-case scope, rules and server implementation are unchanged.

**Status: software refinements implemented; physical access and human input-fit gates pending.** Do not check SB-07 as fully Verified yet. The exact approved case pack, photograph, A10 review, manifest and lockfile are byte-identical to version 7. A10 remains approval for `case-001@1.0.0-rc.1` for prototype rehearsal only.

## What changed

- A sticky phase guide retains the server-derived countdown, short phase instructions and direct links to the private panel, photograph, released drawings/evidence and final result. Links appear only when the authorized snapshot contains that material. An offline banner keeps reconnection and continuing-clock feedback near the action.
- Phone layouts put the private card before the photograph. Read-only country options remain legible rather than looking like disabled voting controls. The title has its missing word space restored; the case title remains above the story.
- The unchanged evidence text is grouped into records with explicitly labeled Portugal/Spain values. On narrow screens the pairs stack vertically instead of squeezing into table columns.
- Photo inspection supports focused arrow-key panning and disables zoom controls at their limits. At 100% touch swipes scroll the page; when enlarged they pan the photo. Instructions and Reset explain this distinction.
- The desktop drawing square is capped at 420px; phone drawing remains responsive. Zoom/country controls have 44px minimum height; form text remains 16px on phones. Existing Undo/Clear, saved/unconfirmed/locked indicators and deadline semantics are preserved.
- The reveal explains existing scoring and points users to horizontal scrolling for score/ballot tables. Those table regions are keyboard-focusable. No award, vote, timing or content change was made.

## Acceptance evidence

| Requirement | Outcome |
| --- | --- |
| Complete desktop case and retained A7/A10 boundaries | Approved real-case journey and existing case/input/privacy regression results below. Content/photo approval unchanged. |
| Private cards, evidence, instructions and timer readable | Before/after screenshot inspection at 1280×900 and 390×900; phase links focus their target; mobile private card precedes the photo; evidence labels and text remain intact. |
| Photo inspection and geography clues | Zoom/reset and keyboard movement pass. Screenshots inspect the original tram destination and Portuguese shop lettering at higher magnification. On a phone the full tram sign needs moderate zoom or horizontal panning; maximum zoom shows only part of it. No clue overlay or answer hint was added before Solution. |
| Drawing, scrolling and selection | Desktop/mobile drawing/submission/lock and keyboard country selection pass. 360×800 touch emulation verifies unzoomed photo scroll, zoomed pan, drawing without page scroll and Undo. |
| Save/error feedback matches authority | Oversized save displays rejection/Unsaved and preserves the accepted drawing through Gallery. Existing invalid caption/reason, lost ACK, reconnect and late-action checks remain regression coverage. |
| Ballots, score and reveal | Separate initial/final choices, secret delivery, server result and original explanations retained. Results navigation and keyboard-scrollable wide tables inspected. |
| Security and bounded input | Focused self-review in SB-07-security-review.md; 69 integration/unit checks pass; unchanged limits/dependencies; zero reported audit vulnerabilities. |
| Four physical screens on trusted HTTPS | **Pending.** Instructions in SB-07-device-check.md reuse the existing server TLS configuration. No certificates were assumed, created or installed. |
| Input-limit fit from human 40-second sketches | **Pending.** Existing caps retained; automated strokes are not human-fit evidence. A maximal 1900-point rounded draft with 80-character caption measured 41,953 serialized action bytes (one stroke), below the 48,000-byte action ceiling; this is a serialization check, not a usability claim. |
| Human rehearsal / blind playtest / mobile release certification | **Pending.** Automated isolated contexts and touch emulation do not complete them. |

## Test record

- `npm ci --ignore-scripts`: passed; 153 packages installed, lockfile unchanged.
- Baseline `npm run build && npm run test:e2e -- tests/e2e/usability.spec.ts`: two screenshot/whole-case inspection journeys passed before UI edits. These established observed usability problems, not artificial failing tests.
- TDD RED: `npm run test:e2e -- tests/e2e/usability.spec.ts -g 'photo can'` failed after a valid four-player Start because the Case sections/Your panel navigation was absent. Implemented released-section navigation and keyboard photo inspection; the same journey passed, together with both layout journeys (3/3, 17.5s).
- Touch/oversize batch: touch passed; oversized-save behavior correctly rejected and retained state, but its last test assertion read the snapshot before Gallery arrived. Added a wait for the observable Gallery heading; did not change authority behavior.
- First broad regression command: `npm run typecheck && npm run test:e2e -- tests/e2e/usability.spec.ts tests/e2e/case.spec.ts tests/e2e/recovery.spec.ts tests/e2e/real-case.spec.ts tests/e2e/foundation.spec.ts tests/e2e/lobby.spec.ts`: typecheck passed, browser **20/22 passed**, exit 1 (2.8m). The real-case test caught the case title hidden by the compact-header CSS; restored it outside the sticky guide. The desktop screenshot inspection also timed out. Its zoom loop checked button state without waiting for the previous zoom update, a potential race at maximum zoom. The helper now waits for each displayed zoom change before continuing; the corrected journey passed under the original timeout. The exact timeout cause was not independently isolated. Neither failure is relabeled as a pass.
- `npm run typecheck` and `npm run build`: passed after the fixes.
- `npm test`: **69/69 passed in 12 files**, final run 2.61s. Includes room authorization, deadlines, malformed paths, privacy/public assets, HTTPS/WSS, content integrity and recovery.
- `npm audit --json`: exit 0; zero reported vulnerabilities. Resolved license review recorded in THIRD_PARTY.md.
- Post-fix browser batch: `npm run test:e2e -- tests/e2e/usability.spec.ts tests/e2e/real-case.spec.ts` passed all **5/5 usability journeys** (desktop 8.7s, phone 7.5s, keyboard 3.2s, touch 7.1s, oversized error 5.6s), but the normal-time case stopped at evidence because its old locator expected table rows. Updated that assertion to the new article records and explicitly verified both country labels and unchanged record text. This batch remains **5/6**, exit 1 (3.1m), not a clean pass.
- Final normal-flow browser rerun: `npm run test:e2e -- tests/e2e/real-case.spec.ts` **passed 1/1** (4.3m), exit 0. Approved real case ran **255,885ms** with four isolated contexts, the normal server clock, random roles, forgery B, three submitted drawings and one automatic lock; zero page errors. Full scoring/reveal, private payload/public-asset checks and Complete stability passed. Together with the five usability passes and 16 existing case/foundation/lobby/recovery passes, all 22 distinct targeted journeys have passing evidence across the documented runs; this is not one clean 22-test command.

No automatic retries or skips were enabled. The full suite's unchanged synthetic normal-time rehearsal and actual process-restart journey were not rerun for presentation-only changes; their SB-06 evidence remains historical. Do not claim a clean full-suite run from this targeted batch.

## Visual review and handoff

Screenshots are generated by `tests/e2e/usability.spec.ts` in `test-results/usability-1280` and `test-results/usability-390`; these are local diagnostic files, excluded from the saved source. The initial element captures can include sticky-header overlap after automatic scrolling; viewport captures reached through section links are the visual reference. Inspected private cards, photo/clue crops, drawing controls, gallery, evidence, ballot and results at desktop/phone widths. Browser emulation does not validate physical font size, device certificate trust, touch latency, Safari/Android engines or soft-keyboard behavior.

Run locally with `npm ci`, `npm run build`, `npm start`, then open `http://127.0.0.1:3000` in four separate profiles. Create/join, ready and Start the real case. For four devices use the exact trusted HTTPS steps and observation checklist in SB-07-device-check.md. Capture actual results before changing the remaining gates.

**Next milestone:** SB-08 Blind playtest and bounded revision, conditional on completing SB-07's physical access/input-fit checks and arranging fresh participants. No SB-08 work, public deployment or paid service was started.
