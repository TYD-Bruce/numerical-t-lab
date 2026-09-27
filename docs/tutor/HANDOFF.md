# AI Tutor Connections v1 — Handoff

Updated: 2026-09-26
Phase: **Production release complete**
Status: **Overall and closeout independent PASS; P0/P1/P2/P3 = 0**
Canonical status: continuing maintainer goal; audit/fix/re-audit before each commit.
Runtime impact: none; documentation only.

## Current release checkpoint

- Overall independent PASS has no unresolved P0/P1/P2/P3 finding. The approved
  correction was committed at `ea9860fb8e078c76c1d5c0d05a2ebbe8e776b8fd`.
- Public main and the private deployment main were pushed normally after live
  identity, clean-state, ancestry and dry-run checks. Private sync `3c6370a` has
  the exact public tree and its own prior private main as its sole parent.
- Vercel deployment `dpl_8E6LfZGZQ3xD79SgXrYrrouCkdZk` is READY and owns
  `https://numerical-t-lab.vercel.app/`; source private SHA is verified.
- [Release evidence](../reviews/2026-09-26-ai-tutor-connections-release.md)
  records 12 canonical HTTP checks, 21 emitted assets with correct types, matching
  JavaScript bytes, seven captured native browser states, both Lab solves/Tutor
  interfaces, hosted key exclusion and empty browser/CSP/runtime-error observations.
- No valid hosted inference, real key, private configuration read or real model
  access occurred. Personal local operation and provider contracts retain the
  accepted local/mock evidence and live-untested limitation.
- The owned release browser is closed. Runtime and configuration are unchanged
  after overall audit; this final diff is documentation only.

Independent closeout re-audit passed after two documentation provenance fixes;
the parent inspected the final report and rechecked all eight frozen hashes.
The authorized final documentation commit is
`Record AI Tutor production release verification`, pushed to public main without
a repeated application deployment. No implementation/release gate remains.
Future live-model checks need a separate bounded instruction. Earlier checkpoints
below retain point-in-time evidence and gates.

<a id="current-overall-audit-checkpoint"></a>

## Previous overall audit checkpoint — committed at `ea9860f`

The following records the historical pre-release gate, now satisfied.

- Clean starting main: `641b2861a1d991f3d180638178b56d3676c5c559`, the 5B commit.
  The overall review covers 14 commits and 125 paths after `5bfcf734`.
- Initial independent Astra Extra High verdict: NEEDS_FIXES, P0/P1/P2 = 0,
  P3 = 2; final verdict after corrections: PASS, P0/P1/P2/P3 = 0. No runtime
  defect found. The full feature was reviewed across ownership seams.
- `OVERALL-P3-01`: restore the stable historical 3B checkpoint anchor below.
  `OVERALL-P3-02`: make the INDEX handoff description durable and accurate.
  Both are independently CLOSED. Re-audit found `OVERALL-P3-03`: two dedicated
  current-gate paragraphs still described the pre-5B-commit state. They now point
  to this current checkpoint and the overall review. Independent final re-audit
  CLOSED P3-03, verified all seven hashes plus 119 unchanged paths, and passed
  355 links / 13 fragments. The parent read the report and rechecked the hashes.
- Fresh independent evidence: 16 files / 677 tests, nine composed cross-layer
  scenarios and an isolated emitted hosted API package, all passing. Only owned
  synthetic loopback fixtures were used; zero external/model-provider calls.
  All fixtures are closed. The parent inspected probe source/results and hashes.
- Full 130-file / 2,211-test verify and native desktop/mobile acceptance remain
  valid inherited evidence on unchanged runtime. New request limits/cancellation
  apply to personal connections and default Linear; the approved legacy default
  ODE provider path retains its existing behavior.
- [Overall review](../reviews/2026-09-26-ai-tutor-connections-overall-review.md)
  records the findings, evidence continuity, limitations and release gate.

Next: create the independently passed local commit
`Record AI Tutor overall audit and close documentation findings`. After that,
verify remotes and the actual demo target before the authorized push/Vercel
update. Deployed verification is still required. No real keys/model calls,
private configuration reads, dependency installs or numerical changes.

<a id="current-chunk-5b-checkpoint"></a>

## Previous chunk 5B checkpoint — committed at `641b286`

The following records the historical pre-commit gate, now satisfied.

- Starting clean main: `72937725379a44c1c00d74ac8f57eb4c331f89f1`, the independently
  passed 5A recovery commit. All feature commits remain local.
- The [acceptance matrix](../reviews/2026-09-26-ai-tutor-connections-chunk-5b.md)
  maps every Phase 5 requirement to fresh or explicitly inherited evidence.
- Fresh cold Home → ODE → Linear checks cover bundled fonts, real MathLive editing,
  successful Run/Solve, local replies, stale Linear cancellation, restored inputs,
  successful Solve reset, mobile Dark and distinct transcripts on route return.
- ODE intentionally keeps previous-success context after draft edits/failed Run;
  Linear requires matching current inputs. The user guide and architecture now
  make that accepted difference explicit. No eligibility or numerical change.
- Native provider/region selection shows fixed destinations; Kimi begins without
  a region and clears a synthetic unsaved key on change. Those form choices make
  no inference request and do not change the active local connection.
- Final owned fixture: 8 local synthetic inference requests, 3 closed held
  requests, zero prohibited global fetch attempts. No real key/model, private
  configuration or external provider access. Browser error/CSP observations are
  empty; resources are same-origin. Only theme persists in browser storage.
- Fresh 124-module build and in-memory lazy graph pass. Runtime/tests/config are
  unchanged from 5A full verify: 130 files / 2,211 tests, all typechecks/boundaries.
  That suite is inherited rather than needlessly repeated for docs-only changes.
- [Windows guide](LOCAL_CONNECTIONS.md) covers setup, data destinations, per-Lab
  history, session lifetime and recovery. Every provider's live status is untested.
  `.env.example` documents existing flags; AGENTS removes an obsolete milestone
  gate in favor of PLAN. No runtime, dependency or deployment configuration edit.
- Evidence is in task temporary storage, `t-lab-chunk-5b-browser`. Its owned
  Chrome session and all six fixture listeners are stopped. Earlier automation
  attempts are retained as inconclusive; the review names authoritative artifacts.
- Independent Astra Extra High 5B audit passed with P0/P1/P2/P3 all zero. It
  checked guide/config/destination rules with pure probes, all 296 links and
  saved graph/browser evidence. All 12 hashes and the empty index matched at
  start/end. The parent inspected its report and probe results and rechecked the
  exact snapshot before recording this verdict. No substantive change followed.

Authorized local commit: `Verify AI Tutor connections and both Labs`.
Next after that commit: request the separate
independent overall audit of the full accumulated feature. Only its pass permits
the final push/Vercel update and deployed verification. No per-chunk push or live
provider call is authorized by this acceptance work.

