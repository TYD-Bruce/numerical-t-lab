# AI Tutor Connections v1 — Chunk 3A2 evidence

Date: 2026-09-25
Status: **Locally verified; independent re-audit PASS, initial P2 closed**
Baseline: clean local `main`, `43f6701dd234638aa88c4c8b90e01207fedc4536`
Scope: opt-in grounded ODE personal chat HTTP boundary.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md).

## Implemented behavior

The explicitly enabled local API now exposes exact `POST /api/personal/chat`.
The request requires the existing same-origin session proof, current connection
generation and an activated, previously tested connection. Its closed envelope
contains ODE profile, request ID, generation, user/assistant messages and context.
It cannot supply a destination, model, key, system prompt or provider tools.
Bootstrap advertises only the implemented ODE chat profile. The default local
server and hosted Vercel adapter do not expose personal operations.

`ai/tutorContextValidation.ts` owns closed, bounded, finite ODE wire validation.
It admits problem/method/result and eligible-shaped Convergence evidence, without
executing expressions, rerunning solvers or recalculating evidence. The existing
20-preview/80-full-point projection constants now live in the shared contract
and are consumed by both projection and validation. All supplied evidence is
serialized intact; unknown fields and malformed values fail before provider access.
The last implicit algebraic residual remains signed. Numerical authority and
freshness stay with the Lab; JSON validation cannot attest either property.

`ai/personalTutorChat.ts` constructs the personal prompt from the existing ODE
system-prompt constant and a captured conversation. It attaches the full validated
context to the latest user question. It does not call the legacy environment-key
or mock path. Configuration body receipt remains 16 KiB; personal chat has a
64 KiB receipt cap. The entire normalized prompt, including system instructions,
is capped at 32 KiB and 40 messages using the existing adapter budget. Overflow
is explicit; no automatic history trimming, numerical evidence deletion or summary.

Only an adapter's completed final answer is accepted. Plain text remains inert
presentation data if optional JSON is not recognized. A recognized JSON response
must contain nonempty message text. Optional chart instructions have a closed
field schema, finite ordered zoom endpoints and bounded primitive table data.
Malformed/unknown chart data is dropped without losing a usable explanation.
The adapter's existing reasoning-marker predicate is reused after model JSON
decoding for required text and accepted chart strings/keys. Invalid required
text fails; invalid optional charts are discarded without trimming answer segments.
No model HTML, math, code or tool becomes executable authority.

Chat owns a session request lease released in `finally`. Cancellation, connection
replacement, disconnect, expiry and HTTP caller closure invalidate late answers
and errors. Responses echo profile/generation/request ID for the upcoming browser
client. No credential or proof is returned. The original hosted `/api/chat`
contract, numerical algorithms, UI and safe rendering remain unchanged.

## Validation

The initial red run had 20 failing HTTP cases and a missing new handler module;
the disabled-server separation case already passed. The first implementation run
caught a signed-residual validation mistake using an actual Backward Euler result.
The validator was corrected to accept the producer's signed final residual and
nonnegative maximum magnitude. Cross-boundary producer tests live in the frontend
test workspace so backend typechecking does not pull browser DOM types into its
runtime scope. No compiler/library contract was relaxed.

- New coverage: **120 cases** in request/output validation, real HTTP routing and
  actual Lab-to-API compatibility tests.
- Focused: **15 files / 597 tests**, including all provider adapters, transport,
  sessions/policy/listener, legacy chat/packaging and existing ODE context tests.
- Corrected `npm.cmd run verify`: **120 files / 1,967 tests**, all workspace/API
  typechecks, import boundaries and the **118-module** frontend build pass.
- Actual ODE producers cover all eight methods, signed diagnostics, second-order
  velocity, 80/81-point sampling and a current six-level Convergence Study. The
  latter also checks that a changed study setup excludes stale evidence.
- Native loopback HTTP exercises every route boundary and pending-request
  invalidation. An actual local synthetic provider server receives read-only
  metadata followed by `/chat/completions?autoload=false`, with no environment key.
  Other provider-family/region route cases use injected transport replies;
  existing adapter tests retain native socket/DNS protocol fixtures.
- Byte tests include oversized content-length and chunked bodies, multibyte
  prompts/output, a chat larger than configuration bodies, and full-prompt overflow
  including server instructions. Rejection does not occupy a request slot.

