# AI Tutor Connections v1 — Chunk 3B evidence

Date: 2026-09-25
Status: **Independent audit PASS; P0/P1/P2/P3 all zero**
Baseline: clean local `main`, `322e7786fba7cfd4ecf2ee44027bd9004ba55e24`
Scope: lazy shared settings, Host connection ownership and ODE personal sending.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md#current-chunk-3b-checkpoint).

## Implemented behavior and ownership

`tutorConnectionSettings.ts` owns inline settings inside the existing Tutor frame.
The initial form contains no key field. Explicit enablement must complete the
local-origin and compatible backend handshake before credential entry appears.
The six provider families use fixed destination previews; Kimi has no preselected
region. Local server URLs remain loopback-only under existing server policy.

Save clears the key input synchronously before calling the runtime, including
failed requests. Destination changes, expiry and disposal also clear it. The
form and runtime do not persist credentials, proof or request handles in Store or
browser storage. Save performs only local configuration. Discover requests model
metadata; Test uses a synthetic prompt; actual Send includes authorized history
and fresh eligible Lab context. Copy explains these different actions and the
limits of verification, final-text-only models and separately managed proxies.

Catalog choices show reported availability and disable unavailable/unloaded rows.
An exact model ID remains possible when discovery is partial or unavailable.
Editing a model invalidates use/test until selection is saved; verification must
then be repeated. Only a tested exact candidate can be activated. Failed tests
preserve the active connection and conversation.

The new `/api/personal/model` operation is necessary after a key has been cleared
from the form: it updates only an existing candidate's validated model ID while
retaining its credential privately on the backend. Exact proof, generation and
candidate identity are required. The old candidate becomes invalid; its work is
cancelled, the replacement is untested, and active chat is unchanged. The closed
body accepts no provider, destination or key. The operation makes no provider
request. Provider base constants moved unchanged into shared contracts so the UI
preview and server policy have one owner.

The Host constructs a tab runtime through the lazy panel module on first open,
retains it across close/navigation and disposes it on Host teardown or
non-persisted pagehide. Settings disposal clears form state and cancels its work,
without disconnecting the shared selected connection. Pure sessions contain only
the established nonsecret provenance. The shared panel keeps its existing
Lab/context/transcript checks and routes personal messages through the guarded
sender; the explicit default selection uses the existing legacy client.

History decisions reuse the single-use runtime review, bound to transcript and
destination identity. Start fresh receives focus by default; Transfer and Cancel
require explicit action. Other-Lab history remains gated by its own choice.
Disconnect keeps the transcript and disables personal Send. Returning to default
requires an explicit history choice. No provider failure retries or falls back.

The existing frame owns transcript scrolling and the mobile modal. Settings have
their own scroll container and operation/revision guards. Fixed error codes map
to English copy in `tutorConnectionCopy.ts`, without raw provider error text.
Complete-response waiting and cancellation are visible. Cancel preserves the user
question and does not add assistant/error transcript content.

## Verification

- Four new candidate-model tests failed before implementation and passed after it.
  They cover credential retention, old candidate/lease invalidation, active-chat
  preservation, proof/generation/model rejection and the key-free browser payload.
- Initial focused check: 7 files / 165 tests. Final browser corrections passed
  2 files / 39 tests. The full suite includes all focused owners.
- Final `npm.cmd run verify`: **124 files / 2,091 tests**, all workspace/API
  typechecks, import boundaries and the **122-module build** passed.
- New UI tests use the actual frontend runtime with injected synthetic fetch.
  They cover hosted/LAN/incompatible handshakes, all cloud form families, explicit
  Kimi region, key clearing, discovery and model change, all history choices,
  stale consent, failed replacement, cancellation, expiry and pre-solve access.
- Browser review found an offscreen history choice after activation review and
  focus falling to the document after hiding Cancel. Choices/progress/errors now
  reveal within the settings scroll container, and chat cancellation restores
  composer focus. The focus regression failed before its fix. A fake-clock case
  verifies expiry clears/removes key entry and invalidates personal reviews.
- `git diff --check` passed. No dependencies, numerical algorithms, expression
  execution, safe math renderer, chart contract or hosted API route changed.

Temporary logs: `t-lab-chunk-3b-model-red.log`, `t-lab-chunk-3b-model-focused.log`,
`t-lab-chunk-3b-ui-focused.log`, `t-lab-chunk-3b-focus-red.log`,
`t-lab-chunk-3b-browser-fixes-green.log`, `t-lab-chunk-3b-verify-final.log`.

## Native Windows browser and bundle evidence

