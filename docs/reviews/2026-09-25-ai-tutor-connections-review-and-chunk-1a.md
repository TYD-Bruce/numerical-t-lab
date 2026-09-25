# AI Tutor Connections v1 — Review verification and chunk 1A

Date: 2026-09-25
Phase: external design review followed by one bounded implementation round
Status: **CHUNK 1A LOCALLY VERIFIED — independent Astra re-audit PASS**
Baseline: local `main`, `5bfcf734b27c2a3e7b42cd2f62ca66fad6713751`
Release impact: local work only; no production change

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md).

## Assessment and independent checks

The supplied review has high value for security and lifecycle acceptance. Its
main contribution is turning broad intentions into falsifiable tests. It is
not evidence that every listed risk is an existing defect. Its embedded citation
markers were not independently resolvable; conclusions below use current source
and the primary references linked here instead.

Source inspection confirmed that the baseline local API had wildcard CORS,
unspecified listen host and an unbounded body reader. Vite had no explicit
project-owned listener/request policy; this does **not** mean its default host
was already `0.0.0.0`. The current model handler uses native `fetch`, not an SDK,
and has no application retry loop. The page still loads Google Fonts and has an
inline theme bootstrap. The hosted adapter imports only the existing handler.

| Review items | Verified interpretation and decision |
|---|---|
| 1, 17: all listeners/proxies | Adopt. A frontend proxy can expose a loopback backend. Chunk 1A constrains dev, preview, HMR and API, including checks before proxy Host rewriting. Any future static server needs the same boundary. |
| 2: Fetch Metadata | Adopt with scope. Require exact same-origin browser metadata plus Host/Origin; personal operations additionally require per-tab proof, custom header and JSON. Metadata is browser-controlled, not native-client authentication. Missing metadata is allowed only for existing native CLI chat. |
| 3: automatic retries | Adopt as a future adapter acceptance requirement, not a discovered P0 SDK bug. Official OpenAI and Anthropic SDKs document retries by default; neither is used here. Keep native HTTP and prove one inference attempt for timeout/429/5xx. Do not assume an uninspected Gemini SDK's policy. |
| 4: environment-key fallback | Adopt seeded-environment regression fixtures. Keep existing administrator/demo behavior separate; a missing personal key must produce zero provider calls. |
| 5: network phases | Adopt configure / discover / test / send data boundaries. Editing fields causes no provider request; discovery/test send no Lab context or history. |
| 6: authentication headers | Adopt. Gemini documents `x-goog-api-key`; compatible DeepSeek transport documents Bearer authentication. Never put a key in a URL, error, log or request identity. |
| 7: CSP | Adopt in chunk 1C, after local assets and actual runtime auditing. The literal suggested policy would block the existing inline theme script; WebSocket treatment of `self` also differs between browsers. An explicit local HMR destination and a deliberate inline-script policy are required. |
| 8, 9: transfer/generation | Adopt. One-use consent binds Lab, transcript revision and both connection generations. Advance generation on replacements, disconnect and expiry, even with the same visible provider/model. Include session identity to avoid generation reuse across restarts. |
| 10: dual expiry | Adopt idle and absolute limits. Correct the implication that combining them prevents interruption: absolute expiry can still occur during activity. Abort, forget the credential, invalidate generation and show an explicit Expired state. |
| 11: URL validation | Adopt with stronger connection-time behavior. A DNS check followed by a fresh DNS lookup still permits a race. Normalize the supported `localhost` model endpoint to literal IPv4 loopback; use explicit `::1` for IPv6. Validate raw authority before the URL parser normalizes unusual numeric forms. Reject redirects. |
| 12: final answers only | Adopt provider-specific fixtures. DeepSeek separates final content from reasoning. Tool-only, blocked, empty, malformed or truncated-without-final output must not become successful Tutor text; never stringify a raw payload as fallback. |
| 13: synthetic test budgets | Adopt small, sufficient, provider-specific budgets and nonempty final text; exact `OK` compliance is not the success condition. Test success is transport compatibility, not mathematical accuracy. |
| 14, 15: realistic privacy | Adopt explicit DevTools/process-memory limits and hostile-local-process/model-server exclusions. Offline describes T-Lab traffic; it cannot attest that another local program never forwards data. |
| 16: Linear Systems evidence | Retain the existing design. Current successful fingerprint-matching evidence remains authoritative; no solver rerun, invented trace, condition number or error bound. |

