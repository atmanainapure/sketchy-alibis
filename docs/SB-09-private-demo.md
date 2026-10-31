# Private prototype awaiting human playtesting

15 October 2026. Atman explicitly deferred human group playtests and physical-device checks, and authorized the remaining technical checks and a runnable private demo. This changes the dependency decision for this handoff: SB-09's applicable technical work can proceed while SB-08 remains deferred. It does not pass, waive into success, or fabricate any human/device result. A10 stays approved for unchanged `case-001@1.0.0-rc.1`, prototype rehearsal only.

## Delivery and operating scope

Start with [START_HERE.md](../START_HERE.md). It includes exact Node/npm startup commands and a solo four-profile walkthrough. The application is local-only by default at `http://127.0.0.1:3000`. No public or remotely accessible preview has been deployed. Available preview hosting uses Cloudflare Workers rather than this project's Node/Express/Socket.IO server, and no supported forwarding route for the running server is exposed in this environment. Moving to that runtime would change the selected architecture; the current source is the supported handoff.

Runtime scope: one Node process; one active four-player room is the measured demo configuration. Configured ceilings remain 128 rooms / 512 sessions, but they are not capacity claims. No autoscaling, proxy, database, account service or paid resource was added. Runtime requires no API secret. Configure HOST/PORT only for the intended interface; APP_ORIGIN is an exact allowed origin. TLS_CERT_FILE and TLS_KEY_FILE must be set together for intentional non-loopback HTTPS. Health endpoint: `/api/health`, with no-store JSON. Source and production configuration are documented in README.

Do not deploy, rebuild/restart or replace the process during a live demonstration. Restart destroys in-memory rooms and results; returning clients display interruption rather than reconstructing assignments. Completed results expire one hour after Complete. Rollback means stop, extract the prior saved source, install/build/start and begin a new room; it cannot restore lost cases. Certificates, tokens, dependencies, compiled output and transient browser artifacts are excluded from the source archive.

## Technical verification

The local checkout exactly matched all 80 saved version 8 files before work. No new repository instruction file was found. Read the canonical blueprint/specification and SB-06/07 evidence; retained their existing executed evidence where code is unchanged.

- `npm run typecheck && npm run build && npm test && npm run test:e2e -- tests/e2e/recovery.spec.ts -g 'approved real:'` passed after correcting a new test fixture's readonly type mismatch. Typecheck/build passed; **70/70 unit/integration tests in 13 files** passed (2.75s). The new approved-case seven-phase recovery journey passed **1/1** (13.6s, 16.1s batch). No retries/skips.
- The new browser journey uses four independent cookie contexts, the approved real pack/photo and a controlled server clock. It saves a nonempty drawing, refreshes/restores it, explicitly locks it, restores all phases, saves private initial/final country/suspect choices, verifies evidence/reveal timing and stable results. It reuses the existing recovery test body with real content; no remote fixture switch exists.
- The new bounded socket check uses four independent credentials in one approved case, ten concurrent rounds of 1900-point drafts (**40 accepted saves**), private projection checks, outsider denial, automatic Gallery locks and newly late rejection. Each action/read uses the existing one-second acknowledgment timeout. Authority time is advanced across the Sketch phase; wall-clock throughput and human 40-second drawing quality are not inferred.
- `npm audit --json`: zero reported vulnerabilities. The scoped ECC Security Review found no new demo-blocking defect; no runtime fix or dependency upgrade was needed. Full review: SB-09-security-review.md.
- Reused SB-07 evidence on byte-identical application/content: five desktop/mobile/keyboard/touch/error journeys; 16 case/foundation/lobby/recovery regressions; final normal-flow approved case **255,885ms**, four independent contexts, random roles, forgery B, three submissions/one auto-lock, full evidence/ballots/scoring/privacy/reveal, zero page errors. This is documented evidence across runs, not a newly executed full-suite claim. Reused SB-06 actual process-restart and missing-ACK checks. The current 70-test run rechecks integration boundaries, expiry, deadlines, privacy and TLS transport.

No known reproducible technical blocker remains for the documented local demo. Neither generated tests nor a passing build establish product success. No artificial failing test or optional feature was introduced to claim a TDD cycle.

## A1–A18 evidence index

| Criteria | Executed evidence |
| --- | --- |
| A1 room capacity/ready/Start; A4 identity/room permissions | rooms/session/game/photo integration tests; SB-03 lobby E2E and SB-07 regression; current integration pass |
| A2 stable assignment; A3 forged choice/default | game integration; normal-flow real-case SB-07; new approved recovery restores identity/cards |
| A4 private data/assets | build boundary/session/photo/game tests; SB-07 real-case asset/stream assertions; new approved recovery and bounded private draft checks |
| A5 phase/deadline authority; A9 evidence release | controlled game/recovery tests and normal-time approved case; new approved recovery preserves deadlines/evidence |
| A6 drawing/lock; A7 invalid captions; A8 missing/late work | game and case E2E; SB-07 oversized rejection; new concurrent large drafts/auto-lock/late rejection and approved recovery |
| A10 content | Explicit recorded human approval for exact case version/photo; content hash/schema checks. No new content approval inferred |
| A11 private initial/final ballots | game/case and approved normal-flow case; new approved recovery restores saved selections |
| A12 ties/arrests; A13 score breakdown | deterministic game fixtures plus approved normal-flow score/result assertions |
| A14 retries; A15 stale/race/deadline | game/recovery/case-channel tests; SB-06 lost ACK and stale tab journeys; current integration pass |
| A16 reconnect; A17 host/process interruptions | SB-06 seven-phase/owner/offline/process restart; new seven-phase approved recovery; unchanged runtime |
| A18 final explanation/retention/cleanup | approved normal-flow real-case explanations and stable Complete; recovery cleanup/expiry tests in current integration pass |

## Explicit deferrals

SB-07's physical HTTPS access, physical interaction checks and human 40-second sketch-fit observations are **deferred, not passed**. Machine-verifiable SB-07 requirements are complete for this private-demo target. SB-08's rules rehearsal, three fresh groups, deduction/fairness/fun thresholds and revisions based on observations are **deferred, not passed**. Browser emulation remains technical evidence only.

SB-09's local technical handoff is ready. Public challenge delivery/account verification, hosting provider selection/limits, budget, live hosted URL/smoke checks, multi-device trust and public release decision remain deferred. A later deployment requires a separate request. No further milestone work is needed to try this private demo; return with a reproducible defect or, when available, actual human/device observations.
