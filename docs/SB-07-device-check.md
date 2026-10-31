# SB-07 four-device check — deferred

**Deferred by Atman on 15 October 2026; no physical-device check has passed. These instructions are retained for later use. The solo loopback demo does not require this step.**

Use four private physical screens on the same trusted LAN. This is a technical access and interaction check, not the SB-08 blind playtest. The current automated evidence covers Chromium at 1280×900, 390×900 and touch gestures at 360×800; it does not certify an iPhone, Android phone or their browsers.

## Start the existing HTTPS server

On your server computer, extract the saved source, open a terminal in `sketchy-alibis`, and run:

```sh
npm ci
npm run build
```

Use the existing trusted LAN certificate and key. They are intentionally absent from the source archive. Its Subject Alternative Name must include the exact LAN address or hostname below. All four devices must already trust its issuing CA. Do not bypass a certificate warning. If the trusted certificate/trust setup is unavailable, record that as the access blocker rather than treating HTTP or ignored warnings as a pass.

In a POSIX shell, replace the three assignments with your actual values:

```sh
SKETCHY_LAN_HOST='192.168.1.23'
SKETCHY_CERT='/absolute/path/to/lan-cert.pem'
SKETCHY_KEY='/absolute/path/to/lan-key.pem'
APP_ORIGIN="https://${SKETCHY_LAN_HOST}:3000" HOST=0.0.0.0 PORT=3000 TLS_CERT_FILE="$SKETCHY_CERT" TLS_KEY_FILE="$SKETCHY_KEY" npm start
```

`192.168.1.23` is an example, not a discovered address. Keep the terminal running. Allow incoming TCP 3000 on the private network if your firewall requires it; do not add public router forwarding. All devices must be on the same reachable network (guest Wi-Fi/client isolation can prevent access). Stop another process using port 3000 first, or change both PORT and the origin's port together. Do not use the synthetic rehearsal server. A server restart ends its in-memory cases.

## Verify four independent players

1. On every device open the **same exact** URL, for example `https://192.168.1.23:3000`. Check there is no certificate warning and the screen says **Connected to the case desk**. Do not substitute localhost on the other devices. Record device model, OS/browser versions and exact origin, without cookies or keys.
2. Player 1 enters a name and chooses **Create room**. Players 2–4 enter distinct names and join the displayed code. Confirm four different seats and that only player 1 has host controls. Do not use four tabs in one profile as four identities.
3. Each player selects **Ready**; host selects **Start case**. This runs the approved `case-001@1.0.0-rc.1` for 255 seconds. Do not show private screens to one another before Solution.
4. During **Inspect (45s)** read your card via **Your panel**, then **Photograph**. Zoom into the tram destination and shop lettering; drag to inspect; reset. On touch screens verify the unzoomed photo lets you scroll the page, while enlarged photo drags pan it. Record whether each clue can be read. Do not count an unreadable clue as a pass because you already know the answer.
5. During **Sketch (40s)** draw normally for the allotted period, include both required details and an optional caption. Test Undo/Clear on one device. Scroll outside the canvas and verify strokes do not scroll the page. Save; wait for **Saved**, then submit on three screens and let a saved draft auto-lock on the fourth. Record accidental scrolling, clipped controls, false save indications or early “Sketch full” errors. Submit locks both drawing and caption.
6. At **Gallery (30s)** verify four published drawings/captions and their lock states; make private initial choices. At **Interrogate (90s)** the **Evidence** link must appear 25 seconds into the phase. Read all three Portugal/Spain record pairs; discuss the stories using in-person conversation or an existing call.
7. At **Verdict (20s)** select a country and accuse a player; confirm **Saved**. Initial choices do not carry into the final ballot. At **Solution (30s)** use **Results**: check the country, murderer, arrest/tie, individual scores and original-card explanations. Scroll the score/ballot tables sideways if necessary. At Complete confirm results stay available.
8. In a separate technical run, refresh one screen after a saved drawing and briefly disconnect another during Interrogate. Confirm the same seat and current server phase return, saved work survives, missed evidence appears and no other player's private card/ballot is shown. The clock does not pause. For stale-tab/host interruptions, follow the existing SB-06 manual recovery matrix.

## Record actual observations

For each device record: trusted connection; distinct seat; photo clue legibility; drawing/scroll/zoom behavior; readable card/evidence/timer; visible save/lock/reconnect feedback; final results; defects with phase and reproducible steps. Keep credentials and pre-reveal private material out of shared diagnostics.

Report whether all four reached the same trusted origin concurrently. Also report any real 40-second sketch that hit a drawing limit or did not save in time, and whether players needed facilitator repair. Mark failures or unperformed steps pending. Do not treat a facilitator-led technical run as a blind playtest. No human results, physical-device passes or mobile-release certification have been recorded yet; SB-08 remains gated on the required access verification and fresh participants.
