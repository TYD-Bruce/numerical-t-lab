# AI Tutor Connections v1 — Repository-Grounded Implementation Plan

Date: 2026-09-25
Status: **Chunk 5B independently passed; separate overall audit pending**
Runtime scope this round: **None; acceptance evidence and operational documentation**
Current chunk baseline: clean `main` at `72937725379a44c1c00d74ac8f57eb4c331f89f1`
The maintainer explicitly resumed after a safe pause. Current evidence is in
[the chunk review](../../reviews/2026-09-26-ai-tutor-connections-chunk-5b.md).

Authority: [Design](../specs/2026-09-25-ai-tutor-connections-v1-design.md).
Continuation: [Feature handoff](../../tutor/HANDOFF.md).

The maintainer's follow-up includes the existing five-file documentation diff
and authorizes review incorporation and bounded implementation rounds. The latest
continuing goal authorizes all chunks under the independent audit/commit workflow in section 8:
work on local main and commit each chunk only after its audit passes. Do not
push individual chunks, install dependencies, run paid inference, or deploy
before the final overall-audit gate. Finish the current chunk before starting
another; preserve the separately reviewable boundaries below.

## 1. Current source map

| Existing owner | Verified responsibility and planned seam |
|---|---|
| `frontend/src/app/contracts.ts` | Generic optional Lab Tutor binding with ready/unavailable context, evidence revision and pure transcript revision; nonsecret connection provenance implemented in 3A3 |
| `frontend/src/app/labRouteAdapter.ts` | Connects an exposed Tutor binding and live session access; already owns reset/request invalidation and disposal order |
| `frontend/src/app/platformTutorHost.ts` | Inserts the launcher, lazily constructs one tab connection, mounts/disposes panels, retains connection across navigation and owns presentation/cancellation hooks |
| `frontend/src/app/platformBootstrap.ts` | Platform Host construction; wire only lightweight connection access if needed |
| `frontend/src/app/appSessionStore.ts` | Pure per-module Lab/Tutor sessions; no credentials, network handles, or provider secrets |
| `frontend/src/tutor/platformTutorPanel.ts` | Shared opaque context/copy consumer; connects settings and guarded personal sending with existing revision/binding guards |
| `frontend/src/tutor/tutorClient.ts` | Same-origin chat fetch and safe public failure boundary |
| `frontend/src/tutor/moduleTutorSession.ts` | Transcript/draft/reset helpers and history serialization |
| `frontend/src/tutor/aiTutor.ts` | Compatibility reexports; pure ODE builder now lives in `labs/ode/odeTutorContext.ts`, shared display helpers in `tutorPresentation.ts` |
| `frontend/src/labs/ode/odeTutorBinding.ts` | ODE evidence eligibility/projection, revision, suggestions/copy, chart delegation and reset/context subscriptions |
| `frontend/src/labs/ode/odeApp.ts` | Current result, Run/reset, chart application, and disposal owner |
| `frontend/src/labs/ode/initialValueProblemsRoute.ts` | Existing complete-Lab binding export |
| `frontend/src/labs/linear-algebra/linearSystemsSession.ts` | Current/stale status, input fingerprint, immutable latest success |
| `frontend/src/labs/linear-algebra/linearSystemsApp.ts` | Lab header, session updates, successful-Solve reset, optional reset history retention and binding disposal |
| `frontend/src/labs/linear-algebra/linearSystemsRoute.ts` | Exposes the Lab-owned Tutor binding through the existing optional port |
| `packages/numerics/src/linear-algebra/linearSystemsNumerics.ts` | Existing result/trace types and producer; inspect and consume, do not modify algorithms or trace authority |
| `packages/contracts/src/tutor.ts` | ODE and Linear DTOs, bounded projection constants, personal session/connection and discriminated chat request/reply DTOs |
| `frontend/src/labs/linear-algebra/linearSystemsTutorContext.ts` | Current-success Linear projection; exact preset reference and selected stored-trace fields, consumed by the lazy-read Lab binding without numerical replay |
| `backend/src/ai/personalTutorChat.ts` | Closed chat envelope/history, server-owned ODE/Linear prompt selection, full-prompt budget and profile-specific final response normalization |
| `backend/src/ai/tutorContextValidation.ts` | Closed bounded ODE/Linear wire schemas; finite evidence and complete Linear trace shape without numerical execution or freshness attestation |
| `backend/src/ai/linearTutor.ts` | Linear prompt and pure deterministic demo generator, wired through default Linear dispatch |
| `backend/src/ai/linearTutorHandler.ts` | Closed default Linear request, shared prompt validation, demo and bounded fixed-destination complete response with caller cancellation |
| `backend/src/ai/chatHandler.ts` | Explicit profile dispatcher and unchanged legacy ODE mock/provider behavior; rejects unsupported profiles |
| `backend/src/dev.ts` | Local API process, environment loading, loopback startup and explicit personal-session enablement/shutdown |
| `api/chat.ts` | Hosted adapter; do not expose personal configuration/session routes |
| `frontend/vite.config.ts` | Frontend root, local API proxy, root-base asset build |
| `frontend/index.html` | Bundled fonts and build CSP meta; external Google Fonts links removed in 1C |
| `frontend/src/math/ui/readonlyMath.ts` | Bundled MathLive font/static CSS imports; inspect actual emitted and requested assets |
| `scripts/verify/importBoundaries.mjs` | Existing four-owner import enforcement |