<a id="current-chunk-5a-checkpoint"></a>

## Previous chunk 5A checkpoint — committed at `7293772`

The following records the historical pre-commit gate, now satisfied.

- Starting clean main: `0daf3b8106818a770645c7a83a3cc8b9dcd15899`, the independently
  passed 4B commit. All feature commits remain local.
- An actual stopped local API produced an empty proxy HTTP 500. Settings described
  it as incompatible response format. The personal request owner now uses the
  existing safe status mapping only when a failed HTTP body is invalid JSON.
- Valid structured failures keep their codes. Malformed success, oversized reads,
  redirects, cancellation, stale identity, no retry/fallback and history rules
  retain their existing guards.
- Native mobile checks also exposed focus loss when successful enablement hid its
  button. The existing settings owner now focuses Provider when that control is
  lost; newer user focus and disposed/stale view guards are preserved. Escape
  then closes the modal, releases inert state and returns focus to the launcher.
- Eleven tests added; six failed before their fixes. Focused verification passes
  5 files / 153 tests. Full verify passes 130 files / 2,211 tests, all typechecks,
  import boundaries and the 124-module production build.
- Corrected production browser evidence: stopped-backend error and explicit
  recovery at 1440 x 1000 Light and 390 x 844 Dark, no pre-handshake key input,
  same-origin resources, no page errors/CSP violations and one mobile modal.
- Before the correction, additional browser acceptance verified two same-origin
  tab connections, disconnect isolation, malformed model output, 32-KiB prompt
  rejection without another model call, and controlled server-clock expiry.
  Expiry removed key entry, preserved history and disabled Send; restarting the
  backend required fresh explicit enablement and configuration.
- This is a scoped correction, not final Phase 5 acceptance. Complete the remaining
  cold-cache ODE/editor/Tutor/both-Lab matrix and provider evidence summary in 5B.
- Evidence: [5A review](../reviews/2026-09-26-ai-tutor-connections-chunk-5a.md).
- Independent Astra Extra High audit: PASS, P0/P1/P2/P3 all zero. Independent checks
  passed 153 focused tests, typechecks, boundaries, six additional client probes
  and native desktop/mobile failure/recovery/Escape scenarios. All 12 audited
  hashes matched before/after and in the parent's final check. The parent inspected
  the report, probe source/results and browser observations before recording this
  verdict; no runtime or test change followed the pass.

Next: local commit
`Fix local Tutor connection recovery`. Then finish 5B and the separate
overall audit before the authorized final push and Vercel update. No real keys,
external model calls, model management, dependency installation or per-chunk push.

<a id="current-chunk-4b-checkpoint"></a>

## Previous chunk 4B checkpoint — committed at `0daf3b8`

The following is the historical pre-commit record; that gate is now satisfied.

- Starting clean main: `ab2a82befc9488dccc8728e70cedca6bf4fb3bce`, the independently
  passed 4A commit. Every preceding feature commit remains local.
- `linearSystemsTutorBinding.ts` lazily projects current successful evidence,
  caches immutable context and publishes revisions. The Lab/route expose it to
  the existing Host; no platform domain interpretation or eager Tutor runtime.
- Draft edits invalidate pending work. Successful Solve clears only this Lab's
  conversation; failed Solve, close and navigation preserve it. New experiment
  offers an explicit clear-history checkbox, checked by default. Retention uses
  the existing Store divider and meaningful-work contract.
- Default `/api/chat` accepts a closed Linear profile/history/context envelope,
  validates it before mock/provider access, and invokes the actual Linear demo
  or one fixed OpenAI Responses request with a 90-second deadline, byte bounds,
  caller cancellation, strict final extraction and public errors. No browser
  provider/key/model authority and no Linear chart action.
- Shared prompt/validation/final-text/error helpers have relative emitted runtime
  imports. The isolated recursive function-package test loads the full hosted
  graph and executes validation/demo without workspace aliases or local session,
  policy or native personal transport modules. Legacy ODE behavior is preserved.
- Full `verify` passes **130 files / 2,200 tests**, typechecks, boundaries and the
  **124-module** build. New source-shape updates permit only the authorized Lab
  binding and require the new transport AbortSignal; no tests were suppressed.
- Rollup graph inspection preserves Home, independent Lab routes and first-open
  Tutor. Native Chrome evidence covers 1440 x 1000 and 390 x 844: actual default
  demos, synthetic local models, fresh/transfer choices, connection provenance
  across Labs, cancellation, Home/Resume, reset retention/clear and local assets.
  All page resources were same-origin, storage empty, no page errors/CSP violations.
- Browser background Google connection attempts were blocked by the fixture proxy;
  these are not page resources or provider calls. The fixture disallows cloud
  leases and all global fetch, uses mock default chat, and reads no environment
  files. External evidence is under `t-lab-chunk-4b-browser` in task temporary storage.
- Evidence: [4B review](../reviews/2026-09-25-ai-tutor-connections-chunk-4b.md).
- Independent Astra Extra High audit: **PASS**, no open P0–P3 findings. It reran
  367 focused tests, typechecks, boundaries, the build graph, four actual HTTP
  cancellation cases and both-Lab browser scenarios. All 41 frozen hashes and
  the exact path set matched at audit start/end and the parent's final check.

Next: local commit `Integrate Linear Systems AI Tutor`, then Phase 5 documentation/full
acceptance and the independent overall audit. No per-chunk push, deployment,
real credentials, external model calls, model management or dependency install.

<a id="current-chunk-4a-checkpoint"></a>

## Previous chunk 4A checkpoint — committed at `ab2a82b`

The following is the historical pre-commit record; that gate is now satisfied.

- Starting clean main: `37df723d0f6ca16429c2e6c73036688185400e76`, the independently
  passed 3B commit. All preceding feature commits remain local.
- Phase 4 is split at its grounding/API and UI/lifecycle boundaries. 4A adds
  `linearSystemsTutorContext.ts`, the closed Linear DTO/validator, server prompt,
  pure demo generator and personal profile. 4B connects the Lab binding, default
  service/demo dispatch, reset and route lifecycle, then verifies both Lab UIs.
- Context requires a current complete success with matching fingerprints. It
  reuses frozen original A/b, xHat, P/L/U, pivots, permutation and diagnostics.
  Only an exact matching preset supplies the qualified reference comparison.
- The trace retains every stored step kind/order and selected fields, capped at
  50 records for dimensions 2–6. Explicit omissions cover repeated matrices,
  pivot candidates and detailed terms/contributions; no numerical replay.
- The local API advertises `linear_algebra` alongside `ode`. Both server and
  browser remove Linear chart instructions. Context validation precedes leases
  and provider access; existing connection, consent and request guards apply.
