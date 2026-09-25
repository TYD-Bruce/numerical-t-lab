# AI Tutor Connections v1 — Design

Date: 2026-09-25
Status: **Chunks through 2A committed; chunk 2B independently passed; chunk 2C next**
Runtime impact of this document: **none**
Starting repository: local `main` at `5bfcf734b27c2a3e7b42cd2f62ca66fad6713751`

The maintainer's 2026-09-25 follow-up authorizes incorporating the external
review and starting one bounded implementation chunk. The continuing goal now
authorizes the full sequence, keeping every chunk's independent review boundary. A subsequent
maintainer instruction requires independent GPT-6 Astra / Extra High audit of
each chunk and authorizes its local commit only after findings are resolved and
rechecked. Push and Vercel demo update are gated on completion of every chunk
and a final independent overall audit. Paid inference remains separately gated.

Related documents:

- [Implementation plan](../plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md)
- [Feature handoff](../../tutor/HANDOFF.md)
- [Review verification and chunk 1A evidence](../../reviews/2026-09-25-ai-tutor-connections-review-and-chunk-1a.md)
- [Chunk 1B evidence](../../reviews/2026-09-25-ai-tutor-connections-chunk-1b.md)
- [Chunk 1C evidence](../../reviews/2026-09-25-ai-tutor-connections-chunk-1c.md)
- [Chunk 2A evidence](../../reviews/2026-09-25-ai-tutor-connections-chunk-2a.md)
- [Chunk 2B evidence](../../reviews/2026-09-25-ai-tutor-connections-chunk-2b.md)
- [Current architecture](../../architecture/CURRENT_ARCHITECTURE.md)
- [Numerical contracts](../../contracts/NUMERICAL_CONTRACTS.md)
- [Linear Systems v1 design](2026-08-10-linear-systems-lab-v1-design.md)

## 1. Agreed product scope

| Decision | Maintainer choice |
|---|---|
| Where personal connections are available | Both frontend and backend must run locally on the same computer |
| Initial supported environment | Native Windows; WSL, containers, and LAN access are deferred |
| Local inference | Already running, already loaded llama.cpp or another compatible chat server |
| Cloud providers | OpenAI, native Anthropic, native Gemini, DeepSeek, and standard Kimi/Moonshot API |
| Cloud destinations | Send credentials, conversation, and authorized Lab context directly to the selected provider |
| Kimi region | Explicit international and mainland-China choices; never switch destinations automatically |
| Credentials | Session-only local backend memory; no browser storage or automatic disk saving |
| Local-model privacy | Strict offline operation, including local fonts |
| Lab coverage | Both the Initial Value Problems and Linear Systems Labs |
| Connection changes | Start fresh by default; user may explicitly transfer history |
| Response delivery | Complete responses, cancellation, and clear progress/error states |

Server launching, downloads, model loading/unloading, agent tools, and operating
the maintainer's other AI clients are outside this feature.

## 2. Verified starting behavior

At the starting commit:

- The frontend calls relative-origin `/api/chat`.
- The shared backend chooses deterministic mock replies or an environment-held
  `OPENAI_API_KEY`, calls the OpenAI Responses API, and hard-codes
  `gpt-4o-mini`.
- No personal connection, model picker, or key-entry form exists.
- `backend/src/dev.ts` sets wildcard CORS and calls `server.listen(PORT)`
  without an explicit loopback host. This is not the proposed local boundary.
- Browser abort/generation checks exist, but the provider fetch has no propagated
  abort signal or explicit timeout.
- The platform already has per-module Tutor sessions and optional Lab bindings.
  The lazy panel still interprets ODE source data directly.
- The Linear Systems route exposes no Tutor binding. Its accepted design
  already requires current-success-only grounding and no chart instruction.
- `frontend/index.html` requests Google Fonts. MathLive CSS is imported through
  the bundler, but complete runtime asset behavior still needs browser evidence.

