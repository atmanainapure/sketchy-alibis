# SB-03 room and identity contract

Historical SB-03 boundary: SB-04 now extends this interface with the rule engine and membership-authorized game actions. Read [SB-04-protocol.md](SB-04-protocol.md) for the current Start handoff, game projections and terminal cleanup. A10 remains pending.

This records the implemented lobby boundary for the next milestone. It does not replace the [canonical blueprint](https://chatgpt.com/space/page_e4db0c79734c8191b236365ff40e44d3) or its game rules. Four identities may occupy a room. Case approval A10 remains pending, and no game engine is wired.

## Identity and request origin

`POST /api/session` establishes an anonymous browser credential before any room allocation. It requires a matching Origin/Host pair and JSON content type; no room can be allocated by this endpoint. Its JSON response contains only `hasMembership`. A valid existing cookie is reused. A new 256-bit random token goes only in `__Host-sketchy-session`, with Secure, HttpOnly, SameSite=Strict, Path=/ and no Domain. Only its SHA-256 lookup key and a separate server session ID are held in memory. Never put the cookie or raw HTTP headers in logs or test artifacts.

The opaque browser cookie has a seven-day maximum lifetime so it cannot expire before a late-created room's retention ends. That does **not** grant seven days of room access. An unattached session expires after one hour; a lobby expires one hour after creation; Closed room authorization expires one hour after closure. Every protected operation checks server validity, and expired records revoke the token even if a browser still holds its value. A 60-second sweep also collects idle expired records; reads/actions reject at the exact deadline. Active-game terminal cleanup is still SB-04/06 work.

Without `APP_ORIGIN`, protected requests accept only this server's exact loopback port on `127.0.0.1` or `localhost`, using its actual HTTP/HTTPS protocol. With `APP_ORIGIN`, both Origin and Host must match that explicit origin; only HTTPS or loopback HTTP is valid. Forwarded headers are not trusted. For direct LAN testing use a trusted HTTPS certificate and `APP_ORIGIN` matching the certificate host and port. Reverse-proxy deployment remains unconfigured.

The browser uses Socket.IO over WebSocket. Browsers supply the WebSocket Origin automatically. All lobby operations require that matching Origin and a valid cookie from the handshake; public transport connectivity alone grants no room access. Automatic polling fallback is not enabled in the browser client. The HTTP loopback Secure-cookie flow is verified in Chromium; this is not certification of other browsers or physical devices.

## Messages and projections

Inputs are strict Zod schemas in `src/shared/lobby.ts`. Unknown fields, invalid UUIDs/types and out-of-range values fail. The server derives the actor from the cookie and its membership map, never a supplied player ID, owner flag or role. Names trim outer whitespace, use 1–20 Unicode code points without control characters, and compare case-insensitively within a room. Codes use six cryptographically selected characters from a 32-character alphabet; joining normalizes case and trims whitespace.

| Socket event | Input and behavior |
| --- | --- |
| `lobby:enter` | Create/join, private UUID attempt ID, tab client ID, name, and code for joins. Creates one seat. The same accepted attempt/payload returns that seat; changing its payload conflicts. Another new attempt while already a member fails. A removed membership cannot be resurrected with its old attempt. |
| `lobby:connect` with `mode: resume` | Requires the retained tab client ID and last accepted generation. Restores the same seat only when both still match. It does not rotate the generation. |
| `lobby:connect` with `mode: takeover` | Explicit user action with a fresh private attempt ID and tab client ID. Rotates the server generation once, invalidates the former writable socket and sends it `lobby:replaced`. Repeating the same takeover returns the original generation; a superseded takeover cannot reclaim control. |
| `lobby:read` | Requires own room code and the currently bound socket. Returns only that member's projection. |
| `lobby:action` | Requires own room code, current generation, player-scoped UUID request ID, action and payload. Ready changes own state. Remove/Start/Close require owner membership. Leave is for non-owners in Lobby. |

All operations acknowledge either `{ok: false, error}` or a success with a receipt, projection and/or own connection metadata. An accepted mutation receipt is retained with its canonical validated payload. Identical retries return that receipt without repeating effects; changed payloads conflict. Authentication, membership and writable-generation checks precede receipt access. Receipts are not broadcast.

`lobby:snapshot` is sent separately to each current member socket. It contains only room code/status/owner ID/expiry, the public roster's IDs/names/connection/readiness, and the recipient's own public player ID. No sessions, credential lookup keys, attempt ledgers, alibis, answer keys or future evidence are serialized. Clients cannot subscribe themselves to arbitrary server rooms.

`lobby:ended` reports membership removal or expiry. `lobby:replaced` reports a superseded connection. The client stops automatic ownership recovery after replacement and offers **Resume here**. The old cookie alone cannot silently take control back.

## Membership and Start

Capacity is four, including the owner. Membership changes clear everyone's readiness. A disconnect preserves the seat, clears only that player's readiness, and leaves owner authority unchanged. Only the current socket can cause that member's disconnect update, so a replaced socket's later disconnect cannot disconnect its successor.

Owner removal revokes the target's existing membership. A non-owner may leave; the owner must explicitly close the room. Closed rooms reject new joins and game mutations while allowing their existing members to see the closure until expiry. There is no owner migration, spectator seat or name-based recovery. A new browser profile requires a new seat.

Start checks owner authority, exactly four connected/ready members, candidate identity/version/approval metadata and the game port's full-schema validation result. The synchronous room operation hands an immutable roster plus content ID/version to `GamePort.start` once, then stores that pinned version and freezes membership. A leave/disconnect processed first prevents Start. Failure before handoff leaves Lobby unchanged; the game port must itself commit atomically or throw without effects.

`GamePort` is an in-process interface in `src/server/rooms/authority.ts`, not a remotely selectable fixture. SB-04 owns the complete case schema, assignment and phase engine. Production currently reads the real unapproved candidate, rejects Start, and has no implemented game port. Tests inject an approved **synthetic** candidate and synchronous port to verify the room-side contract. This does not approve or run case-001.

## Retry and reconnect behavior

The client keeps tab identity, generation, room code and one pending request in sessionStorage. These values are not the rejoin credential and cannot authorize another browser without the cookie. Each deliberate command saves its attempt/request ID before emission. Buttons prevent overlapping commands; a lost acknowledgement leaves an explicit pending state and retry control.

On reconnection, the client establishes the cookie session before opening a new socket. It resumes the existing writable generation **before** retrying a pending lobby mutation. An already accepted Ready retry returns its original receipt and does not undo the readiness cleared by disconnect. Pending Create/Join or explicit Takeover requests retain their original IDs. Callback epochs discard acknowledgements from an obsolete connection or ownership generation.

This implements lobby identity recovery only. Recovery of drawings, ballots, game deadlines, authority failures and terminal case results remains in later milestones. The process owns all room data in memory. Restarting the server loses it; the UI reports the room unavailable and does not invent a restored seat or result.

## Bounds

These are local prototype safeguards, not measured capacity claims:

- 64 KiB maximum Socket.IO payload; 120 handled requests per connection per minute, including malformed requests.
- 20 validated entry attempts per session per minute; 60 connect/resume/takeover operations and 120 actions/reads per event/session per minute.
- 60 bootstrap requests per source IP per minute, using the actual socket address rather than forwarded headers.
- At most 512 anonymous sessions, 128 rooms and 2,048 live rate buckets. Allocation fails safely when a bound is reached.
- Eight room-code collision attempts; never replace an existing room on collision.
- Up to 32 successful entry attempts per session, 128 takeover receipts per seat and 256 mutation receipts per seat. At a bound, refuse new work instead of evicting still-needed receipts.

Room, entry and credential records expire with their associated lifecycle. Timers are stopped when the application closes. Further concurrency/capacity measurement belongs to SB-09.