- The default `/api/chat` and `tutorClient.ts` remain ODE-only in this chunk.
  The demo generator is tested but unwired; no Linear launcher/interface yet.
- Evidence: [4A review](../reviews/2026-09-25-ai-tutor-connections-chunk-4a.md).
- Full verify passes 126 files / 2,154 tests, all typechecks, boundaries and
  the 122-module build. Rollup graph checks preserve Home and Tutor isolation.

Initial independent audit found no runtime issue and one P3 documentation
inconsistency: the backend architecture section still described the personal
endpoint as ODE-only. That section now names both profiles, limits chart
acceptance to ODE and identifies exactly the remaining 4B work. Runtime/test
hashes remain unchanged. Bounded re-audit returned PASS and closed the P3 finding,
with P0/P1/P2/P3 all zero. Independent verification includes 339 focused tests,
all typechecks and 32 additional actual-producer probes. The parent checked
the report, probe source and all 24 frozen paths/hashes before verdict-only
documentation updates. No runtime change followed the audit.

Next: create the passed local commit
`Add Linear Systems Tutor grounding and personal profile`. Do not begin 4B before
that gate. No real API keys, cloud/model calls, model management, installs,
Git remote contact, push or deployment. The overall audit remains required.

<a id="current-chunk-3b-checkpoint"></a>

## Previous chunk 3B checkpoint — committed at `37df723`

The following records the historical pre-commit gate, now satisfied.

- Starting clean main: `322e7786fba7cfd4ecf2ee44027bd9004ba55e24`, the independently
  passed 3A3 commit. All preceding commits remain local.
- `tutorConnectionSettings.ts` owns the inline settings form inside the existing
  Tutor frame. No key field exists before a compatible local handshake. Keys
  clear synchronously on Save, destination changes, expiry and disposal.
- Explicit Save/Discover/Test/Use actions disclose their destinations and data.
  All six provider families are available; Kimi starts without a region choice.
  Listed models do not imply readiness, unloaded models cannot be selected from
  the catalog, and Test does not attest mathematical accuracy.
- `/api/personal/model` only changes the exact staged candidate's model. It
  preserves its backend credential, creates a new untested candidate identity,
  cancels old candidate work and leaves the active connection unchanged. It
  cannot accept a provider, endpoint or credential, and makes no provider call.
- The Host constructs one runtime through the first-open lazy module and retains
  it across close/navigation. The panel routes personal messages through the
  guarded client while retaining its existing Lab/context/transcript checks.
  Configuring before a solve is allowed; sending still needs eligible Lab context.
- Start fresh is focused by default; transfer/cancel remain explicit. Failed
  replacement tests preserve the active selection/history. Disconnect keeps the
  transcript but disables personal Send. Default service requires its own choice.
- Browser review corrected hidden history choices and focus lost after cancelling
  chat. Settings reveal progress/review/errors within their own scroll container;
  request cancellation restores the composer. Session expiry removes key entry.
- Full verify: 124 files / 2,091 tests, typechecks, boundaries and 122-module build.
  Production Home loads only its entry script; the 42.33 kB / 13.73 kB gzip Tutor
  chunk stays deferred and has no ODE runtime import. Native Chrome 1440 x 1000
  and 390 x 844 workflows use only an owned loopback fixture and synthetic input.
- Evidence, harness caveats and remaining limits are in the
  [3B review](../reviews/2026-09-25-ai-tutor-connections-chunk-3b.md).

`Audit AI Tutor connections` (GPT-6 Astra, Extra High) returned PASS with all
severities zero. Independent execution passed 167 focused tests, typechecks,
boundaries, an in-memory graph build and real-browser local connection/model,
both history-transfer directions, mobile focus, cancellation and Home/Resume.
The full parent verification log was inspected, not rerun in full. All 23 frozen
paths/hashes and the main baseline/index matched before/after; the implementation
task independently checked them before recording the verdict. Audit recovery
after a transport interruption preserved completed evidence and introduced no
repository edits. No runtime change followed the pass.

Next: commit `Add local AI connection settings to Tutor` locally.
No phase 4, push or deployment before its required gate. No real API keys or
external provider calls; Linear Systems Tutor remains the next chunk.

## Previous chunk 3A3 checkpoint — committed at `322e778`

The following records the historical pre-commit gate, now satisfied.

- Starting clean main: `8ada41b678a79f9323c642ebf29e9385af3d8218`, the independently
  passed 3A2 commit. Every preceding chunk remains local.
- `tutorConnection.ts` owns tab-local proof, configuration/test/activation,
  requests, explicit destination changes, cancellation and expiry. It is not yet
  instantiated by production Host/panel. No import-time networking or persistence.
- Pure sessions preserve nonsecret destination provenance. A runtime review is
  single-use and bound to Lab, revision, source/target identity and candidate ID.
  Default fresh, explicit transfer and cancel are exercised across both Store
  Labs. Other-Lab transcript reuse remains blocked until its own decision.
- Candidate cancel discards staged credentials. Failed verification preserves the
  active selection. Uncertain activation fails closed without hosted fallback;
  history edited during the request remains intact and needs another decision.
- The personal sender rebuilds the envelope from current Lab context/conversation
  and guards fetch/body/response/notification boundaries. A 3B caller must prepare
  provenance before appending a question and retain the panel's acceptance guards.
- Browser reply decoding is bounded and projects only public fields. Session
  snapshots advertise the existing idle timeout; timers never extend absolute
  expiry. Catalog/final-text constants and error codes are shared wire data.
- Focused: 18 files / 498 tests. Full verify: 123 files / 2,068 tests, all
  typechecks, boundaries, 118-module build. Native HTTP reaches only an owned
  loopback synthetic model without Authorization. No new browser workflow claim.
- See [3A3 evidence](../reviews/2026-09-25-ai-tutor-connections-chunk-3a3.md) for
  regression corrections, limits, source owners and temporary logs.

Initial Astra Extra High audit returned NEEDS_FIXES, P0 0 / P1 0 / P2 3 / P3 0.
It independently reproduced:

1. `send()` rechecks successful results after completion notifications but skips
   that final guard on rejection. Reentrant clear/context/navigation/abort/dispose
   still returns an obsolete provider error.
2. The browser does not renew idle accounting for accepted provider failures,
   so it can expire and close a live backend session at the old deadline.
   The independent real-HTTP proof checks backend `authorize()` without refresh.
   Include accepted test/discovery failure and cancellation paths in the repair;
   use authoritative accepted activity, never blind renewal, polling or retry.
3. Optional chart decoding checks only its type. Reject malformed/unknown fields
   with the approved finite/ordered/bounded schema, preserving clean message text.

