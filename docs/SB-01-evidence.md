# SB-01 implementation evidence

**Date:** 14 October 2026. **Current milestone status: Verified after attempt 2.** The exact matching browser now runs both required journeys. The attempt 1 evidence below is historical; its browser blocker was resolved as recorded under “Attempt 2.” No playable case or human playtest is claimed.

## Attempt 1 historical checkpoint

Attempt 1 ended Blocked on browser verification. The commands and failures in the following sections describe that checkpoint and have not been rewritten as successful runs.

Scope: project setup, public/private module separation, one-origin React/Express/Socket.IO shell, clock/randomness seam, build/test tools, local HTTPS route, and source documentation. No prior application existed in the supplied workspace. No unrelated files were overwritten. No game rules, rooms, sessions, private alibis, drawings, evidence release, votes or scoring have been implemented. All later milestone acceptance criteria remain pending.

## TDD cycle: protect the browser import boundary

**Test target:** `tests/integration/client-boundary.test.ts`. These tests invoke real Vite builds of temporary fixtures. They do not mock a bundler or mirror a path-checking helper.

**RED command, before adding the guard:**

```sh
npm test -- tests/integration/client-boundary.test.ts
```

Actual result: exit **1**, **4 failed / 1 passed**. The allowed public shared import passed. Direct server, transitive shared-to-server, raw-file and symlinked server imports all produced bundles when the test required rejection. Each failure reported `promise resolved "RolldownOutputImpl{ …(2) }" instead of rejecting`; emitted code contained the synthetic `SERVER_ONLY_CANARY_NOT_A_REAL_CASE` value. This was missing behavior, not missing packages, compilation failure or a test-selection error.

**Implementation:** add `tooling/client-boundary.ts`, enabled by `tooling/client-config.ts`. The pre-load guard canonicalizes filesystem paths and allows modules only under `src/client`, `src/shared` or installed dependencies; server imports fail with `Browser boundary`. Vite virtual modules remain supported. Dev filesystem allowlisting and production static serving are separate transport controls.

**GREEN:** reran the identical command; exit **0**, **5 passed**. Assertions were retained. Production scaffolding was checked with build/smoke tests instead of artificial failing tests.

## Executed checks

| Command or check | Actual result | What it establishes |
| --- | --- | --- |
| `npm install --no-fund` | Exit 0 | Installed exact direct versions and generated `package-lock.json` |
| `npm ci --no-fund` | Exit 0 | Clean dependency reinstall from the lockfile succeeded |
| `npm ls --depth=0` | Exit 0 | All 18 direct packages resolved without peer errors |
| `npm run typecheck` | Exit 0 on final source | Browser/tooling and server TypeScript checks pass |
| `npm run build` | Exit 0 on final source | Vite browser build and Node server compilation pass |
| `npm test` | Exit 0 after clean install; **3 files, 9 tests passed**, no skips | Five bundle-boundary tests, three real HTTP/socket/dev-server smoke tests, one HTTPS/WSS test |
| `npm audit --json` | Exit 0; **0 reported vulnerabilities** | Registry advisory result at inspection time, not a security certification |
| `npm run dev` + readiness-triggered HTTP requests in the same local process environment | `/`, `/api/health`, `/main.tsx`, `/@vite/client` all returned **200** | Actual documented development command serves HTML, JSON and transformed JS |
| `npm start` via Playwright's webServer | Health readiness succeeded before browser launch | Production entrypoint starts and answers health on its test port |
| Browser output inspection | HTML, one CSS and one JS asset; no source maps, private canary or server `node:crypto` import | Current public output excludes the exercised server/test data; there is no real case pack yet |

Final regression sequence, after `npm ci`:

```sh
npm run typecheck && npm run build && npm test
```

Result: exit **0**, **9/9 tests passed**. HTTP and socket tests use real loopback servers on ephemeral ports. Four socket clients receive separate connection IDs, with both WebSocket and polling exercised. These connection IDs are **not** player identities or proof of room isolation. Private source/configuration/test URLs return safe 404 responses in production; the development private-file probe is denied and contains no server source.

The TLS test generates a temporary OpenSSL certificate, explicitly trusts that certificate in Node HTTPS and Socket.IO clients, and verifies HTTPS and WSS on the same origin with validation enabled. Certificate files are deleted in cleanup. No certificate authority is installed, TLS validation is not disabled, and physical-device trust is not inferred from this test.

## Setup issues corrected

- The HTTPS smoke client's CA option needed a PEM string for the installed Socket.IO type definition; typechecking caught and verified the correction.
- The dev-private-file smoke originally required exactly 403, while the safe response was 404. It now accepts only 403 or 404 and still verifies that server content is absent; the denial requirement was not weakened to permit success or a server error.
- Replaced Vite's deprecated `hmr.server` configuration with `ws.server`, following the installed Vite API.
- `tsx watch` could not create its local IPC socket in this environment. The dev command uses Node's watcher with the tsx loader instead. Vite's temporary bundled config then caused restart loops; native config loading removed that loop. The final documented dev command passed the HTTP smoke check. Cross-command loopback probes were not usable in this execution environment; the final probe spawned and queried the server within one command.
- Added explicit `.ts` extensions to tooling imports and enabled them for the no-emit tooling typecheck. Final builds have no Vite native-config warning.
- npm reports an environment-owned `http-proxy` configuration warning. No global npm setting was changed.

