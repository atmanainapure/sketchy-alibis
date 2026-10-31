# Dependency inventory

Direct dependencies pinned and inspected on 14 October 2026. License values below come from the installed package manifests. Dependency license texts remain in their distributed packages; retain the applicable notices when distributing compiled artifacts. This is a setup inventory, not the full release license review planned for SB-09.

| Package | Version | Manifest license |
| --- | --- | --- |
| React / React DOM | 19.3.1 | MIT |
| Express | 5.3.0 | MIT |
| Socket.IO / Socket.IO Client | 4.8.4 | MIT |
| Zod | 4.6.7 | MIT |
| React Sketch Canvas | 8.0.0 | MIT |
| Panzoom | 4.6.2 | MIT |
| Vite | 8.3.4 | MIT |
| Vite React plugin | 6.1.2 | MIT |
| Vitest | 5.0.4 | MIT |
| Playwright Test | 1.64.1 | Apache-2.0 |
| TypeScript | 7.0.2 | Apache-2.0 |
| tsx | 4.23.15 | MIT |
| Node types | 24.19.2 | MIT |
| Express types | 5.0.6 | MIT |
| React / React DOM types | 19.3.0 | MIT |

React Sketch Canvas (controlled Canvas API) and Panzoom are integrated in SB-05 and appear in the browser bundle. Chromium integration is verified; evaluation on physical devices remains pending. No external fonts, map provider, image service, or remote asset requests are used by the app.

## Case photograph

`assets/private/case-001/scene-001.jpg`: photo by **Paul Keiffer** on [Unsplash](https://unsplash.com/photos/a-yellow-tram-travels-down-a-lisbon-street-Am61s2Rya2Y), under the [Unsplash License](https://unsplash.com/license), accessed 14 October 2026. Attribution is optional under that license; the Solution screen credits the creator and links the source and license. The game embeds the photograph rather than reselling it alone or creating a competing image collection. The downloaded provider rendition was only renamed locally. Full source, image hash, modification history, clue references and recorded human review are in [the content review](docs/cases/case-001-review.md). SB-05 delivers the unchanged asset only to verified members of its started case, under a neutral URL/filename. A10 for the exact case/photo was approved by Atman Ainapure on 15 October 2026 for prototype rehearsal only.

## SB-07 resolved dependency check (15 October 2026)

The unchanged lockfile contains 220 dependency entries, including optional platform packages: 174 MIT, 26 Apache-2.0, 5 ISC, 12 MPL-2.0 and 2 BSD-3-Clause declarations. `xmlhttprequest-ssl` lacks a lockfile license field; its installed LICENSE contains the MIT permission/disclaimer and passive.ly LLC copyright notice. The 12 MPL declarations are Lightning CSS and its optional platform packages, used as development/build tooling; none were modified. Retain applicable distributed license/notice files. This inventory is not a release legal opinion or a claim that every optional binary was installed. `npm audit --json` returned zero reported vulnerabilities across the resolved tree on this date. No dependency or photograph license was changed.