All 20 frozen hashes, paths, main baseline and empty index matched at both audit
ends, and the implementation task independently rechecked them. Corrections now
cover both send outcomes after subscribers, authoritative activity on accepted
failures/cancellation, and closed optional-chart fields. The backend's new activity
observation authenticates without renewal and returns only session ID, generation
and idle deadline. A bounded cancellation acknowledgement cannot revive an expired
session or extend its absolute lifetime. No retry/polling was introduced.

Seventeen regression cases failed before the repair; corrected coverage adds 36
cases overall. The original independent native HTTP probes now pass their required
outcomes: stale failures cancel, malformed charts disappear, and a controlled
provider failure leaves the live session available with no close request.
Independent Astra Extra High re-audit returned PASS, with P0/P1/P2/P3 all zero.
It passed 19 files / 588 focused tests, all typechecks, boundaries, original HTTP
probes and additional activity/chart boundaries. All 25 corrected file hashes
matched before and after audit, and the implementation task independently checked
them before recording this verdict. The auditor is idle; all original and re-audit
evidence is preserved. No runtime change followed the pass.

Next: commit `Add Tutor connection provenance and guarded client` locally, then 3B.
Do not start 3B before PASS and that commit, or push/deploy before the overall audit.

## Previous chunk 3A2 checkpoint — committed at `8ada41b`

The following records the historical pre-commit gate, now satisfied.
## Current chunk 3A2 checkpoint

- Starting branch `main`, clean HEAD `43f6701dd234638aa88c4c8b90e01207fedc4536`
  (`Move Tutor context ownership into Labs`). All previous chunk commits passed
  independent review and remain local.
- Split the original 3A2 scope at its backend/browser boundary. This chunk owns
  the chat HTTP contract; 3A3 owns runtime connection/provenance, per-Lab one-use
  history-transfer decisions and the guarded browser client. Settings remain
  3B and Linear Systems context/prompt/integration remain phase 4.
- Exact opt-in `/api/personal/chat` requires origin-bound session proof, the
  active tested connection and current generation. Bootstrap advertises ODE
  chat only. The request cannot choose provider, model, key or system authority.
  The endpoint is absent on the default local server and from the hosted adapter.
- `ai/personalTutorChat.ts` validates envelope/history and captures the full
  ODE prompt before an async boundary. `ai/tutorContextValidation.ts` validates
  closed, bounded, finite data; it performs no numerical execution and cannot
  attest freshness, correctness or browser consent. The Lab still owns those
  evidence decisions. Configuration remains 16 KiB; chat receipt is 64 KiB.
  The complete normalized prompt is 32 KiB / 40 messages, with no silent loss.
- ODE projection and validation now share the unchanged 20-preview/80-full-point
  budgets. Actual-producer tests cover all eight methods, signed implicit
  residuals, second-order velocity, 80/81 points and a six-level Convergence Study.
  Initial validation incorrectly required a nonnegative final residual; the
  failing Backward Euler producer test caught this and the validator was corrected.
- Only a completed adapter answer can be normalized. Plain text remains inert;
  a recognized JSON response needs a nonempty message. Optional chart data has
  a closed schema, bounded tables and finite ordered zoom endpoints. Invalid
  chart data is dropped without rejecting otherwise usable explanatory text.
- Leases release in `finally`. Cancellation, replacement, disconnect, expiry and
  HTTP socket closure reject late answers/errors. Synthetic fixtures exercise all
  six families and both Kimi regions; a native loopback server verifies the
  readiness request followed by completion with `autoload=false`, without a key.
- Focused: **15 files / 597 tests**. Final full verification and bundle results
  are in the [3A2 review](../reviews/2026-09-25-ai-tutor-connections-chunk-3a2.md).
  Temporary evidence: `t-lab-chunk-3a2-red.log`, initial correction logs,
  `t-lab-chunk-3a2-corrected-focused.log` and `t-lab-chunk-3a2-corrected-verify.log`.
  No real provider/model/key, browser workflow, install, Git remote or deployment
  is exercised. Browser personal sending is still unavailable.

The first independent audit returned **NEEDS_FIXES**, P0 0 / P1 0 / P2 1 / P3 0.
It confirmed the parent-supplied JSON Unicode reasoning-marker counterexample
through real loopback HTTP, including optional charts, and independently passed
586 focused / 1,956 full tests, typechecks, boundaries and an external build.
All 21 frozen paths/hashes and the starting HEAD/index matched before/after audit;
the implementation task independently rechecked them before editing.

Correction: reuse the existing marker predicate for decoded required message
text and accepted chart labels, keys and cells. Reject invalid required text;
discard invalid optional charts intact. Do not strip reasoning segments. Eleven
regressions failed before the fix and pass after it, with expanded native HTTP
coverage. The unchanged auditor reproduction now returns controlled failures
for escaped message/closing markers and clean explanations without contaminated
charts. Evidence is `t-lab-chunk-3a2-correction-red.log` and
`t-lab-chunk-3a2-corrected-independent-probes.jsonl`. No external model/key was used.

Independent re-audit returned **PASS**, P0/P1/P2/P3 all zero; the original P2 is
closed. It independently passed 597 focused and 1,967 full tests, API typecheck,
boundaries, the native HTTP reproduction and an additional 156-case decoding
matrix. It inspected the corrected full verification log; standalone frontend
typecheck/build and browser evidence were not repeated by the re-auditor.
All 21 paths/hashes matched at both ends. The implementation task independently
rechecked the frozen bytes, main HEAD and empty index before verdict metadata.
No runtime change followed the pass. No real provider API key or cloud call was used.

Next gate: local commit `Add validated personal Tutor chat`.
Do not start 3A3 before that gate. Overall audit remains mandatory before push/demo update.

## Historical chunk 3A1 checkpoint

- Starting branch `main`, clean HEAD `2e6f3319739d448d0a4bb2a6359619c2126ad26c`
  (`Add DeepSeek and regional Kimi Tutor adapters`). All six earlier chunk
  commits passed independent review and remain local.
- The ODE context builder moved to `labs/ode/odeTutorContext.ts`; the binding
  now owns ready/unavailable context, copy, evidence revisions and notifications.
  It reads the current successful Run and existing Convergence eligibility,
  caches only unchanged immutable evidence and starts projection on first read.
- Shared panel/Host runtime has no ODE interpretation. The pure transcript has
  a separate revision. Abort, generation, binding, context and transcript checks
  prevent stale sends/replies/errors/chart actions/focus, including synchronous
  Store mutations. Draft/placement-only updates preserve valid replies.
- An unavailable panel retains its transcript/composer, explains why sending is
  disabled, and refreshes when eligible evidence appears. Successful Run still
  resets conversation; failed Run and navigation preserve it. Compare remains
  unavailable; stale/blocked/mismatched Convergence evidence stays excluded.