Additional implemented owners:

- `frontend/src/labs/linear-algebra/linearSystemsTutorBinding.ts`: fresh
  eligible Linear Systems evidence projection, revision/subscriptions and suggestions.
- `frontend/src/tutor/tutorConnection.ts`: per-tab runtime connection metadata
  and identity; no provider key retention.
- `frontend/src/tutor/tutorConnectionSettings.ts`: lazy local connection form
  within the existing Tutor presentation, not a competing modal.
- `backend/src/ai/providers/`: bounded native transport and adapters for all six
  provider families, with explicit regional destinations and final-text extraction.
- `backend/src/localTutorSession.ts`: implemented expiring credential/session
  ownership, independent of serializable Lab/Tutor state, with policy and scoped
  HTTP owners in `localTutorPolicy.ts` and `localTutorRoutes.ts`.

Do not add an abstraction just to mirror every provider. Shared transport can
serve DeepSeek, Kimi, and compatible local chat APIs with explicit provider
policies. Keep native Anthropic, Gemini, and OpenAI payload ownership distinct.

## 2. Phase 0 — Accept contracts and specify test fixtures

Review incorporation is authorized. The
[verification record](../../reviews/2026-09-25-ai-tutor-connections-review-and-chunk-1a.md)
separates verified baseline defects from prospective requirements. Typed APIs
and constants for later chunks are defined immediately before their tests;
do not add unused abstractions in chunk 1A.

- Resolve the narrow AGENTS browser-key wording explicitly according to the
  agreed local-entry exception. Preserve all other security boundaries.
- Define typed ready/unavailable binding results, ODE/Linear Systems wire DTOs,
  local configuration/session operations, redacted error codes, and immutable
  connection identity. Mark new APIs as proposed until implemented.
- Write exact numeric limits, session expiry, allowed local origins/addresses,
  and provider endpoint presets into one authoritative owner; do not duplicate
  constants across frontend/backend.
- Define per-Lab history-transfer state transitions before writing UI.
- Establish bounded trace projection and context limits using representative
  existing 2-through-6-dimensional Linear Systems results. Omit only explicitly
  optional evidence and report that omission; do not derive new math.
- Identify font files/licenses and inspect all runtime asset requests.
- Recheck current official provider docs, including both Kimi regional endpoints.

The initial design/review documents belong to the coherent chunk 1A commit;
do not create a separate commit merely for this preparation.

## 3. Phase 1 — Local foundation, in three separate chunks

### Chunk 1A — Listener and HTTP boundary (committed at `2e20a3a`)

Write failing behavioral tests, then implement:

- `backend/src/localApiServer.ts`: side-effect-free local HTTP server factory,
  independent of the hosted handler. Validate loopback socket, actual Host/port,
  exact frontend-origin allowlist and browser Fetch Metadata before delegation.
- `backend/src/dev.ts`: preserve root environment loading, bind explicitly to
  `127.0.0.1`, validate API port and optional `T_LAB_LOCAL_ORIGINS` configuration.
- Remove wildcard CORS. Accept JSON only; cap bodies at 1 MiB, including chunked
  bodies; return controlled errors without echoing input or exceptions.
- Preserve origin-free CLI JSON calls only on the existing `/api/chat`. Browser
  requests require both an approved Origin and `Sec-Fetch-Site: same-origin`.
- `frontend/vite.config.ts`: dev/preview loopback, strict ports, same-listener
  HMR, and a pre-proxy Host/Origin check. Unsafe listener overrides fail before
  startup. Proxy to literal loopback; do not trust forwarded headers.
- Typecheck the Vite configuration. No browser bundle/runtime changes.

Exercise native Windows HTTP servers and the real Vite dev/preview proxy with
injected handlers. Prove valid requests reach the handler once; hostile Host,
Origin, Fetch Metadata and form requests do not reach it. Preserve the current
hosted adapter/packaging and model handler behavior.

