# SB-05 verification evidence

Current status update, 15 October 2026: see [approved real-case rehearsal](SB-05-real-case-rehearsal.md). The results and pending statements below describe the earlier checkpoint; A10 and the technical real-case rehearsal are now completed, while physical-device testing and human playtesting remain pending.
15 October 2026 UTC / 14 October New York. **SB-05 Complete playable local case: browser implementation verified with synthetic content; milestone completion remains blocked by A10 and the subsequent real-content integrated rehearsal.** SB-02 remains unchecked. No human playtest, physical-device test, deployment or provisioning occurred.

## Starting point and scope

Read canonical blueprint revision 1.4/sequence 4, capability specification sequence 0, repository source/configuration and SB-04 protocol/evidence. The source matched saved archive version 4, SHA-256 `7e3862fbaf7d1d15785a7cd196e34f747b40ed30f94712b853641263e98dd79b`. No applicable ancestor/project AGENTS.md or unrelated source changes were found.

SB-04 was checked against its exact server-rule acceptance criteria: assignment/defaults, all phase boundaries and delayed catch-up, drawing/ballot locks and revisions, evidence, scoring/partial/tie fixtures, privacy/authorization, receipts and expiry. Baseline `npm run check` passed typecheck/build, **56/56 Vitest checks and 6/6 Chromium journeys**. No unfinished SB-04 behavior was found; no rule fix or gameplay change was needed.

The next blueprint title is **SB-05 Complete playable local case**. SB-03/SB-04 are verified; SB-02’s automated candidate work exists but A10 human sign-off is pending. The blueprint explicitly treats dependencies as completion gates, not permission to build. This continuation therefore implements SB-05’s software while preserving that gate. Tests use a separate labelled synthetic pack and only reuse the licensed photograph/provenance. The real `review.approved` remains false, and ordinary Start remains blocked.

Scope includes case screens, one shared authenticated connection, drawing wrapper/private saves, photograph authorization/zoom/retry, country map/buttons, initial/final ballots, evidence, reveal and simple accepted-state refresh. SB-06’s full recovery matrix and later milestones were not implemented. Node/package versions and lockfile are unchanged; nothing was installed.

## Actual TDD cycles

| Behavior | RED command and observed cause | GREEN evidence |
| --- | --- | --- |
| Authorized photograph | `npm test -- tests/integration/photo.test.ts`: **1 failed**. A valid started-room member received 404 where the test required the pinned image; no photo route existed. Unauthorized negative checks already passed and are not claimed as RED. | Same command: **1 passed** after the fixed-path, membership-authorized route was added. The test verifies exact JPEG hash, neutral filename, private/no-store policy, outsider/wrong-room denial and expiry. |
| Complete case interface | `npm run test:e2e -- tests/e2e/case.spec.ts`: **1 failed**. Four independent sessions successfully started and received Inspect snapshots, but the UI had no Inspect heading/screen. | Typecheck/build and the same browser target: **1 passed**, traversing the full controlled-time case and inspecting privacy/results. |
| Trimmed caption/reason save status | `npm run test:e2e -- tests/e2e/case.spec.ts -g 'caption normalization'`: **1 failed**. Server-accepted text with outer spaces remained labelled Unsaved; normalization mismatch could resubmit unchanged text. | Normalize comparisons/saves using the server’s trimming rule. Typecheck/build and the case suite: **3 passed**, including invalid-caption/reason preservation and the lost-ACK branch. |
| Cleared-seat delayed ACK | `npm test -- tests/unit/case-channel.test.ts`: **1 failed**. An old acknowledgement restored `gamePending: true` after the seat was cleared. | Keep epoch-crossing status updates tied to the same still-pending request. `npm test -- tests/unit/case-channel.test.ts tests/integration/photo.test.ts`: **2 passed**; the full regression also passed. |

Extracting the existing synthetic pack/controlled clock into a shared test helper was scaffolding, not claimed as a behavioral RED cycle. Additional A/B, lost-ACK, invalid-input, normal-time and privacy assertions are actual verification, not invented prior failures. A one-off source-comparison script initially used an incorrect relative parent path; it was corrected and the comparison succeeded. That diagnostic setup error was not a product/test failure.

## Final commands and results