These are source-inspection findings, not a fresh production or live-provider test.

## 3. Ownership and request flow

Proposed flow:

```text
Lab-owned successful result and context builder
  -> shared lazy Tutor panel
  -> same-origin local T-Lab API
  -> backend connection session and validated provider adapter
  -> selected loopback inference server OR selected cloud provider
```

One connection selection is shared within the current browser tab. ODE and
Linear Systems retain separate conversations, drafts, reset behavior, and
grounding. Separate tabs must not share mutable provider selections or keys.

Ownership remains:

- Lab: eligibility, immutable evidence, fresh context per send, suggestions,
  successful-Run reset notifications, and any existing bounded chart action.
- Platform Host: launcher placement, presentation, focus, modal ownership,
  connect/disconnect, and route lifecycle.
- Lazy Tutor UI: connection form, transcript, user choices, request progress,
  cancel, and errors.
- Backend: credentials, endpoint policy, connection verification, limits,
  provider invocation, prompt selection, output normalization, and redaction.
- Contracts package: serializable requests and responses only.
- Numerical package: unchanged numerical and trace authority.

The shared panel must stop importing domain interpretation as its own authority.
Evolve the existing binding to return a Lab-authored ready/unavailable snapshot
and, when ready, a profile-discriminated serializable request context. Do not
introduce a second authoritative result or duplicate eligibility state.

Request profiles are limited to ODE and Linear Systems in this feature.
Validate the profile/context pairing on the backend before constructing a prompt.
Preserve the existing hosted ODE request behavior during the migration.

## 4. Local-only credential and endpoint boundary

Personal-configuration routes exist only in an explicitly enabled local server.
They are absent from the Vercel adapter. Hiding a form is not enforcement.

Before enabling key entry, the frontend must confirm an eligible local origin
and obtain a capability/session response from its same-origin local API.
The backend independently enforces its local mode, bound address, exact approved
Host and Origin values, and a session-bound request token. Personal operations
require `Sec-Fetch-Site: same-origin`, JSON, and a custom session-proof header.
Reject missing metadata/proof, `Origin: null`, cross-site and same-site requests,
and simple form/text submissions. Fetch Metadata supplements authorization; it
does not authenticate native clients capable of setting arbitrary headers.

Every listener able to reach these routes must be loopback-only: the frontend
dev/preview server, its API proxy, HMR, the backend, and any future local static
server. Reject unsafe CLI/config overrides before listening. The frontend must
check its incoming Host and browser Origin before the proxy rewrites Host;
backend checks remain independent. Forwarded headers are not trusted evidence.

Chunk 1A locks incoming services to IPv4 `127.0.0.1`, with `localhost` accepted
as an HTTP Host alias. Defaults are frontend 5173, preview 4173, API 3001, with
strict frontend ports. The backend's explicit frontend-origin allowlist may
contain only canonical HTTP `127.0.0.1`/`localhost` origins with a port. Direct
JSON CLI calls without browser Origin/Fetch Metadata remain supported only for
the existing `/api/chat`; this exception must never authorize personal routes.
The local HTTP body cap is 1 MiB, with 30-second request-receipt and 10-second
header timeouts. These are transport limits, not model/context budgets.

For outgoing local-model endpoints, accept only explicit HTTP ports at
`127.0.0.1`, `[::1]`, or `localhost`. Normalize `localhost` to `127.0.0.1` for
the actual connection, avoiding a second DNS lookup; IPv6-only servers use
`[::1]` explicitly. Validate the original authority before URL normalization so
integer, octal, hexadecimal, abbreviated and mapped-IP forms cannot normalize
into acceptance. Reject other 127/8 addresses, trailing-dot aliases, backslashes,
URL credentials, queries, fragments, LAN/wildcard hosts, and other schemes.
Restrict paths to the documented API base and read-only discovery/inference
operations. Chunk 1B implements this outgoing policy with a bounded transport.
Chunk 2A exposes explicit local/OpenAI discovery and synthetic testing behind
session proof. Personal chat remains deferred to profile/context/history
integration; the tested completion adapter is a backend-only port.

