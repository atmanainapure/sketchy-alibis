# SB-04 verification evidence

Completed 14 October 2026, America/New_York (15 October UTC). Status: **Verified within SB-04's server-rule scope**. [Canonical blueprint](https://chatgpt.com/space/page_e4db0c79734c8191b236365ff40e44d3). No human playtest, A10 sign-off, physical-device test or deployment occurred.

## Source and prerequisites

Read blueprint revision 1.3/current sequence 3, capability specification sequence 0, existing code, package/lockfile/configuration and SB-03 evidence. The local source matched saved source version 3, SHA-256 `8e323592cc83ce6d9a26ba6f76435114c4e3f343c38ab8dde12acfba1a173b9c`. No applicable AGENTS.md or unrelated source changes were found. SB-04's formal prerequisite is SB-01; the baseline `npm run check` passed typecheck/build, 34 Vitest tests and six Chromium journeys. SB-03's verified room interface was available for authenticated integration.

Scope: server-owned Start/assignment, phases, forgery selection, drawing/ballot revisions/locks, evidence, tally/scoring/reveal, projections, observations and expiry. Small room/socket adapters connect the rules to verified membership. The existing browser code, package manifest/lockfile, case authoring pack, photograph and human review checklist are unchanged. `review.approved` remains false. No new dependencies or services were installed. No consequential gameplay contradiction was found; the preserved 255-second schedule and scoring rules were used.

## TDD execution

Environment: Node 24.19.0 / npm 11.9.0, existing lockfile; Vitest 5.0.4; Playwright Test 1.64.1 with matching Chromium 156.0.8078.4. Tests use real HTTP and WebSocket connections, separate anonymous cookie identities, controlled absolute time and deterministic random indices. Fixture source/clock injection is in-process only.

| Behavior | RED command and observed failure | GREEN and guarantee |
| --- | --- | --- |
| Case Start, assignment, private projection, scheduled progression and expiry | `npm test -- tests/integration/game.test.ts`: **3 failed, 1 passed**. Four valid ready/connected members existed, but Start returned `CONTENT_UNAVAILABLE` because the old server had no usable game engine/source interface. The malformed/unapproved-content test already passed against the old rejection gate; it is not claimed as new RED evidence. | Same command after implementation: **4 passed**. Positive Start now exercises runtime validation, stable assignment, exact boundaries, evidence timing, no-input result and expiry. |
| Forgery/drawing/ballot actions, revisions, authorization and scoring | Same command after adding ten cases: **10 failed, 4 passed**. Cases started and game reads worked; missing `game:action` handler returned no ACK. Failures were the missing protocol behavior, not dependency/setup failures. | Typecheck and the same suite after action implementation: **14 passed**. Includes genuine 2–1–1, 2–2, zero-vote and partial-vote fixtures with no self-votes. |
| Exact content pinning across Start | `npm test -- tests/integration/game.test.ts -t 'exact candidate'`: **1 failed, 19 filtered out**. Start's second source read exposed the replacement pack's geography instead of the already validated candidate's text. | Pass the exact candidate through the room handoff, then detach runtime state. The two-file focused suite passed **21 tests**, including this regression and the real unapproved pack's schema check. |

A temporary TypeScript error in the new test harness's inferred empty player array was fixed with an explicit player type. That was a setup/type correction, not a substantive RED claim. Additional concurrency, privacy, content-mutation, malformed-drawing and timer-failure tests passed without production fixes; they are recorded as verification, not invented TDD failures.

## Final actual commands

| Command | Result |
| --- | --- |
| `npm run typecheck && npm test -- tests/integration/game.test.ts tests/unit/game-content.test.ts` | Exit 0; TypeScript passed, **21/21 tests in two files passed** before the last direct-boundary check was added. The final full suite includes all **22** authority/schema checks. |
| `npm run check` | Exit 0; both TypeScript checks, production client/server build, **56/56 Vitest tests in eight files**, **6/6 Chromium journeys**. No skipped full-suite tests or automatic browser retries. Final Vitest duration 1.58s; browser duration 8.2s. |
| Source/archive comparison and public-build marker scan | Manifest/lockfile, actual case, photo, A10 review checklist and browser source unchanged. No private case markers in the browser build. Browser JS/CSS build hashes stayed unchanged from SB-03. |

Npm proxy-config and environment-color warnings did not fail the commands. The existing six browser journeys remain lobby/transport regressions; no new playable-game browser journey is claimed. Full coverage percentage was not measured, and no blanket threshold was added.

