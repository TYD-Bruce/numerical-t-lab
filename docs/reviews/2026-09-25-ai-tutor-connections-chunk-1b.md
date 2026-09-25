# AI Tutor Connections v1 — Chunk 1B evidence

Date: 2026-09-25
Status: **Independent re-audit PASS — ready for local commit**
Starting point: clean local `main`, `2e20a3afe37a4183be9ca0e8df006d2bdf236010`
Scope: credential sessions, scoped local HTTP operations and destination policy.
Release impact: local only; no push, deployment, provider inference or model management.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md).

The maintainer's continuing goal authorizes the complete sequence, preserving
each independent audit/fix/re-audit/local-commit boundary. The earlier chunk 1A
stop was completed with commit `2e20a3a`; this is the next bounded chunk. Final
overall audit remains mandatory before any push or Vercel demo update.

## Implemented ownership

- `backend/src/localTutorSession.ts`: per-server credential/runtime owner,
  independent tab sessions, candidate versus active connections, generation,
  request leases, expiry and cleanup. It performs no network or environment-key lookup.
- `backend/src/localTutorPolicy.ts`: write-only connection validation, fixed
  public errors, exact destinations, scoped provider paths and public-IP checks.
- `backend/src/localTutorRoutes.ts`: eight exact POST operations, proof checks
  and strict JSON body schemas. It exposes no arbitrary forwarding operation.
- `backend/src/localApiServer.ts`: retains the chunk 1A boundary and checks
  personal proof before reading a personal body, then revalidates session state
  when dispatching it. Personal routes exist only with an explicit session owner.
- `backend/src/dev.ts`: `T_LAB_PERSONAL_TUTOR=true` explicitly enables that owner;
  unset/false keeps personal routes absent. Invalid flag values fail startup.
  Shutdown releases sessions before closing the listener; server close also
  disposes the session owner. The process remains native Windows/IPv4 loopback.
- `backend/src/ai/providers/providerTransport.ts`: bounded native HTTP transport
  for future adapters, with actual socket fixtures. No public route invokes it yet.
- `packages/contracts/src/tutor.ts`: serializable connection input, nonsecret
  metadata, session/capability and public error types; no runtime or credentials store.

The hosted adapter, administrator/demo handler, frontend runtime, numerical
owners and dependencies are unchanged. The single hosted API function remains
independent of the local session and transport owners.

## Session and wire contract

All routes below require the existing exact loopback Host, allowed frontend
Origin, `Sec-Fetch-Site: same-origin`, uncompressed JSON and
`X-T-Lab-Client: tutor-v1`. This custom bootstrap marker is not a secret.
`POST /api/personal/session` accepts only `{}` and issues a random 128-bit session
ID plus an independent 256-bit proof. Every subsequent operation additionally
requires `X-T-Lab-Session` and `X-T-Lab-Proof`, bound to that exact frontend
origin. No native-CLI metadata exception applies to any personal route.

| POST suffix under `/api/personal/` | Exact body | Effect |
|---|---|---|
| `session` | `{}` | Create a tab session; no key or provider request |
| `status` | `{}` | Return nonsecret current metadata and deadlines |
| `stage` | `{generation, connection}` | Validate and retain a candidate; preserve active connection |
| `discard` | `{generation, candidateId}` | Forget only the matching candidate |
| `activate` | `{generation, candidateId}` | Replace active connection only after backend-owned test success |
| `disconnect` | `{generation}` | Forget active/candidate keys, abort owned work, advance generation |
| `cancel` | `{requestId}` | Cancel only the exact operation owned by this tab |
| `close` | `{}` | Release the entire session |

There is no browser key form. The capability explicitly reports
`providerOperations: false`; discovery, connection-test, personal-chat, proxy
and model-management routes are absent. No caller can submit `tested: true`
to activate a candidate. Only a current backend test lease can mark it tested;
this is exercised with fixtures until adapters implement actual validation.
A candidate may omit its model for discovery. Test, activation and completion
independently require a selected model; no placeholder model ID is needed.