Cloud connections use fixed, reviewed provider/region presets over HTTPS.
Pin a credential to its selected provider and destination. Reject redirects
rather than forwarding credentials or trying another host. Validate resolved
destinations where hostnames are accepted, including checks against rebinding
and redirects. Do not inherit an ambient credential for another connection.
Missing/expired personal credentials must fail even when matching administrator
environment keys exist. Provider credentials belong in authentication headers,
never URL/query/redirect locations, request IDs, logs, or public errors. Gemini
uses `x-goog-api-key`; compatible chat providers use explicit Bearer headers.

Local session authentication is separate from the provider key. An opaque,
unguessable per-tab session handle may live in frontend runtime memory; the
provider key must not enter AppSessionStore, Lab state, a transcript, a URL,
analytics, logs, browser persistence, or a response body.

After an explicit connection action, transfer the typed key to the local
backend and clear the form field. Keep only masked connection metadata in UI.
On disconnect, replacement, expiry, or backend shutdown, release the key and
abort work owned by that connection. Use both idle and absolute expiry, with
deterministic clock tests. Initial design limits are 30 minutes idle and 8 hours
absolute; only accepted session operations refresh idle activity. Absolute
expiry still applies during activity: abort, release the credential reference,
advance generation, show Expired, and require reconnect. Reload creates a new browser session;
unload cleanup is best effort, so abandoned backend sessions must expire.
Do not promise immediate erasure on tab closure or forensic zeroization of
JavaScript strings. Transient input and the transfer request may remain visible
in browser DevTools or runtime memory instrumentation.

AGENTS records the maintainer's narrow exception to its browser-key prohibition:
transient entry into a verified local form, immediate transfer, no retained
browser key, and no hosted key entry. A loopback listener alone is insufficient
to enable the form; all personal-route/session controls must exist first.

Threat boundary: protect against unintended website access, cross-tab leakage,
misrouting, and accidental persistence. The feature cannot establish that a
user-installed local proxy never forwards data, or protect against a hostile
browser extension, same-user malware, attached debugger, memory-inspecting
process, or compromised local inference server.

## 5. Offline behavior

After dependencies, font assets, and model files are installed, local-model
mode must function without an internet connection.

- Bundle fonts and required licenses locally; remove external font stylesheet
  requests and preconnects. Audit math fonts, sounds, and deferred assets too.
- Frontend requests are same-origin; the local backend permits inference only
  to the selected loopback endpoint in this mode.
- No cloud model discovery, provider ping, telemetry, update check, download,
  or cloud fallback occurs in the background.
- Loading either Lab and opening Tutor must work without internet access.
- Switching to a cloud provider is an explicit mode change, with the destination
  and outgoing data explained before the user initiates a request.

Enforce browser network destinations with a local CSP as part of the offline
asset chunk: provider HTTP calls must originate only from the backend. Audit
all resource directives, local fonts/MathLive and the existing inline theme
bootstrap before enabling enforcement. Production `connect-src` is same-origin;
development may additionally allow its exact loopback HMR WebSocket. Do not
copy `script-src 'self'` blindly or add broad wildcard/unsafe exceptions to make
the current page pass. Chunk 1C implements local fonts and resource CSP: it
hashes the owned bootstrap and keeps a styles-only inline exception for existing
MathLive/Vite/layout CSS. Local response headers also deny embedding. The static
meta policy does not claim to enforce header-only directives. Complete offline
inference remains gated on the later adapters and connection UI.

An offline UI label describes T-Lab's enforced traffic policy. It cannot prove
the internals of an arbitrary local server. A genuine local inference server
with already available model files is required for end-to-end offline use.
A failure to reach it produces a local error, never a cloud request.

## 6. Providers and model verification

