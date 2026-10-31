# SB-06 Reconnect and failure recovery

15 October 2026. Scope: four-player, one-case prototype; unchanged pinned stack, authority rules and case-001@1.0.0-rc.1 approval for prototype rehearsal. SB-05's approved real-case rehearsal satisfies the prerequisite. Repository instructions were checked; no applicable AGENTS.md was present. No public deployment or paid resources.

## Implementation

Reused cookie membership, connection generations, explicit takeover, authoritative receipts, revision checks, catch-up timers, fixed roster, private projections and expiry cleanup. Added a monotonic `snapshotRevision` to full authorized game snapshots; the client discards an older snapshot even if its server timestamp and per-field revisions match. Drawing paths remain whole replacements.

Fixed a delayed read completion that could clear the internal busy gate for a newer seat's action. It now checks the connection epoch before changing that gate. Superseded connections clear the case on both event and error paths and ignore later game snapshots.

The client retains only `caseRecovery.expiresAtLocal` in its existing sessionStorage record. It is derived from accepted server expiry/time and local receipt time. It is used solely to distinguish known expiry from unavailable authority; no role, alibi, drawing, ballot, result or credential is persisted there or reconstructed from it. Live expiry carries an explicit server `expired` reason. If a previously active case cannot be restored, the UI clears private state and says “Case interrupted; results unavailable.” Without known terminal timing, an unavailable room is conservatively treated as interruption. Lost cookies cannot reclaim a seat by name/code.

The approved content file, A10 checklist, photograph, dependency manifest and lockfile are byte-identical to source version 6. Photo SHA-256: `76a990af93dd289f81797e96146159288e9c7f265fb6a62862b03213ecdfb6c6`.

## Test-first evidence

| Command / stage | Actual outcome |
| --- | --- |
| `npm test -- tests/unit/case-channel.test.ts` after same-tick stale-snapshot test | RED: 1 failed / 1 passed. Older snapshot changed selected forgery B back to null. No setup error. |
| Same command after snapshot revision fix | GREEN: 2 passed. |
| `npm run build && npm run test:e2e -- tests/e2e/recovery.spec.ts` with initial interruption/expiry tests | Build passed; RED: both browser assertions failed on missing specific messages after real transitions. |
| `npm run typecheck && npm run build && npm run test:e2e -- tests/e2e/recovery.spec.ts` after messaging fix | GREEN: typecheck/build and 2 browser tests passed. |
| `npm test -- tests/unit/case-channel.test.ts` after delayed-read/new-action regression | RED: 1 failed / 2 passed. A stale callback allowed a second concurrent send (2 pending emits instead of 1). |
| Same command after epoch guard fix | GREEN: 3 passed. |
| `npm test -- tests/integration/recovery.test.ts` | 8 passed. These verify reused behavior; they are not claimed as new RED/GREEN cycles. |
| `npm test` after recovery/cleanup additions | 69 passed in 12 files. |
| `npm run test:e2e -- tests/e2e/restart.spec.ts` | 1 passed, actual child process SIGKILL/restart; four real-case sessions. |
| Expanded recovery browser batch, after typecheck/build | 7 passed in 59.9s, zero automatic retries. |

## Full regression and test-harness defect

`npm run check` ran typecheck/build successfully, **69/69 Vitest tests in 12 files** (5.48s), then **18/19 browser journeys** (10.4 minutes); exit 1. Both normal-time cases passed: approved real case **255,815ms**, zero page errors; synthetic rehearsal **255,141ms**. The sole failure was the seven-phase recovery test's 30-second overall timeout.

Increasing that test's total budget to 60 seconds did not fix it: two repeats timed out. Adding bounded action/navigation waits exposed a disabled Submit button. A new accepted-stroke assertion then failed immediately: **0 strokes instead of 1**. The shared browser drawing helper had sent raw mouse coordinates without scrolling its target into view after navigation. The application correctly refused an empty drawing; no authority defect was shown.

The helper now scrolls the canvas into view before drawing. The recovery test explicitly requires one accepted stroke and verifies an explicit lock survives another refresh. The same seven-phase test passed twice (11.1s and 10.9s; 25.2s batch), with zero automatic retries. The temporary 60-second override was removed; the original 30-second test budget remains, with five-second action and ten-second navigation bounds and named phase steps. This fixes the test fixture rather than hiding a slow/failing behavior. Earlier focused passes did not prove nonempty strokes in this particular journey; the strengthened final run supersedes that gap.

Final command: `npm run typecheck && npm run build && npm test && npm run test:e2e -- tests/e2e/case.spec.ts tests/e2e/recovery.spec.ts tests/e2e/restart.spec.ts` exited **0**. Typecheck and production client/server build passed; **69/69 Vitest tests in 12 files** passed (2.19s); **11/11 Chromium journeys** passed (1.1 minutes), no skips or automatic retries. The strengthened seven-phase recovery test passed in **12.1s** under its original 30s budget. Actual process restart passed again. The earlier eight unaffected browser journeys (foundation, lobby and two normal-time rehearsals) passed in the full run; they were not rerun after the drawing-helper-only correction. Application source was unchanged between the full run and this final focused batch.

