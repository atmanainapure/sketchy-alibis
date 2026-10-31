# SB-04 case authority contract

This is the server handoff for SB-05. The canonical blueprint and capability specification remain authoritative. This records the completed SB-04 server contract. The subsequent [SB-05 client handoff](SB-05-client-contract.md) describes the implemented browser integration. A10 for case-001@1.0.0-rc.1 was explicitly approved on 15 October 2026 for prototype rehearsal only. See [the real-case rehearsal report](SB-05-real-case-rehearsal.md). Physical-device testing and human playtests remain pending.

## Start and ownership

`lobby:action/start` retains SB-03's owner, four-member, connected and ready guards. The room reads one candidate, validates approval/runtime structure, then passes `{roomCode, roster, contentId, contentVersion, candidate}` to the synchronous game port. The engine parses that exact candidate into detached state before publishing anything. A failed parse/start leaves the lobby unchanged. The roster is frozen; later joins/removals/leave are rejected. A duplicate accepted Start does not allocate another case, assignment or schedule.

`CaseGames` owns one `CaseAuthority` per room. Production uses `systemRuntime` and `case001`. The source and runtime injection points are in-process TypeScript arguments only, with no environment/HTTP/socket selector for test packs, roles, time or approval. The `game` injection is retained for the existing room-interface tests.

Production selects a murderer using cryptographic `randomInt(4)`, then assigns the three innocent cards using Fisher–Yates with bounded indices 3 and 2. This gives uniform selection without an empirical frequency gate. The public owner receives exactly the same information boundary as any other player. The murderer alone sees A/B and can select during Inspect; no choice defaults privately to A at 45 seconds.

## Authority schedule

| State | Start-relative interval | Accepted new actions and boundary effect |
| --- | --- | --- |
| Inspect | [0, 45s) | Murderer chooses A/B. At 45s lock it, defaulting to A when absent. |
| Sketch | [45, 85s) | Own revisioned drawing/caption saves or explicit full-snapshot submission. At 85s lock remaining drafts and publish gallery together. |
| Gallery | [85, 115s) | Own revisioned initial country/suspect choices. At 115s freeze them. |
| Interrogate | [115, 205s) | No game mutations. Publish the entire evidence sheet once at 140s. |
| Verdict | [205, 225s) | Own revisioned final country/suspect/reason. Initial choices do not prefill these fields. |
| Solution | [225, 255s) | Freeze ballots, calculate/store one result, reveal the solution. No new game mutations. |
| Complete | From 255s | Stable result; expire at Start +255s +1h. |
| Aborted | On unsafe transition/scheduling failure | No result/winner; interruption message. Expire one hour after abort. |

Timers target absolute Start-relative deadlines. Delayed work catches up all elapsed boundaries in order, using their scheduled timestamps; it publishes the current permitted state rather than replaying stale phase screens. Protected requests also catch up before acting. No pause or early advance exists, including when every player submits or disconnects. A timer/transition failure aborts rather than inventing a result.

## Socket API and actor verification

All messages inherit SB-03's same-origin cookie, membership, rate/payload and writable-generation controls. The room adapter supplies the actor ID from verified membership. The client cannot choose an actor or subscribe to another player's projection.

| Event | Input | Output |
| --- | --- | --- |
| `game:read` | `{roomCode}` | `{ok: true, view}` for this authenticated member/current socket. |
| `game:action` | `{roomCode, caseId, generation, requestId, action}` | Accepted receipt, or error with current own view when domain validation fails. Wrong-room/auth/envelope failures carry no game view. |
| `game:snapshot` | Server event, no client subscription payload | Separate current projection to each connected room member on Start, boundaries and connection changes. Private saves do not broadcast progress. |

`caseId` is the unique server case-instance UUID from the view, not the authoring pack ID. Request IDs are UUIDs private to the sender. Schemas are strict. No `advance`, `score`, role override or player-targeted private read operation exists.

Action payloads:

| Type | Fields |
| --- | --- |
| `choose-forgery` | `option: 'A' or 'B'` |
| `save-drawing`, `submit-drawing` | `expectedRevision`, `strokes`, `caption` |
| `save-initial` | `expectedRevision`, `country`, `suspectId` |
| `save-final` | `expectedRevision`, `country`, `suspectId`, `reason` |

Country is one of PT/ES/FR/IT/NL/GB or null. Suspect is a different frozen roster member's UUID or null, including disconnected players. Null clears a choice; blank strings represent an empty caption/reason. Each draft starts at revision 0. A successful mutation requires its current `expectedRevision` and increments it once. First explicit drawing submission wins. Stale revisions return `STALE_REVISION` with own accepted state; a different edit after submission returns `LOCKED` while still in Sketch. Newly late actions return `PHASE_ENDED`; premature actions return `ACTION_NOT_AVAILABLE`, both with current phase/lock state.