| Command/check | Actual result |
| --- | --- |
| `npm test -- tests/unit/case-channel.test.ts tests/integration/photo.test.ts` | Exit 0, **2/2 passed**, 1.01s. |
| `npm run check` | Exit 0. Both TypeScript checks and production client/server build passed; **58/58 Vitest checks in 10 files**, 1.88s; **10/10 Chromium journeys**, 4.8 minutes, no automatic retries or skipped tests. |
| Normal-duration journey within that full suite | Four isolated Chromium contexts, actual Node clock and timers, deterministic test assignment. **255,195ms** from authoritative Start to observed Complete. Recorded phase offsets exactly 0/45/85/115/205/225/255 seconds and evidence 140 seconds. Scores exactly 2/5/5/5; shared winners and revealed data matched in all four sessions. |
| `npm run typecheck && npm run test:e2e -- tests/e2e/case.spec.ts` | Exit 0; typecheck and **3/3 browser journeys passed**, 28.5s, after adding explicit undo/clear/defaulting checks. No production code changed after the full regression. |
| Local rehearsal entrypoint smoke | `node --import tsx tests/helpers/rehearsal-server.ts` launched successfully on loopback port 3001; HTTP 200 and expected HTML; stopped cleanly. |
| Browser visual/smoke inspection | Rendered desktop Sketch page inspected at 1280px width: photo and drawing visible, accepted status/controls readable, no horizontal overflow; **0 page errors**. Zoom and reset checks passed. Internal screenshot is excluded from the source checkpoint. |
| Public-boundary/source comparison | Manifest, lockfile, real case, pinned photo and human checklist byte-identical to version 4. Seven private case/credit/clue/test-content markers absent from production JS; no test helpers compiled into `dist`. Existing protected-file/import tests passed. |

Environment remains Node 24.19.0, npm 11.9.0, Vitest 5.0.4, Playwright Test 1.64.1 and matching Chromium 156.0.8078.4. Npm proxy/config and environment-color warnings did not fail commands. No coverage percentage was measured or blanket threshold introduced. Synthetic frames were inspected in memory; raw credential-bearing traces/storage exports were disabled and excluded.

## Acceptance mapping

| SB-05 acceptance behavior | Status and observable evidence |
| --- | --- |
| All phases at normal durations; one uninterrupted four-session journey | **PASS, synthetic technical rehearsal.** All six phases plus Complete observed without time acceleration, host overrides or early advancement. Actions supplied by automation, not four humans. |
| Each player sees only allowed data (A2–A4/A6/A9/A11) | **PASS, scoped browser + regression checks.** Own private IDs remain stable; innocent payloads lack forgery options; gallery absent before 85s; evidence absent before 140s; solution/ballots/cards/answer absent before 225s. No private pack in browser build. |
| Drawing round-trip, explicit atomic lock, latest accepted auto-lock, missing sketch (A6–A8) | **PASS.** Caption and marks submit together; later editor controls lock. An accepted draft survives refresh unchanged and appears unchanged in Gallery. Lost draft ACK still publishes the accepted work. Cleared/blank sketches use placeholders and remain eligible voters. |
| Caption/reason validation and literal rendering (A7/A11) | **PASS.** Six words, 81-character captions and 161-character reasons remain unsaved; previous valid content is preserved at the deadline. Trimmed content reaches Saved; markup appears as text. |
| Separate initial/final choices and named country controls (A11) | **PASS.** Initial choices freeze; Verdict begins empty. Accepted country/suspect changes persist. Selected country button and SVG highlight agree. No self-target is offered. Authority still validates every target. |
| Both forgeries and complete shared evidence (A3/A9) | **PASS, synthetic branches A and B.** Same sheet appears at the server boundary. A no-choice case privately reports default A. Actual case reasoning remains an A10 review task. |
| Lost vote ACK and one correct result (A12–A14/A18) | **PASS, SB-05 subset.** Dropped final ACK preserves the accepted vote and score; refresh at Solution preserves the same result. Reveal shows all original cards, selected/unused forgery, choices/reasons, tally, score components, winners and source credit. Existing server edge-case tests remain green. |
| Photograph failure/retry and accepted-state refresh | **PASS, scoped checks.** Retry restores the image, leaves the deadline unchanged and retains an affected-session notice. Ordinary authenticated refresh restores own accepted work. Hostile/offline/process-loss matrix remains SB-06. |
| Real case/photo integration and A10 | **PARTIAL / BLOCKED.** The exact licensed asset works through the authorized viewer; attribution is withheld until Solution. Human rights/clue/alibi sign-off was not supplied. The real pack is not approved or started, so a normal-time run using that exact approved pack remains outstanding. |
| Physical devices and human product success | **PENDING / NOT RUN.** Automated contexts do not establish four-device access, usable touch controls, fun, fairness or the geography–drawing–deception hypothesis. |

## Handoff

Use [SB-05 client contract](SB-05-client-contract.md) and [focused security self-review](SB-05-security-review.md) alongside the existing server protocol. The regular app retains the content gate. To inspect the new screens, follow README’s loopback-only synthetic rehearsal instructions; do not flip the real approval flag to bypass A10.

Keep **SB-05 unchecked** until A10 and the real-content integrated rehearsal are complete. The next planned milestone is **SB-06 Reconnect and failure recovery**, but its SB-05 completion prerequisite is not fully satisfied. No later milestone, paid service, deployment or human study was started.
