# AI Tutor Connections v1 — Chunk 2C Review

Date: 2026-09-25
Status: **Independent audit PASS — local commit boundary**
Baseline: clean local `main`, `fd14abcff6a2192a95248d30a5446b89d37af1f6`
Production impact: **none; local implementation only**

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md),
[feature handoff](../tutor/HANDOFF.md).

## Implemented change

The existing backend adapter supports DeepSeek and both explicit standard Kimi
destinations. Together with 2A/2B this completes the requested provider-family
adapter scope. Personal chat HTTP, settings and both-Lab integration remain later
chunks; an implemented adapter is not an end-to-end feature or live-model test.

| Destination | Discovery / completion | Output-budget field |
|---|---|---|
| DeepSeek, `api.deepseek.com` | `/models`, `/chat/completions` | `max_tokens` |
| Kimi international, `api.moonshot.ai` | `/v1/models`, `/v1/chat/completions` | `max_completion_tokens` |
| Kimi mainland, `api.moonshot.cn` | `/v1/models`, `/v1/chat/completions` | `max_completion_tokens` |

These use the existing fixed HTTPS presets and Bearer headers through the native
bounded transport. A selected credential never crosses to another provider or
region, even after redirect, authorization failure, throttling, server error or
timeout. There is one attempt and no automatic retry or fallback. Local-only
`autoload=false` never appears on a cloud request.

Synthetic tests send the fixed greeting with no Lab history/context and 2,048
output tokens; backend completions remain capped at 4,096. Payloads contain only
system/user/assistant final text, the exact model, budget and `stream:false`.
They do not assume optional temperature, tools, thinking or structured-output
parameters. The shared compatible-chat parser preserves final text (including
optional JSON text) while excluding reasoning fields and rejecting tool-only,
refused, empty, malformed or incomplete replies. Error envelopes cannot pass as
valid completions. DeepSeek resource exhaustion reports `provider_busy`; its
`aborted` finish reports `response_incomplete`, not caller cancellation. Public
incomplete copy now covers interruption and context limits without attributing
every incomplete answer to an output limit.

Discovery uses one bounded `data[].id` catalog and the shared projected
`{ models, hasMore }` DTO. The documented unpaginated endpoints return
`hasMore:false`; duplicate, malformed and more-than-256 lists fail rather than
being silently truncated. Bare IDs and capability flags do not prove readiness.

## Model compatibility boundary

Kimi's current thinking guidance requires preserved historical reasoning for
`kimi-k3`, `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`. This Tutor's approved
history contains final answers only. The adapter therefore marks those exact
IDs unavailable in discovery and rejects manual testing/completion before
inference, with a fixed `model_unsupported` explanation. It does not retain,
synthesize or transfer hidden reasoning, or silently change the selected model.
The guard follows documented requirements; no live request established whether
missing reasoning would be rejected or merely reduce reasoning continuity.

`kimi-k2.6` does not preserve historical reasoning by default. Other IDs remain
testable candidates. This small exclusion is not an exhaustive model registry;
future IDs require protocol evidence and a successful greeting cannot guarantee
multi-turn behavior, mathematical accuracy or adequate reasoning budget. The
settings chunk must expose these limits. Native preserved-thinking support is
not implemented by this version. Both Kimi destinations use the standard API;
Kimi Code Plan endpoints are outside scope.

## Verification

New `cloudCompatibleAdapters.test.ts`: **103 cases**, covering provider-specific
payloads, final-text-only history, refusal/incomplete/malformed/error replies,
reasoning filtering, tool-call shapes, explicit keys with ambient keys seeded,
input/output/catalog bounds, model exclusions, late candidate/region replacement,
exact native HTTP options, session testing/activation and active preservation
after failures. Mocked DNS/HTTPS sockets verify TLS identity, Bearer headers and
single attempts for each destination on 302/401/403/429/500/503/timeout.

Tests were added first: the initial run failed 103 new cases plus the expanded
bootstrap capability expectation. After implementation, all 257 adapter/route
tests passed. The prior unsupported-provider test now supplies an unknown
provider instead of treating implemented DeepSeek as unsupported.

Focused command:

```text
npm.cmd run test:run -- backend/src/ai/providers/cloudCompatibleAdapters.test.ts backend/src/ai/providers/nativeProviderAdapters.test.ts backend/src/ai/providers/providerAdapters.test.ts backend/src/ai/providers/providerTransport.test.ts backend/src/localTutorProviderRoutes.test.ts backend/src/localTutorRoutes.test.ts backend/src/localTutorSession.test.ts backend/src/localTutorPolicy.test.ts backend/src/localApiServer.test.ts backend/src/ai/chatAdapter.test.ts backend/src/ai/chatPackaging.test.ts
```

Result: **11 files / 437 tests PASS**. API typecheck passed separately.
Full `npm.cmd run verify`: **116 files / 1,827 tests PASS**, all typechecks,
import boundaries and build passed. Frontend build remains 116 modules, entry
JS 59.11 / 18.31 kB gzip and deferred Tutor 12.14 / 4.61 kB. Existing deferred
math chunk-size warnings remain. No frontend source, numerical, dependency or
hosted API behavior change was made.

Evidence in OS temporary storage: `t-lab-chunk-2c-red.log`,
`t-lab-chunk-2c-adapters.log`, `t-lab-chunk-2c-focused.log`,
`t-lab-chunk-2c-api-typecheck.log`, `t-lab-chunk-2c-verify.log`.
New fixtures use injected replies or simulated native sockets. Existing loopback
HTTP fixtures remain in the focused suite. No real provider/model calls, real
credentials, model management or browser/deployment checks occurred. The 1C
[browser evidence and automation limitation](2026-09-25-ai-tutor-connections-chunk-1c.md)
remain separately recorded.

## Primary-source cross-check

- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)
  and [List Models](https://api-docs.deepseek.com/api/list-models/): request budget,
  catalog IDs, separate final/reasoning fields and documented finish reasons.
- Kimi [international](https://platform.kimi.ai/docs/api/chat) and
  [mainland](https://platform.kimi.com/docs/api/chat) Chat Completions: regional
  endpoints, Bearer authentication, current budget field and final text.
- [Kimi model list](https://platform.kimi.ai/docs/api/list-models): catalog fields
  and non-interchangeable regional keys.
- [Kimi thinking models](https://platform.kimi.ai/docs/guide/use-thinking-models):
  model-specific historical-reasoning requirements and K2.6 default behavior.

These were public documentation reads, not provider inference or discovery.
Documentation-site redirects do not change the reviewed fixed API destinations.

## Independent audit and next gate

`Audit AI Tutor connections` (GPT-6 Astra / Extra High) returned **PASS**, with
P0/P1/P2/P3 all zero. It independently passed 437 focused tests, API typecheck,
import boundaries and diff/documentation checks, and reviewed the full verify log.
It independently cross-checked the primary protocol sources and found the Kimi
exact-ID compatibility exclusions consistent with the final-answer-only design.

The audit began and ended on the stated main baseline with an empty index and
the exact 15 task paths. All frozen file hashes matched before and after. The
implementation task independently verified the manifest digest, every path and
file hash, branch/HEAD and empty index before adding final verdict metadata.
No runtime change followed the pass. External audit evidence is recorded as
`chunk-2c-audit.md` and `chunk-2c-final-snapshot.json` in the auditor's temporary
report directory; the frozen manifest is `t-lab-chunk-2c-audit-manifest.json`.

Next: the authorized local commit `Add DeepSeek and regional Kimi Tutor adapters`,
then implement and audit chunk 3A. Every
remaining chunk and the independent overall audit must pass before push and
Vercel demo update.