Gate: focused tests, full `npm.cmd run verify`, whitespace/diff review, and
recorded evidence. **Independent audit, corrections and re-audit, then local
commit under section 8.** This chunk creates no
capability/session/key routes, outbound model endpoint policy, CSP, fonts,
settings, provider adapter, or Linear Systems binding. It cannot claim complete
personal-connection security or offline readiness.

Commit boundary after the independent audit passes:
`Constrain local Tutor HTTP transport`.

### Chunk 1B — Credential sessions and destination policy (committed at `b9fad94`)

- Implement per-tab proof, JSON/custom-header personal operations, strictly
  explicit credentials, 30-minute idle / 8-hour absolute expiry, bounded session
  count, request ownership, generation and disconnect cleanup.
- Test missing/wrong proof, cross-tab access, all expiry boundaries and aborts.
- Implement strict original-authority URL validation, localhost-to-literal
  normalization, fixed cloud regions and redirect rejection. Tests must exclude
  DNS normalization bypasses, ambient credentials and arbitrary forwarding.
- Define scoped operations before exposing routes; discovery/inference remain
  unavailable until their adapters exist. No browser key form yet.

Gate: session/destination/HTTP tests, hosted packaging, typechecks, boundaries,
full suite/build as required, independent audit/correction/re-audit and local
commit before the next chunk.

Historical chunk 1B contract details are in the
[chunk 1B evidence](../../reviews/2026-09-25-ai-tutor-connections-chunk-1b.md).
The backend uses an explicit enable flag, origin-bound random session/proof,
strict POST schemas and separate candidate/active connections. Bootstrap accepts
no key; only an internally successful test can authorize activation. Discovery,
test and personal chat remain absent until adapters exist. Numeric bounds live
in the backend session/transport owners; public DTOs carry only safe metadata.
The native transport is included here so redirects, DNS pinning, header-only
credentials, cancellation and limits are executable policy rather than promises.
Tests use synthetic endpoints and DNS; no provider call is authorized by this chunk.
Candidates can discover without a selected model. Test/activation/completion
require selection, and local model IDs remain bounded opaque strings separate
from endpoint validation. These are corrections from the first independent audit.

Commit boundary after the independent audit passes:
`Add local Tutor credential sessions`.

### Chunk 1C — Offline assets and browser CSP (committed at `f36cfc1`)

- Bundle approved fonts and licenses; remove remote font links/preconnects.
- Audit deferred MathLive and other resources; fit enforced CSP to the actual
  inline theme bootstrap, styles and exact local HMR destination.
- Cold-cache, external-network-blocked browser evidence across both Labs and
  math editors; do not claim end-to-end local inference until adapters exist.

Gate: asset/build graph and browser evidence, both themes and mobile/desktop.
Stop for review. No dependency installation without separate authorization.

Implemented: local interface fonts/licenses, MathLive asset policy, CSP response
headers and build meta policy. Final full verification passes 112 files / 1,579
tests and the 116-module build; browser evidence includes external-traffic-blocked
Labs, math editors, synthetic Tutor and CSP negative probes. The external
beforeunload automation limitation is isolated and recorded in the review.
Independent audit returned PASS with P0/P1/P2/P3 all zero. It independently
passed 80 focused tests, typechecks, boundaries, an external build and browser
spot checks. All 26 file hashes matched before/after review; the implementation
task independently confirmed the match before recording verdict metadata.

Commit boundary: `Bundle offline Tutor assets and enforce browser policy`.

## 4. Phase 2 — Provider adapters and explicit verification

Split into separately reviewed rounds: **2A** local compatible + OpenAI,
**2B** native Anthropic + Gemini, **2C** DeepSeek + both Kimi regions. Reuse
transport only where the actual protocols agree. Retain the complete requested
provider scope; completing 2A does not finish phase 2.

Chunk 2A implements the adapters and exact local discovery/test routes, with
test-gated candidate activation. Its tested `completeWithProvider` port remains
backend-only until Phase 3 supplies profile/context/history validation; there
is no public personal chat proxy. Bootstrap initially advertised local/OpenAI;
2B adds native Anthropic/Gemini and 2C completes the six provider families.
Limits are owned by `PROVIDER_ADAPTER_LIMITS`:
256 models (shared policy-owned `PROVIDER_MODEL_LIMIT`), 40 messages, 32 KiB
prompt and final text. Test budgets are 1,024 local / 2,048 OpenAI output tokens;
internal completion is capped at 4,096. No automatic truncation or context-fit
claim. OpenAI assistant history explicitly represents final answers.