- Focused verification: **16 files / 168 tests**. Full verification and build
  details are in the [3A1 review](../reviews/2026-09-25-ai-tutor-connections-chunk-3a1.md).
  New Rollup-module ownership checks preserve real dynamic boundaries despite
  changed emitted chunk names. The panel has no static ODE/numerics dependency.
- Native Windows browser fixtures, with external proxy forwarding disabled,
  cover 1440 x 1000 and 390 x 844, ready/unavailable transitions, synthetic chat,
  failed/successful Run, clearing a pending request, Compare, in-app Home/Resume,
  mobile focus trap/Escape, theme and containment. No live provider or key was used.
- Temporary evidence: `t-lab-chunk-3a1-final-focused.log`,
  `t-lab-chunk-3a1-final-verify.log`, red-test logs and
  `t-lab-chunk-3a1-browser/`. No app dependency, numerical algorithm, backend
  provider protocol, key form, personal chat route or deployment changed.

`Audit AI Tutor connections` (GPT-6 Astra, Extra High) returned **PASS**, with
P0/P1/P2/P3 all zero. Independent execution passed the 168 focused tests,
typechecks, import boundaries, emitted-graph build and diff/doc checks. The
auditor inspected full verification and browser evidence without repeating the
browser run. All 33 paths/hashes matched before and after review; the implementation
task independently confirmed those bytes, main HEAD and empty index before
recording this verdict. No runtime change followed the pass.

Committed locally as `43f6701` (`Move Tutor context ownership into Labs`).
The current checkpoint above supersedes the earlier combined 3A2 scope and gate.

## Historical chunk 2C checkpoint

- Starting branch `main`, clean HEAD `fd14abcff6a2192a95248d30a5446b89d37af1f6`
  (`Add native Anthropic and Gemini Tutor adapters`). All previous chunk commits
  remain local; 2B passed independent review with no findings.
- The backend now supports every requested provider family. DeepSeek uses
  `max_tokens`, Kimi `max_completion_tokens`; synthetic tests use 2,048 output
  tokens and internal completions 4,096. Shared compatible-chat extraction keeps
  final text only, rejects error envelopes, refusal/incomplete/tool-only replies,
  and maps DeepSeek resource exhaustion/interruption to controlled errors.
- Kimi international and mainland keep separate fixed hosts and credentials.
  No redirect, retry, region/provider/environment-key fallback, optional tools,
  thinking controls or model-management operation was added.
- Official Kimi guidance requires historical reasoning for `kimi-k3`,
  `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`. Those exact IDs are reported
  unavailable and fail testing/completion before inference. This final-text-only
  version does not support preserved thinking. Other IDs remain candidates,
  with no all-model or multi-turn compatibility guarantee from a greeting test.
  Future settings must explain the limitation and surface `model_unsupported`.
- New fixture coverage: **103 cases**. Focused: **11 files / 437 tests**. Full
  `npm.cmd run verify`: **116 files / 1,827 tests**, all typechecks, boundaries
  and the unchanged 116-module frontend build pass. Entry JS 59.11 / 18.31 kB
  gzip; deferred Tutor 12.14 / 4.61 kB. The initial red run had 104 failures
  (103 new adapter cases and one updated capability expectation), then passed.
- Evidence logs: `t-lab-chunk-2c-red.log`, `t-lab-chunk-2c-adapters.log`,
  `t-lab-chunk-2c-focused.log`, `t-lab-chunk-2c-api-typecheck.log`,
  `t-lab-chunk-2c-verify.log` in OS temporary storage. The
  [2C review](../reviews/2026-09-25-ai-tutor-connections-chunk-2c.md) records
  protocol sources, exact fixture boundaries, exclusions and the audit gate.
- No real provider/model/credential was used. New protocol fixtures inject
  replies or mock DNS/native HTTPS sockets. Existing HTTP fixtures exercise the
  listener/session boundary. No new browser or deployment evidence is claimed.

`Audit AI Tutor connections` (GPT-6 Astra, Extra High) returned **PASS**, with
P0/P1/P2/P3 all zero. Independent checks passed 437 focused tests, API typecheck,
boundaries and diff/doc checks. All 15 paths/hashes matched before/after audit;
the implementation task independently verified the frozen bytes, main HEAD and
empty index before recording the verdict. No runtime change followed that pass.

Committed locally as `2e6f331` (`Add DeepSeek and regional Kimi Tutor adapters`).
Personal chat and settings remain unavailable until their integration chunks.
The final overall audit remains mandatory before push and Vercel demo update.

## Historical chunk 2B checkpoint

- Starting branch `main`, clean HEAD `74a07735c84a2b24088f5a6b75cfddcfb2e08c9a`
  (`Add local and OpenAI Tutor adapters`). Chunk 2A passed independent re-audit
  after its empty-tool-list correction and is committed locally.
- `providerAdapters.ts` now supports native Anthropic Messages and Gemini
  generateContent through the existing native transport. Anthropic uses separate
  system instructions and user/assistant history; Gemini uses native content
  parts and user/model roles. Synthetic test budgets are 2,048 output tokens;
  internal completion remains 4,096. No tools, optional reasoning configuration,
  beta API or automatic retry is enabled.
- Native output extraction keeps final text only. Anthropic handles both refusal
  signals, including `stop_details`; Gemini excludes `thought` content and
  signatures. Incomplete/refused/empty/malformed/tool-only/reasoning-only replies
  fail with fixed public errors. Native text fragments concatenate without
  inserting characters into optional JSON text.
- Native model discovery makes one request capped at 256 models, using the
  same policy-owned limit as response validation. The common response is now
  `{ models, hasMore }`. Raw cursors are neither exposed nor followed; exact-ID
  entry remains the fallback when the list is partial. Gemini native names are
  preserved, and explicitly unsupported generation methods mark a model
  unavailable. Empty protobuf lists are accepted; error objects are rejected.
- Bootstrap advertises local/OpenAI/Anthropic/Gemini. DeepSeek/Kimi remain 2C;
  personal chat HTTP, settings, history consent and both-Lab integration remain
  later chunks. Existing local readiness/autoload, credential/session lifecycle,
  legacy hosted chat, numerical behavior and dependency versions are unchanged.
- New native fixtures: **71 cases**. Focused: **10 files / 334 tests**. Full
  `npm.cmd run verify`: **115 files / 1,724 tests**, typechecks, boundaries and
  116-module frontend build pass. Entry JS 59.11 / 18.31 kB gzip; Tutor 12.14 /
  4.61 kB, unchanged. Fixtures use injected replies or simulated HTTPS sockets;
  no real provider, key or model was used. No new browser/deployment claim.
