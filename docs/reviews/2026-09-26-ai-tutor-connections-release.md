# AI Tutor Connections v1 — Production release verification

Date: 2026-09-26 (America/New_York; deployment/check timestamps use UTC)
Status: **PRODUCTION VERIFIED; independent closeout PASS; P0/P1/P2/P3 = 0**
Scope: authorized release after the separate [overall audit PASS](2026-09-26-ai-tutor-connections-overall-review.md).
Closeout runtime impact: **none; documentation only**.

## Exact release identities

| Item | Verified identity |
|---|---|
| Public repository / branch | `https://github.com/TYD-Bruce/numerical-t-lab.git`, `main` |
| Public release commit | `ea9860fb8e078c76c1d5c0d05a2ebbe8e776b8fd` |
| Public prior remote main | `5bfcf734b27c2a3e7b42cd2f62ca66fad6713751`; release was 15 commits ahead, zero behind |
| Public/private release tree | `b084fe515f2708d940c12806d8828b74ae32b39d` |
| Private deployment repository | `https://github.com/TYD-Bruce/numerical-t-lab-deploy.git`, `main` |
| Private sync commit | `3c6370ae71ec058786f9988b947e97ca95e49bec` |
| Sole private parent | `9649cb67b8ef1dfc507fa3238dc45789220a84e3` |
| Vercel project | `numerical-t-lab`, `prj_IhfXZrgmIFA0UiI9GGItlbSXf5SX`, Vite |
| Deployment | `dpl_8E6LfZGZQ3xD79SgXrYrrouCkdZk`, READY, production, Git source |
| Canonical demo | [numerical-t-lab.vercel.app](https://numerical-t-lab.vercel.app/) |
| Immutable deployment | [numerical-t-l592pl0vh-bruce-tian.vercel.app](https://numerical-t-l592pl0vh-bruce-tian.vercel.app/) |

Live remote reads confirmed both prior main SHAs before mutation. Clean local
main, exact HEAD/tree, ancestry and dry-run checks preceded normal public and
private fast-forward pushes. The private commit was created from the exact public
tree with its private parent; the histories were not merged. No branch/worktree,
force push, environment change or deployment-protection change was used.
After deployment, Vercel's canonical-alias lookup resolves the new deployment and
its exact private source SHA. The owned browser is closed; worktree was clean
before this documentation-only closeout.

## Deployed checks

| Check | Observed result |
|---|---|
| Canonical routes | `/`, `/ode`, `/ode/initial-value-problems`, `/linear-algebra`, `/linear-algebra/linear-systems`, `/pde`: HTTP 200 HTML with identical root shell. Native browser also directly loaded the nested ODE URL. |
| API/function separation | GET `/api/chat`: JSON 405. Three malformed POSTs (`{}`, missing Linear payload, unsupported profile): JSON 400. These fail before provider dispatch; no valid inference request was sent. |
| Entry assets | Entry JS and CSS: HTTP 200 with JavaScript/CSS types. Together with route/API checks these form 12 canonical HTTP checks. |
| Deferred assets and fonts | All 21 actual emitted assets observed across Home, Linear and ODE: HTTP 200 with appropriate types. Every downloaded JS file has the same SHA-256 as the audited 5B build. Interface/math fonts are served from the same origin. |
| Loading order | Cold Home loads only entry JS/CSS and interface font. Linear navigation adds its route/shared pure chunks, with no ODE runtime or full Tutor panel. `platformTutorPanel` appears only after opening Tutor. |
| Desktop | 1440 × 1000 Light: both Lab Tutor interfaces render beside the Lab. Linear hosted settings refuses personal enablement; ODE performs the starter numerical Run and enables its result questions/composer. |
| Mobile | 390 × 844 Dark: successful Linear Solve and ODE Run expose their distinct suggestions in one named modal each. Composer stays in the frame; page width is within viewport. Native Escape dismisses ODE Tutor and returns focus to its launcher. Screenshots were visually inspected. |
| Hosted personal-key exclusion | Clicking Enable personal connections produces the local-computer requirement and “No key can be entered here.” There is no password input and no configuration fetch. |
| Browser health | Seven captured states contain zero page errors, CSP violations or API fetch attempts; resources are same-origin. Console/error buffers are empty. Only theme preference persists. |
| Immutable identity | Anonymous URL redirects to Vercel SSO; redirect was not followed. An authorized connector GET returns 200 and HTML byte hash equal to the canonical shell. Immutable API POSTs were not performed. |
| Runtime errors | Vercel's project runtime-error query, scoped from deployment creation, reports no runtime errors. This is a bounded observation, not ongoing monitoring. |

The release browser uses a task-owned init guard that records and rejects API
fetches; its recorded API attempts are zero. Numerical solves run in the browser.
Separate HTTP probes send only invalid requests to verify packaged API behavior.
No real provider key, environment/private configuration, real LocalAI model or
valid hosted inference was used.

## Evidence and limitations

Task temporary artifacts include `t-lab-release-identities.json`,
`t-lab-release-deployment.json`, `t-lab-release-http-results.json`,
`t-lab-release-immutable.json`, `t-lab-release-asset-results.json`,
`t-lab-release-runtime-errors.json`, browser state JSON/screenshots and the
readable HTTP/asset/init probe scripts. The release browser session was closed.

The initial combined HTTP probe completed all 12 canonical checks, then stopped
at the immutable URL's SSO redirect. That is a protection boundary, not a failed
canonical check; the authenticated HTML check is separately recorded. Some CLI
clicks were inconclusive and were replaced by native focus/Enter plus observed
DOM/state. A full-page navigation after a successful Solve needed acceptance of
the application's existing beforeunload dialog; it then loaded the nested ODE
route. No inconclusive command is counted as evidence of an application action.

The browser also requests `/favicon.ico` implicitly. Neither the pre-feature
baseline nor this release declares or ships that icon; the unchanged SPA rewrite
returns HTML for it. It is recorded separately from the 21 emitted assets, whose
content types all pass. No icon or routing change was added in release closeout.

The Vercel project-detail tool has a parameter-mapping mismatch, and the build-log
tool reports unavailable. Project/deployment/source/alias identity was instead
verified with working project-list and deployment tools plus actual HTTP/asset
evidence. READY status is confirmed; inspection of remote build logs is not claimed.

Local evidence remains the overall audit's 677 fresh focused tests and nine
cross-layer scenarios plus inherited full verification (130 files / 2,211 tests,
all typechecks, boundaries and 124-module build). The release introduces no code
change or reason to repeat those suites. Real provider/model inference remains
live-untested, including hosted valid generation. The legacy default ODE path
retains its approved pre-existing response/abort behavior; personal/default Linear
guarantees are not generalized to that path.

## Closeout outcome

The first independent closeout review found no runtime/release-evidence issue
and two P3 documentation provenance issues. `RELEASE-CLOSEOUT-P3-01` now pins
PLAN's 125-path snapshot to the original audited `641b286`, instead of moving
HEAD. `RELEASE-CLOSEOUT-P3-02` explicitly labels PROJECT_HANDOFF's full-suite
and local mock/browser evidence as inherited from 5A/5B. Both are independently
CLOSED with final P0/P1/P2/P3 = 0. The initial report is
`release-closeout-audit.md`; no runtime checks or deployment were repeated.

The final `release-closeout-reaudit.md` confirms the exact three-file correction
delta, all eight final hashes, 365 links / nine fragments, the other 118 original
paths and all 27 named evidence files unchanged. The parent read the complete
report and independently rechecked the eight hashes before verdict-only metadata.
The approved final documentation commit/push preserves the audited deployed code;
no repeated deployment is needed. No implementation or release gate remains.
No future feature work is authorized by this closeout; real model testing requires
a separate bounded instruction.