Use a small backend adapter layer, not a general agent framework.

Implementation checkpoint: 2A implements local-compatible/OpenAI and 2B adds
native Anthropic/Gemini adapters. DeepSeek/Kimi remain 2C. The table describes
the full approved scope, not current end-to-end UI availability.

| Provider family | Proposed transport |
|---|---|
| OpenAI | Responses API |
| Anthropic | Native Messages API |
| Gemini | Native Gemini API with API-key authentication |
| DeepSeek | Direct provider endpoint using its compatible chat API |
| Kimi/Moonshot | Direct compatible chat API; explicit international/mainland preset |
| Local compatible server | OpenAI-compatible Chat Completions; llama.cpp loaded-state discovery when supported |

Provider-specific request fields, authentication, model enumeration, final-text
extraction, structured-output support, and refusal handling belong in adapters.
Do not assume that shared chat syntax makes all optional parameters compatible.
Do not pass reasoning fields through as learner-facing final answers.
Each adapter extracts only documented final-answer fields; never fall back to
stringifying the raw response. Reasoning-only, tool-only, safety-blocked,
refusal-without-answer, truncated-without-final-text, empty and malformed
responses are explicit failure fixtures. Any usable but truncated answer must
be identified as incomplete, never a successfully completed Tutor response.

Network actions are explicit:

| Action | Permitted outgoing data |
|---|---|
| Edit/configure fields | No provider request |
| Discover models | Selected destination's credentials and model/API metadata; no Lab data/history |
| Test connection | Same metadata plus a synthetic test prompt; no Lab data/history |
| Tutor Send | User message, authorized conversation, fresh eligible context from this Lab |

Connection activation/verification UI must name its network operation before
starting it. Background validation must not turn typing a key into a provider call.

Model discovery lists available chat-capable candidates when the endpoint can
report them. Support exact model-ID entry when reliable discovery is unavailable.
Discovery is not proof that a model is usable or loaded.

Implemented native catalogs use one bounded first page, sharing a 256-model
limit with validation. Discovery returns projected candidates and `hasMore`;
never follow or expose raw cursors. The settings UI must identify an incomplete
list and allow exact model-ID entry. Gemini's explicit generation-method
metadata may exclude unsupported candidates; a bare ID remains only listed.

For llama.cpp router mode, distinguish listed, loaded, unavailable, and loading
states. Use read-only discovery without a reload parameter or management call.
Never start, download, load, unload, or switch the server's active model.
Describe congestion or readiness failures without disrupting another client.

Implemented local protection combines read-only metadata before each inference
with policy-owned `autoload=false` on the actual completion URL. Reject explicit
unloaded/loading/sleeping/unavailable states. A listing without status remains
only server-reported availability. When discovery is unsupported (404/405/501),
allow an exact manual ID with unknown readiness; never mask auth/network or
malformed-data errors. A separately administered server may control sleep/wake
or ignore compatibility parameters; T-Lab cannot attest or atomically enforce
that server's internal lifecycle. It sends no management/reload request.

The explicit Test connection action may issue a small synthetic inference
request to the selected destination, with a visible notice of possible cloud
cost. It sends no existing conversation or experiment data. Check authentication,
selected-model acceptance, nonempty final text, and response compatibility.
Use a small, sufficient provider-specific output budget accounting for reasoning
tokens; success does not require an exact `OK` string. Bound time and response size.
Record the tested connection identity; editing provider, region, URL, key,
or model invalidates that result.

Display "connection tested" or "ready", not "model accuracy verified".
A returned model ID is server-reported identity, not attestation of weights.
A model can pass transport checks and still provide incorrect mathematics.

Normalize successful responses into the existing safe Tutor presentation.
Preserve safe plain-text handling when a model cannot reliably produce optional
structured chart output. Apply an ODE chart instruction only after existing
validation succeeds. Linear Systems accepts explanatory content only.
Never execute provider tools, model HTML, code, or mathematical expressions.