- Temporary evidence: `t-lab-chunk-2b-native-red.log`,
  `t-lab-chunk-2b-discovery-error-red.log`, `t-lab-chunk-2b-focused.log`,
  `t-lab-chunk-2b-final-verify.log`. The [2B review](../reviews/2026-09-25-ai-tutor-connections-chunk-2b.md)
  records primary sources, exact tests and limits.

`Audit AI Tutor connections` (GPT-6 Astra, Extra High) returned **PASS**, with
P0/P1/P2/P3 all zero. Independent checks passed 334 focused tests, API typecheck,
boundaries and diff checks. All 16 paths/hashes matched before and after audit;
the implementation task independently verified them before recording verdict
metadata. No subsequent runtime changes.

Committed locally as `fd14abc` (`Add native Anthropic and Gemini Tutor adapters`).
The complete feature and overall audit
remain required before push and Vercel demo update.

## Historical chunk 2A checkpoint

- Starting branch `main`, clean HEAD `f36cfc111aa3a44f57335babb6d39ad75909afa2`
  (`Bundle offline Tutor assets and enforce browser policy`). Chunk 1C passed
  independent full and scoped follow-up audits before this local commit.
- `backend/src/ai/providers/providerAdapters.ts` owns local Chat Completions
  and OpenAI Responses payloads, read-only discovery, synthetic testing and
  final-answer extraction. The session bootstrap reports only `local`/`openai`
  as supported. Other provider families remain chunks 2B/2C.
- Exact local `/api/personal/discover` and `/api/personal/test` POSTs accept only
  candidate ID, generation and request ID, with existing origin/proof checks.
  Stage sends no provider request. Test uses a fixed greeting prompt with no
  caller history/context; only successful current tests permit activation.
  Reconfiguration, caller closure, explicit cancellation and expiry invalidate
  pending work. Failure leaves the previous active connection usable.
- Local inference reads `/v1/models` first. Explicit unloaded/loading/sleeping
  or unavailable states prevent inference; the policy-owned completion URL
  retains `autoload=false` through the native transport. An unsupported listing
  (404/405/501 only) permits an exact manual ID with unknown readiness. Listing
  without state does not attest loaded weights. T-Lab cannot atomically control
  a separately administered server's lifecycle or guarantee its compliance.
- OpenAI uses Responses, `store:false`, complete responses and explicit
  final-answer phase for assistant history. Both adapters reject incomplete,
  empty, refused or malformed answers; reasoning/tool fields are not rendered.
  Recognized inline think tags fail safely. Existing safe Tutor normalization
  remains a later handler consumer, not a new arbitrary renderer.
- Adapter limits: 256 model candidates, 40 messages, 32 KiB input/output text;
  test output budgets 1,024 local / 2,048 OpenAI, internal chat budget 4,096.
  These are byte/output ceilings, not a tokenizer or model context guarantee.
- `completeWithProvider` is a tested backend-only port. Personal chat HTTP,
  profile/context validation, transfer consent, settings UI and Linear Systems
  binding remain separate integration chunks. Legacy `/api/chat` is unchanged.
- Focused validation: **9 files / 263 tests**. Full `npm.cmd run verify`:
  **114 files / 1,653 tests**, all typechecks, import boundaries and build pass.
  The frontend still builds 116 modules with unchanged entry/Tutor chunk sizes.
  Native HTTP fixtures and simulated HTTPS sockets cover privacy, auth, exact
  paths, stale/cancelled work, model-unload races and no retry on timeout/429/5xx.
  No real provider/model calls or new browser checks were performed.
- Temporary evidence: `t-lab-chunk-2a-fixed-focused.log`, `t-lab-chunk-2a-fixed-verify.log`,
  and the adapter/HTTP/phase red-test logs in the OS temporary directory. See
  [the chunk 2A review](../reviews/2026-09-25-ai-tutor-connections-chunk-2a.md)
  for exact evidence and source references.

The first independent audit found one P2: normal complete local responses with
`tool_calls: []` could not pass testing/activation. All original 21 hashes were
independently verified unchanged before repair. The corrected shape check allows
omitted/null/empty arrays and rejects nonempty arrays or malformed present values.
Eight added adapter regressions and actual HTTP fixtures cover the correction;
the red run had eight failing cases before the fix. Full verification was repeated.

`Audit AI Tutor connections` (GPT-6 Astra, Extra High) returned **PASS** on the
corrected snapshot, with P0/P1/P2/P3 all zero. It independently passed 263 focused
tests, API typecheck, boundaries and the original HTTP reproduction. All 21
hashes matched v2 before/after audit; the implementation task independently
verified them before recording verdict metadata. No subsequent runtime edits.

Committed locally as `74a0773` (`Add local and OpenAI Tutor adapters`). The
current checkpoint above governs continuation; retain the overall audit gate.

## Historical chunk 1C checkpoint

The maintainer explicitly resumed after the safe pause. The continuing goal
retains independent audit/fix/re-audit before each local commit, then an overall
audit before push and deployment.

- Reviewed baseline: branch `main`, HEAD `b9fad94ae46c9ea89bd1d481739d8f610ba471e7`
  (`Add local Tutor credential sessions`). Chunk 1B passed independent re-audit;
  the implementation task verified all 21 hashes before recording verdict metadata
  and committing. The worktree was clean before chunk 1C started.
- Chunk 1C contains 26 reviewed files; its local commit is `f36cfc1`.
  Owners: `frontend/contentSecurityPolicy.ts`, `frontend/vite.config.ts`,
  `frontend/index.html`, `frontend/src/app/appShell.ts`, local font assets and
  licenses, `frontend/src/math/ui/readonlyMath.ts`, and focused tests.
- DM Sans normal/italic and JetBrains Mono normal variable TTFs are unmodified
  upstream files, with OFL notices under `frontend/public/licenses` and MIT
  notices for MathLive/KaTeX fonts. [Font provenance](../../frontend/src/assets/fonts/README.md)
  records pinned sources, hashes, licenses and asset costs.
- CSP is a local HTTP response header plus a production HTML meta policy.
  It hashes the existing inline theme bootstrap, permits same-origin requests
  and the exact development HMR host/port, and rejects configured header overrides.
  The styles-only inline exception supports existing Vite/MathLive/layout CSS;
  scripts have no unsafe-inline/eval allowance. Data fonts/images are permitted.
  Local HTTP headers also deny embedding; the header-only directive is absent
  from static meta CSP. Deferred MathLive uses bundled CSS fonts and disables
  implicit font-directory/sound fetching.
- Nine new regression cases failed before implementation. Focused validation:
  6 files / 80 tests. Full `npm.cmd run verify`: **112 files / 1,579 tests**, all
  typechecks, boundaries and 116-module build passed. Entry JS remains 59.11 /
  18.31 kB gzip; Tutor 12.14 / 4.61 kB. Fonts add 825,348 raw bytes (402,844 gzip).
  No dependency, numerical or provider-adapter change.
