# AI Tutor Connections v1 — Chunk 5A evidence

Date: 2026-09-26
Status: **Independently passed; local commit ready**
Baseline: clean local `main`, `0daf3b8106818a770645c7a83a3cc8b9dcd15899`
Scope: bounded local connection recovery corrections found during Phase 5 browser acceptance.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md#current-chunk-5a-checkpoint).

## Reproduction and correction

With the actual local API stopped and the frontend proxy still running, Enable
personal connections receives an empty HTTP 500. The client attempted strict JSON
parsing first, so the UI described this as an incompatible response. It correctly
withheld key entry but gave the wrong recovery guidance.

The personal request owner in `tutorConnection.ts` now maps a non-JSON failed HTTP
response through the existing `readFailure` status policy. HTTP 413 still means
input too large; an unstructured service failure means unavailable. It never
displays the body or treats the response as success. Valid structured errors
keep their explicit codes and existing activity/identity handling.

Strict success parsing, bounded response reading, cancellation, timeouts,
redirect rejection and stale-response checks remain in place. The catch applies
only to `response_invalid` on non-success HTTP status; oversized and cancelled
reads keep their original errors. No retry, fallback, provider, backend, session,
numerical, safe-rendering, dependency or import ownership change was made.

The recovery walkthrough also reproduced focus loss when successful enablement
hid its button. The active element became the page body, so Escape did not reach
the existing Tutor key handler. The settings operation owner now falls back to
the available Provider control if its original focus target is no longer usable.
It reveals that control within settings, keeps newer user focus and retains the
existing operation/disposal guards. No second modal or document key handler was added.

## Verification

Seven cases were added to the existing client suite. Five reproduced the defect
before implementation. They cover empty HTTP 500, HTML HTTP 502, invalid UTF-8
HTTP 503, plain HTTP 413, malformed HTTP 200, oversized HTTP 500, and failed
personal chat preserving its exact selection/history with one attempt and no
provider call. The malformed-success and oversized-response controls passed
before and after the fix. Four additional focus cases cover successful enablement,
failed handshake, newer focus and disposal. The success case failed before its
correction. jsdom tests exercise the recovery rules; native Chrome verifies actual
focus, visibility and Escape. No test was skipped or weakened.

- Focused verification: **5 files / 153 tests**.
- `npm.cmd run verify`: **130 files / 2,211 tests**, frontend/numerics/contracts
  and API typechecks, import boundaries, **124-module** production build.
- Rollup graph/static closure checks preserve Home, independent Linear routing,
  first-open settings/Tutor and no ODE runtime in the shared Tutor closure.
  In-memory graph raw/gzip bytes: entry **60,209 / 18,628**, Linear **82,105 / 24,714**,
  Tutor **43,020 / 13,916**. Existing deferred math size warnings remain.
- `git diff --check` passes. External logs: `t-lab-phase-5-proxy-red.log`,
  `t-lab-phase-5a-focus-red.log`, `t-lab-phase-5a-focused-final.log`,
  `t-lab-phase-5a-final-verify.log`.

## Browser evidence

Native Windows Chrome uses isolated sessions, owned loopback listeners and a
proxy with no external forwarding. Both Vite build/server runs disable environment
files. Default inference is actual mock mode; global provider fetch is prohibited,
and personal transport permits only the exact owned local fixture. Synthetic
keys are never real credentials. No cloud or existing local model was called.

The corrected production build was checked at 1440 x 1000 Light and 390 x 844
Dark. Stopping the real fixture API now displays the controlled unavailable-service
message. No key field appears. Restarting that API and explicitly enabling again
restores configuration with an empty key and visible focus on Provider. The mobile
frame has one named modal, inert background and no horizontal overflow; an immediate
Escape now releases the modal/inert state and focuses the Tutor launcher.
Inspected resources are same-origin, page error/CSP arrays are empty. The corrected
browser run made **zero model requests and zero prohibited global fetch attempts**.
Native dev Home also loaded with real content and no error overlay.

Initial Phase 5 browser checks on the unchanged 4B baseline additionally established:

- A cold local Home/Linear route loads interface fonts, readonly math, settings,
  editable matrix data, successful Solve and a complete synthetic local reply.
- Two same-origin tabs begin independently. The second has default selection,
  empty configuration and no key field before its own handshake. Both use different
  selected models; disconnecting the first preserves the second's working chat.
- A malformed model response makes exactly one request, preserves previous replies
  and shows a bounded compatibility error without upstream text.
- Three long synthetic replies remain visible. The fourth question exceeds the
  complete prompt budget; the model request counter stays unchanged and a shorter-
  conversation error is shown. No numerical evidence is silently removed.
- Advancing only the owned server's clock beyond idle lifetime, then exercising
  authentication, expires its real sessions. UI removes credential entry, preserves
  history and disables Send. This is a controlled-clock browser/server check, not
  a claim that 30 wall-clock minutes elapsed or a substitute for timer unit tests.
- Actual backend stop/restart loses sessions and requires fresh explicit enablement.

Artifacts are preserved under `t-lab-phase-5-browser` in task temporary storage:
baseline/corrected harnesses, manifests, request counts, observation JSON and
screenshots. The initial failed Escape observation is retained as the focus-defect
reproduction; final `focus-mobile-escape.json` records zero dialogs/inert elements.
A desktop offscreen-click attempt was inconclusive; the final explicit keyboard
check is `focus-backend-desktop-verified.json` and its recovery companion.
The second tab needed its observation listeners installed explicitly;
earlier assertions use its DOM, screenshots, resource timeline and browser error
buffer, not an invented init-script history. Some offscreen controls required
native focus/Enter; a selector lookup and command-line quoting error were corrected
before drawing conclusions. Browser background traffic was denied separately from
application resource observations.

## Gate and remaining work

Independent Astra Extra High audit returned **PASS — P0/P1/P2/P3 all zero** on
the complete 12-file frozen diff. It independently passed 153 focused tests,
frontend/numerics/contracts typechecks and import boundaries; six extra client
probes checked redirect, structured-error, stream-error and cancellation precedence.
Native Chrome desktop/mobile failure/recovery and immediate Escape passed with
zero model requests, zero prohibited fetch attempts and no observed page/CSP errors.
The auditor inspected the full parent verification log and graph/output rather
than claiming another full-suite or build run. It checked 253 local file links
and exact baseline/path/hash/index identity at start and end.

The parent independently inspected the report, probe source/results and browser
observations, then confirmed all 12 hashes before verdict-only documentation
updates. Runtime and tests did not change after the pass. The external report is
`numerical-t-lab-audit-01a0d978/chunk-5a-audit.md` in task temporary storage.

Ready for the authorized local commit:
`Fix local Tutor connection recovery`.

5B still needs the complete acceptance/evidence matrix, remaining cold-cache ODE
math-editor/Tutor and both-Lab coverage, and final provider/readiness documentation.
Earlier targeted checks are not a whole-feature completion claim. Real provider
readiness remains untested, while adapter protocols have mock fixture evidence.
The separate independent overall audit must pass before the authorized final
push and Vercel update. No push or deployment occurred in this chunk.
