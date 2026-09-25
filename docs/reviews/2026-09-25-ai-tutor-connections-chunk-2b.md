# AI Tutor Connections v1 — Chunk 2B Review

Date: 2026-09-25
Status: **Independent audit PASS — local commit boundary**
Baseline: clean local `main`, `74a07735c84a2b24088f5a6b75cfddcfb2e08c9a`
Production impact: **none; local implementation only**

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md),
[feature handoff](../tutor/HANDOFF.md).

## Implemented change

The existing backend adapter owner now supports native Anthropic Messages and
Gemini generateContent. Bootstrap advertises those providers alongside local
compatible and OpenAI. Both reuse the existing explicit local session, candidate
testing/activation, proof, credential, expiry, cancellation and bounded native
transport owners. There is no new SDK, dependency or general agent framework.

| Provider | Request | Final answer |
|---|---|---|
| Anthropic | `/v1/messages`; separate `system`, user/assistant messages, explicit `max_tokens`, `stream:false`; existing `x-api-key` and version headers | Complete assistant message text blocks; thinking/redacted thinking excluded; both refusal signals handled |
| Gemini | `/v1beta/models/{id}:generateContent`; native system instruction/content parts, user/model roles, one candidate and explicit output limit; existing header-only key | One completed `STOP` candidate; text parts only, thought content/signatures excluded |

Synthetic tests use the existing fixed greeting, no Lab context/history, and
2,048 output tokens. Internal completion remains capped at 4,096. Optional
thinking controls, tools, beta features and structured-output parameters are
not assumed to work on every model. Native final-text fragments are concatenated
without inserted characters, preserving optional JSON text for the later safe
Tutor normalizer. No model-generated code or tool call is executed.

Refused, incomplete, empty, malformed, reasoning-only and tool-only answers
return controlled errors. Anthropic recognizes `stop_details.type=refusal` as
well as its refusal stop reason; context/output-limit termination is incomplete.
Gemini checks prompt blocking and candidate finish reasons and rejects malformed
thought flags instead of treating them as final text. Keys, raw error bodies,
reasoning and signatures never become the response text.

## Discovery contract

`TutorModelDiscovery` now returns `{ models, hasMore }`; the existing HTTP
`models` field is preserved and gains the boolean marker. Local/OpenAI continue
their unpaginated discovery. Anthropic/Gemini request one bounded first page,
using fixed policy-owned `limit=256` / `pageSize=256`. The same
`PROVIDER_MODEL_LIMIT` feeds adapter validation, avoiding competing ceilings.

Anthropic IDs and Gemini native model names are projected to the existing
candidate DTO. Explicit Gemini method metadata without `generateContent`
marks the candidate unavailable; absent capability metadata makes no stronger
claim than listed. Malformed/duplicate/oversized model lists fail rather than
silently truncate. Gemini can omit an empty protobuf repeated field, so `{}`
is a valid empty page; an error envelope is not.

`has_more` and `nextPageToken` are reduced to `hasMore` after type checks.
Cursors, descriptions and other provider metadata are neither exposed nor
followed. One explicit discovery action makes exactly one request. The later
settings UI must identify incomplete lists and permit exact model-ID entry;
model testing does not require discovery or a match in the first page.

## Scope and limits

- Existing destination pinning, DNS/TLS checks, redirects, header authentication,
  request/response/time ceilings, no ambient key and no automatic retry remain.
- Adapter limits remain 40 messages and 32 KiB prompt/final text. They are not
  a tokenizer or a guarantee that every model has enough context/output budget.
- DeepSeek and both Kimi regions remain chunk 2C. The personal chat HTTP route,
  browser key UI, history transfer and Linear Systems Tutor remain later chunks.
- No numerical, frontend runtime, dependency, legacy hosted chat or deployment
  change. Existing local readiness/autoload protections remain intact.
- No real provider/model calls, credentials, DNS resolution or model management
  were used. Synthetic fixtures do not prove live-provider readiness or accuracy.

## Verification

Focused command:

```text
npm.cmd run test:run -- backend/src/ai/providers/nativeProviderAdapters.test.ts backend/src/ai/providers/providerAdapters.test.ts backend/src/ai/providers/providerTransport.test.ts backend/src/localTutorProviderRoutes.test.ts backend/src/localTutorRoutes.test.ts backend/src/localTutorSession.test.ts backend/src/localTutorPolicy.test.ts backend/src/localApiServer.test.ts backend/src/ai/chatAdapter.test.ts backend/src/ai/chatPackaging.test.ts
```

