# AI Tutor Connections v1 — Chunk 3A1 evidence

Date: 2026-09-25
Status: **Locally verified; independent audit PASS**
Baseline: clean local `main`, `2e6f3319739d448d0a4bb2a6359619c2126ad26c`
Scope: Lab-owned ODE grounding and shared Tutor lifecycle safety.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md).

## Implemented behavior

The existing ODE context builder now belongs to `labs/ode/odeTutorContext.ts`.
Its point sampling, bounds, method metadata and problem projection are preserved;
readonly arrays are copied only into the existing bounded DTO projection.
`odeTutorBinding.ts` reads the Lab's successful result/problem and the existing
Convergence eligibility helper, returning ready/unavailable context with a
monotonic binding-local revision. Projection starts on first read and reuses
the derived snapshot while immutable evidence identity and eligibility match.
Convergence drawer/metric changes do not invalidate an answer. Stale, blocked
or fingerprint-mismatched study evidence remains excluded. Input edits and a
failed Run still leave the previous successful ODE Run available to Tutor.

`LabTutorBinding` owns explanatory copy and context-change subscriptions.
`PlatformTutorHost` subscribes without building context, refreshes the active
panel and unsubscribes on disconnect. Old callbacks check connection identity.
The shared panel consumes opaque context and no longer imports ODE sources.
Shared sanitization/chart-discriminator helpers moved to `tutorPresentation.ts`;
`aiTutor.ts` retains compatibility reexports for existing callers.

Pure per-Lab Tutor sessions now have a transcript revision. Message append,
divider and nonempty clear advance it; draft and desktop placement do not.
The panel combines request generation/abort, binding/module identity, current
context revision and expected transcript revision before sending and accepting
work. It rechecks after Store notifications before chart actions or focus.
Clearing pending work resets loading without fabricated assistant/error text.
The legacy client rejects unsupported profiles before calling the ODE API.

The unavailable panel retains its transcript and disabled composer, displays
Lab-owned reason text and becomes usable after eligible context arrives.
Successful Run resets, failed Run retention, Compare exclusion, navigation,
safe rendering and existing chart validation remain intact. No dependency,
numerical algorithm, provider protocol, API credential behavior or deployment
change. Personal chat/history consent remains 3A2, settings 3B and Linear
Systems Tutor phase 4; those are not implemented by this chunk.

## Automated and bundle evidence

Focused checks pass **16 files / 168 tests**. Full `npm.cmd run verify` passes
**117 files / 1,847 tests**, frontend/numerics/contracts and API typechecks,
import boundaries and production build. No tests were skipped or numerical
assertions weakened. Red tests preceded the new ownership/revision behavior,
then additional reproductions found and closed disconnected callback, synchronous
transcript reset/chart and synchronous outgoing-send races.

Two old manifest assertions depended on the ODE facade retaining its former
source-key name. Rollup now coalesces that facade with its emitted ODE chunk.
The tests identify its exact source-module owner and continue requiring the
entry's dynamic edge and shared Lab presentation ownership. Added transitive
emitted-graph checks prove Home has no Lab/Tutor runtime, Tutor has no
ODE/numerics runtime, and complete Labs do not eagerly import Tutor networking,
MathLive or Compute Engine. Source graph checks independently cover the same
ownership seams. No manual chunk configuration was added.

Build: **117 modules**; entry JS **59.37 / 18.38 kB gzip**, lazy Tutor
**9.30 / 3.65 kB**, ODE **424.34 / 128.77 kB**, Linear Systems
**75.80 / 22.63 kB**. The previous deferred shared Convergence chunk is no
longer a Tutor dependency; individual chunk-size comparisons are not equivalent
to route-total sizes. Existing large MathLive/Compute Engine warnings remain.

Evidence is in OS temporary storage: `t-lab-chunk-3a1-final-focused.log`,
`t-lab-chunk-3a1-final-verify.log`, the initial/extra/submit/transcript red-test
logs and `t-lab-chunk-3a1-build/.vite/manifest.json` (intermediate graph evidence).
The final verification rebuild supplies the current production assets.

## Browser evidence and limits

Native Windows with agent-browser and its isolated Chrome, built Vite preview,
an explicit synthetic local chat handler and a proxy that rejects external
HTTP/CONNECT traffic. No real provider, credential, model, download or model
management operation. Assets and successful chat stayed on the loopback origin.

- Desktop 1440 x 1000: Home and lazy ODE load, unavailable Tutor reason/disabled
  sending, keyboard Run enabling the same panel, synthetic reply, and Light/Dark.
- Failed Run (`tEnd = t0`) kept two transcript items and an enabled Tutor; a
  subsequent request still contained the prior successful `tEnd = 5` context.
  A successful rerun cleared the transcript and kept the composer enabled.
- Clearing an intentionally delayed request left no stale answer/error or busy
  composer. Compare selection disabled sending while retaining the transcript.
- Mobile 390 x 844: named modal, inert background, visible contained composer,
  synthetic reply, Tab/Shift+Tab wrapping, Escape releasing modal/inert state and
  returning focus to the connected launcher.
- In-app Home removed the Tutor DOM; Resume restored one panel, the two prior
  messages and Compare's disabled state. Sampled views had no horizontal overflow,
  external document resource, reported page error or console error.

Screenshots and observations live in `t-lab-chunk-3a1-browser/`. The driver did
not activate some offscreen click targets; explicit focus plus Enter exercised
the native keyboard path successfully. A fixture startup command initially used
a Windows path where Node required a file URL; the corrected fixture ran through
the tool's managed process session. These were not reported as product passes.
After the final synchronous-callback guards and full rebuild, a fresh isolated
session repeated initial unavailable state, keyboard Run, enabled composer and
synthetic reply against `platformTutorPanel-BoGgwjJc.js`. The final smoke recorded
two messages, no external document resources and empty error/console reports.
The implementation task closed its browsers and stopped its fixture processes.
No hard-reload-after-solve claim is made; the isolated beforeunload driver limit
recorded in [1C](2026-09-25-ai-tutor-connections-chunk-1c.md) remains. Geometry is
browser evidence, not jsdom or screen-reader certification. Convergence revision
eligibility and injected synchronous callback races are automated fixture evidence.

## Independent gate

`Audit AI Tutor connections`, using GPT-6 Astra / Extra High, returned **PASS**
with **P0 = P1 = P2 = P3 = 0**. It independently passed the 16 focused files /
168 tests, frontend/numerics/contracts typechecks, import boundaries, the external
Vite contract build, diff and documentation checks. It inspected the full 1,847
test/build log and browser evidence, including desktop/mobile screenshots; it did
not independently rerun the browser or claim complete-feature readiness.

All 33 paths (29 modified, four new) and hashes matched before/after audit, with
main HEAD unchanged and index empty. Manifest SHA-256:
`dccd6725286af4dd1f3dcb8cc0d733848f8222b3e947ae3f3e18599dd9fccc0f`.
The implementation task independently rechecked the complete path/hash set,
branch, baseline and empty index after PASS. Only verdict/next-gate metadata
was then recorded; no runtime changes followed the pass. The external report
and snapshot are retained as `chunk-3a1-audit.md` and
`chunk-3a1-final-snapshot.json` in the audit evidence directory.

Commit boundary: `Move Tutor context ownership into Labs`.

The next chunk is 3A2, with separate connection/history provenance and validated
personal chat. No per-chunk push or Vercel deployment. The complete feature and
independent overall audit remain required before the final release gate.