## Acceptance criteria

| Criteria | Executed evidence and status |
| --- | --- |
| A1/Start integration | Existing missing-ready/connected, owner, concurrent leave/disconnect and invalid-pack checks still pass. New approved synthetic case starts through that same room boundary. Exact validated content and four-member roster are pinned. Server scope complete. |
| A2 assignment | One controlled murderer, three distinct innocent cards, unchanged assignment/case ID on repeated Start and resume. Separate fixture puts murderer in a non-owner seat; owner gets no extra secrets. Crypto bounded-index/Fisher–Yates logic inspected, without a flaky sampling threshold. Complete for server rules. |
| A3 forgeries | Murderer switches A→B before 45s, late changes fail, accepted old receipt still succeeds, innocents cannot choose. No-choice defaults A privately. Both branches use the same evidence. Complete for server rules. |
| A5 timing | Every phase checked 1ms before, at and after its boundary. Evidence checked at 139999/140000/140001ms. Delayed wakeups cross several phases in order. A direct-action test at 45/85/225s suppresses timer callbacks and preceding reads, proving that the action handler itself catches up before validation. A separate timer-only run publishes Complete without further player requests after Start. All submissions do not advance the clock. Complete for server rules. |
| A6–A8 drawings/captions | Full-snapshot submission, private until Gallery, atomic caption+marks, revision conflict, first-final-wins concurrency, locked rejection, five words/80 code points, malformed paths, literal markup preservation, auto-lock/blank-caption/missing mode and newly late rejection pass. Rule portions complete; drawing widget, status UI and caption rendering remain SB-05. |
| A9 evidence | One complete sheet at 140s for A and B; absent before release and present in later views. Event records use the scheduled timestamp once. Server portion complete; built viewer/reconnect UI later. |
| A11 ballots | Gallery choices freeze at 115s; Verdict starts empty; final revisions, null clearing, self/unknown targets, six countries and 160-character reason validation pass. Other players see no choices or reasons before Solution. Rule portions complete. |
| A12–A13 results | 2–1–1, 2–2, zero, one-vote innocent arrest, one-vote murderer arrest, partial fields, murderer vote, country points, innocent personal points despite a tie and tied winners pass with exact totals. Repeated reads through Complete preserve results. Server portions complete. |
| A14–A15 consistency | Accepted duplicate forgery/drawing/final actions return original receipts after boundaries; changed payload conflicts. Concurrent saves and final submissions cannot replace newer/locked work. Current membership/generation is checked before any game action or receipt. Server rule portions complete; lost-ACK/transport UI matrix remains SB-06. |
| A4 privacy and authority | Cross-room reads/actions, supplied actor IDs, role/time/score overrides and replaced sockets are denied. Own snapshots and errors reveal no other player's private panel. Drawings/evidence/solution publish only at their scheduled stages. Public asset/import regression passes. Server scope complete; full game browser inspection remains SB-05/07. |
| P18/P19 and expiry calculations | Fixed Complete+1h and Aborted+1h expiry; revoked session access at deadline; timer/transition failure produces an interruption without a winner. Phase/selection/default/lock/choice/connection/rejection/duplicate observations stay private until Solution. Event/receipt bounds documented. SB-04 scope complete; full recovery/device/retention journeys remain later gates. |

## Security review and implementation decisions

The [focused self-review](SB-04-security-review.md) traced verified membership through action validation and projections. It found and corrected the duplicate content-source read, with a failing/passing regression. Accepted receipts store a digest plus small acknowledgement rather than repeated full drawings. Input payloads and event records are bounded. No new supported issue remains within this reviewed scope; no independent audit or external penetration test is claimed.

The [protocol](SB-04-protocol.md) records action shapes, timing, views, receipt behavior and technical drawing limits. These are implementation choices within the existing scope, not changed game rules or a new stack. Raw SVG/image uploads are not accepted; SB-05 will adapt the selected drawing widget to normalized black-pen strokes.

## Remaining gates and next step

SB-04 is complete. SB-02 **A10 human content sign-off remains pending**, as does physical-device testing. The candidate pack and checklist were not approved or changed. The browser remains the lobby; Start on the real pack stays blocked.

**Next planned implementation: SB-05, complete playable local case.** SB-03/SB-04 prerequisites are verified, but SB-02 approval is still the unmet completion gate. No later implementation milestone has all its prerequisites complete yet. The next unresolved action is the human review of the existing exact case/photo. No manual study results are supplied or inferred. Work stops after SB-04, with no deployment or provisioning.