**Status: SB-06 Verified.** A14–A18 recovery requirements are satisfied by the combined evidence above. No known reproducible implementation failure remains in scope. The pinned environment is Node 24.19.0, npm 11.9.0, Vitest 5.0.4, Playwright Test 1.64.1 and Chromium 156.0.8078.4 (revision 1248). The initial full command is retained as failed; it must not be described as a clean full-suite pass.

## Acceptance and recovery matrix

| Criterion | Evidence and outcome |
| --- | --- |
| A14 accepted retries | `integration/recovery.test.ts`: all five action families keep the exact original receipt after reconnect and phase boundary. Changed-payload conflict remains covered by game tests. Revoked/superseded sockets are rejected before receipt lookup. Browser hides both drawing ACK and reconciliation read, then retries the identical request after Gallery; one revision and one auto-lock. |
| A15 stale/concurrent/deadline actions | Existing game suite covers exact before/at/after phase boundaries and catch-up without timer callbacks. New tests race autosave and submission in both orders: one revision wins, loser is stale or locked. Newly late requests fail; accepted retries remain accepted. Snapshot and delayed-callback regressions are fixed. |
| A16 recovery | Four independent browser contexts. Disconnect/unload plus refresh during Inspect, Sketch, Gallery, Interrogate, Verdict, Solution and Complete restores identical seat, role, accepted work and deadline. Paths/roster do not duplicate. Missed evidence appears on return; drawings auto-lock after the deadline. Superseded tab reloads three times without reclaiming or receiving later reveal. |
| A17 interruptions | Host drops; roster remains frozen and clock continues. All players offline through Verdict return to Complete with one stable result. Integration newcomer denied even using original player's name. Lost credential clears private UI. Actual built Node process is killed and restarted at the same origin with the approved real case: all four tabs show interruption, no result/assignment reconstruction, old cookie lacks membership, old room code cannot rejoin. |
| A18 reveal/retention/cleanup | Result identical across returns. Live expiry and known expiry after offline refresh show “Room expired.” Controlled cleanup verifies CaseGames forgets the authority (including its receipt/observation storage), memberships and server credentials disappear; old reads/resumes/photo fail. No subsequent publication occurs. |
| Private recovery | Full streams checked: own identity only, no innocent forgery options, no public drawing before Gallery, evidence before 140s, or result/cards/ballots before Solution. Existing cross-room, public-build, origin/session/photo controls remain in regression. Focused review: SB-06-security-review.md. |

Controlled server clocks run only in directly constructed local test harnesses. They are not browser-clock overrides or remotely available production endpoints. The offline-expiry browser test separately changes the client wall clock to check message selection; server expiry is still advanced by its controlled authority clock. The restart test uses a normal built process and approved real content. Most recovery tests use synthetic content and automated marks. They cannot establish human deduction quality or physical-device usability.

## Manual recovery checks — pending

1. From the project run `npm ci` if dependencies are absent, then `npm run build && npm start`. Open `http://127.0.0.1:3000` in four separate browser profiles (not four tabs sharing cookies). Create/join one room, ready all players and Start. For actual separate devices follow README's trusted LAN HTTPS setup; loopback is local to each device.
2. Refresh one player during each phase. Note their identity/card, phase deadline and accepted fields before/after. During Sketch wait for **Saved**, refresh, then submit and refresh again: drawing/caption must be identical and locked. Unsent edits are not guaranteed to survive.
3. Disconnect a player's network across the Sketch deadline (85s) and the evidence release (140s). Restore it: accepted drawing must be locked, current evidence visible, and the original clock unchanged. Repeat with the host; the others must keep playing. If DevTools offline mode does not interrupt an existing WebSocket, disable the device's network connection.
4. Open a second tab in one player's profile and select **Resume here**. The original must say **Session opened elsewhere**. Reload the original repeatedly: it must not steal the seat automatically. Only an explicit Resume here may take over.
5. Disconnect all players before Verdict ends (225s), return after Complete (255s), and compare the result. Do not expect missing votes to be invented. Refresh again: no extra points. Do not refresh an unconfirmed change merely to force it through; use **Retry unconfirmed change** when offered. The automated proxy test exercises actual lost acknowledgments reproducibly.
6. In a disposable test room stop the local server during play, restart it at the same origin, and reconnect. Expect **Case interrupted; results unavailable**, no resumed scores and no reclamation by name/code. This deliberately loses every in-memory room on that process.
7. For normal retention, leave a completed room for one hour. Returning before expiry must restore the same result; after known expiry it must show **Room expired.** Record browser/device, phase, steps, expected/actual behavior and any UI errors; omit cookies, storage exports and unrevealed private content from shared logs.

Physical-device testing, four-human rehearsal and blind playtesting remain **pending**. No successful human recovery run is inferred from these automated tests. Next milestone after verification: **SB-07 Readability and interaction refinement**. Do not implement it as part of this checkpoint.
