# AI Tutor Connections v1 — Handoff

Updated: 2026-09-25
Phase: **Chunk 2C — DeepSeek and regional Kimi adapters**
Status: **Independently passed — local commit boundary, chunk 3A next**
Canonical status: the maintainer's continuing goal authorizes the complete
feature sequence, with independent audit/fix/re-audit before each local commit.
Runtime impact: **DeepSeek/Kimi added to local personal discovery/test and backend completion adapters**.

## Current chunk 2C checkpoint

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

Next: commit `Add DeepSeek and regional Kimi Tutor adapters` locally. Chunk 3A follows with
connection/history state and Lab-authored context; personal chat and settings
are still unavailable. The final overall audit remains mandatory before push
and Vercel demo update.

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

The current Tutor is an ODE-specific client of `/api/chat`; its backend uses
deterministic demo replies or an environment-held OpenAI key with a fixed
`gpt-4o-mini` model. There is no personal key/model/endpoint form.
The Linear Systems Lab has no Tutor binding.

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

**Commit the independently passed chunk 2C locally, then implement and
independently audit chunk 3A before its next local commit.**

Provider adapters are locally implemented with documented model limitations;
connection/history UI and both-Lab Tutor integration follow in separate rounds. No per-chunk
push or deployment. Keep the latest release record separate from this local work.
