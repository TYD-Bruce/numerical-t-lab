# AI Tutor Connections v1 — Chunk 2A Review

Date: 2026-09-25
Phase: **Local-compatible and OpenAI provider adapters**
Status: **Independent re-audit PASS — local commit boundary**
Baseline: clean local `main`, `f36cfc111aa3a44f57335babb6d39ad75909afa2`
Production impact: **none; local implementation only, no remote operation**

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md),
[feature handoff](../tutor/HANDOFF.md).

## Implemented boundary

`backend/src/ai/providers/providerAdapters.ts` adds the local-compatible Chat
Completions and OpenAI Responses protocols over the existing leased native
transport. It owns discovery projection, provider payloads, a fixed synthetic
test prompt and bounded final-answer extraction. Other providers remain 2B/2C.

With explicit `T_LAB_PERSONAL_TUTOR=true`, the local API now accepts exact POST
routes `/api/personal/discover` and `/api/personal/test`. Both require existing
same-origin/proof checks and an exact body of `generation`, `candidateId`,
`requestId`. No caller prompt, history, context, key or destination is accepted
on those operations. Stage owns configuration and sends no provider request.
Bootstrap advertises only `local` and `openai`; unsupported families fail before
network access. Successful current tests permit separate explicit activation.

The session owner retains credential/expiry/candidate/active authority. The
route owns leases and marks a candidate tested only after successful final text
and current-identity checks. Every route finishes its lease. HTTP caller closure
now propagates abort to provider work; explicit cancel, replacement and expiry
retain the same stale-result protection. A failed candidate cannot replace the
previous active connection. Test replies expose session status, not model text.

`completeWithProvider` is a tested backend-only completion port. The personal
chat HTTP route remains absent until the later profile/context/history-aware
handler. No general prompt proxy, browser settings/key-entry UI or Linear
Systems Tutor binding is added here. Legacy `/api/chat`, hosted packaging,
safe rendering, numerical code and dependency versions are unchanged.

## Protocol and privacy decisions

- Discovery projects only a validated exact model ID and availability. It does
  not copy paths, arguments or arbitrary model metadata. Listed IDs are not a
  claim of chat capability, loaded weights or model accuracy.
- Before local inference, read `/v1/models` without reload or management calls.
  Explicit unloaded/loading/sleeping/unavailable states prevent inference.
  Only unsupported discovery (HTTP 404/405/501) permits a manual exact ID without
  metadata. Auth, redirect, malformed data and network failures remain failures.
- Local completion always uses `/v1/chat/completions?autoload=false`; the native
  request now preserves this policy-owned query. A synthetic race fixture
  unloads the model after its metadata response and verifies no autoload.
  This protects llama.cpp's documented process-loading path. Bare compatible
  listings cannot attest loaded weights, and separately administered servers
  may ignore the parameter or control sleep/wake themselves. There is no atomic
  guarantee of their internal lifecycle. T-Lab never sends load/unload/reload.
- OpenAI uses `/v1/responses`, `store:false`, non-streamed output and a separate
  instructions field. Retained assistant history has `phase: final_answer`.
  There is no automatic retry, region/provider/model fallback or ambient key.
  Credentials remain in provider-specific headers, never URL/body fields.
- Local output requires exactly one complete assistant choice. OpenAI output
  uses completed final assistant message `output_text` parts, skipping commentary
  and non-message reasoning/tool items. Reasoning-only/tool-only, refusal,
  truncated, empty and malformed output fail with fixed public errors. Recognized
  inline think tags also fail; no raw response stringification or reasoning
  stripping is used. Optional JSON text remains text for the later existing
  safe Tutor normalizer; no new arbitrary renderer is introduced.

## Bounds

| Owner | Implemented ceiling |
|---|---|
| Adapter discovery | 256 models; exact unique IDs |
| Adapter prompt | 40 user/assistant messages; 32 KiB serialized prompt |
| Adapter final text | 32 KiB; reject overflow rather than truncate |
| Synthetic test | 1,024 local / 2,048 OpenAI output tokens; short fixed greeting |
| Backend completion port | 4,096 output tokens |
| Existing transport | 15 seconds per discovery/readiness request; 90 seconds per inference; 1 MiB outbound body; 2 MiB response |
| Existing personal HTTP | 16 KiB configuration/control body; bounded receipt timeouts |

Output tokens can include reasoning. These byte and output ceilings do not
promise every model has sufficient context. No token estimator, silent history
truncation or numerical-evidence truncation is introduced.

## Verification

Focused command:

```text
npm.cmd run test:run -- backend/src/ai/providers/providerAdapters.test.ts backend/src/ai/providers/providerTransport.test.ts backend/src/localTutorProviderRoutes.test.ts backend/src/localTutorRoutes.test.ts backend/src/localTutorSession.test.ts backend/src/localTutorPolicy.test.ts backend/src/localApiServer.test.ts backend/src/ai/chatAdapter.test.ts backend/src/ai/chatPackaging.test.ts
```

