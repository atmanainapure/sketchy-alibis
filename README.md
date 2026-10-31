# Sketchy Alibis

**Private prototype awaiting human playtesting.** [Open the demo and follow the solo walkthrough](START_HERE.md). Human group playtests and physical-device checks were explicitly deferred on 15 October 2026; none is marked passed. [Current technical handoff](docs/SB-09-private-demo.md).

Four friends inspect a location photograph, draw private alibis, and find the liar. **Atman Ainapure approved A10 for case-001@1.0.0-rc.1 on 15 October 2026 for prototype rehearsal only.** Normal Start now uses that exact approved case. See [real-case rehearsal evidence and human instructions](docs/SB-05-real-case-rehearsal.md) for current verification and outstanding checks.

The [canonical development blueprint](https://chatgpt.com/space/page_e4db0c79734c8191b236365ff40e44d3) is the only progress plan. Read it before continuing, together with the [capability specification](https://chatgpt.com/space/page_ea1e086a743c819197ee74775b804304) and [stack research](https://chatgpt.com/space/page_a9de5296faa88191a460ceeaa65f5116). Evidence is in [SB-01](docs/SB-01-evidence.md), [SB-02](docs/SB-02-evidence.md), [SB-03](docs/SB-03-evidence.md), [SB-04](docs/SB-04-evidence.md), [SB-05](docs/SB-05-evidence.md) , [SB-06 recovery evidence](docs/SB-06-evidence.md) and [SB-07 interface evidence](docs/SB-07-evidence.md). Read the [room protocol](docs/SB-03-protocol.md), [case protocol](docs/SB-04-protocol.md), [client handoff](docs/SB-05-client-contract.md) and [current security review](docs/SB-06-security-review.md) before continuing. The [case review pack](docs/cases/case-001-review.md) contains spoilers and is not served by the app. Its five A10 review items are approved for this exact version and photo; this is not a human playtest result.

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

Lobbies expire after one hour. Closing retains a read-only closure view for existing members for one hour; no new joins or mutations are accepted. Clearing cookies or restarting the server loses access, with no recovery by name/code alone. HTTP loopback cookie behavior is verified in Chromium; use trusted HTTPS for other devices.

To inspect the compiled application:

```sh
npm run build
npm start
```

This uses the same address, serving only `dist/client` as public files. Do not run dev and production on the same port concurrently. On a port conflict, stop the other process or set `PORT` to an unused port. `HOST` defaults to `127.0.0.1`; expose a LAN address only for an intentional private rehearsal.

## Try the case interface with synthetic content

This local technical rehearsal uses dummy alibis/evidence and the existing licensed photograph. Its setup is explicitly labelled **Synthetic rehearsal**. It does not approve `case-001`, test its reasoning, or count as a human playtest.

```sh
npm run build
node --import tsx tests/helpers/rehearsal-server.ts
```

Open **http://127.0.0.1:3001** in four separate browser profiles. Create/join the same room, make everyone Ready, then Start. Assignments are random and the complete case takes 255 seconds. Choose A/B if you are the murderer; draw with the black pen; use undo/clear and an optional caption; save or submit. Inspect the shared gallery, make initial choices, discuss the released sheet, and make a fresh final verdict. Country/accusation changes save automatically after a one-second editing pause; use the explicit Save button when needed. A displayed Saved state refers to accepted work. Every phase ends on the server’s clock.

The helper binds only to loopback port 3001. Stop it with Ctrl+C. It is test-only code outside both production builds, with no remote switch for fixtures, approval, time or roles. The regular `npm run dev` / `npm start` entrypoints use the exact real content approved for prototype rehearsal; Start still requires an approved, valid pack.

## Checks

```sh
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

`npm test` includes production-server smoke checks, so build first. The HTTPS smoke test needs `openssl` on PATH and creates/deletes a temporary test certificate. Playwright needs its matching Chromium binary and system browser dependencies. `npm run check` runs typecheck → build → Vitest → Playwright without skipping failed stages. `npm run test:watch` is the Vitest watch runner.

The room-focused regression commands are:

```sh
npm test -- tests/integration/session.test.ts tests/integration/rooms.test.ts
npm run test:e2e -- tests/e2e/lobby.spec.ts
```

Playwright starts a fresh local production server on port 4317 and refuses to reuse another server. Each player has an independent context; takeover tests deliberately share only one player's context between tabs. Each integration test uses ephemeral ports and closes its sockets/server. The historical SB-05 full check passed **58 Vitest tests and 10 Chromium journeys**. SB-06 now passes **69 Vitest checks** and the **11-journey targeted recovery/case/restart batch**; the full run passed the other eight journeys but exposed a drawing-helper defect, corrected and retested as documented in [SB-06 evidence](docs/SB-06-evidence.md). Current approved-case verification is recorded in [the real-case report](docs/SB-05-real-case-rehearsal.md). The matching Chromium setup is documented in SB-01 evidence. Raw network traces, screenshots and storage-state exports are disabled to avoid saving credentials. Local HTML reports remain under ignored `playwright-report/`; do not distribute unreviewed test artifacts.

To exercise the new authority with controlled synthetic fixtures:

```sh
npm test -- tests/integration/game.test.ts tests/unit/game-content.test.ts
```

These **22 checks** use real HTTP/WebSocket connections and four separate cookie identities, with synthetic content and controlled time. They exercise a whole case, both forgeries, deadlines, drawings, ballots, privacy, concurrency, scores and cleanup without waiting 255 seconds. `tests/helpers/game-harness.ts` supplies the synthetic pack and `clock.to(offsetMs)`; it is not an application route, environment switch or human playtest. The browser suite now also exercises complete synthetic cases with the real licensed asset. `npm run test:e2e -- tests/e2e/case.spec.ts` runs the three controlled-time case journeys; `npm run test:e2e -- tests/e2e/rehearsal.spec.ts` runs the full 255-second normal-time rehearsal. `npm run test:e2e -- tests/e2e/real-case.spec.ts` runs the approved real case through the normal application with random roles and normal time. The full suite now includes both normal-time rehearsals and takes roughly nine to ten minutes. These are automated sessions, not physical-device or human playtests.

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

The server constructs a separate allowlisted view for each verified member. Own cards/drafts/ballots remain private; drawings publish at Gallery, evidence at 140 seconds, and cards/ballots/answers/results at Solution. Credentials and internal room objects never enter those projections. The import guard rejects filesystem modules outside client/shared/dependencies, including tested indirect, raw and symlinked imports. Dev filesystem serving is restricted; production serves only the browser build. No public directory is copied wholesale. The neutral photograph route checks cookie membership, room and case ID, serves only its fixed allowlisted asset, and uses private/no-store caching. Credit and source links appear only at Solution. Never put secrets in `src/client`, `src/shared`, or `VITE_*` environment variables.

`createApplication({ runtime, game, caseSource })` provides direct in-process test seams. Remote requests cannot select fixtures, change the clock or assign roles. The room authority derives actors from verified cookie/session membership and the current writable generation. Start requires four ready connected members and an approved, schema-valid case; the exact candidate is parsed into detached runtime state, with an immutable roster and pinned version. The normal application uses the explicitly approved real case. Timers catch up against the original Start, and Complete/Aborted expires after one hour, deleting room/identity/case records. SB-06 recovery journeys cover each phase, stale tabs, retry/deadline handling, expiry and actual process replacement. See docs/SB-06-evidence.md for commands and manual checks.

## Local HTTPS route for later device testing

The server accepts `TLS_CERT_FILE` and `TLS_KEY_FILE` together. They must identify PEM files, kept outside source snapshots. Missing one is a startup error. The application does not load `.env` files automatically; set variables in the shell or process configuration.

For a private LAN rehearsal, obtain a local certificate whose Subject Alternative Names include the exact LAN IP or hostname used by all devices. Use a local CA that every participating device explicitly trusts, retain its private key only on the issuing machine, and keep the application's server key local in `.certs/`. Alternatively use an already trusted development certificate. Do not bypass certificate warnings or disable TLS validation to count a rehearsal as verified.

After building, a POSIX shell example is:

```sh
APP_ORIGIN=https://your-certificate-host:3000 HOST=0.0.0.0 PORT=3000 TLS_CERT_FILE=.certs/lan-cert.pem TLS_KEY_FILE=.certs/lan-key.pem npm start
```

Replace `your-certificate-host` with the exact trusted hostname/IP in the certificate. Each screen must open that **same** origin, with no certificate warning. `APP_ORIGIN` is an exact origin without a trailing slash; non-loopback HTTP is rejected. Without it, only the actual loopback protocol/port is accepted for private operations. Forwarded headers are not trusted; reverse-proxy hosting is not configured. The automated HTTPS/WSS test establishes a private cookie and creates a room with certificate validation enabled. Firewall/LAN reachability and certificate trust on four physical devices are **not yet verified**; the test does not install a CA or certify device access.

## Scope and source checkpoint

The preserved prototype is four players, one case, six countries, one murderer, private drawings and ballots, server-controlled deadlines, and the agreed scoring/recovery rules. Public jobs, 3–8 players, three-case standings, awards, accounts, spectators, chat/voice, AI judging, and persistent history remain deferred. SB-04 implements the server rules; SB-05 connects the drawing widget, photo delivery, map selection, private ballots and result screens to that authority.

No Git remote, hosted service, database or paid resource has been created. The source archive linked in the canonical blueprint preserves this project, excluding dependencies, build outputs, certificates and transient test artifacts. Restore that source before resuming if the current checkout is unavailable. The exact dependency tree is unchanged in `package-lock.json`; see [THIRD_PARTY.md](THIRD_PARTY.md) for licenses. Current completion evidence and pending human/device checks are recorded in [the real-case rehearsal report](docs/SB-05-real-case-rehearsal.md). SB-06 recovery implementation and its separate verification are documented in docs/SB-06-evidence.md. No public deployment or paid service is authorized.

## SB-07 interface and device handoff

The phase guide now keeps instructions, countdown and section links visible. Phone layouts show your private card first; shared evidence stacks into labeled country pairs. Zoomed photos support keyboard arrows and touch panning; unzoomed photos allow page scrolling. Results explain points and provide keyboard-accessible scrolling tables. The approved content, server rules and limits are unchanged.

See [SB-07 evidence](docs/SB-07-evidence.md) for actual test results and remaining gates, [focused security review](docs/SB-07-security-review.md), and [exact four-device HTTPS instructions](docs/SB-07-device-check.md). Physical access, human 40-second sketch fit and human playtests remain pending; SB-08 has not begun. Run `npm run test:e2e -- tests/e2e/usability.spec.ts` after building to reproduce the layout/keyboard/touch/error checks.
