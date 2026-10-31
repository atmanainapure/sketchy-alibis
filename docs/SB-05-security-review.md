# SB-05 focused security review

Scope: the changed browser renderer/transport, normalized drawing adapter, authorized photograph route and test-only rehearsal setup. This was an ECC Security Review **self-review**, not an independent audit. The existing cookie, origin, membership, room and server-rule tests were retained. No deployment, dependency upgrade, external attack or broad vulnerability scan was performed.

| Finding | Evidence and impact | Correction and retest |
| --- | --- | --- |
| SB05-S1 — Low: delayed action acknowledgement restored a pending prompt after seat removal/takeover | `CaseChannel.send` updated `gamePending` on an old connection epoch even after `clear()` had removed that request. A deterministic test first failed with `gamePending: true` after the seat was cleared. This could confuse the next session’s retry UI; no cross-player data disclosure was demonstrated. | Only report an interrupted pending request if it is still the channel’s same pending object. The focused test passed after the change, then ran in the regression suite. |

Inspected controls:

- The browser reuses the verified room socket/generation. Actions carry room/case/request identity, never a caller-supplied player or role. Server checks remain authoritative. Cross-room and replaced-socket rule tests still apply.
- The photograph route verifies cookie membership, exact room/case and expiry before selecting a fixed local asset. No client-selected path, remote fetch or redirects exist. The integration test first returned 404 for an authorized request before the route existed; after implementation it returns the exact pinned JPEG while denying no-cookie, outsider and wrong-room requests and post-expiry access.
- Browser projections withhold peer cards/drafts/ballots and unreleased evidence/results. Four-session payload checks cover early phases, scheduled Gallery/evidence/Solution delivery and innocent views without forgery options. Existing server tests cover unauthorized actions and error projections.
- Player names, captions and reasons use literal React text. Browser tests verify markup remains text in gallery/ballot reveal. The drawing library receives numeric paths and fixed paint values, with an empty trusted background-image input; it never receives uploaded SVG/HTML or a user URL. Result links accept HTTPS only.
- The production browser bundle contains none of the scanned real case/credit/clue or synthetic future-evidence markers. Private source, asset and review paths remain unavailable as static files; the authenticated image route is the deliberate exception. Test helpers and fixtures are absent from the compiled production tree.
- Timeout reconciliation reads authorized state, preserves accepted drawings/votes through a deadline and never recomputes scores. The broader hostile reconnect/replay matrix is deferred to SB-06; these checks are not a claim that it is complete.
- The real case, photo, review checklist, package manifest and lockfile are unchanged. A10 remains false/pending. The normal application cannot select the synthetic pack remotely. No credentials, storage states or raw network traces are saved into the source checkpoint.

No other supported security finding remains in this inspected SB-05 scope. Physical devices, other browser engines, hosting/TLS proxies, capacity, process-restart UX and a complete SB-06 recovery review remain unverified here. The photo failure flag is local debrief information and does not influence authoritative scoring.