Final correction result: **9 files / 263 tests passed**. New coverage is 66 adapter cases and
8 actual loopback HTTP integration cases. Existing policy/transport expectations
were updated for the deliberate autoload query contract; they still check exact
destinations. Hosted adapter and packaging regressions pass unchanged.

The adapter test initially failed to load because its implementation was absent.
After adding that implementation, two assertions used a matcher unavailable in
the installed Vitest; replacing it with the equivalent call-count and argument
assertions resolved that harness error. The eight new HTTP integration cases
failed before route wiring. The assistant-history phase regression also failed
before the explicit phase field was added. No checks were skipped or weakened.

Native loopback fixtures exercise stage/discover/test/activate, exact schemas,
proof, failed candidate preservation, user-requested retry, stale completion,
caller cancellation and model-unload races. Simulated native HTTP/HTTPS sockets
exercise actual transport option/body construction, pinned TLS identity,
credential headers and one inference attempt on timeout/429/500/503 for both
providers. No real DNS/provider/model request, paid inference, credential use
or model management was performed. Test fixtures close during cleanup.

Final correction `npm.cmd run verify`: **114 files / 1,653 tests passed**, frontend/numerics/
contracts/API typechecks, import boundaries and production build passed.
Build: 116 modules; entry JS 59.11 kB / 18.31 kB gzip, deferred Tutor 12.14 kB /
4.61 kB gzip, unchanged from 1C. The known deferred math chunk-size warnings
remain. This backend-only chunk adds no browser claim; [1C browser evidence and
its hard-navigation automation limitation](2026-09-25-ai-tutor-connections-chunk-1c.md)
remain recorded separately.

Temporary local evidence: `t-lab-chunk-2a-fixed-focused.log`,
`t-lab-chunk-2a-fixed-verify.log`, `t-lab-chunk-2a-empty-tools-red.log`,
the initial focused/full logs, `t-lab-chunk-2a-adapters-red.log`,
`t-lab-chunk-2a-http-red.log`, `t-lab-chunk-2a-phase-red.log`, and the intermediate
adapter/typecheck logs in the OS temporary directory. These prove fixture and
local checkout behavior, not a live provider's current readiness.

## Primary-source cross-check

- [llama.cpp server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md):
  model metadata, compatible chat and router autoload behavior.
- [llama.cpp server routes](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/server.cpp)
  and [router implementation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/server-models.cpp):
  read-only model listing and the autoload opt-out, including its lifecycle limits.
- [OpenAI Responses types](https://github.com/openai/openai-node/blob/master/src/resources/responses/responses.ts):
  final-answer phase, output items/status, `store` and reasoning-inclusive output budget.
- [OpenAI model listing](https://developers.openai.com/api/reference/resources/models/methods/list)
  and [structured output guidance](https://developers.openai.com/api/docs/guides/structured-outputs):
  model enumeration is not a per-model optional-feature guarantee.

## Independent audit and next gate

The first read-only review by `Audit AI Tutor connections` using GPT-6 Astra,
Extra High returned **NEEDS_FIXES: P0=0, P1=0, P2=1, P3=0**. It independently
passed 255 focused tests, API typecheck and import boundaries, checked the
protocol sources, and reproduced the P2 through actual loopback HTTP. All 21
file hashes and paths matched before/after review; the implementation task
independently confirmed that snapshot before making corrections.

**P2 — empty tool-call list compatibility:** a truthiness test incorrectly
rejected a normal complete local response containing `tool_calls: []`, blocking
connection testing and activation. The corrected check accepts absent/null/empty
lists and rejects nonempty lists or malformed present values. Eight new adapter
cases cover those shapes; the normal HTTP fixture now returns an empty list.
The red run failed eight cases (including four HTTP assertions) before the
two-line runtime correction. The final focused and full commands above pass.
Initial full evidence was 114 files / 1,645 tests; eight added cases bring it
to 1,653. No tool execution or provider scope was added.

Independent report and reproduction are in the task-owned temporary directory
`numerical-t-lab-audit-01a0d978`, files `chunk-2a-audit.md` and
`chunk-2a-empty-tools-repro.jsonl`. The
[OpenAI compatible message type](https://github.com/openai/openai-node/blob/master/src/resources/chat/completions/completions.ts)
permits the empty array; this finding does not claim a live server was exercised.

Independent re-audit returned **PASS: P0=P1=P2=P3=0**, closing the P2.
The auditor repeated 263 focused tests, API typecheck, boundaries and its real
HTTP reproduction: omitted/null/empty lists pass; actual tools and malformed
lists remain rejected. Its report is `chunk-2a-reaudit.md` in the same temporary
directory. The complete 21-file v2 snapshot matched before/after audit, with no
extra paths or staged changes. The implementation task independently verified
all hashes and unchanged baseline before recording this verdict. Subsequent
changes are limited to verdict and next-gate documentation.

Coherent local commit boundary:
`Add local and OpenAI Tutor adapters`.

Next chunk after PASS and local commit: **2B — native Anthropic and Gemini**.
Continue all planned UI, both-Lab, offline and release gates. No chunk push;
the independent overall feature audit must pass before push and Vercel update.