- Real Chrome checks used isolated sessions and a loopback proxy that rejects
  all external traffic, with local fixtures only. Dev Home/HMR and ODE math
  editing/solve/Tutor passed. Production Linear Systems editing/solve and ODE
  math editing, virtual keyboard, solve and synthetic Tutor reply passed.
  Desktop 1440 x 1000 and mobile 390 x 844, Light/Dark, local fonts and saved
  theme reload were observed. Normal checked flows had no CSP violations,
  cross-origin resource requests or document horizontal overflow.
- Production probes: same-origin license fetch 200; external and other-loopback-
  port fetches blocked; an unauthorized inline script did not execute. Intentional
  violations were recorded separately from normal-flow evidence. The local app
  was also rejected in an iframe after adding the header-only embedding policy.
- One automated hard navigation after a completed Linear Systems solve left
  the isolated agent-browser/Chrome target unresponsive. After resume, the same
  Windows socket error 10060 was reproduced on a separate minimal HTML page
  with only a button and native beforeunload handler, without any T-Lab code.
  This isolates the symptom outside this feature, without identifying the
  driver/Chrome internal cause. In-app Home/Resume restored Linear Systems
  output successfully. Do not claim the hard-navigation check passed.
- Evidence is in the OS temporary directory: `t-lab-chunk-1c-final-verify.log`,
  `t-lab-chunk-1c-focused.log`, `t-lab-chunk-1c-red.log`, and directory
  `t-lab-chunk-1c-browser` (screenshots, observation/probe JSON, proxy-denial log,
  fixture scripts and `beforeunload-isolation.txt`). Temporary evidence is
  local, not a production verification. The [chunk review](../reviews/2026-09-25-ai-tutor-connections-chunk-1c.md)
  records scope, evidence and limitations. Fixture processes were stopped for
  the pause; resumed browser checks used new task-owned fixtures only. All
  resumed task-owned browsers, drivers and fixture servers are now stopped.

`Audit AI Tutor connections` (GPT-6 Astra, Extra High) returned **PASS**, with
P0/P1/P2/P3 all zero. It independently passed 80 focused tests, typechecks,
boundaries, an external build and browser spot checks. It also reproduced the
hard-navigation automation timeout and retained that limitation. All 26 file
hashes matched before/after audit. The implementation task independently checked
the exact bytes before recording this verdict. Pre-commit follow-up is limited
to verdict/gate metadata and LF normalization of one license notice, without
wording or font-byte changes. Commit boundary: `Bundle offline Tutor assets and enforce browser policy`.
That gate is complete; the current checkpoint above governs continuation.

The following sections retain the agreed requirements and chunk 1A/1B evidence;
the current checkpoint above supersedes their earlier next-gate wording.

## Starting point

Initial proposal preflight found clean local `main` at
`5bfcf734b27c2a3e7b42cd2f62ca66fad6713751`.
No remote Git operation was performed. The repository's latest released-state
evidence remains [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md).

The implementation continuation rechecked the same branch/HEAD. Its only
starting changes were the five proposal documents (PLAN, INDEX, this handoff,
design and plan), explicitly included by the maintainer's follow-up. No unrelated
work was discarded. The first independent audit reviewed the uncommitted chunk.
Chunk 1A subsequently passed independent re-audit and was committed as
`2e20a3afe37a4183be9ca0e8df006d2bdf236010`. Chunk 1B started from that clean
`main` revision and is now committed at `b9fad94`. Chunk 1C followed that baseline
and is committed at `f36cfc1`.

At the proposal baseline, Tutor was an ODE-specific client of `/api/chat`; its backend used
deterministic demo replies or an environment-held OpenAI key with a fixed
`gpt-4o-mini` model. There was no personal key/model/endpoint form.
The Linear Systems Lab had no Tutor binding then.

## Agreed decisions

- Custom connections require frontend and backend on the same computer.
- Native Windows first; WSL, Docker, and LAN access are deferred.
- Connect to already running and loaded local models only.
- Support local OpenAI-compatible servers, OpenAI, native Anthropic and Gemini,
  DeepSeek, and standard Kimi/Moonshot APIs.
- Kimi international/mainland regions are explicit choices, never fallback targets.
- Cloud credentials/conversation/authorized context go directly to the selected
  provider through the local backend.
- Keys are session-only, with no browser persistence or automatic disk saving.
- Local inference mode is strictly offline, including font assets.
- Both ODE and Linear Systems receive Tutor interfaces.
- Provider/connection changes start fresh by default; transfer requires an
  explicit choice.
- Complete responses initially, with cancellation and useful status/errors.

No blocking product-choice question remains. The supplied review was checked
against source and primary documentation; useful constraints were incorporated.

## Documents to review

1. [Design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md)
2. [Repository-grounded implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md)
3. [Review verification and chunk 1A evidence](../reviews/2026-09-25-ai-tutor-connections-review-and-chunk-1a.md)
4. [Chunk 1B evidence](../reviews/2026-09-25-ai-tutor-connections-chunk-1b.md)
5. [Current chunk 1C evidence](../reviews/2026-09-25-ai-tutor-connections-chunk-1c.md)

The new scope deliberately combines provider configuration and Linear Systems
Tutor integration. It supersedes the older plan's separation of those topics
for the authorized feature sequence. Existing numerical, evidence,
lifecycle, and security responsibilities remain binding.

## Findings that drive implementation

- Chunk 1A replaces local API wildcard CORS, unspecified binding and unbounded
  body reads; Vite dev/preview/HMR and pre-proxy validation are included.
- Personal configuration must be unavailable in the Vercel adapter, not merely
  hidden in its frontend.
- AGENTS now explicitly records the agreed temporary local-entry exception.
  There is still no key form; listener controls alone do not authorize one.
- The shared panel interprets ODE context and contains ODE copy. Both must be
  separated from shared presentation.
- Linear Systems already stores the result and trace evidence needed for
  grounding; no numerical algorithm change is proposed.
- Browser cancellation does not currently cancel the upstream provider fetch.
- Google Fonts caused external traffic in the starting baseline; chunk 1C
  replaces those requests with local assets and browser resource policy.
- Connection selection is proposed as tab-wide, but transcript transfer consent
  is per Lab. An inactive Lab must not leak its history after a provider switch.
- Model discovery is not readiness or mathematical-quality verification.
- A local endpoint can be a proxy; offline claims must describe T-Lab's traffic
  policy accurately.

## Implemented in chunk 1B

- An explicitly enabled local process owns origin-bound per-tab session/proof
  and write-only credentials; `T_LAB_PERSONAL_TUTOR` is unset/false by default.
