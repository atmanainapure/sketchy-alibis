# SB-03 verification evidence

Date: 14 October 2026. Status: **Verified for the room/identity milestone**. This is implementation evidence, not a playtest, content sign-off or release certification. The [canonical blueprint](https://chatgpt.com/space/page_e4db0c79734c8191b236365ff40e44d3) remains the sole progress plan.

## Starting point and scope

Read blueprint revision 1.2, the Product Capability specification, saved stack findings and current source. The saved version-1 archive matched the working source before edits. No applicable AGENTS.md or unrelated source changes were found. SB-03 depends on SB-01; the baseline `npm run check` passed typecheck/build, 14 Vitest checks and 2 Chromium journeys, satisfying that prerequisite. SB-02 remained blocked on human A10 review and was not a prerequisite for room implementation.

Implemented private Create/Join, four-seat capacity, names, anonymous credentials, server membership/owner permissions, readiness, removal/leave/closure, room-side Start validation and version handoff, request idempotency, connection generations and lobby reconnect. The UI and wire protocol are documented in [SB-03-protocol.md](SB-03-protocol.md). The focused ECC Security Review is [SB-03-security-review.md](SB-03-security-review.md).

The real `case-001@1.0.0-rc.1`, licensed photograph, review checklist, package manifest and lockfile were unchanged. The case still has `review.approved: false`. A10 human review is **pending**. No phases, assignments, drawing tools, evidence release, ballots or scores were implemented. No dependencies, accounts, databases, hosted services or paid resources were added.

## TDD execution record

All commands ran in the project root with Node 24.19.0 / npm 11.9.0, the existing lockfile, Vitest 5.0.4 and Playwright Test 1.64.1. Chromium used the installed matching headless shell 156.0.8078.4. RED failures below were observed before their corresponding implementations/fixes.

| Behavior and command | Actual RED | Correction and actual GREEN |
| --- | --- | --- |
| `npm test -- tests/integration/session.test.ts` | 2 failures: the existing server was reachable but POST `/api/session` returned 404 instead of the expected private bootstrap/denial responses. | Added the cookie bootstrap and origin/content-type policy; the same 2 tests passed. |
| `npm test -- tests/integration/rooms.test.ts` | 11 failures after valid cookies and real WebSocket connections were established. Missing `lobby:*` handlers produced no ACK; the test helper represented that observable protocol failure as `REQUEST_FAILED`. | Implemented the authority and adapter. The combined session/room command passed all 13 then-existing checks. |
| `npm run test:e2e -- tests/e2e/lobby.spec.ts` | The 2 initial lobby journeys timed out against the old connected landing page, which had no room-entry controls. Initial cleanup errors also obscured the locator stack; cleanup was corrected. | Implemented lobby/controller/UI. Typecheck, build and both lobby journeys passed. |
| `npm test -- tests/integration/session.test.ts` (origin configuration) | 1 failed, 2 passed: `ftp://localhost` configuration unexpectedly succeeded. | Restrict configured origins to HTTPS or loopback HTTP. Regression passes in the final 4-test session suite. |
| `npm test -- tests/integration/rooms.test.ts -t 'malformed requests'` | 1 failed, 15 filtered out: the 121st malformed request returned `INVALID_REQUEST` rather than `TRY_LATER`. | Count connection requests before schema parsing. The regression passes in the final 16-test room suite. |
| `npm test -- tests/integration/session.test.ts` (cookie lifetime) | 1 failed, 3 passed: 7,200-second browser expiry could precede the allowed late-created lobby and closure-retention window of 10,800 seconds. | Let the opaque cookie outlive room retention, while retaining strict independent server expiry/revocation. The final 4-test session suite passes. |
| `npm run test:e2e -- tests/e2e/lobby.spec.ts -g 'lost Ready'` | 1 failed: deliberately drop a real Ready ACK, navigate away and return; the UI incorrectly reports `Session opened elsewhere` instead of restoring the seat. | Resume the current generation before replaying the retained mutation; ignore ACKs from obsolete connections. The final full suite and three repeated executions of this journey pass. |

The lost-ACK test was added after a full regression run first exposed the same race: typecheck/build and all 34 Vitest tests passed, but the browser suite had 4 passes and 1 failure in the refresh journey. That failure was investigated, reproduced with deterministic ACK loss and corrected; it was not dismissed as a flake. A separate earlier full check stopped at a TypeScript fixture-header inference error; that setup error was corrected and is not counted as a substantive TDD RED.

## Final executed commands

| Command | Actual result |
| --- | --- |
| `npm run check` | Exit 0: both TypeScript checks, production Vite/server build, **34/34 Vitest tests in 6 files**, **6/6 Chromium journeys**. No skipped checks or automatic retries. Vitest duration 1.31s; browser duration 8.2s. |
| `npm run test:e2e -- tests/e2e/lobby.spec.ts -g 'refresh\|lost Ready' --repeat-each=3` | Exit 0: **6/6 executions passed**, comprising the two affected journeys repeated three times; 8.8s. This is a bounded check of the observed reconnect race, not a stability guarantee. Use a literal pipe inside the shell quotes, without a backslash, when copying this command. |

The npm proxy-configuration and color-environment warnings did not fail the commands. Test browser contexts were independent per player; takeover deliberately used two tabs within only one player's context. The lost-ACK test forwards real server traffic and drops exactly one matched ACK, without mocking authorization or game state.

## Acceptance mapping

| SB-03 acceptance behavior | Observable evidence and result |
| --- | --- |
| A1: four identities in the correct private room; fifth/bad code/duplicate name | Real-protocol tests distinguish two rooms and normalize code/name input. Browser journey uses five independent contexts: four share one roster, fifth is rejected, unknown code and case-insensitive duplicate name fail. Passed. |
| Private create/join attempts are idempotent | Repeated accepted payloads retain the same room/seat; changed payload conflicts; concurrent identical joins allocate one seat; competing last-seat requests admit one. Old join after leaving cannot revive membership. Passed. |
| A4 room access and owner permissions | Another room's member cannot read or mutate this room; guests cannot Start/Remove/Close; supplied actor IDs are rejected; host cannot remove another room's player. Missing/fabricated credentials and missing Origin fail. Passed. |
| Public/private boundary | Explicit projection key assertions; only public roster and own public ID are emitted. Existing private import/path/asset checks pass. Name markup renders literally. No case secrets, session data or attempt ledgers in lobby projections. Game-specific cards/drafts remain later acceptance work. |
| Ready and membership changes | Own readiness only; join/remove/leave clear all readiness; disconnect clears only the departing player's flag. Host disconnect preserves owner/room; only explicit Close closes it. Passed. |
| Start preconditions and atomic handoff | Missing readiness/connectivity fails; absent, unapproved, malformed and schema-invalid packs leave Lobby unchanged. A synchronous approved synthetic port receives the immutable four-person roster and pinned version once; identical Start retry adds no second call. Concurrent leave/Start has one valid winning outcome; a processed disconnect prevents Start. Passed. |
| Real case remains unavailable | Independent browser journey readies four players, attempts Start and sees the content-unavailable message with the same lobby intact. No approval override or game fixture is remotely selectable. Passed. |
| Identity and one writable generation | Refresh and reconnect recover the same seat with credential + retained tab/generation; new-tab takeover is explicit and idempotent. Old connection writes and automatic reclaims fail; deliberate Resume here succeeds. Passed. |
| Lost acknowledgement | Server accepted Ready is not re-applied after disconnect cleared it. Reconnect binds the identity before retrying the same action receipt; no duplicate seat or false takeover. Deterministic browser test and bounded repeats pass. |
| Removed/closed/expired memberships | Removed seats cannot read/write; closed rooms reject mutations/joins; controlled expiry revokes credentials and code access. Forced code collisions cannot overwrite existing rooms. Passed. |
| Bounded input and safe errors | Name limits/control characters, strict unknown-field rejection, repeated guesses, malformed message rate limits and failed game-port handoff tested. Internal thrown text does not reach clients. Passed. |
| Trusted local transport | HTTPS smoke establishes an actual private cookie and room over WSS with certificate validation enabled; temporary certificate is removed. HTTP loopback Secure-cookie behavior passes in Chromium. |

The Start success evidence is specifically the **room-side interface contract with a synthetic approved fixture**. It does not satisfy SB-04 assignment/phase criteria or approve the real case. The game port must commit synchronously/atomically or throw without side effects; no external service is involved.

## Inspection, limitations and next work

A local desktop screenshot was visually inspected for legibility and overflow; the lobby was readable with no horizontal overflow at 1100px. The screenshot was transient and is not included in the source checkpoint. Four physical-device access, Firefox/WebKit, phone drawing, production reverse-proxy configuration, load capacity and human enjoyment/fairness have **not been verified**. No raw credential traces/storage-state files are saved.

Run instructions and the four-profile exercise are in the README. The in-memory process is the room authority: restarting it loses rooms and returns an unavailable-room outcome. It does not fabricate a recovered case. Full game-state recovery and terminal case cleanup remain later milestones.

SB-03 has no remaining supported failure within its acceptance scope. **SB-04 authoritative case rules** is next, with its SB-01 prerequisite satisfied; use clearly labeled synthetic fixtures until content approval. SB-02 A10 is still pending and blocks completion of SB-02/SB-05. Work stops after SB-03. No public deployment or human playtest occurred.