Candidate replacement changes an unguessable candidate ID and aborts its old
test/discovery work. It does not discard the active connection. Activation
advances the connection generation even for identical public metadata, clears
the old credential and invalidates pending work. Invalid configuration or a
failed/unverified candidate cannot replace an active connection. Future UI owns
the explicit per-Lab fresh/transfer decision before requesting activation.

Limits have one backend authority: 32 sessions, 8 active requests across the
server, one active request per session, 30 minutes idle, 8 hours absolute,
16 KiB personal JSON bodies and 4 KiB printable-ASCII credentials. Cloud model IDs
are bounded to 200 identifier characters. Local IDs are opaque strings of at
most 1,024 UTF-16 code units: spaces, Unicode and Windows/POSIX paths are kept
unchanged, while blank IDs and control characters are rejected. They never
determine an endpoint, filesystem operation or executable expression.
Only accepted operations refresh idle
activity; failed proof, invalid configuration, stale generation and busy
requests do not. Timers expire abandoned or busy sessions without another HTTP
request, abort leases, clear credential references and invalidate generation.
Absolute expiry still wins during activity. New processes issue new identities.

Keys never appear in session responses, capability data or public error text.
No cookie, disk storage, browser persistence, raw error cause or credential
logging was introduced. Releasing references is not a promise of forensic
erasure from JavaScript memory. Same-user malicious processes, browser
extensions and a compromised local model server remain outside the threat boundary.

## Destination and transport behavior

Local bases accept only explicit HTTP ports at `127.0.0.1`, `[::1]` or
`localhost`, with the root or `/v1` base. Localhost becomes literal IPv4 before
connection; there is no local DNS lookup. Original-authority validation rejects
numeric aliases, other 127/8 hosts, mapped IPv6, LAN/wildcard hosts, credentials,
queries, fragments, encoded paths, backslashes and management paths.

Cloud presets are fixed HTTPS destinations: OpenAI `/v1`, Anthropic `/v1`,
Gemini `/v1beta`, DeepSeek's standard root, and explicit Kimi international
`api.moonshot.ai/v1` or mainland `api.moonshot.cn/v1`. A cloud configuration cannot
override its base URL or provide arbitrary headers. Credentials are explicit;
matching environment keys cannot fill missing personal credentials.

The transport resolves a selected cloud hostname once, rejects any nonpublic
answer, and connects to one pinned address with the original TLS server name,
Host and required certificate verification. It uses a fresh native connection
without the global proxy agent. Credentials appear only in the appropriate
authentication header. All redirects fail; no address, model, region or provider
retry/fallback exists. Its only operations are model discovery and completion;
discovery cannot carry a body/history. Provider payload/extraction semantics
remain for the adapter chunks.

Budgets are 15 seconds for discovery, 90 seconds for completion, a 1 MiB outbound
JSON body, 2 MiB response body and 16 KiB response headers. The total deadline
includes DNS, connection and response receipt. Cancellation during DNS cannot
dispatch a late request; cancellation during response receipt destroys the
upstream request. Encoded, oversized, malformed and non-JSON responses produce
fixed errors. One attempt is proved for redirects, 429 and 5xx; no provider body
or redirect location becomes public error text.

Primary endpoint references rechecked for this chunk (no fixed model inventory
or live compatibility claim):