Chunk 2B uses each native API's instructions, history roles and final-text fields.
It excludes thinking/signatures, handles refusal/incomplete states and uses
2,048-token synthetic tests / 4,096-token completions. Discovery requests only
one page with policy-owned size, returning `{ models, hasMore }` without raw
cursors or automatic pagination. Gemini method metadata can exclude unsupported
generation candidates; absent metadata is not a capability guarantee. Exact-ID
entry remains available for partial lists. Tests cover actual request options
through mocked native HTTPS sockets, route/session activation, no retry,
stale responses, malformed discovery, output limits and explicit credentials.

Chunk 2C reuses the compatible-chat final parser for DeepSeek and explicit Kimi
regions, with separate output-budget fields and fixed header-only destinations.
Tests are capped at 2,048 output tokens and completions at 4,096. Resource-busy
and interrupted DeepSeek responses fail without retry. Catalogs use a single
bounded list request; listing is not readiness. Kimi's three documented
always-preserved-thinking IDs are unavailable and rejected before inference,
including exact-ID entry; the Tutor neither retains nor invents reasoning history.
The [2C review](../../reviews/2026-09-25-ai-tutor-connections-chunk-2c.md)
records IDs, official references and the fixture-only evidence boundary.

Readiness is read-only metadata, not attestation. Local unloaded/loading/sleeping
states block inference; a bare listing is only a candidate. Only unsupported
discovery (404/405/501) permits exact manual IDs without metadata. The explicit
autoload query protects the documented router process-loading path, but T-Lab
does not control an arbitrary server's wake/sleep behavior or policy compliance.

Use recorded synthetic fixtures and injected HTTP transports. Do not contact
real providers as part of normal tests.

Cover each requested family:

- OpenAI Responses;
- native Anthropic Messages;
- native Gemini;
- direct DeepSeek compatible chat;
- Kimi international and mainland compatible chat;
- local compatible chat, with optional llama.cpp loaded-state discovery.

Test authentication placement, URL construction, region isolation, model
selection, discovery failures, final-text extraction, optional structured output,
reasoning/refusal handling, rate/quota errors, timeout, cancellation, output
limits, and malformed/empty responses.

Add explicit connection testing with a small synthetic prompt. Editing connection
fields invalidates prior test success. Do not send Lab data during the test.
Discovery must not call model management or reload endpoints. A listed model
must not be treated as a ready model.
For llama.cpp router support, also disable automatic loading on each inference
request (`autoload=false`) and verify loaded state using read-only metadata.
Test a model becoming unloaded between discovery and inference. A prior loaded
check alone cannot prevent the router's documented default automatic loading;
the adapter must carry the explicit opt-out through the scoped transport.

No automatic retries, cross-provider/region fallback, or ambient-key fallback.
For each adapter, assert exactly one outbound inference on timeout/429/5xx,
and zero calls for missing personal credentials with environment keys seeded.
Assert credentials never appear in URLs and only final-answer fields survive.

Phase gate: focused provider/session/handler fixtures, both typechecks as
applicable, full suite for the shared API boundary, hosted packaging check, and
production build.

Suggested commit boundary: `Add Tutor provider adapters`.

## 5. Phase 3 — Shared connection UI and ODE compatibility

Split **3A** connection-generation/history-consent state and Lab-authored ODE
context from **3B** settings/panel wiring and browser QA. Repository inspection
subdivides 3A into three coherent, independently audited commits. The HTTP
validation boundary and the browser history-consent state each receive their
own audit before being joined by settings UI:

- **3A1** moves the existing ODE projection to a pure Lab owner, exposes a
  ready/unavailable snapshot with a binding-local revision, and makes the shared
  panel consume opaque context and Lab-owned copy. Separate shared presentation
  helpers from ODE interpretation so Linear Systems will not import ODE runtime.
  Add pure transcript revisions and reject stale responses/chart actions after
  context/transcript changes. Reuse the Host lifecycle for context refresh.
  Preserve successful-Run reset, failed-Run successful-output retention, Compare
  exclusion and existing Convergence evidence eligibility. No personal chat/key UI.
- **3A2** adds validated personal chat through the tested backend adapters.
  Accept the ODE profile with a closed, bounded context schema, explicit input
  budgets and safe response normalization; reject unsupported profiles before
  networking. Reconcile personal-chat body/prompt limits without silently
  dropping evidence. Preserve the hosted ODE API. This backend-only integration
  does not yet enable personal sending from the browser or imply history consent.
- **3A3** adds session/connection provenance, one-use per-Lab transfer decisions,
  and the browser personal-chat client with session/generation/request guards.
  Keep proof and pending requests outside pure state. Exercise fresh/transfer/
  cancel and inactive-Lab transitions before the settings UI connects them.