Result: **10 files / 334 tests passed**, including **71 new native adapter cases**.
The initial 68 native cases all failed before implementation. That red run also
reported an unhandled failed assertion from the fake-timer timeout case because
the unimplemented provider returned a different error before timer advancement;
the test now captures settlement immediately and asserts afterward. Its final
result checks the same error code and single attempt. No expected behavior was
relaxed to obtain a pass.

Four old expectations initially failed for intentional contract changes: two
discovery shapes, bootstrap's supported-provider list, and the now-implemented
Anthropic negative fixture. They were updated to the new DTO/provider support;
the unsupported-provider regression still verifies DeepSeek makes no request.
Two additional tests bound native model lists. A separate focused red test then
reproduced an error envelope being accepted as empty Gemini discovery; it passes
after the common model-list parser rejects error envelopes.

Native tests exercise payloads/history roles, fixed synthetic data and budgets,
final text/JSON fragments, refusals, incomplete/blocked/malformed content, private
thinking exclusion, input/output bounds, explicit credentials, stale candidate
replacement and pagination projection. Simulated native HTTPS sockets exercise
the real route handler/session/transport chain for discovery, testing and
activation, including exact URLs, DNS/TLS options and header-only authentication.
These are socket mocks, not real remote HTTP. Existing loopback HTTP tests cover
the unchanged listener/proof/caller-abort boundary. Timeout/429/500/503 fixtures
verify one inference attempt for each native provider.

Final `npm.cmd run verify`: **115 files / 1,724 tests passed**, all frontend/
numerics/contracts/API typechecks, import boundaries and production build passed.
Build remains 116 modules; entry JS 59.11 / 18.31 kB gzip, deferred Tutor 12.14 /
4.61 kB. Existing deferred math chunk-size warnings remain. No new browser check
is claimed; [1C's browser evidence and automation limitation](2026-09-25-ai-tutor-connections-chunk-1c.md)
remain separately recorded.

Temporary evidence: `t-lab-chunk-2b-native-red.log`,
`t-lab-chunk-2b-first-focused.log`, `t-lab-chunk-2b-discovery-error-red.log`,
`t-lab-chunk-2b-focused.log`, `t-lab-chunk-2b-api-typecheck.log`,
`t-lab-chunk-2b-final-verify.log`. The earlier full verify passed 1,723 tests;
it was repeated after the error-envelope correction, producing the final 1,724.

## Primary-source cross-check

The following primary sources were checked during this chunk's preparation:

- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create)
  and [Messages SDK types](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/src/resources/messages/messages.ts):
  request roles/system, output blocks, stop reasons and refusal details.
- [Anthropic Models API](https://platform.claude.com/docs/en/api/models/list):
  bounded page size, IDs and `has_more`.
- [Gemini generateContent](https://ai.google.dev/api/generate-content) and
  [SDK types](https://github.com/googleapis/js-genai/blob/main/src/types.ts):
  native content, one candidate, blocking/finish reasons and thought metadata.
- [Gemini Models API](https://ai.google.dev/api/models): native model names,
  supported methods and pagination. Enumeration does not guarantee live access.

## Independent audit and next gate

`Audit AI Tutor connections`, GPT-6 Astra / Extra High, returned **PASS**, with
P0/P1/P2/P3 all zero. It independently passed 10 focused files / 334 tests,
API typecheck, import boundaries and diff checks, inspected protocol sources,
and checked the implementation task's full verification log. It did not repeat
the full suite/build or claim a browser/live-provider check.

Before/after audit, all 16 paths and file hashes matched the frozen manifest,
HEAD remained the baseline, and the index was empty. The implementation task
independently verified the same snapshot before recording the verdict. Only
verdict/next-gate metadata changed afterward. Independent report and snapshot
are in the task-owned temporary directory `numerical-t-lab-audit-01a0d978`,
files `chunk-2b-audit.md` and `chunk-2b-final-snapshot.json`.

Coherent local commit boundary:
`Add native Anthropic and Gemini Tutor adapters`.

Then implement **2C — DeepSeek and both standard Kimi regions**. Every later
integration and overall-audit gate remains required before push and Vercel update.