- [OpenAI Responses quickstart](https://developers.openai.com/api/docs/quickstart)
- [Anthropic API overview](https://platform.claude.com/docs/en/api/overview)
- [Gemini native REST/authentication](https://ai.google.dev/api)
- [DeepSeek standard endpoint](https://api-docs.deepseek.com/quick_start/agent_integrations/deepcode/)
- [Kimi international quickstart](https://platform.kimi.ai/docs/overview)
- [Kimi mainland standard API example](https://platform.kimi.com/blog/posts/kimi-api-quick-start-guide)
- [llama.cpp model IDs and routing](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)

## Verification

Policy/session tests were written before their owners and failed for missing
modules. Transport tests similarly failed before transport implementation.
HTTP route tests, after fixing their test helper syntax/header omission, failed
on the absent routes before integration. No requirement was relaxed to obtain
a pass. Four new suites add 143 tests; the existing default-disabled local
server test now also covers the real session route.

Self-review added reproductions for stale candidate test success and a malformed
provider value. Both failed before correction: a repeated test now clears its
earlier success, and a non-string provider receives a controlled validation
error. Focused and complete verification were repeated after these corrections.

`npm.cmd run verify` passed on the final source: **111 files / 1,570 tests**,
workspace and API typechecks, import boundaries and production build. Focused
policy/session/transport/routes and existing HTTP/proxy/hosted packaging checks
pass (8 focused files / 223 tests). Synthetic HTTP fixtures prove redirect isolation, exact header placement,
actual in-flight connection cancellation and response budgets. DNS/TLS pinning
uses injected fixtures, not calls to a cloud provider.

Separate native Windows `dev.ts` processes were started with explicit mock mode
and ephemeral ports. Disabled personal mode returned 404; enabled mode returned
201 with provider operations unavailable. Both task-owned processes were stopped.

The production build still transforms 115 modules. Entry JavaScript remains
59.11 kB / 18.31 kB gzip; lazy Tutor remains 12.14 / 4.61 kB. Existing large
deferred MathLive chunk warnings remain. Existing manifest/import contracts
pass; this is structural evidence, not browser Network evidence.

No real browser/offline/CSP/layout or live-provider readiness claim is made.
Local fonts, complete provider adapters, connection/history UI and Linear
Systems Tutor remain subsequent chunks. No private reference or real key was used.

## Independent gate

The first independent GPT-6 Astra / Extra High review of the 21-file snapshot
returned **NEEDS_FIXES** with two P2 findings: model discovery incorrectly
required prior model selection, and local model IDs excluded legitimate file
paths/spaces. Its own loopback probe confirmed both, including a discovered
Windows model ID that could not subsequently be selected. It independently
passed the then-current 204 focused tests, typechecks, import boundaries,
native startup probes and documentation checks. No other confirmed in-scope
finding was reported. The implementation task verified all frozen file hashes.

Nineteen new cases cover model-less discovery for all provider families, opaque
local IDs and controls, test/activation/completion guards, HTTP staging, and a
complete synthetic discover-select-test-activate round trip with a Windows ID.
Thirteen failed before correction. The narrow correction makes candidate model
selection optional, checks it at each inference/activation boundary, and keeps
local identifiers separate from URL authority/path validation. Existing cloud
identifier validation and endpoint restrictions are preserved.

The implementation task independently reran the auditor's original probe:
model-less staging and exact returned-model staging now both return 200, and
only the explicit discovery makes one fixed `GET /v1/models` request.
Independent re-audit returned **PASS**: both P2 findings are closed, with no new
in-scope findings. It independently passed 223 focused tests, workspace/API
typechecks, import boundaries, whitespace checks and all 190 relative links in
nine Markdown files. Its missing-model probe also confirmed that a previous
active connection stays usable and rejected operations make no network request.
The auditor checked the implementation task's 111-file / 1,570-test full verify
log; it did not repeat the full suite/build or claim browser/provider readiness.

Both tasks confirmed all 21 files against the unchanged re-audit manifest
`558fc68888cd3acbae995ae5ad1b383e188939d87e41cd1532e91a60b104c2ea`.
Only final verdict/next-gate metadata followed the pass. One local commit is
authorized: `Add local Tutor credential sessions`.
No push or deployment at this boundary. After commit, the continuing goal
proceeds to chunk 1C with the same audit/commit sequence.
