# SB-04 focused security review

14 October 2026 America/New_York / 15 October UTC. ECC Security Review self-review of new case actions, authority-owned state and private projections. No independent agent review, hosting audit or security certification is claimed.

Reviewed paths: `src/server/game/content.ts`, `src/server/game/authority.ts`, the game additions to `src/server/rooms/authority.ts` and `src/server/application.ts`, and `src/shared/game.ts`. The earlier cookie/origin/membership controls remain in force. No infrastructure, identity provider or dependency change was made.

| Finding | Evidence and impact | Fix and retest |
| --- | --- | --- |
| SB04-S1 — Start could pin a different candidate than the one validated (medium correctness risk; trusted source seam required) | Room validation called the candidate source, then game Start called it again. A source returning different contents under the same ID/version on its second read made the active case use the replacement explanation. No remote caller can select this source, but it weakened the atomic content/version boundary. | Start passes the exact validated candidate to the engine, which validates and detaches it. `exact candidate` test failed with the replacement text, then passed. The content-mutation test also confirms later authoring changes cannot alter a running case. |

No other supported unresolved finding was identified in this scope. Controls checked:

- Session cookie and Origin checks precede game access. Room membership determines the actor, room and current writable socket/generation. Neither owner status nor knowledge of a code grants access to another private panel. Replaced sockets and wrong-room requests fail without a game view.
- Strict message envelopes reject supplied actor fields. Game actions reject unknown role/time/score fields and unsupported operations. Immutable roster membership determines valid accusations, including disconnected players; self-votes fail.
- The authority catches up before new actions. Old accepted retries retain their original acknowledgement after a boundary; altered payloads conflict, and stale draft revisions cannot overwrite current work. Generation authorization still applies before receipt access.
- State is projected explicitly per recipient. Public state never contains the internal case object, credentials, receipt maps or other players' unpublished submissions. Error reconciliation includes only the requesting member's view. Private saves do not send public progress markers.
- The phase schedule alone releases gallery, evidence and Solution. The owner has no advance/score endpoint. Result computation uses accepted final fields and stores one result. Client timestamps, initial choices, drawing quality and optional prose do not determine scores.
- Drawing input is bounded coordinate data, with no raw SVG/HTML/image upload path. Captions/reasons remain literal strings. Browser rendering of game captions is a later UI obligation, not claimed as tested here.
- Receipt payloads are hashed with SHA-256; retained acknowledgements are small and capped at 256 per player. Action bytes, stroke/point counts and diagnostic events are bounded. No credential, raw message or full drawing is copied into event diagnostics. Final phase/evidence timestamps are retained even when diagnostic detail reaches its cap.
- Runtime content includes only the fields required by the engine/projections; provenance and clues are not sent until Solution. The actual candidate remains unapproved. The public build contains no case markers and its browser bundle is unchanged.
- Complete/Aborted expiry removes case data and associated membership/authorization. Game timers stop on application close. Scheduling failure is tested to abort without a result or internal error text.

Executed evidence: 22 authority/schema checks within the final 56-test Vitest run, and six existing Chromium journeys after the fix. See [SB-04-evidence.md](SB-04-evidence.md) for RED/GREEN commands and acceptance mapping.

Remaining limits: no playable case UI or photo endpoint exists yet; those require SB-05 projection/rendering checks. Full browser failure/recovery testing, physical-device access, production reverse-proxy behavior and measured concurrent-room capacity remain later work. No external dependency vulnerability scan or load test was run. In-memory restart loss remains the agreed default. A10 content review and human playtests remain pending.
