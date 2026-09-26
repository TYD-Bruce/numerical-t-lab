# AI Tutor Connections v1 — Chunk 3A3 evidence

Date: 2026-09-25
Status: **Independent re-audit PASS; all three initial P2 findings closed**
Baseline: clean local `main`, `8ada41b678a79f9323c642ebf29e9385af3d8218`
Scope: browser connection runtime, conversation provenance and one-use decisions.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md).

## Implemented owners and behavior

`frontend/src/tutor/tutorConnection.ts` provides an explicitly constructed,
tab-owned runtime. Construction performs no networking. Eligible canonical
HTTP localhost/127.0.0.1 origins with an explicit port may bootstrap a same-origin
personal session; a compatible capability reply is required before configuration.
All requests use relative exact personal paths, JSON, same-origin mode, omitted
cookies and rejected redirects. Browser-owned Origin/Fetch Metadata are not forged
by production code. Session proof and pending request controllers stay inside this
runtime. Configuration input is serialized for the request without storing the
provider key in runtime snapshots, Store, history or browser persistence.

The owner handles stage, discovery, synthetic test, discard, activation, status,
disconnect, explicit hosted selection and disposal. Editing/staging configuration
invalidates previous local test eligibility. Failed tests preserve the active
selection and transcript. Cancel discards the staged candidate; activation needs
its exact tested identity. Lost/malformed activation or disconnect replies fail
closed because the server may already have applied the mutation. A personal
selection never falls back automatically to hosted sending.

`ModuleTutorSession.connection` contains only copied/frozen nonsecret destination
kind, session identity and generation. Draft/placement/divider updates preserve
provenance; clearing drops it. Changing provenance advances transcript revision.
The connection owner issues a review object bound to Lab, transcript revision,
source/destination identity and current selection; candidate reviews additionally
bind candidate ID. It consumes the decision once while these still match. Fresh
is the default, transfer preserves only that Lab's user/assistant transcript, and
cancel preserves the previous selection/conversation. Another Lab's old history
stays intact but cannot send until its own decision. An edit during activation
does not retroactively authorize or clear the edited history; the newly selected
connection remains gated on a new choice.

The personal sender reads fresh Lab context and serializes the authorized Lab's
messages. It checks Lab/profile, context revision, transcript revision, provenance,
runtime/session generation, request ID, caller signal and current-mount callback.
Checks span fetch, streamed body reads, response normalization and completion
notifications, including reentrant Store changes. It returns completed content;
the existing panel still owns transcript append, rendering and chart application.
The caller must prepare provenance before appending its first question and retain
the panel's own response guards. These ports are exercised in tests; settings and
panel/Host wiring remain 3B, so the production UI still uses the legacy client.

`tutorConnectionProtocol.ts` projects known public response fields and maps only
closed error codes. Raw fetch errors, server bodies and unknown fields do not
become public failure details or retained snapshots. Replies are capped at
512 KiB before JSON parsing, including catalog envelopes. Existing catalog and
final-text budgets (256 models / 32 KiB) now have shared contract constants,
consumed by both adapters and browser decoding without changing their values.
The shared error-code list replaces the equivalent type-only union.

Backend snapshots additionally advertise the existing `idleTimeoutMs`. Browser
timers enforce advertised idle/absolute deadlines without a keepalive poll. While
an operation is pending, absolute expiry still applies; the backend independently
enforces idle expiry. Authenticated chat/test/discovery/cancel replies include an
activity envelope (session ID, generation, idle deadline), including controlled
failures. The observation does not touch backend activity. The client reconciles
matching replies before surfacing a controlled failure; older acknowledgements
cannot roll back newer activity. Terminal session errors still invalidate the
connection when the backend reports a newer generation. Other accepted operations
return authoritative snapshots. Successful legacy chat/discovery replies without
activity retain conservative dispatch-based renewal. No path extends absolute expiry.
Browser timeouts are 15 seconds for session/configuration operations, 20 for
discovery and 120 for test/chat (covering backend readiness plus inference).
Cancel/close cleanup is best effort, capped at 1.5 seconds and never retried.
While a cancellation acknowledgement is pending, only the old idle check is
deferred; timeout and absolute expiry still invalidate it. Late acknowledgements
cannot resurrect a disposed/expired session. Optional chart decoding projects the
existing finite/ordered numeric, boolean, label and table schema with shared
unchanged bounds; invalid optional charts are omitted without losing valid text.
Backend expiration remains responsible for abandoned credentials.