- Eight exact personal POST operations bootstrap, inspect, stage, discard,
  activate, disconnect, cancel and close sessions. Subsequent operations require
  ID/proof headers; bootstrap permits no credential or provider request.
- A candidate does not replace the current connection. Only a current backend
  test lease can authorize activation. Replacement, disconnect and expiry
  invalidate old work and clear credential references.
- Model discovery permits an unselected candidate; testing and activation
  require selection. Local server model IDs preserve opaque Windows/POSIX paths,
  spaces and Unicode independently of the strict endpoint policy.
- Sessions expire after 30 minutes idle or 8 hours absolute; timers work without
  another request. There are bounded sessions, request concurrency and JSON bytes.
- Strict loopback endpoint normalization and fixed cloud/region presets exclude
  arbitrary forwarding and environment-key fallback. Native transport pins
  validated cloud DNS, retains TLS identity, rejects redirects, and has bounded
  request/response/deadline behavior without retries or provider fallback.
- Personal discovery/test/chat routes remain absent and capability reports
  `providerOperations: false`. That chunk had no key form, model adapter,
  offline/CSP change or Linear Systems Tutor. Transport tests use synthetic sockets/DNS.

The session, policy, transport and wire contract are recorded in the current
evidence document. Future adapters must release request leases in `finally`,
propagate client cancellation, validate a final nonempty test response before
marking a candidate tested, and never call transport from field editing.

## Historical chunk 1A implementation and audit

- Added `backend/src/localApiServer.ts` as a side-effect-free HTTP server factory;
  `dev.ts` loads environment files and binds it to literal IPv4 loopback.
- Exact Host/port and configured frontend-origin checks, browser same-origin
  metadata, JSON-only uncompressed bodies, 1 MiB body cap, bounded HTTP receipt
  timeouts, no wildcard CORS or raw parser/exception reflection.
- Native CLI JSON compatibility is limited to legacy `/api/chat`.
- Vite dev/preview use strict ports and IPv4 loopback; HMR shares the listener.
  Pre-proxy checks prevent Host rewriting from erasing an untrusted source.
- Configured API origin overrides must be canonical HTTP loopback origins;
  listener/HMR overrides that could expose the local boundary fail at startup.
- The Vite legacy override that disables WebSocket token checks is rejected;
  browser HMR requires the current token, including same-origin browser requests.
- Added two test suites; frontend typechecking now includes Vite config.
- No change to hosted adapter, model handler, provider destination, ODE/Linear
  Systems browser runtime, numerical algorithms or dependencies.

The dedicated independent Codex task `Audit AI Tutor connections` is configured
as GPT-6 Astra (`gpt-6-astra`), Extra High (`xhigh`). Each stable chunk must pass
audit, bounded corrections and re-audit before the implementation task commits
it locally. The auditor is read-only and shares this saved checkout; no branch
or worktree is created. Freeze the input while it reviews. The detailed workflow
is in section 8 of the implementation plan.

Keep chunk commits local. Only after every chunk and a final independent
overall audit pass may the implementation task push and update the Vercel demo,
after verifying exact Git/deployment targets. Dependency installation, model
management and paid/live provider calls remain separately gated.
Before a continuation, repeat preflight and inspect any task-owned diff.
Never stash/reset or overwrite it automatically. Chunk 1A passed its audit and
was committed. Chunk 1B passed its own re-audit and was committed at `b9fad94`.

The first audit returned NEEDS_FIXES with one P2: enabling
`legacy.skipWebSocketTokenCheck` allowed an external-origin, token-free HMR
connection. The implementation task independently reproduced the accepted
upgrade and synthetic source-error frame, added a startup rejection, and
verified that the original reproduction now fails before listening. Seven new
regression cases cover the override, a valid browser token, and rejected
missing/invalid tokens. Independent re-audit returned **PASS**, with no
unresolved in-scope findings. It independently reran 80 focused tests,
workspace/API typechecks, import boundaries, the original HMR reproduction and
documentation checks. All 16 files matched the frozen manifest before and after
review; the implementation task independently confirmed that match before
recording this verdict. No further runtime changes followed the pass.

## Historical chunk 1B validation and limitations

Chunk 1B passes `npm.cmd run verify`: 111 files / 1,570 tests, all workspace/API
typechecks, import boundaries and the unchanged 115-module browser build.
Four new suites add 143 policy, session, transport and route tests. Existing
HTTP/proxy/HMR and hosted packaging checks pass. A separate native Windows
`dev.ts` opt-out/opt-in probe returned 404/201; task-owned processes were stopped.
No live provider, real browser or deployment validation is claimed.

At that historical boundary, local fonts/CSP, provider adapters, the key form/
history workflow and Linear Systems Tutor were unfinished; Google Fonts still
required external traffic. Chunk 1C now covers fonts/CSP. Provider adapters,
the key form/history workflow and Linear Systems Tutor remain later chunks.

The first independent chunk 1B audit returned NEEDS_FIXES for two P2 model
selection/ID constraints. Both are corrected with new failing-then-passing
regressions and the auditor's original loopback reproduction. Independent
re-audit returned **PASS**, with no new in-scope findings. The auditor independently
passed 223 focused tests, both typechecks, import boundaries and documentation
checks, and checked the final full-verification log. All 21 source/document
hashes matched before and after review; the implementation task independently
confirmed that match before adding this verdict metadata. No runtime edit
followed the pass.

### Historical chunk 1A evidence

Focused verification passes 4 files / 80 tests: 75 new local transport cases and
5 existing hosted adapter/packaging tests. Real Windows loopback HTTP, Vite dev
and preview proxy, occupied-port failure and same-port HMR upgrade were tested.
Final `npm.cmd run verify` passes 107 files / 1,427 tests, workspace/API
typechecks, import boundaries and the 115-module build. Existing lazy-bundle
contracts pass. Real `dev.ts` startup also reached handler validation with mock
enabled; the task-owned process was stopped. See the evidence record for scope
and limits. No test was skipped and no dependency changed.
Documentation checks pass for 10 Markdown files / 186 relative links, all seven
new files and `git diff --check`. The pre-commit audit snapshot has an empty
index, `main` at the starting SHA, nine modified tracked files and seven
untracked task files. Git history records the eventual local commit identity.

At that historical boundary, no real-browser offline/CSP/layout validation,
live model call or provider credential was used. Credential sessions were
unimplemented then and are now covered by chunk 1B above. Origin-free CLI
compatibility must never be reused as personal-route authorization.

## Exact next gate

**Create the independently passed 3A3 local commit, then implement and audit 3B.**

Provider adapters are locally implemented with documented model limitations;
3A3 runtime/history work is locally verified, settings/panel wiring is 3B and Linear Systems phase 4. No per-chunk
push or deployment. Keep the latest release record separate from this local work.