3A3 is now locally verified: `tutorConnection.ts` owns private proof and pending
work, per-Lab review consumption and the guarded sender; `tutorConnectionProtocol.ts`
owns bounded public response decoding. Pure sessions preserve provenance through
draft/placement/dividers and drop it on clear. A small session DTO addition
advertises the existing idle policy, and shared response constants retain their
values. Tests exercised the ports before production UI wiring. Independent
re-audit closed all three initial P2 findings; 3A3 is committed at `322e778`.

3B integrates the settings and connection controls with these owners and runs
the full connection/history browser workflows. Each subchunk ends at review;
3A1 also receives focused browser/lifecycle and lazy-boundary evidence.

Tests first for:

- Settings reachable without a current solve;
- local capability required before key entry;
- form-key clearing and absent browser persistence;
- provider/region/model editing and verification invalidation;
- clear model-compatibility limitations, including the fixed preserved-reasoning
  rejection and the distinction between connection testing and accuracy/readiness;
- configuration test failure preserving the active conversation/connection;
- connection replacement aborting pending work;
- Start fresh, explicit Transfer this Lab, and Cancel;
- inactive-Lab history blocked from accidental transfer;
- consent bound to Lab/transcript revision/source and destination generations;
- cancellation without fake transcript messages;
- stale completion rejection by connection and Lab identity.

Implement the shared lazy settings presentation and per-tab runtime connection
access. Reuse existing Host/modal ownership. Show selected destination and model,
connection status, bounded failure copy, Disconnect/Forget, and Cancel request.

3B adds one necessary candidate operation: `/api/personal/model` accepts only
generation, candidate ID and exact model ID. Discovery happens after key entry
is cleared, so selecting a discovered model must preserve the credential on the
backend. This operation creates an untested candidate identity, aborts previous
candidate work and preserves the active connection. It has no provider transport
and cannot change destination/region/credential. Policy and preview share the
unchanged fixed destination constants in `packages/contracts/src/tutor.ts`.

Move ODE context interpretation to its Lab-owned binding using the existing
builder and Convergence helper. Preserve existing exports only where callers
still need them; avoid a broad file reorganization. Keep one context authority.

Preserve ODE Run/reset/navigation behavior and chart validation. Safe plain text
may survive optional JSON failure; malformed chart instructions never execute.

Phase gate: focused panel/Host/session/ODE tests, full suite, all typechecks,
boundaries/build, and desktop/mobile keyboard and lifecycle browser checks.

Suggested commit boundary: `Add local AI connection settings to Tutor`.

## 6. Phase 4 — Linear Systems Tutor

Repository inspection splits this phase into independently audited commits:

- **4A — Grounding and personal profile:** Lab-owned current-success projection,
  closed Linear DTO/validation, bounded selected fields from every stored trace
  step, Linear server prompt and pure deterministic demo generator. Admit the
  profile at the authenticated local endpoint and browser capability boundary;
  discard all Linear chart actions on both sides. No binding/launcher yet.
- **4B — Lab and default-service integration:** expose the binding, context/reset
  subscriptions and launcher through the existing route/Host ports. Wire the
  default `/api/chat` Linear prompt/demo with a validated profile and preserve
  its emitted Vercel package boundary. Integrate successful Solve, failed Solve,
  draft edits, reset choices and disposal, then perform both-Lab browser checks.

The hosted function's runtime graph uses explicit relative emitted `.js` targets
for backend/public-contract helpers, while type-only workspace aliases remain.
This narrowly documented packaging exception preserves the already accepted
native Node/Vercel boundary; it does not permit a new dependency direction or
expose local personal sessions. A recursive emitted-graph invocation test covers it.

The 4A trace DTO keeps all stored step kinds in order and selected original
fields, with a 50-record wire ceiling for dimensions 2–6. Core A/b, xHat, P/L/U,
pivots, permutation, residuals, threshold and qualified reference remain intact.
It explicitly omits matrix-scale terms, pivot candidates, repeated full matrices,
swapped matrix rows, substitution contributions, residual products and reference
components. Elimination keeps its three stored rows and multiplier; substitution
keeps its authoritative numerator, diagonal and result, with the optional sum
only when recorded. No new numerical value is calculated. The API validates the
complete stage order, index/dimension bounds and declared omissions; it cannot
attest the supplied arithmetic or Lab freshness. The unchanged whole-prompt
32 KiB/40-message budget fails explicitly, without dropping evidence/history.

Write tests against the actual session/result owners before adding the binding.

- Allow only current successful fingerprint-matching context.
- Serialize original A/b, xHat, P/L/U, pivots, residual/safeguard evidence,
  qualified reference comparison, and the agreed bounded stored-trace projection.