An accepted receipt contains requestId, acceptedAt, accepted phase, and revision where applicable. It is bound to this case, authenticated player and canonical validated action. Same-request identical retries return the original receipt without another effect, even after the phase ends. Changed validated payloads conflict. Authorization precedes receipt access; a takeover generation must first establish authority before retrying. An original receipt is not a fresh-state snapshot. Read/reconcile current own state afterward.

## Drawings and ballots

The transport representation is normalized square-canvas strokes: arrays of nonempty arrays of `{x,y}` points in [0,1]. There is no raw SVG, HTML, uploaded image or color/style field. The SB-05 adapter now normalizes its coordinates and exposes one black pen; see the client handoff for its rendering bounds. A one-point stroke is a drawable mark. Empty `strokes: []` clears a draft; explicit submission requires marks. Drawing and caption are accepted atomically in one snapshot.

Implementation bounds: at most 128 strokes, 2,000 points total, and 48,000 UTF-8 bytes per game action inside the existing 64 KiB socket envelope. These are technical defaults, not changes to drawing scoring; revisit only with a measured widget constraint. Caption trims outer whitespace, allows five whitespace-separated words and 80 Unicode code points. Reason trims outer whitespace and allows 160 code points. Markup stays literal data; SB-05 uses React text rendering. Invalid data leaves accepted work unchanged.

Gallery records each player's locked drawing and caption with `submitted`, `automatic`, or `missing` lock mode. Missing marks retain a valid saved caption but never fabricate an image or change eligibility/points. Initial and final ballots remain separate. Only final accepted fields score; missing fields remain null with no default vote.

All valid votes count, including the murderer's. Arrest requires a unique positive highest tally, without a majority requirement. Tie/zero means no arrest. Correct country gives +2; innocent correct accusation gives +3 regardless of group arrest; murderer escape gives +3, with no accusation bonus. An innocent arrest also means murderer escape. Scores are stored once, with component breakdowns and all tied highest-score winners.

## Projection and lifecycle

Views contain caseId/contentVersion, phase, serverTime, absolute phaseEndsAt, expiresAt, `public` and `self`. Public initially contains opening, neutral photo metadata, six countries and the roster's IDs/names/connection state. Gallery appears at 85s, the complete evidence at 140s, and Solution at 225s. Own guilt/card/forgery controls/drawing/initial/final state are in `self`; no other player's drafts or submission timing is sent early.

Solution includes murderer, selected and unused forgery, original cards, ballots/reasons, score/tally, geography/alibi explanations, clues/provenance and debrief observations. The runtime schema selects required fields; the authoring object is never serialized wholesale. Photo asset delivery, zoom/map rendering and case screens are implemented in the separate SB-05 client layer. The current licensed authoring pack fits the runtime schema, but approval remains false. Runtime validation cannot provide A10 sign-off.

Observation data stays inside the case until Solution. It records phase timestamps, selection/default, drawing lock mode, initial/final choices, disconnect/reconnect and rejected/duplicate requests without credentials or raw payloads. Detailed events are capped at 4,096; phase/evidence boundaries are always retained and overflow is counted by event type. Up to 256 accepted receipts per player are retained as digests plus small receipts, not repeated drawing payloads. Limits fail safely rather than evicting accepted receipts.

Complete/Aborted retains its case until one-hour expiry. Sweeps delete game state, receipts/events, room membership and credential authorization. Every protected request enforces expiry; periodic cleanup also collects idle records. Application close cancels game timers. The process remains in-memory: a restart cannot restore a case. Full browser failure/recovery journeys and physical-device checks remain later work.

## Exercising the implementation

Run `npm test -- tests/integration/game.test.ts tests/unit/game-content.test.ts` from the project root. The synthetic fixture uses real server connections and independent cookies with a controlled clock; it never enables the real case or serves a test photograph. `clock.to(offsetMs, false)` simulates a delayed wakeup. The newer SB-05 browser journeys separately exercise synthetic full cases. Do not mark SB-05 playable-case acceptance complete from these protocol tests.

## SB-06 recovery additions

GameView includes a monotonic `snapshotRevision` within its case. It orders whole authorized snapshots, including changes made at the same server millisecond; it is not a permission or action revision. Clients replace accepted state, discard older snapshots and continue to send per-field expectedRevision. Expiry emits `lobby:ended` with `reason: "expired"` before membership removal; it carries no private case data. Client-only accepted expiry estimates select unavailable wording and never restore authority. See SB-06-evidence.md for the executed recovery matrix.