Primary references checked on this date:

- [Fetch Metadata: Sec-Fetch-Site](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site)
- [OpenAI Node SDK retries](https://github.com/openai/openai-node#retries)
- [Anthropic TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript)
- [Gemini API authentication](https://ai.google.dev/api)
- [DeepSeek authentication example](https://api-docs.deepseek.com/quick_start/agent_integrations/oh_my_pi/)
- [DeepSeek final/reasoning fields](https://api-docs.deepseek.com/guides/thinking_mode/)
- [CSP connect-src and WebSockets](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

Installed Vite 5.4.21 source was also inspected for its config hooks, preview
inheritance and WebSocket server ownership. Provider fields and regional
endpoints must be checked again during their adapter chunks; this review does
not certify a complete live provider matrix.

## Chunk 1A implementation

- `backend/src/localApiServer.ts` owns local HTTP validation and bounded body
  reading, with injected handlers for tests. Importing it starts no listener.
- `backend/src/dev.ts` preserves repository-root environment loading and starts
  the API on `127.0.0.1`. Approved frontend origins default to HTTP localhost and
  127.0.0.1 on ports 5173/4173; explicit overrides remain canonical loopback only.
- `frontend/vite.config.ts` owns dev/preview binding, strict ports, disabled CORS,
  same-listener HMR and pre-proxy request checks. Unsafe listener/HMR overrides
  fail during config resolution, including the legacy WebSocket token-check
  bypass. API proxy targets literal IPv4 loopback.
- Local chat rejects wrong Host/port, unapproved Origin, cross-site/same-site/
  missing browser metadata, non-JSON and compressed input. Bodies are capped at
  1 MiB including streamed UTF-8 bytes. Request-receipt/header timeouts are
  30/10 seconds. Parsing and unexpected local-wrapper errors are fixed text.
- Origin-free native JSON CLI calls remain on `/api/chat` only. This is not
  authorization for future personal routes. Existing handler/provider behavior,
  including its current response/error mapping, is unchanged.
- Vite config is included in frontend typechecking. No runtime dependency,
  browser bundle entry, numerical code or hosted API adapter was changed.

The AGENTS key rule now records the already approved transient local-entry
exception. No key form or personal route is implemented or enabled by this chunk.

## Evidence

Tests were written before implementation: both new suites first failed because
the local server owner did not exist. Focused verification now passes **4 files /
80 tests**, including **75 new tests** and existing hosted adapter/packaging
checks. Test harness issues with the installed Vitest assertion API and table
shape were corrected without weakening behavioral requirements.

Native Windows HTTP evidence includes:

- Actual API, Vite dev and Vite preview listeners bound to `127.0.0.1`.
- Valid JSON traverses each real proxy and reaches the injected handler once.
- A foreign incoming Host is blocked before proxy rewriting could make it
  acceptable to the backend; forwarded headers do not grant authority.
- A frontend Host/Origin mismatch fails even when that alternate Origin is in
  the backend allowlist; browser cross-site/same-site/form requests never invoke
  the handler.
- Exact 1 MiB success and over-limit chunked/multibyte input rejection; the
  server still handles a later valid request.
- Aborted uploads never reach the handler; refused frontend requests close the
  connection instead of leaving an unread upload on keep-alive.
- Occupied frontend ports fail instead of silently choosing a new port.
- HMR WebSocket upgrade succeeds on the frontend's existing loopback port;
  browser connections require the current server token. External, opaque and
  same-origin browser requests with missing/invalid tokens are rejected.
- Personal routes remain absent, and hosted adapter packaging tests still pass.
- The real `dev.ts` process starts under native Windows with mock explicitly
  enabled; an origin-free JSON request reaches existing handler validation (400
  for an empty payload). The task-owned process was stopped afterward.

Final `npm.cmd run verify` passed: **107 files / 1,427 tests**, all workspace
and API typechecks, four-owner/API import boundaries and the production build.
After the initial full pass, the connection-close correction, aborted-upload
test and independent audit's HMR fix were followed by focused tests and full
verification of the final source. No tests were skipped or weakened and no
dependencies changed.

The existing Vite manifest/static-import contract tests passed. The build
transformed 115 modules; entry JavaScript is 59.11 kB raw / 18.31 kB gzip and
Tutor remains a separate 12.14 / 4.61 kB chunk. The deferred MathLive and editable
math chunks still produce the greater-than-500-kB warning; no chunking policy
was changed to suppress it. This is structural/build evidence, not a browser
Network capture.

The initial self-review found no blocker; the independent audit subsequently
found the HMR issue described below. Self-review also corrected the
architecture documents' stale package-alias wording to the already implemented
relative hosted-handler import. Credentials, real provider/model calls, model
loading and remote Git operations were not used. At the pre-commit audit
snapshot, the index was empty and HEAD remained the starting `main` revision.

Documentation checks passed for 10 changed Markdown files and 186 relative
links. All seven new task files passed whitespace/final-newline checks; new
documents contain no machine-absolute paths, unfinished placeholders or unresolved
review citation markers. `git diff --check` passes.

## Independent audit and correction

The dedicated task `Audit AI Tutor connections` runs GPT-6 Astra
(`gpt-6-astra`) with Extra High (`xhigh`) reasoning against this saved checkout.
Its first stable 16-file review returned **NEEDS_FIXES**, with one P2 and no
other confirmed in-scope findings. It independently passed the then-current
73 focused tests, workspace/API typechecks, import boundaries and native
HTTP/proxy/HMR probes; it did not claim full-suite/build/browser evidence.

The P2 was an accepted unsafe override: `legacy.skipWebSocketTokenCheck: true`
disabled Vite's browser HMR token check. An external-origin, token-free
WebSocket upgraded with status 101 and received a synthetic source-error frame.
The implementation task checked the frozen source manifest and independently
reran the reproduction before changing code.

The repair rejects that override during config resolution. A regression test
failed before the repair and passed afterward. Seven additional cases now
cover the override, valid browser token, and missing/invalid tokens from
external, opaque and same-origin browser requests. The original independent
reproduction now fails at startup. The Vite fixtures also disable environment
file loading and avoid dumping a resolved config on assertion failure.

The final source passed 80 focused tests and full verification (1,427 tests).
The independent re-audit returned **PASS**, with no unresolved in-scope
findings. It independently reran the 80 focused tests, workspace/API typechecks,
import boundaries, the original HMR reproduction, whitespace and documentation
link checks. It also inspected the implementation task's full verification log;
it did not claim to have independently rerun the full suite or build.

The before/after manifests covered exactly 16 files and had identical aggregate
SHA-256 `96ef8f350747e414f52e1c61c25ca8e34ab15a61e0a9822867d06a771d6593b8`.
The implementation task independently matched every current file to that
manifest before recording final verdict/next-gate metadata. No further source
or substantive documentation changes followed the pass. The local commit is
authorized at this boundary; its identity is recorded in Git history.

## File scope

Runtime/tooling and tests (six files):

- `backend/src/dev.ts`
- `backend/src/localApiServer.ts` (new)
- `backend/src/localApiServer.test.ts` (new)
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/src/app/localTransport.contract.test.ts` (new)

Documentation (ten files, including the five targeted proposal files): AGENTS,
PLAN, README, docs/INDEX, current/deployment architecture, this review, the
connection design/implementation plan, and Tutor HANDOFF. The pre-commit snapshot has
nine modified tracked files and seven untracked task files. No unrelated file
or numerical/browser runtime owner was changed.

## Limits and next gate

This is transport infrastructure, not a usable personal-model feature. Session
proof, key lifetime, endpoint forwarding policy, provider adapters, propagation
of cancellation upstream, local fonts/CSP, settings, history migration and
Linear Systems Tutor remain later work. The baseline Google Fonts dependency
still exists; strict offline operation is not claimed.

HTTP fixture evidence is not real-browser geometry/network evidence or a test
from a second physical LAN device. Browser offline/CSP evidence belongs to
chunk 1C and integrated Tutor evidence to later rounds. Production is unchanged.

The maintainer subsequently required independent GPT-6 Astra / Extra High audit
before each chunk's local commit. Chunk 1A has passed that independent gate and
can now be committed locally; no later feature/release gate is satisfied. All chunk
commits remain local until the final independent overall audit passes, followed
by verified push and Vercel demo update. Next implementation: chunk 1B credential
session and destination-policy tests, before exposing any browser key entry.