- Reject absent, stale, partial, failed, or mismatched evidence.
- Explain using a Linear Systems prompt and deterministic demo response.
- Assert no claim of a computed condition number or inferred error bound.
- Assert no chart instruction, solver invocation, new trace, or matrix mutation.
- Expose `getTutorBinding` from the mounted Lab through its route.
- Use the existing Host launcher and module-isolated Store access.
- Integrate successful-Run reset, failed-Run preservation, edits, remount,
  New experiment, disposal, and request invalidation.
- Verify reset UI accurately represents the new conversation-clearing choices;
  do not leave a newly added Tutor conversation behind an inaccurate reset dialog.

No numerical source changes are expected. If a required context field is absent,
stop and review the design rather than changing the numerical producer silently.

Phase gate: Linear Systems binding/UI/route/prompt tests, cross-Lab integration
and history-transfer tests, complete shared suite and verification, and browser
evidence for both Labs.

Suggested commit boundary: `Integrate Linear Systems AI Tutor`.

## 7. Phase 5 — Full verification and documentation

Phase 5 is split after reproduced browser integration findings. **5A** fixes
non-JSON HTTP failure classification when the local backend is unavailable and
keyboard focus lost when successful enablement hides its button,
with focused regression tests, complete verification, browser reproduction and
its own independent audit/commit. Suggested commit:
`Fix local Tutor connection recovery`. **5B** completes the remaining
acceptance matrix and final documentation described below. Neither subchunk
replaces the independent overall feature audit.

Run Windows-safe commands from the repository root. Focused commands should use
the actual new test files plus relevant existing files.

Existing focused anchors include:

```text
npm.cmd run test:run -- frontend/src/tutor/aiTutor.test.ts frontend/src/tutor/aiTutorPanel.test.ts frontend/src/tutor/moduleTutorSession.test.ts
npm.cmd run test:run -- frontend/src/app/platformTutorHost.test.ts frontend/src/app/appSessionStore.test.ts frontend/src/app/labRouteAdapter.test.ts
npm.cmd run test:run -- frontend/src/labs/linear-algebra/linearSystemsSession.test.ts frontend/src/labs/linear-algebra/linearSystemsApp.test.ts frontend/src/labs/linear-algebra/linearSystemsRoute.test.ts
npm.cmd run test:run -- backend/src/ai/chatHandler.test.ts backend/src/ai/chatPrompt.test.ts backend/src/ai/chatAdapter.test.ts backend/src/ai/chatPackaging.test.ts
npm.cmd run verify
git diff --check
git status --short
git diff --stat
```

The final verify command covers full tests, typechecks, boundaries, and build.
Do not repeat a completed full verification without a change, failure, or
specific unresolved concern.

Bundle evidence order: manifest/graph, static versus dynamic imports, raw/gzip
sizes, supplementary markers, then browser Network. Tutor/settings must remain
first-open lazy; neither Home nor Linear Systems should acquire ODE runtime
merely to provide a Tutor launcher. Provider credentials/adapters remain server-only.

Browser evidence:

- Cold-cache offline load, both Labs, local fonts, math editors, Tutor settings,
  and already-loaded local inference, with external traffic blocked/observed.
- Explicit cloud mode identifies destination and never changes region/model
  automatically. Use mocks unless a bounded live call is separately authorized.
- Both Labs: eligible/absent/stale/restored/failed contexts, successful Run,
  New experiment, route navigation, reopen, and pending-request cancellation.
- Connection changes from each Lab, inactive-Lab return, fresh/transfer/cancel,
  two tabs, expiry, server disconnect, malformed output, and long-context errors.
- Wide desktop and roughly 390 x 844 mobile, Light/Dark, keyboard-only operation,
  visible focus, screen-reader names/status, and existing modal containment.

Update feature HANDOFF every coherent phase. Update PLAN/INDEX on transitions.
Update current architecture only for implemented ownership; update README and
project HANDOFF when the implementation milestone is actually verified. Record
live provider status individually as mocked-contract-verified, live-verified,
or untested. Do not call the whole provider matrix live-verified from fixtures.

Final commit boundary after the independent audit passes:
`Verify AI Tutor connections and both Labs`.

## 8. Rollback and review boundaries

The maintainer's audit workflow applies to every feature chunk:

1. The implementation task finishes one bounded chunk and its required checks.
2. Freeze the exact tracked and untracked task diff. The dedicated project
   audit task uses **GPT-6 Astra (`gpt-6-astra`), Extra High (`xhigh`)** and reviews
   the saved local `main` checkout read-only. No worktree or branch is created.
3. The auditor checks actual source, caller/lifecycle behavior, security,
   contracts, tests and documentation; it reports actionable findings with
   severity, file/line evidence, reproduction and a clear verdict. Planned
   later-chunk behavior must not be misreported as a current missing feature.
