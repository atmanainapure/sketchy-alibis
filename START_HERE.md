# Sketchy Alibis private demo

**Private prototype awaiting human playtesting.** Four players, one approved case. You can try it alone by controlling four independent browser profiles. No public service, remote preview URL, accounts or API keys are required.

## Open it on your computer

1. Download `sketchy-alibis-source.zip` and extract it. Open a terminal in its `sketchy-alibis` folder. You should see `package.json`.
2. Use Node 24 and npm 11. Check with `node --version` and `npm --version`. The verified versions are Node 24.19.0 and npm 11.9.0.
3. Run these commands in order:

```sh
npm ci
npm run build
npm start
```

4. Keep that terminal running. Open **http://127.0.0.1:3000** on the same computer. This is a local address. It is not a remotely accessible link and will not open this computer's game from your phone or another computer.

If port 3000 is busy, stop the other server or use `PORT=3002 npm start` in a POSIX shell, then open `http://127.0.0.1:3002` in every profile. For this loopback demo leave HOST, APP_ORIGIN, TLS_CERT_FILE and TLS_KEY_FILE unset unless intentionally configured. If session creation fails, check you used the same exact origin in every window and that browser cookies/session storage are enabled. Chromium is the verified browser family; other engines and physical devices are deferred.

## Short solo walkthrough

1. Open four distinct Chrome browser profiles and arrange their windows so you can switch quickly. Give them temporary labels such as Maya, Leo, Sam and You. Ordinary windows/tabs in one profile share a seat; multiple incognito windows also share their incognito session. Four profiles are the reliable approach. Do not use Resume here as a way to create another player: it takes over the existing seat.
2. In the first profile enter a name and click **Create room**. In the other profiles enter distinct names and join using the same six-character code. Confirm all four names appear. Click **Ready** in each, then **Start case** in the host window.
3. **Inspect, 45 seconds:** read a private card, use **Photograph**, zoom/pan and reset. If you inspect the murderer's window, choose either forgery; no selection defaults to A. Seeing all four cards yourself spoils the mystery, but lets you inspect the interface.
4. **Sketch, 40 seconds:** draw in at least one window. Add an optional caption of at most five words, wait for **Saved**, then **Submit and lock**. You do not have to draw in every window. Saved drafts auto-lock and blank seats show a missing sketch; all seats remain voters.
5. **Gallery, 30 seconds:** inspect the drawings and optionally save initial country/suspect choices. **Interrogate, 90 seconds:** open **Evidence** when it appears 25 seconds into the phase. Compare the country-labeled records with the stories. There is no built-in voice/chat or pause.
6. **Verdict, 20 seconds:** choose a country and another player in one or more windows. Wait for **Saved**. Initial choices do not carry over. **Solution, 30 seconds:** click **Results**, check scores and read the explanations. At **Complete**, results remain available for an hour.

The case lasts 255 seconds from Start. Switching windows does not pause it. You can refresh after a saved drawing to check recovery; only accepted work is restored. A solo inspection is not evidence that the social deduction is fun or fair.

## Start another inspection or stop

There is no rematch in this prototype. When finished, stop the server with Ctrl+C. Restart with `npm start`, refresh all four profiles and create/join a new room. The old room is lost: in-memory state cannot survive server restart. The interruption message refers to that old case; it does not prevent a new room. Never restart during a case you want to preserve.

## Current status

The recorded A10 approval remains for unchanged `case-001@1.0.0-rc.1`, prototype rehearsal only. The application source and game rules are unchanged from the verified SB-07 version. Additional approved-content recovery and bounded input checks now pass. See [technical evidence](docs/SB-09-private-demo.md) and [security review](docs/SB-09-security-review.md).

Human group playtests, physical-device checks and human 40-second drawing-fit observations were explicitly deferred by Atman on 15 October 2026. None is marked passed. The SB-08 study and public delivery remain deferred. For later multi-device access, the existing [trusted LAN HTTPS instructions](docs/SB-07-device-check.md) still apply; they are not required for this solo loopback demo.