## Initial verification evidence

- Initial red run: missing new runtime module. Further behavioral regressions
  caught four lifecycle/consent cases and three cancellation/uncertain-activation
  cases before bounded corrections. No test was weakened or skipped.
- New coverage: **65 cases** across runtime, protocol, native loopback integration
  and pure-session provenance.
- Focused: **18 files / 462 tests passed** including legacy panel, Host, Store,
  Lab adapter, lazy boundary, provider adapters/transport and personal HTTP routes.
- Full `npm.cmd run verify`: **123 files / 2,032 tests**, all workspace and API
  typechecks, import boundaries and the **118-module** production build passed.
- Fake-clock evidence covers browser timeout, idle renewal without absolute
  extension, and absolute expiry of pending work. Late success/error, cancellation,
  reset, context change, navigation, dispose, proof isolation, wrong response
  identities, reentrant callbacks and no retry/fallback are covered.
- Actual native HTTP runs the browser runtime through the real local API,
  session owner, provider adapter and scoped transport into an owned loopback
  model fixture. Discovery/test/chat/cancel/disconnect pass. Every provider
  request lacks Authorization, and its only paths are `/v1/models` and
  `/v1/chat/completions?autoload=false`. The other Lab's history is absent.
  Browser Origin/Fetch Metadata are emulated by the test-only native bridge.
- Protocol cases cover malformed/incompatible bootstrap, missing policy fields,
  numeric/identity validation, secret-field omission, closed error codes, invalid
  JSON/UTF-8 and oversized replies before parsing.

Temporary logs: `t-lab-chunk-3a3-red.log`, `t-lab-chunk-3a3-async-red.log`,
`t-lab-chunk-3a3-discard-red.log`, `t-lab-chunk-3a3-focused.log`,
`t-lab-chunk-3a3-verify.log`. Initial typecheck findings were narrow test generic
typing and optional-candidate narrowing; both were corrected without changing
compiler settings. All fixture listeners/sessions are disposed.

Full tests include emitted Rollup/manifest ownership checks. Entry JS is
**59.46 / 18.40 kB** raw/gzip, Tutor **9.30 / 3.65 kB**, ODE
**424.38 / 128.78 kB**, Linear Systems **75.80 / 22.63 kB**. The small entry
increase is pure session provenance preservation; connection networking is not
eagerly imported. Existing large math-chunk warnings remain.

## Evidence limits and next gate

No real API key, external provider/model request, dependency installation,
numerical change, Git remote operation, push or deployment occurred. Provider
fixtures are synthetic. No new product UI or real-browser geometry/workflow check
is claimed; browser settings and integrated lifecycle QA remain 3B. Linear Systems
grounding/prompt/UI remain phase 4; its history isolation is tested through the
existing pure Store, not a claim that its Tutor is already integrated.

Self-review corrections are represented by the failing/passing regressions above.
The initial independent audit returned **NEEDS_FIXES: P0 0 / P1 0 / P2 3 / P3 0**.
The original implementation/verification evidence above does not establish final
acceptance. It identified these three independent counterexamples:

1. The sender rechecks scope after a successful completion notification, but a
   rejected request skips that final check. A subscriber which clears history,
   changes context, navigates, aborts or disposes can still receive the old
   `provider_auth` error. Both outcomes must recheck the captured identities;
   a current genuine error must remain intact.
2. Accepted provider failures update backend idle activity but leave the browser's
   old deadline. A real loopback `provider_busy` reply just before that deadline
   leaves the backend live; the client then expires and closes it. The auditor
   proved liveness with non-renewing `authorize()`, not `status()`. Reconcile
   authoritative accepted activity, including test/discovery/chat failures and
   cancellation, without extending absolute expiry or adding polling/retries.
3. The client's optional-chart check uses only the type discriminator. An
   identity-matching malformed reply retains nonnumeric zoom endpoints and unknown
   fields. Validate/project the approved finite/ordered/bounded chart schema;
   discard an invalid chart while preserving a clean explanation.

The auditor independently repeated 462 focused tests, all workspace/API typechecks,
boundaries and diff checks, inspected the parent full verification/build evidence,
and checked 220 local Markdown targets. Its native counterexamples used owned
loopback listeners without Authorization. No real credential or external model
was accessed. The public-metadata fault-injection observation did not change the
actual backend destination and was not counted as a separate finding.