4. The implementation task independently evaluates findings, makes bounded
   corrections, verifies them, freezes the new diff and requests re-audit.
   Never edit the audit input while that auditor is actively reviewing it.
5. Commit only when the final audited snapshot has no unresolved actionable
   findings, required checks pass, and the implementation task has verified the
   verdict. Stage only task files and create one coherent commit per chunk.
   Suggested chunk 1A message: `Constrain local Tutor HTTP transport`.
6. Keep all chunk commits local. Do not push merely to create preview evidence.
7. After all implementation chunks, request an independent **overall audit** of
   the complete feature and accumulated commit range, including cross-chunk
   interactions, security/privacy, both Labs, lifecycle, offline/browser,
   provider-fixture and release evidence. Fix and re-audit until clear.
8. Only then use the maintainer's conditional authorization to push the verified
   final state and update the Vercel demo. First verify exact HEAD, clean status,
   remotes/tracking and the existing demo deployment target; then verify nested
   routes, API JSON, assets, desktop/mobile and console health after deployment.

The audit task never edits source, commits or deploys. It returns a report to
the implementation task, which owns repairs, evidence updates and Git actions.
New substantive edits after a pass invalidate that pass and require re-audit.
Final audit/commit metadata may be recorded without claiming that unreviewed
runtime changes were covered. No final release gate is satisfied by chunk 1A.

Each phase ends in a reviewable boundary; later phases do not start when the
maintainer asks to stop. If a regression appears before commit, inspect the
approved diff and repair narrowly. Never reset or discard unrelated work.
If a committed phase must be undone, propose a forward corrective/revert commit
for explicit maintainer authorization; do not rewrite history.

A failed connection leaves the previous successful Lab output and usable
connection intact. A cancelled provider switch preserves the prior transcript.
Local-only routes remain gated even if the frontend feature is unavailable.

Production release is a later stage under the maintainer's conditional
authorization above, requiring exact-head verification and hosted route/API/asset smoke.
No current documentation or local test changes production status.

## 9. Current evidence and next gate

Chunks through 5A are committed at local main `7293772`. 5B completes the
acceptance/evidence matrix and Windows configuration guide without runtime edits.
The unchanged full verification passes 130 files / 2,211 tests, all typechecks,
boundaries and the 124-module build. Fresh build/graph/browser checks cover the
remaining offline and both-Lab paths with synthetic local models only. Independent
5B audit passed with P0/P1/P2/P3 all zero; the parent inspected its report/probes
and rechecked all 12 frozen hashes. The local commit gate is satisfied, followed
by the separate overall feature audit.
See [5B evidence](../../reviews/2026-09-26-ai-tutor-connections-chunk-5b.md).

### Historical evidence through 3A2

The original preparation and chunk 1A are committed at `2e20a3a`. The continuing
goal now advances through separate independent gates. Chunk 1B passes 111 files /
1,570 tests, typechecks, import boundaries and build, with native Windows startup
and synthetic transport/session evidence. Detailed evidence and limits are in
the [current review record](../../reviews/2026-09-25-ai-tutor-connections-chunk-1b.md)
and [handoff](../../tutor/HANDOFF.md).

The dedicated audit task, `Audit AI Tutor connections`, uses the required model
and effort. Its first pass found one HMR token-check override bypass. The
implementation task reproduced it, added a startup guard and browser-handshake
regressions, and repeated full verification. Independent re-audit returned PASS
with no unresolved in-scope findings; the implementation task confirmed that all
16 files still matched the audited manifest before recording verdict metadata.