## 7. Tutor availability and grounding in both Labs

Both Lab headers expose Open AI Tutor through the existing Host. Connection
settings remain reachable before a successful solve; grounded message submission
requires an eligible current result.

ODE preserves its accepted single-method behavior, current Convergence evidence,
ordinary successful-Run conversation reset, and Compare exclusion.

Linear Systems gets its own binding, suggestions, prompt, and deterministic demo
behavior. Build context from `latestSuccessfulResult` only when
`resultStatus === "current"` and the fingerprints agree. Include the bounded
original A and b, computed xHat, P/L/U convention, stored pivots and row-swap
evidence, residual and residual infinity norm, pivot safeguard metadata, and
qualified preset-reference comparison when supplied.

A bounded projection of stored computation-trace evidence may support step
explanations. Do not rerun elimination, reconstruct missing steps, or describe an
omitted trace as complete. Context budget failures must be explicit and must not
silently replace authoritative evidence with model-generated summaries.

Exclude stale, absent, failed, partial, and fingerprint-mismatched results.
A failed operation preserves the previous successful output and conversation;
it does not make that output current for changed inputs.

Linear Systems explanations must distinguish residual from solution error,
avoid claiming a computed condition number or error bound, and treat pivot
threshold failure conservatively. Tutor cannot modify matrices, rerun a solver,
or replace a numerical trace.

## 8. History, connection changes, and lifecycle

Connection configuration is tab-wide; consent to transfer history is per Lab.

When activating a different connection, stop pending requests and offer:

1. Start fresh — default;
2. Transfer this Lab's conversation — explicit choice naming the destination;
3. Cancel — retain the existing connection and conversation.

Do not clear the existing conversation merely because a connection test fails.
A transfer includes only that Lab's user/assistant conversation. Build numerical
grounding afresh for the next message. Never import the other Lab's transcript,
credentials, internal errors, or stale numerical context.

For an inactive Lab with an existing transcript, changing the shared connection
must invalidate its permission to reuse that transcript with the new destination.
On returning to that Lab, require the same fresh/transfer decision before any
history is sent. Its conversation must never transfer implicitly because the
other Lab approved a transfer.

Track connection identity with nonsecret session metadata. Runtime credentials,
abort controllers, pending requests, and mounted handles remain outside pure
session state. Preserve ordinary route navigation and New experiment semantics.

Use a monotonic connection generation within an unguessable session identity.
Advance it on activation, key/model/region/endpoint replacement, disconnect and
expiry, including replacement with apparently identical public metadata.
History-transfer authorization is a one-use decision bound to
`{labId, transcriptRevision, fromConnectionGeneration, toConnectionGeneration}`.
Consume it only while all identities still match, then establish the new
conversation provenance. Changing the snapshot or destination invalidates
unconsumed consent; a persistent boolean cannot authorize later transfers.

Every send captures the Lab, session and connection generation, context revision,
conversation revision, and request ID.
Check those identities after each asynchronous boundary. Cancellation, switching,
new successful runs, reset, edits that invalidate grounding, navigation, and
disposal must prevent stale completions from rendering or applying chart actions.
Propagate cancellation through the local API to the provider request where
supported. Cancellation does not guarantee a provider stops billing instantly.

## 9. Progress, failures, and resource limits

Use complete-response delivery. Provide Connecting, Testing, Ready, Waiting,
Cancelled, and Failed feedback with accessible status/error relationships.
Cancelled work must not create a fake assistant/error transcript message.

Distinguish actionable errors such as local server unavailable, model unloaded,
authentication rejected, insufficient quota, provider busy, timeout, context too
large, malformed response, and expired local session. Redact credentials,
provider response bodies, and machine-private paths from public errors.

Set explicit input/body, history, context, output, response-body, concurrency,
and timeout limits. Test their boundaries. Check the selected model's usable
context metadata when reliable; otherwise use a documented conservative bound.
Never silently discard numerical evidence to fit. Let the user start a shorter
conversation when necessary.

