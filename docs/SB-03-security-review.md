# SB-03 focused security review

Date: 14 October 2026. Workflow: **ECC Security Review**, performed as a self-review of room access and identity handling. This is not an independent audit or security certification. Scope: session bootstrap, Socket.IO handlers, room authority/projections, browser identity/retry controller and lobby rendering. No hosting infrastructure was provisioned or assessed.

## Trust boundary checked

Untrusted browser payload → same-origin handshake and live opaque cookie → strict wire schema and request bound → server membership → own room/current socket/generation → owner/action/state guard → idempotent receipt or one mutation → explicit recipient projection.

Reviewed `src/server/application.ts`, `src/server/rooms/sessions.ts`, `src/server/rooms/authority.ts`, `src/shared/lobby.ts`, `src/client/use-lobby.ts`, `src/client/main.tsx`, and the corresponding tests. No client-supplied ID or host flag determines the actor. Socket connection alone grants no room access. Each lobby response is built from an allowlist; no generic room serialization or client-selected room subscription exists. The server-only case remains outside the public build and private-file routes remain denied.

## Supported findings and disposition

| Finding | Reproduction and impact | Correction and retest |
| --- | --- | --- |
| SB03-S1 — unsupported origin scheme accepted (low; configuration hardening) | `createApplication({ publicOrigin: 'ftp://localhost' })` resolved instead of rejecting. A malformed deployment configuration could create unusable policy assumptions. No demonstrated cross-room bypass. | `application.ts` now accepts only an exact HTTPS origin or HTTP loopback. Meaningful test failed first; final session suite passes. |
| SB03-S2 — malformed input bypassed request counter (medium; availability) | 121 malformed lobby events on one valid socket all reached validation; the limit was only applied after parsing. Repeated invalid traffic could consume unbounded per-connection validation work. | Count requests before parsing/authenticated dispatch, with bounded counter storage and payload size. Test first observed `INVALID_REQUEST` instead of `TRY_LATER`; final room suite passes. This is bounded prototype protection, not a volumetric DoS claim. |
| SB03-S3 — browser credential expired before room retention (medium; identity availability) | Original two-hour cookie could expire before an identity bootstrapped up to one hour before room creation, then a lobby closed near its one-hour deadline and retained one further hour. Browser could lose recovery while the server still retained the seat. | Seven-day opaque cookie ceiling; independent server authorization still expires at the required lobby/Closed deadline and is revoked there. Regression first failed on Max-Age; final cookie and room-expiry tests pass. A stale browser cookie cannot authorize after server expiry. |
| SB03-S4 — pending action replay preceded identity resume (medium; recovery correctness) | Browser full regression showed a Ready ACK lost during navigation produced `Session opened elsewhere` on return. A real-server browser test then intentionally dropped that ACK and reproduced failure. The server correctly refused the unbound socket. | `use-lobby.ts` binds the retained generation before retrying a mutation, preserves its original request ID and ignores obsolete-connection callbacks. Full browser suite and 3 repeats of each affected journey pass. No permission check was weakened. |

All four supported findings above are addressed and retested. See [SB-03-evidence.md](SB-03-evidence.md) for factual RED/GREEN history and exact final commands/counts.

## Controls verified

- Credentials use 256-bit random tokens; only a SHA-256 lookup key and separate server session ID are retained. Cookie is `__Host-`, Secure, HttpOnly, SameSite=Strict, Path=/, with no Domain. Bootstrap returns only membership presence, never the token. Browser JS cannot read the cookie.
- POST bootstrap requires exact Origin/Host and JSON content type. Protected socket handlers independently require a valid cookie and same-origin handshake. Missing Origin cannot authorize lobby operations even though public transport smoke connections are permitted. Forwarded IP/origin headers are not trusted.
- Four-seat/name validation and bounded code generation operate inside synchronous room mutations. Repeated accepted create/join requests cannot allocate duplicate seats; collisions cannot replace rooms. Another room's member cannot read/mutate the target room or remove its players.
- Owner checks come from the verified member and room owner ID. A payload claiming another player is rejected. Removal revokes membership; closure stops mutations; expiry removes room/session/entry records and invalidates the credential.
- Explicit takeover rotates one server generation. Automatic resume needs the retained client ID and current generation; stale sockets cannot write or silently rotate ownership. Takeover and mutation receipts are scoped to the authenticated identity, with changed-payload conflicts and bounded retention.
- Public snapshots contain roster state and own public ID only. Case contents/answers, future evidence, raw credentials and receipt ledgers are absent. React renders player names as literal text; the browser markup regression passes.
- Raw network traces/screenshots/storage-state exports are disabled for automated tests. Source archives exclude test artifacts, credentials, certificates, dependencies and builds. No secret environment values or credentials were added to source.

## Limits retained

The app remains a single in-memory authority. Restart loss is explicit, and no name/code-based credential recovery is promised. The chosen implementation bounds are documented in the room protocol; they have not been measured as a supported concurrency target. An adversary knowing a room code can attempt to occupy an available seat, consistent with this private-code prototype; the host can remove lobby members. Accounts, passwords and invitations are outside scope.

The real app cannot start the case because approval and the full game engine are absent. Game-private projections, timed releases, drawing/ballot payloads and active-game cleanup require fresh scoped checks in SB-04–06. Browser testing covers Chromium on local loopback, plus a Node HTTPS/WSS test with certificate verification; it does not certify physical-device trust, mobile browsers or a future reverse proxy. Dependency versions were unchanged; no new external vulnerability-database audit or public penetration test was performed.

A10 remains pending. No human content approval, gameplay study or independent implementation review is inferred from this review.
