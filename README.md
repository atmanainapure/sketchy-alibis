# Sketchy Alibis


Four friends inspect a location photograph, draw private alibis, and find the liar. **Atman Ainapure approved A10 for case-001@1.0.0-rc.1 on 15 October 2026 for prototype rehearsal only.** Normal Start now uses that exact approved case. See [real-case rehearsal evidence and human instructions](docs/SB-05-real-case-rehearsal.md) for current verification and outstanding checks.


## Run locally

Use Node **24.19.0** and npm **11.9.0** (Node 24 and npm 11 are declared as the supported major versions). From this folder:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. Stop with Ctrl+C. Vite and Socket.IO share the Node server's port. Node watch mode restarts server code, while Vite updates browser code. Server restarts discard in-memory rooms. The native Vite config loader avoids a restart loop caused by temporary config bundles.

To try the lobby:

1. Open that exact address in four separate browser profiles. Ordinary tabs in one profile share one credential and are not four players. The automated equivalent uses four isolated Playwright contexts.
2. The first player enters a name and chooses **Create room**. Share the six-character code privately. The other three choose distinct names and **Join room** with that code.
3. Toggle **Ready**. Only the host sees **Start case**, **Remove**, and **Close room and leave**; guests can leave. Joining/leaving/removing a seat clears everyone's readiness. A fifth player is rejected.
4. Refresh a player's tab: their seat and name return. A disconnect clears only that player's readiness. A second tab in the same profile offers **Resume here**; taking over puts the former tab into **Session opened elsewhere** until explicitly reclaimed.
5. With four connected, ready players, click **Start case**. The approved real case opens at Inspect and runs for 255 seconds. Unapproved or invalid content still fails Start; separate negative tests retain this boundary.

## Internal boundaries

| Location | Responsibility |
| --- | --- |
| `src/client` | Lobby/case screens, shared connection, private drafts, drawing adapter, photo viewer, map/ballots and reveal |
| `src/shared` | Public wire schemas and content-free projection types; no answer pack |
| `src/server` | HTTP/socket lifecycle, origin policy and server-only clock/randomness injection |
| `src/server/rooms` | Anonymous sessions, membership, host permissions, generations, receipts and expiry |
| `src/server/game` | Runtime content schema, pinned case authority, schedule, private state, projections and result calculation |
| `src/server/content` | Versioned private authoring pack; runtime validates it and Start requires human approval |
| `assets/private` | Pinned photograph served only through verified started-room membership, never copied into public assets |
| `tooling` | Vite configuration and browser import guard |
| `tests/integration` | Real builds/transports, room authorization and controlled full-case rule scenarios |
| `tests/unit` | Case content consistency and asset integrity checks |
| `tests/e2e` | Independent-player lobbies, full synthetic cases, A/B branches, private payloads, save failures and normal-time rehearsal |

