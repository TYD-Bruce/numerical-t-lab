# AI Tutor Connections v1 — Chunk 5B acceptance

Date: 2026-09-26
Status: **Independent audit PASS; local commit gate satisfied**
Baseline: clean local `main`, `72937725379a44c1c00d74ac8f57eb4c331f89f1`
Scope: remaining acceptance evidence, Windows configuration guide and status consolidation.
Runtime impact: **none**; documentation and non-secret `.env.example` comments only.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
User guide: [Local connections](../tutor/LOCAL_CONNECTIONS.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md#current-chunk-5b-checkpoint).

## Acceptance matrix

This matrix combines fresh 5B evidence with identified, previously audited checks
on the same feature. Inherited evidence is not claimed as a new run. The 5A
corrections only changed public HTTP-failure mapping and settings focus recovery;
the complete 5A verification covered the accumulated runtime and tests now at HEAD.

| Requirement | Evidence and result |
|---|---|
| Local-only frontend/backend and guarded personal routes | [1A](2026-09-25-ai-tutor-connections-review-and-chunk-1a.md), [1B](2026-09-25-ai-tutor-connections-chunk-1b.md): native loopback listener, Host/Origin/browser metadata, explicit process opt-in and session proof. Current `localApiServer`, `localTutorPolicy`, session/routes and transport tests remain in the full suite. Hosted adapter omits personal routes. |
| Session-only keys and exact destinations | 1B and [3B](2026-09-25-ai-tutor-connections-chunk-3b.md): backend ownership, no ambient personal key, expiry and input clearing. Fresh 5B Save clears a synthetic key; region changes clear an unsaved synthetic key. Only the existing theme preference appears in browser storage. |
| Offline application assets and real editors | [1C](2026-09-25-ai-tutor-connections-chunk-1c.md) plus fresh 5B cold Home → ODE → Linear browser run: local fonts, actual MathLive typing, successful Run/Solve, settings and complete synthetic local replies under an external deny proxy. |
| Requested provider families / explicit Kimi regions | [2A](2026-09-25-ai-tutor-connections-chunk-2a.md), [2B](2026-09-25-ai-tutor-connections-chunk-2b.md), [2C](2026-09-25-ai-tutor-connections-chunk-2c.md): mocked protocol/socket contracts. Fresh native keyboard choices display every fixed destination; Kimi begins with no region. Changing the form makes no model request or active-selection change. Individual live status is untested in the user guide. |
| Loaded-model-only local operation | 2A native HTTP fixtures cover readiness, unavailable models and a race after listing, with `autoload=false` and no management endpoint. 3B/4B browser discovery covers loaded/unloaded entries. Fresh 5B uses only an owned fixture reporting a loaded model; no real llama.cpp readiness claim. |
| ODE grounding and compatibility | [3A1](2026-09-25-ai-tutor-connections-chunk-3a1.md), ODE binding/context/lifecycle suites and fresh 5B: absent-result Send gating, real expression edit/Run/reply, cancellation, retained previous-success grounding after a rejected draft and mobile route return. Compare remains disabled. |
| Linear current-result grounding | [4A](2026-09-25-ai-tutor-connections-chunk-4a.md), [4B](2026-09-25-ai-tutor-connections-chunk-4b.md), context/binding/integration suites and fresh 5B: pre-Solve gating, result reply, actual matrix edit aborts pending work, matching-input restoration keeps history, successful Solve clears only this Lab's history. Failed-Solve and both reset choices are inherited 4B evidence. |
| Fresh/transfer/cancel and inactive-Lab consent | [3A3](2026-09-25-ai-tutor-connections-chunk-3a3.md), 3B/4B native browser and provenance/client/Store integration suites. Both-Lab switches, explicit transfer and inactive-Lab review were checked in 4B. Fresh 5B checks Start fresh default focus and distinct histories on route return. |
| Close/navigation/reset and two tabs | 4B covers Home/Resume, reopen, both New experiment choices, mobile containment and pending cancellation. [5A](2026-09-26-ai-tutor-connections-chunk-5a.md) covers separate same-origin sessions and disconnect isolation. Fresh 5B returns from Linear to ODE with only its ODE transcript. |
| Expiry, stopped backend and failure states | 5A covers actual backend stop/restart, controlled server-clock expiry, malformed output and full-prompt overflow without another model call; focus recovery and Escape were independently rechecked. Current session/transport/client/settings tests cover timers, stale completions, cancellation and no fallback. Fresh 5B adds explicit ODE cancellation and actual Linear edit cancellation. |
| Desktop/mobile, Light/Dark and safe presentation | 3B/4B/5A browser evidence plus fresh 5B at 1440 × 1000 Light and 390 × 844 Dark. Named single Tutor modal, inert background, visible keyboard focus, contained composer and no horizontal page overflow were observed. This is not a screen-reader device certification. Safe math/response rendering tests remain unchanged. |
| Lazy ownership and hosted packaging | Fresh 5B in-memory Rollup graph and resource timeline; Home excludes Lab/Tutor/math runtime, Linear excludes ODE/eager Tutor, shared Tutor excludes ODE runtime. 4B's isolated emitted function-package test remains in full verification. No deployment is inferred from these checks. |

## Fresh 5B browser evidence

Native Windows Chrome uses an isolated session and an owned loopback fixture
running the actual local API/session/routes/provider adapter. Build, dev and
preview disable environment-file loading. The fixture forces default mock mode,
removes the ambient default key, rejects global provider fetch, and permits
personal transport only to its own synthetic model endpoint. The browser's
external proxy rejects requests and never forwards traffic.

Cold production Home loads only entry JS/CSS, DM Sans and favicon. Nonzero transfer
sizes establish fresh resource loading. ODE navigation loads readonly math;
actual keyboard editing of the MathLive field to `0-y` loads editable/Compute
Engine support, then a successful Forward Euler Run and synthetic Tutor reply
complete. DM Sans, JetBrains Mono, KaTeX Main and KaTeX Math are loaded locally.
Linear then renders its matrix input and factors and receives a profile-specific
local reply without including the ODE transcript.

An actual Linear A11 edit from 3 to 4 closes the pending model request, disables
Send, displays the ineligible-result explanation and retains the prior transcript.
Restoring A11 to 3 re-enables the retained result without clearing history. A
successful Solve then clears it. The mobile Dark reply, modal and composer were
visually inspected. ODE's mobile return contains only its ODE history.

ODE intentionally differs: it explains the previous successful single-method
Run after draft edits or a failed Run. A native `h = 0.3` attempt on `[0, 5]`
shows the existing grid-alignment error, preserves history and keeps that previous
successful Run available to Tutor; a subsequent local reply succeeds. This is
the accepted 3A1 compatibility rule, not current-input Linear grounding. No
numerical contract or eligibility behavior was changed to unify them.

Native provider keyboard selection confirms OpenAI, Anthropic, Gemini, DeepSeek
and both Kimi destination disclosures. Kimi starts with an empty region. Changing
international to mainland clears a synthetic unsaved key while the active local
connection remains selected. The model counter stays at seven throughout these
form choices; the later ODE question is the eighth request.

Final fixture counters: **8 inference requests**, all to the owned synthetic local
server; **3 closed held requests** (one timeout, one explicit ODE cancellation,
one Linear input invalidation); **0 prohibited global fetch attempts**. All model
completions use `autoload=false`. No cloud model, real local model, real key,
private configuration, download or model-management operation was used. Observed
application resource origins are exclusively the local preview; page-error and
CSP arrays and the browser error buffer are empty. Browser background connection
attempts were denied separately and are not application requests.

Evidence is preserved in task temporary storage under `t-lab-chunk-5b-browser`:

- `servers.mjs`, `servers.json`, model/cancellation logs and `final-state.json`;
- `cold-home.json`, `ode-native-editor.json/.png`, `ode-local-reply-verified.json/.png`;
- `linear-before-solve.json`, `linear-local-response.json/.png`,
  `linear-stale-ref-verified.json`, `linear-current-restored.json`, `linear-success-reset.json`;
- `linear-mobile-dark.json/.png`, `ode-mobile-dark-resumed.json/.png`;
- `ode-failed-run-native.json`, `ode-failed-run-history-native.json`,
  `ode-explicit-cancel-verified.json`, `browser-final-evidence.json`;
- provider `*-native.json`, `kimi-mobile-dark.png`, `provider-choices-final-counts.json`;
- `bundle-graph-focus.json` and its inspected generator.

Early automation attempts using unsupported semantic focus, offscreen clicks,
quoted attribute selectors or synthetic select changes were inconclusive. Some
commands reported success without changing the intended control. Final evidence
uses fresh accessibility refs, native keyboard selection, public DOM observations
and server counters. The unsuccessful attempts are retained, not counted as
product passes or defects. In particular, only `linear-stale-ref-verified.json`
establishes the actual matrix-edit cancellation. The ODE timeout artifact is not
misreported as explicit cancellation.

After collection, the owned Chrome session was closed. The fixture process was
matched to its exact script before stopping; all six owned listeners were then
verified absent. No user server or model process was touched.

## Verification and documentation

The current source/test/config runtime equals the independently audited 5A commit.
Its full `npm.cmd run verify` passes **130 files / 2,211 tests**, all typechecks,
import boundaries and the **124-module** build. The final log is
`t-lab-phase-5a-final-verify.log` in task temporary storage. This docs-only chunk
does not rerun that completed suite without a runtime change or new failure.

Fresh 5B production build and in-memory graph checks pass. Graph raw/gzip bytes:
entry **60,209 / 18,628**, Linear route **82,105 / 24,714**, shared Tutor
**43,020 / 13,916**. Static/dynamic closure assertions and native browser resources
confirm the intended loading boundaries. Existing large deferred math warnings
remain; no dependency or manual chunking change was made.

`git diff --check` passes. The 12-file task set contains only documentation and
`.env.example`; all **296** checked local Markdown file/anchor links resolve.

The new user guide distinguishes local/cloud data destinations, supported Windows
setup, loaded-model expectations, consent, session lifetime, offline serving,
model limitations and recovery. `.env.example` documents the existing personal
opt-in and origin allowlist without storing personal keys. AGENTS replaces its
obsolete Linear Day 2 gate with a durable pointer to PLAN. Architecture clarifies
the existing ODE/Linear grounding difference. Status documents distinguish
locally verified work from pending overall audit and release. Numerical contracts,
runtime, tests, dependencies and deployment configuration are unchanged.

## Independent review and next gate

Independent Astra Extra High review returned **PASS — P0/P1/P2/P3 all zero**.
It independently verified the exact 12 paths/raw hashes and empty index at both
ends, checked all 296 links, inspected saved native browser evidence/screenshots
and recomputed graph closures and output sizes. Pure executable probes confirmed
dev/preview proxy configuration, provider targets, six rejected local URLs,
mandatory Kimi region and session/body/prompt limits without network access.
The auditor found no missing required Phase 5 item and accepted the explicitly
inherited evidence for unchanged runtime. It did not rerun the full test suite,
browser workflow or build, and did not claim live-model or release validation.

The parent read the full report, inspected probe source/results and independently
rechecked all 12 frozen hashes before these verdict-only documentation updates.
No runtime, test, guide or other substantive change followed the audit pass.
External report: `numerical-t-lab-audit-01a0d978/chunk-5b-audit.md` in task temporary
storage. Authorized local commit: `Verify AI Tutor connections and both Labs`.

The next separate gate is an independent **overall feature audit** across the
full accumulated commit range and cross-chunk interactions. Only after that pass
may the conditionally authorized push and Vercel update proceed, followed by
actual hosted route/API/asset/mobile verification. Live provider/model readiness
remains untested and is not fabricated from fixture evidence. No push or deployment
occurred in this chunk.
