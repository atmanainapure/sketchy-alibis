# Sketchy Alibis


A four-player murder mystery game built around investigation, drawing, deduction, and interrogation.

## Run locally

## How to Play

1. **Inspect:** Explore the case and examine the available evidence.
2. **Sketch:** Draw your interpretation of the clues.
3. **Gallery:** Review the sketches and observations.
4. **Interrogate:** Question the other players and compare alibis.
5. **Verdict:** Vote for the player you believe is the culprit.
6. **Solution:** Reveal the case solution and compare it with the accusations.
7. **Complete:** Review the results and scores.

   
Use Node **24.19.0** and npm **11.9.0** (Node 24 and npm 11 are declared as the supported major versions). From this folder:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. Stop with Ctrl+C. Vite and Socket.IO share the Node server's port. Node watch mode restarts server code, while Vite updates browser code. Server restarts discard in-memory rooms. The native Vite config loader avoids a restart loop caused by temporary config bundles.

## Repository Contents

- **Sketchy Alibis/**: Game source code and project files.
- **Technical Guide (PDF):** Detailed documentation of the game's architecture, implementation, and mechanics.
- **Skills Used (PDF):** Documentation of the ChatGPT skills used and created during development.

For the complete technical details, refer to the **Technical Guide**. The **Skills Used** PDF explains the skills involved in building the project.

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