## Blocked and unexecuted checks

| Check | Status and exact blocker |
| --- | --- |
| `npx playwright install chromium` | Exit 1. Chromium 156.0.8078.4, Playwright build 1248, repeatedly downloaded an invalid/empty archive: `End of central directory record signature not found` |
| `npx playwright install chromium --only-shell` | Exit 1 with the same archive failure for Chrome Headless Shell |
| `npm run test:e2e` | Runner collected **2 tests**, started the webServer, then reported **2 browser launch errors** because `chromium_headless_shell-1248/.../chrome-headless-shell` was absent. **0 browser journeys executed; 0 browser passes** |
| Browser rendering, four browser contexts, visible disconnect/reconnect | **NOT RUN**, blocked by that missing executable. The test source is in `tests/e2e/foundation.spec.ts` |
| Visual/mobile review and trusted access on four physical devices | **NOT RUN**; no devices or trusted LAN certificate supplied. README documents the later route |
| Cookie/session/game reconnection and hidden-information payload checks | **NOT IMPLEMENTED/NOT RUN**; owned by SB-03 onward |
| Human playtest | **NOT RUN**; no participants, sessions or results assumed |
| Public host / submission | **NOT RUN**; not authorized in this milestone |

Do not mark SB-01 Verified until a matching browser binary is available and both browser checks execute successfully, with any actual failure fixed and retested. Run `npx playwright install chromium`, then `npm run check` on the restored source. A browser download failure is not TDD RED evidence. No coverage percentage was requested or measured.

## Scoped security review

The substantive finding was the browser build's ability to bundle server modules; the four observed leakage routes now fail and the public import still succeeds. Current HTTP serving exposes only intentional public files. Production has no clock/role override endpoint, accounts, credentials, private case payloads, or user-content upload surface.

The guard does not certify future assets, dependency internals or projections. Review all newly added asset references, case content and shared schemas. Authentication, per-room authorization, session takeover, CSRF/cookie policy, private payload projection, action validation/rate limits, and phase authority remain explicit gates in SB-03–06. No infrastructure review or penetration test was performed.

## Attempt 2 browser recovery and acceptance check

The continuation request required resolving SB-01 before advancing. Source comparison with the saved 26-file archive found no intervening application changes. The existing browser tests and all package versions were left unchanged.

1. `npx playwright install chromium --only-shell` again exited **1**. Inspecting the exact Playwright CDN response found HTTP 200 with a 195-byte **HTML “Site Unavailable” page**, not a ZIP. This was an environment/download failure, not a failing game behavior.
2. The official Chrome for Testing known-good versions manifest listed the required **156.0.8078.4** build. Downloaded its matching Linux headless-shell ZIP directly from [Google’s official distribution](https://storage.googleapis.com/chrome-for-testing-public/156.0.8078.4/linux64/chrome-headless-shell-linux64.zip), HTTP 200, 125,797,539 bytes. Checked ZIP integrity and member paths, extracted with its executable modes into Playwright’s `chromium_headless_shell-1248` cache directory. No browser or package was patched; TLS validation remained enabled. The binary reported `Google Chrome for Testing 156.0.8078.4`.
3. Ran `npm run check` on the unchanged SB-01 source: exit **0**. Typecheck and build passed; **3 Vitest files / 9 tests passed**; **2 Playwright Chromium tests passed**, no retries or skips. Four isolated browser contexts loaded the same-origin application; the separate disconnect/reconnect journey observed both states after a real server restart.

The ordinary setup command remains `npx playwright install chromium`. If the same CDN problem recurs in this environment, use the exact version and archive above in the installed Playwright cache location; do not substitute a different browser and claim equivalent verification. The large downloaded browser archive is not included in the project checkpoint.

SB-01’s acceptance criteria are now satisfied: reproducible source/build, separated private/public imports, same-origin HTTP/socket shell, transport/TLS checks and both required browser journeys. The later SB-02 regression also passed with **14 Vitest tests and 2 browser tests**. Four physical-device access, sessions, gameplay and human evaluation remain later scope.

## Resume

Read the [canonical blueprint](https://chatgpt.com/space/page_e4db0c79734c8191b236365ff40e44d3) and this source before editing. SB-01 is Verified. SB-02’s authored candidate and pending human review are recorded in `SB-02-evidence.md`; **SB-03 private rooms and player identity** is the next implementation milestone. The selected stack and P1–P19 defaults are preserved. Challenge delivery findings are recorded separately in `challenge-constraints.md`.

Source snapshot: `sketchy-alibis-sb01.zip`, containing this project without `node_modules`, `dist`, credentials, certificates, temporary helpers or generated browser traces. Its durable identifier and checksum are recorded in the canonical blueprint. No Git remote or external service is assumed.