All 20 paths/hashes, clean index and main baseline matched at audit start and end.
The implementation task independently rechecked these before recording this
verdict. External evidence is preserved under the dedicated audit directory as
`chunk-3a3-audit.md`, start/final snapshots, `chunk-3a3-independent-probes.mjs`
and `.jsonl`, and `chunk-3a3-idle-http-probe.mjs` and `.jsonl`. The parent also
preserves `t-lab-chunk-3a3-idle-probe-v2.mjs`, a network-free reproduction using
`authorize()` without an observation-induced idle refresh. Its original v1 probe
used `status()` and is weaker evidence; it is preserved rather than overwritten.

## Corrections and re-audit input

All three findings have bounded corrections and local verification:

- `send()` rechecks identity in `finally`, after `run()` completion subscribers,
  for both success and rejection. Genuine current provider errors remain intact;
  clear/context/navigation/abort/dispose produce cancellation.
- The session owner provides read-only authenticated activity. Only the local
  HTTP envelope adds its three public fields to chat/test/discovery/cancel replies.
  Unauthenticated requests receive no activity. Exact route response assertions
  include the new field; they were not relaxed to partial matching. Client tests
  cover accepted chat/test/discovery failures, acknowledgement absence/mismatch,
  cancellation timing/timeout, stale acknowledgements and unchanged absolute expiry.
- Chart labels/cells use the existing 1,024-byte bound, tables 80 rows/16 columns,
  keys 80 characters with prototype-related keys rejected, finite numeric fields,
  ordered zoom endpoints and boolean flags. Shared constants preserve backend
  limits. Browser normalization copies accepted fields/cells and drops an invalid
  optional chart entirely. No renderer, numerical algorithm or consumer is changed.

The pre-fix correction run had **17 failures / 44 passes**, reproducing five stale
errors, three accepted-failure idle cases and nine malformed charts. Controls
retained genuine errors and rejected unauthenticated/ambiguous renewal. The final
corrections add **36 cases** beyond the original audit input (**101 new cases**
relative to 3A2). Focused verification passes **18 files / 498 tests**; full
`npm.cmd run verify` passes **123 files / 2,068 tests**, all typechecks, boundaries
and the unchanged **118-module** build and bundle sizes recorded above.

The implementation task reran both original auditor scripts unchanged. All five
stale-error variants now return `request_cancelled`; the control retains
`provider_auth`. Malformed chart data disappears while clean text survives.
Near the old idle deadline, synthetic `provider_busy` now leaves the browser and
backend live, with a newer idle deadline and **zero close requests**. The liveness
check remains read-only `authorize()`. These scripts used **34 owned loopback
provider requests**, **zero Authorization headers**, **zero actual cloud requests**.
The committed native HTTP fixture also covers this idle boundary. This is local
protocol evidence, not real-model or browser UI verification.

Additional temporary evidence: `t-lab-chunk-3a3-correction-red.log`,
`t-lab-chunk-3a3-corrected-focused-all.log`, `t-lab-chunk-3a3-corrected-verify.log`,
`t-lab-chunk-3a3-corrected-probes.jsonl` and
`t-lab-chunk-3a3-corrected-idle-probe.jsonl`. Original audit files remain intact.

## Independent re-audit and commit gate

The existing `Audit AI Tutor connections` task (GPT-6 Astra, Extra High) returned
**PASS: P0 0 / P1 0 / P2 0 / P3 0**, closing all three original findings with no
new actionable regression. It independently passed **19 files / 588 tests**,
all typechecks and import boundaries, reran the unchanged original HTTP probes,
and added 27 chart-boundary cases plus four loopback API activity checks. Invalid
proof reveals no activity; malformed requests and unmatched cancellation do not
renew it; matched cancellation does; reading activity is not keepalive. No real
key or external model request was used.

All **25/25** corrected hashes, the exact path set, empty index and baseline
matched before and after audit. The implementation task independently confirmed
these before recording the verdict. No subsequent runtime/test change occurred;
only this verdict and next-gate metadata were updated. External evidence is
`chunk-3a3-reaudit.md`, start/final snapshots, focused/typecheck logs, original
probe outputs and `chunk-3a3-reaudit-boundary-probes.mjs` / `.jsonl` in the
dedicated audit directory. Earlier evidence remains preserved. The full-suite
and build evidence is the implementation task's result, inspected by the auditor;
its independent rerun was focused. Browser/UI and live-model limitations above
still apply.

Next gate: commit `Add Tutor connection provenance and guarded client` locally,
then implement and independently audit 3B. The full feature and independent
overall audit must pass before push/demo deployment.