Do not automatically retry a completion that might have been accepted or billed.
Do not retry using another model, key, provider, region, or hosted backend.
Prefer the existing native HTTP transport. If an SDK is approved later, explicitly
disable its retries instead of relying on defaults. For every adapter, fixtures
must prove exactly one outbound inference request on timeout, 429 and 5xx, and
zero requests when the personal credential is missing, even with environment keys.

## 10. Hosted behavior and exclusions

Personal connection/key routes and custom endpoint forwarding remain unavailable
on hosted deployments. The existing administrator-configured Tutor/demo path
remains separate from personal local connections. Both Lab profiles need bounded
demo behavior; release evidence must identify which path was actually tested.

No numerical algorithm, trace producer, dependency, framework, persistent history,
account, agent tool, Glossary handoff, PDE Tutor, model download, server process
management, LAN support, WSL support, or deployment is authorized by this design
scope. Any later dependency need is a separate decision.

## 11. Acceptance evidence

Required evidence before claiming implementation complete:

- Both Lab headers expose accessible Tutor UI and local connection settings.
- Provider adapters pass protocol, authentication, extraction, malformed-output,
  refusal, cancellation, timeout, and destination-isolation fixtures.
- Local boundary tests reject hostile origins, invalid session handles, disallowed
  destinations, redirects, cross-tab access, and hosted configuration requests.
- Dev/preview/HMR/backend listeners and proxies cannot expose personal routes
  to LAN traffic. Host rewriting cannot bypass frontend-origin checks.
- Personal routes reject simple forms and missing/invalid Fetch Metadata/proof.
- Each adapter proves single-attempt behavior and no environment-key fallback.
- Browser traffic evidence shows no direct provider requests; local mode also
  has no Google Fonts/CDN traffic.
- Keys are absent from persisted state, logs, responses, generated assets, and
  public bundles; expiry and disconnect abort owned work.
- Local mode passes a cold-cache, internet-disabled browser run across both Labs,
  Tutor, math editors, and deferred assets, with network evidence.
- Grounding tests cover current/stale/restored/failed results, domain isolation,
  no invented arithmetic, and unchanged ODE/Compare/Convergence behavior.
- Provider changes exercise both Labs, explicit history transfer, cancellation,
  failed tests, and late completions.
- Transcript revision and destination-generation changes invalidate transfer
  consent; idle/absolute expiry invalidate both work and credentials.
- Full tests, typechecks, import boundaries, production build, and verify pass.
- Manifest/static-import inspection proves Tutor/settings remain lazy, and
  Linear Systems opening does not eagerly acquire ODE runtime.
- Browser review covers wide desktop, roughly 390 x 844 mobile, keyboard focus,
  existing modal ownership, Light/Dark, and controlled math rendering.

Mocked adapter tests establish contract behavior, not live provider readiness.
Live provider tests require separately authorized credentials and bounded calls.
Local llama.cpp testing must use an already running, loaded model. No test may
alter another client's model state.

## 12. Review gate and public references

Current gate: chunks through 2A are committed after independent audit. Chunk 2B
(native Anthropic/Gemini) passed independent audit with no findings. After its
local commit, chunk 2C adds DeepSeek/Kimi. Settings and both-Lab integration remain
later chunks. Follow the continuing goal through each gate; do not push before
the final independent overall audit.

Primary API/security references consulted during discussion:

- [llama.cpp server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create)
- [Gemini API](https://ai.google.dev/api)
- [DeepSeek API](https://api-docs.deepseek.com/)
- [Kimi API quickstart](https://platform.kimi.ai/docs/overview)
- [Kimi mainland platform](https://platform.kimi.com/docs/get-api-key)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

Recheck provider-specific fields and regional endpoints during adapter
implementation. No fixed model inventory or pricing claim is established here.
