# SB-05 browser handoff

The canonical blueprint and capability specification remain authoritative. SB-05 implements the browser journey. A10 is now explicitly approved for case-001@1.0.0-rc.1 for prototype rehearsal; normal Start accepts that exact pack. See [evidence](SB-05-evidence.md) for actual checks and limits. No game rules or package versions changed.

## Components and authority

- `use-lobby.ts` retains the existing authenticated socket and tab identity. `CaseChannel` uses that same connection; it does not allocate another player/socket or accept a supplied actor ID.
- `game-view.ts` contains content-free wire types. The server’s projection is typechecked against them. Private case text, correct-answer values, clues and provenance are never bundled into browser modules.
- `case-screen.tsx` renders only received fields. The browser’s estimated countdown never advances phases, publishes evidence, locks another player’s drawing or calculates scores. At zero it waits for the server. Original phase times remain unchanged.
- `case-editors.tsx` keeps local edits distinct from accepted snapshots. Drawings/captions save atomically; initial and final ballots mount separately, so initial choices cannot prefill Verdict. All reveal details come from the server result.
- `drawing.tsx` uses the controlled `Canvas` API from the already selected React Sketch Canvas v8 package. It replaces the complete path list rather than appending on restore. Both editor and gallery use the same rendering API. Only a black pen is exposed; hardware eraser gestures are treated as black drawing. Undo removes the last stroke; Clear removes marks. No image upload, text tool or AI interpretation exists.
- `photo.tsx` uses the installed Panzoom package, with drag, zoom in/out and reset controls. The photo remains accessible throughout the case. `countries.tsx` supplies original schematic country silhouettes and six named buttons whose selection/highlight stays synchronized. No mapping service or new license dependency is introduced.

## Drawing bounds

The wire format stays SB-04’s unit-square numeric strokes. Display size does not change the saved coordinates. The adapter clamps pointer coordinates to that square and rounds them to three decimal places. It stops adding marks at 128 strokes or 1,900 points and displays an undo/clear message. This is below the authority’s 2,000-point and 48,000-byte action limits. Line width is a fixed proportion of the square. The server still independently validates every payload.

Captions follow the shared five-word/80-code-point trimmed rule. Reasons follow the 160-code-point trimmed rule. Invalid local edits are visibly unsaved and cannot replace the accepted snapshot. Text is rendered through React as literal text; no player-controlled HTML or raw SVG is inserted.

## Saving and simple refresh

Valid dirty work saves after a one-second editing pause, with explicit Save buttons available. The channel serializes sends and retains the exact pending request ID/payload in memory. Submit carries the complete drawing/caption, uses the current accepted revision, and remains disabled while another write is in flight or unconfirmed. The interface reports Saving, Saved, Unsaved, Unconfirmed, Disconnected/unsaved and Locked.

After an acknowledgement, the channel reads the current authorized snapshot instead of treating a historical receipt as current state. If the acknowledgement times out, that read can reconcile the exact accepted revision/content, including a deadline crossed in the meantime. Otherwise the request remains unconfirmed and a retry uses the same request identity. No new late work is replayed into a later phase. Clearing/replacing a seat invalidates delayed responses so they cannot restore its prior pending UI state.

Refreshing uses the existing cookie and tab generation. The server supplies the current phase and accepted drawing, ballots, released evidence and results. Unaccepted local drafts are not saved as authoritative browser state. Game retry requests remain in memory; a refresh recovers accepted server state instead of replaying browser drafts. SB-06 adds monotonic full snapshot revisions, epoch-safe completion and timing-only unavailable-room messaging; its recovery matrix is in SB-06-evidence.md. Existing lobby identity recovery and takeover behavior are preserved.

## Photograph access

`GET /api/rooms/:roomCode/cases/:caseId/photo` requires an existing cookie membership in that exact started room and case. It checks expiry and rejects cross-site requests. It does not accept a filesystem path, external URL, player ID, content version or filename from the requester. A fixed server-side allowlist maps `scene-001.jpg` to the pinned JPEG. Responses use `image/jpeg`, neutral inline filename, `private, no-store`, and the existing `nosniff` policy. Missing/unauthorized resources return the same generic 404.

Loading failure exposes Retry without changing any deadline. A tab-local affected-session flag survives an ordinary refresh and remains visible after recovery/reveal. This flag is a debrief aid, not a server scoring input or new analytics stream. The licensed bytes, neutral alt text and deferred credit/source presentation remain unchanged. Rights/clue/human-review approval is independent of the working viewer.

## Rehearsal and remaining gate

The ordinary application uses the exact case approved by Atman Ainapure on 15 October 2026 for prototype rehearsal (`case001.review.approved === true`). Tests inject a separate synthetic pack through the existing in-process seam; only its photograph/provenance are reused from the real authoring pack. Its stories, evidence and explanation are dummy test content. The local `tests/helpers/rehearsal-server.ts` entrypoint binds loopback only, uses normal time/random assignment, and labels the synthetic session explicitly. It and the test clock are absent from both production builds; there is no production fixture/clock/approval endpoint.

The explicit approval is recorded in the case pack and human checklist. See [real-content rehearsal evidence](SB-05-real-case-rehearsal.md) for the actual normal-flow run and pending human/device checks. Synthetic tests do not establish content approval or human outcomes. SB-06–09 remain outside this work.
