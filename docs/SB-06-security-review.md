# SB-06 focused ECC Security Review

15 October 2026. Self-review of local application recovery, credential replay, subscription authorization, expiry and client state. No independent security certification, production assessment, dependency upgrade or external testing.

## Findings and fixes

| Finding | Impact / reproduction | Correction and verification |
| --- | --- | --- |
| Same-tick snapshots lacked total ordering (low, consistency) | Deliver a newer forgery/connection snapshot, then an earlier one at the same server time; the UI reverted accepted state. No cross-player payload disclosure was demonstrated. | Authority snapshotRevision and client monotonic guard; meaningful unit RED/GREEN. |
| Old read callback cleared newer action's internal busy gate (low, consistency) | Resolve old action ACK, hold its read, clear/reconnect, begin a new action, then resolve old read. A retry could concurrently emit despite busy UI. Server idempotency still prevented duplicate mutation. | Check epoch before clearing gate; meaningful unit RED/GREEN. |
| Missing specific authority-loss/expiry feedback (low, recovery) | Lost credential/restart or normal expiry showed only generic room unavailability. | Accepted timing metadata only; private state cleared; browser RED/GREEN plus real process restart and offline-expiry verification. |

Superseded-error handling also clears the channel and ignores later snapshots while superseded, matching the already-working replacement event. No new authorization source was introduced.

## Controls inspected and exercised

- `application.ts` rechecks same origin and hashed cookie session on every socket action/read, not just connection establishment. `Rooms.gameRead/gameAct` verifies room membership and current writable socket/generation before projections, mutation or cached receipts. Direct tests reject stale sockets for both receipt replay and reads; existing tests reject outsiders/cross-room access and supplied actor fields.
- Resume requires the original client ID and generation. Explicit takeover increments generation; old tabs do not auto-reclaim. Browser repeats reload three times and verifies no later Solution payload reaches the old tab. Broadcasts iterate only current member socket IDs; expiry removes room membership and the case before later publication.
- Snapshot projections remain allowlisted public/self state. Revision is only an ordering value, never authorization. Session storage adds only an expiry estimate: no cookie token, alibi, strokes, ballot or score. Tampering with this estimate can change unavailable-message wording only; it is never submitted to the server or used to award points.
- Exact retries are authorized before digest/receipt access. The same request ID with altered content conflicts. Deadline catch-up precedes new mutations; retained accepted receipts survive the deadline. Existing limits on action size, stored receipts, room/session counts and observation records remain unchanged.
- Cleanup test verifies authority removal (receipt/observation owner), memberships and credential revocation; old socket, photo and resume access fail. Actual process termination and replacement cannot recover old membership from the cookie or client metadata.
- Runtime and public-asset boundary tests remain required. No remote clock/role/content override was added. Real pack, photo and approval are unchanged.

Raw network frames, cookies and storage are held in test memory only. Trace/screenshots/video are disabled; error contexts and local HTML reports are excluded from the saved source bundle. Reports name behaviors and totals rather than credentials or pre-reveal player data. Limits keyed to session/connection IDs remain bounded, short-lived rate-limit buckets and expire independently; they contain no game content or rejoin tokens.

Residual limitations: in-memory authority deliberately cannot survive process loss. Client wall-clock changes can mislabel an unavailable room as expired/interrupted, but cannot restore data or extend server deadlines. Stolen valid cookies still represent the same anonymous player; no account-based recovery is in scope. TLS on actual devices, external hosting, browser families beyond Chromium and human playtests remain unverified. No supported high-severity vulnerability was found in this scoped review; that is not a broad security guarantee.