Chunk 1B independent re-audit returned PASS after both P2 corrections. The
implementation task verified all 21 file hashes against the frozen manifest.
Chunk 1B is committed locally at `b9fad94`. After explicit maintainer resume,
chunk 1C completed local verification and independent audit with no findings,
then committed at `f36cfc1`. Chunk 2A now passes 9 focused files / 263 tests and
full verification with 114 files / 1,653 tests, typechecks, boundaries and build.
Its first audit's P2 empty-tool-call-list compatibility finding is corrected
with eight added adapter cases and real HTTP coverage. Independent re-audit
returned PASS with all severity counts zero; the implementation task verified
all 21 frozen hashes before recording verdict metadata. Chunk 2A is committed
at `74a0773`. Chunk 2B now passes 334 focused tests and full verification with
115 files / 1,724 tests, typechecks, boundaries and build. Independent 2B audit
returned PASS with P0/P1/P2/P3 all zero; the implementation task verified all
16 frozen hashes before recording verdict metadata. Chunk 2B is committed at
`fd14abc`. Chunk 2C passes 11 focused files / 437 tests and full verification
with 116 files / 1,827 tests, typechecks, boundaries and build. Independent audit
returned PASS with P0/P1/P2/P3 all zero, independently repeating focused/API/
boundary checks. The implementation task verified all 15 frozen hashes before
recording the verdict. Chunk 2C is committed at `2e6f331`.
Chunk 3A1 passes 16 focused files / 168 tests; its review records full verification,
emitted module ownership and desktop/mobile lifecycle evidence. Independent
audit returned PASS with P0/P1/P2/P3 all zero; the implementation task verified
all 33 frozen paths/hashes and the unchanged main baseline before recording
verdict metadata. Chunk 3A1 is committed at `43f6701`.
Chunk 3A2 passes 15 focused files / 597 tests. Its review records final full
verification, native loopback chat, cancellation and synthetic provider contracts.
The initial audit returned one P2: escaped reasoning markers survived model JSON
decoding. The same marker predicate now checks decoded message and chart text/keys;
11 failing regressions and the auditor's native HTTP reproduction now pass.
The HTTP route admits ODE only; a successful schema check does not attest the
numerical values, freshness or browser transfer consent. Independent re-audit
returned PASS with P0/P1/P2/P3 all zero, independently repeating the focused and
full suites, API typecheck, boundaries, original native HTTP probe and 156 further
decoding cases. The implementation task rechecked all 21 frozen paths/hashes,
main HEAD and empty index before verdict metadata. Its historical gate was local
commit `Add validated personal Tutor chat`; no runtime change followed the audit pass.
Chunk 3A3 owns browser provenance, transfer consent and client integration;
settings and Linear Systems stay at their separate later boundaries.
The complete offline workflow and both-Lab requirements remain in scope.

### Historical 3A3 evidence and gate — committed at `322e778`

Chunk 3A2 is committed at `8ada41b`. Corrected chunk 3A3 passes 18 focused files / 498
tests and full verification with 123 files / 2,068 tests, all typechecks,
boundaries and the 118-module build. Its native HTTP test spans the real local
API/session/adapter/transport with a synthetic loopback model and no Authorization.
Regressions cover inactive-Lab consent, one-use/revision/destination identity,
failed testing, uncertain activation, cancellation and reentrant notification.
Initial independent audit returned NEEDS_FIXES (three P2; other severity counts
zero). Corrections now guard rejected results after completion subscribers,
synchronize idle accounting with authenticated activity without renewing it,
and validate/project optional chart fields. Added regressions cover cancellation
acknowledgements, absolute expiry, stale identity and bounded chart fields. The
original independent HTTP probes now produce the required corrected outcomes.
Independent re-audit returned PASS, with all three findings closed and no new
findings (all severities zero). It passed 588 focused tests and additional
boundaries; all 25 frozen hashes matched before/after and the implementation task
independently rechecked them. The local commit gate is satisfied at `322e778`.
All original frozen hashes matched, and the
implementation task independently rechecked them before this verdict record.
The preceding 3A2 pre-commit paragraph records a historical gate now satisfied.

### Previous 3B evidence and gate — committed at `37df723`

The following records the historical pre-commit gate, now satisfied.

Shared settings and the production ODE panel now use the existing per-tab runtime.
Settings remain reachable before a solve, credential fields require a compatible
local handshake, and each explicit network action explains its destination/data.
Pure Store state remains free of proof, credentials and controllers. Model edits
use the candidate-only operation above; failed verification preserves active work.
History choices are single-use, visible and explicit, including return to default.
The Host retains the connection across close/navigation and disposes it on teardown.

Full verification passes 124 files / 2,091 tests, all typechecks, boundaries and
122-module build. Actual dev/production-preview Chrome workflows at desktop/mobile
widths cover key clearing, Kimi choices, loaded-model discovery, synthetic tests,
fresh/transfer/cancel, personal sending, busy errors, cancellation, disconnect and
Home/Resume. Browser-driven fixes reveal history choices inside the settings
scroll frame and restore composer focus after cancel. Expiry removes key entry.
Application resources stay same-origin; a deny proxy blocks browser external
traffic, and a fixture guard forbids external provider transport. No live key/model.

Independent 3B audit returned PASS, P0/P1/P2/P3 all zero. It passed 167 focused
tests, typechecks, boundaries, in-memory graph build and real-browser local
connection/history/mobile/cancellation checks. All 23 frozen paths/hashes matched
at both ends, and the implementation task independently rechecked them. No
runtime change followed the verdict. Next gate: local commit
`Add local AI connection settings to Tutor`. Phase 4 follows that commit.
Overall independent audit remains mandatory before push and demo deployment.