Owned dev and production-preview servers use real local session/routes/adapters,
an owned loopback model fixture, and a synthetic default chat handler. Environment
files are disabled for these Vite servers. An explicit fixture guard rejects any
provider transport except the exact owned local server. A browser deny proxy
blocks external traffic. No real API key, cloud model or existing local AI server
was used, and no model was loaded/unloaded/downloaded.

Chrome evidence covers 1440 x 1000 and 390 x 844, Light/Dark, keyboard focus,
pre-solve settings, key clearing, Kimi region changes, local discovery/selection,
test/use, fresh/transfer/cancel, successful complete reply, provider-busy errors,
failed candidate preservation, held-request cancellation, disconnect, explicit
default selection and in-app Home/Resume. The selected local connection and four
transcript messages survived close/navigation/Resume. Disconnect preserved them
and disabled Send; explicit default Start fresh cleared them.

On mobile, one modal remains active, Tab wraps to Close, Escape restores the
launcher, and composer/actions fit inside the frame without horizontal overflow.
The history-choice section is visible with Start fresh focused at both widths.
Cancellation restored focus to the composer and kept three earlier messages plus
the unanswered user question. Browser resource observations contain only the
frontend origin, no script errors and no CSP violations. Storage contains only
the existing theme preference after choosing Dark; no session-storage entries.
The 22 model fixture requests use only `GET /v1/models` and
`POST /v1/chat/completions?autoload=false`, all without Authorization; two held
requests were closed after cancellation. Blocked Chrome background-service
attempts are distinguished from application resource traffic.

The build manifest/Rollup ownership graph keeps settings, connection runtime and
networking in the first-open Tutor boundary, with no static ODE dependency. Home
actually loads only its entry script. Measured raw/gzip sizes in kB:

| Chunk | Raw | Gzip |
|---|---:|---:|
| Entry | 60.19 | 18.62 |
| Tutor | 42.33 | 13.73 |
| Tutor CSS | 8.36 | 2.12 |
| Shared Tutor constants | 1.05 | 0.50 |
| ODE | 424.41 | 128.77 |
| Linear Systems | 75.80 | 22.63 |

Existing large deferred math chunk warnings remain. No manual chunking was added.
Artifacts are in `t-lab-chunk-3b-browser/` under the task temporary directory:
server fixture, screenshots, resource/focus observations, model/cancellation
records and `bundle-graph.json`. Browser automation refs did not automatically
scroll clipped controls, and its select helper omitted native input events;
actual keyboard focus/Enter/Home/End actions completed these checks. These are
harness limitations, not ignored application failures.

## Independent audit

The dedicated **Audit AI Tutor connections** task, configured as **GPT-6 Astra,
Extra High**, returned **PASS**, P0 0 / P1 0 / P2 0 / P3 0. No fix was requested
or applied. It independently passed seven focused files / 167 tests, frontend,
numerics, contracts and API typechecks, import boundaries, diff checks and an
in-memory production build. The entry/Tutor static closures preserve their
required boundaries. It inspected the parent's complete 2,091-test verification
log without rerunning that full suite.

Its separate in-app browser exercised pre-solve/local capability gating, native
Kimi required-region validation, discovery/model selection/testing, activation,
personal replies, both transfer directions, mobile focus/geometry/cancellation,
disconnect and Home/Resume. Nine additional model requests reached only the owned
loopback fixture, all without Authorization. Browser logs were empty. This is
independent browser evidence; the parent's Chrome deny-proxy, Light/Dark and
storage checks remain inherited evidence where not explicitly repeated.

The auditor verified the exact main baseline, empty index and all 23 frozen
paths/hashes at start and finish. The implementation task independently rechecked
them before these verdict-only documentation updates. A status-channel transport
interruption was recovered in the same task, preserving completed evidence and
performing remaining closeout only. The audit report and snapshots are preserved
externally as `chunk-3b-audit.md`, `chunk-3b-start-snapshot.json` and
`chunk-3b-final-snapshot.json`. No runtime change followed the pass.

## Limits and next gate

No live provider/model readiness or deployed-demo claim is made. Linear Systems
Tutor is phase 4; both-Lab and overall offline acceptance remain later gates.
Responsive QA opens the panel at the tested width. The existing Host chooses
mobile presentation on open; resizing an already open desktop panel requires
reopening it. Automatic presentation reconciliation was not added in this chunk.
The earlier beforeunload hard-navigation automation limitation remains; this
round verifies in-app navigation and explicit browser/session closure.

Next: create the authorized local commit `Add local AI connection settings to Tutor`.
No subsequent chunk, push, remote contact or deployment before its gate.