Final full verification includes the emitted Rollup/manifest ownership checks:
Home does not acquire Lab/Tutor runtime, shared Tutor does not acquire ODE/numerics,
and Lab routes preserve deferred Tutor/math boundaries. Build raw/gzip sizes are
entry **59.37 / 18.38 kB**, deferred Tutor **9.30 / 3.65 kB**, ODE
**424.38 / 128.78 kB**, Linear Systems **75.80 / 22.63 kB**. Moving the unchanged
projection constants into the contract adds one transformed module and about
0.04 kB to the ODE chunk. Existing large math-chunk warnings remain.

Temporary evidence: `t-lab-chunk-3a2-red.log`, initial focused/typecheck correction
logs, `t-lab-chunk-3a2-corrected-focused.log`, `t-lab-chunk-3a2-corrected-verify.log`.
Test-owned servers and sessions are disposed. No browser workflow, real provider,
real model/key, dependency installation, Git remote or deployment was exercised.
The preceding chunk's browser evidence is historical and is not a new check here.

## Scope and audit gate

The first independent audit returned **NEEDS_FIXES**, with P0 0 / P1 0 / P2 1 /
P3 0. It independently confirmed the parent-supplied escaped reasoning-marker
hypothesis through the native HTTP/provider path: Unicode-escaped markers became
accepted text after JSON decoding, in both required messages and optional chart
strings. This is a final-content boundary failure, not evidence of HTML execution
or credential disclosure. The auditor also passed 586 focused and 1,956 full
tests, typechecks, boundaries, an external build, 26 first-order method/order
producer cases and 218 relative link targets. All 21 paths/hashes matched.

The bounded correction shares the original marker predicate before/after JSON
decoding. Eleven regressions failed before the fix; corrected tests cover opening/
closing markers, case, decoded whitespace, chart labels/cells/keys and preserved
ordinary math/inert text. The native HTTP fixture covers the same rejection/drop
behavior. The implementation task reran the auditor's unchanged probe: required
markers now return 502 `response_invalid`, while contaminated optional charts are
absent from otherwise successful explanations. Calls remain loopback-only without
provider Authorization. Evidence: `t-lab-chunk-3a2-correction-red.log` and
`t-lab-chunk-3a2-corrected-independent-probes.jsonl`.

Independent re-audit returned **PASS**, with P0/P1/P2/P3 all zero and the initial
P2 closed. It reran 597 focused and 1,967 full tests, API typecheck, boundaries
and the original native HTTP reproduction. An additional independent 156-case
matrix covered angle-bracket/tag-letter/mixed escapes, opening/closing/case/
whitespace variants, all accepted output string locations and ordinary controls.
All cases passed. It inspected the corrected parent full-verification log;
standalone frontend typecheck/build and browser checks were not repeated in the
re-audit. The earlier independent external build is inherited evidence.
All 21 frozen path hashes matched at both ends; the implementation task separately
rechecked those bytes, main baseline and empty index before verdict metadata.
No runtime change followed the PASS. The auditor confirmed only synthetic or
loopback provider exercise, with no real API key or actual cloud-provider call.

The original combined 3A2 scope is split at the backend/browser boundary. This
chunk does not enable personal sending in the browser or implement a consent
decision. **3A3** adds session/connection provenance, per-Lab one-use history
transfer and the guarded client. **3B** adds settings and browser workflows.
**Phase 4** integrates Linear Systems context, prompts and Tutor. All remain in
the maintainer's continuing goal. Schema validation does not grant history consent.

Self-review and the initial audit led to the signed-residual, empty-message and
decoded-marker corrections. No further in-scope defect is currently established.
No source/test/config outside the personal
boundary and unchanged ODE projection constants was modified. Runtime state stays
outside pure Lab/Tutor sessions. Numerical behavior, dependencies and production
state are unchanged. Documentation distinguishes current API support from future
browser/personal-history and Linear Systems integration.

Next gate: local commit `Add validated personal Tutor chat` of the independently
passed chunk. Pre-commit follow-up is limited to this verdict/next-gate metadata.
Do not begin 3A3 until that commit gate. Do not push or update Vercel before the
complete feature and independent overall audit pass.
