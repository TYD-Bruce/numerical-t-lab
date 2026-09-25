# AI Tutor Connections v1 — Handoff

Updated: 2026-09-25
Phase: **Chunk 1B — credential sessions and destination policy**
Status: **Independent re-audit PASS — ready for local commit**
Canonical status: the maintainer's continuing goal authorizes the complete
feature sequence, with independent audit/fix/re-audit before each local commit.
Runtime impact: **explicitly enabled local session API and provider transport foundation**.

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
`main` revision; its local changes are the current task's work.

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
4. [Current chunk 1B evidence](../reviews/2026-09-25-ai-tutor-connections-chunk-1b.md)

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
- Google Fonts currently cause external traffic during local use.
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
  `providerOperations: false`. No key form, model adapter, offline/CSP change or
  Linear Systems Tutor is present. Transport tests use synthetic sockets/DNS.

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
was committed. Chunk 1B has now passed its own re-audit before the next local commit.

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

## Current validation and limitations

Chunk 1B passes `npm.cmd run verify`: 111 files / 1,570 tests, all workspace/API
typechecks, import boundaries and the unchanged 115-module browser build.
Four new suites add 143 policy, session, transport and route tests. Existing
HTTP/proxy/HMR and hosted packaging checks pass. A separate native Windows
`dev.ts` opt-out/opt-in probe returned 404/201; task-owned processes were stopped.
No live provider, real browser or deployment validation is claimed.

Local fonts/CSP, complete provider adapters, the key form/history workflow and
Linear Systems Tutor remain unfinished. Google Fonts still requires external
traffic. The complete goal is active; chunk 1B does not satisfy the final gate.

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

**Commit the independently passed chunk 1B locally, then continue to chunk 1C
under the maintainer's continuing goal.**

Chunk 1C covers offline assets/CSP; provider families, connection/history UI and
both-Lab Tutor integration follow in separately audited rounds. No per-chunk
push or deployment. Keep the latest release record separate from this local work.
