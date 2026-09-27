# AI Tutor Connections v1 — Chunk 4B evidence

Date: 2026-09-25
Status: **Locally verified; independent audit PASS; local commit gate**
Baseline: clean local `main`, `ab2a82befc9488dccc8728e70cedca6bf4fb3bce`
Scope: Linear Tutor Lab/route/default-service integration and both-Lab acceptance.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md#current-chunk-4b-checkpoint).

## Implemented behavior and ownership

`linearSystemsTutorBinding.ts` exposes the 4A projection, Lab-authored English
copy and context/reset subscriptions. Projection starts on first read; immutable
result identity, status, fingerprint and dimension determine its revision.
Workflow presentation does not invalidate evidence. The Lab publishes context
changes and disposes subscriptions; its route exposes the existing optional
binding port. The generic Host owns the launcher, shared panel and connection.
No runtime handle enters the pure Store and no numerical producer changes.

Successful Solve resets only this Lab's conversation. Edits cancel stale work;
failed Solve, close and navigation retain history. New experiment defaults to
clearing this Lab's history. An explicit unchecked choice retains it with the
existing new-experiment divider and meaningful-work metadata. The native checkbox
participates in the reset dialog focus loop, and both modal owners remain separate.

Default `/api/chat` dispatches `linear_algebra` explicitly and rejects other
unsupported profiles without falling back to ODE. The Linear envelope accepts
only profile, user/assistant messages and context, validated before mock or
provider access. It reuses the full prompt budget and server-owned prompt,
serves the actual deterministic demo, or uses one fixed default OpenAI Responses
destination/model. New Linear transport bounds the complete request at 90 seconds,
raw response at 2 MiB and final text at 32 KiB; rejects redirects, incomplete/
refused/invalid output; accepts no browser provider/key/model configuration; and
uses fixed public errors. Caller cancellation covers headers and body reads.
Server and browser drop Linear chart instructions. Legacy ODE response behavior
and body shape remain unchanged.

`odeTutorPrompt.ts`, `tutorMessagePolicy.ts`, `providers/openaiFinal.ts` and
`tutorErrors.ts` hold the existing shared prompt, message/transport budgets,
strict final extraction and error identity outside local connection ownership.
Existing imports remain compatible through reexports. The hosted runtime graph
uses relative emitted `.js` paths and contains no personal policy/session/native
transport modules. Both HTTP adapters pass caller signals and release listeners;
the new Linear branch consumes the signal. The server entry remains POST-only.

## Automated verification

The initial new binding/client/default-service suites were red. They now verify
lazy projection and revisions, disposal, profile separation, closed authority,
mock validation, byte/deadline limits, cancellation, incomplete/refusal/reasoning
output and sanitized failures. A real Lab/route/Store/Host/panel integration suite
covers pre-Solve gating, retained history, current context, stale late answers and
errors, successful versus failed Solve, per-Lab isolation, both reset choices,
navigation, cancellation and pure state.

The function packaging test recursively transpiles actual emitted relative
runtime imports into a temporary ESM package, without workspace resolution. Native
import succeeds; malformed ODE input returns the existing 400 and validated Linear
input returns its real demo. No provider fetch occurs. This is structural/local
packaging evidence, not a deployed Vercel invocation.

Full verification initially identified two old proxy assertions missing the new
AbortSignal and one historical source guard forbidding all Linear Tutor bindings.
The updated assertions require the signal and retain the prohibition on eager
Tutor runtime, Glossary and unrelated deferred features. No tests were skipped,
numerical tolerance changed or failure suppressed. Session presentation helpers
re-freeze transcript arrays on open/close; retention tests assert content, not
an unsupported array-identity guarantee.

- `npm.cmd run verify`: **130 files / 2,200 tests**, all typechecks, import
  boundaries and the **124-module** production build.
- `git diff --check`: pass before audit.
- Rollup graph/static closure: Home excludes Labs, Tutor runtime, Chart.js and
  deferred math; Linear excludes ODE and eager Tutor/math; shared Tutor excludes
  ODE source. Graph raw/gzip measurements: entry **60,209 / 18,624 bytes**,
  Linear route **82,105 / 24,714**, Tutor **42,810 / 13,848**. Existing deferred
  math size warnings remain, with no manual chunking or dependency changes.
- Evidence: `t-lab-chunk-4b-red.log`, `t-lab-chunk-4b-verify-first.log` and final
  `t-lab-chunk-4b-verify.log` in external task temporary storage. The separate
  in-memory graph build is in `t-lab-chunk-4b-browser/bundle-graph.json`.

## Native browser evidence

Native Chrome on Windows, desktop 1440 x 1000 and mobile 390 x 844, used the
production build with actual default handler in mock mode and an owned loopback
compatible model fixture. A dev Home smoke check also passed. The fixture loads
no environment files, deletes any ambient default key, rejects global fetch and
permits personal leases only to its exact owned model URL. No live API key or
external model request was used, and no real model was loaded or unloaded.

- Linear pre-Solve launcher/settings and disabled Send; successful Solve enables
  current evidence. The real default demo distinguishes residual from error and
  renders controlled readonly math using local assets.
- Local save clears the synthetic key, discovery distinguishes loaded/unloaded,
  Test precedes Use and Start fresh receives default focus. Fresh Linear chat
  does not send prior demo history. An explicit transfer to a second synthetic
  model sends only the authorized Linear history with fresh Linear grounding.
- Navigation to ODE uses its own context/history with the same tab connection.
  Local ODE and default ODE demo both work. Switching ODE to default does not
  silently transfer Linear history: its resumed panel requires Review conversation
  and disables Send until its own choice.
- Mobile cancellation closes the synthetic model HTTP connection, keeps prior
  messages, appends no fake answer and restores composer focus. Escape closes
  the sheet; the background is inert while open.
- Home shows separate Resume cards. Mobile New experiment exposes the checked
  clear-history option. Unchecking retains history and divider with Send disabled
  before a new Solve; the default checked reset removes that Lab's transcript.
- Page resource origins are exclusively the local preview origin; browser storage
  remains empty, no horizontal page overflow or page errors/CSP violations were
  observed. Browser background Google connection attempts were denied by the
  offline proxy before TLS; they were not application/provider requests.

Screenshots, observations, synthetic request/cancellation logs and the harness are
preserved under `t-lab-chunk-4b-browser`. Automation initially needed corrected
PowerShell `.cmd` stdin/quoted references and explicit scrolling for clipped
controls. Mobile modal evidence was captured after reopening at the target width;
this chunk does not change the pre-existing open-panel resize behavior.

## Independent review and remaining gates

Independent **GPT-6 Astra / Extra High** review of the frozen 41-path diff passed
with **P0 = P1 = P2 = P3 = 0**. Start and final branch/HEAD were the baseline
above. All raw file hashes and the exact changed/untracked path set matched;
the index stayed empty. The parent independently repeated those checks before
recording the verdict. The external report is `chunk-4b-audit.md` beside the
audit artifacts in task temporary storage.

The auditor independently ran **16 files / 367 tests**, both typechecks, import
boundaries and an in-memory Vite/Rollup build. Twenty-two extracted declarations
and function bodies match the pre-change prompt, message/error policies and ODE
helpers. Four additional native HTTP probes cover local and hosted wrappers,
each cancelled while awaiting headers and while reading an unfinished body.
Every case aborted injected provider work, completed its wrapper and wrote no
late response; both body readers were cancelled. Fetch was mocked in all cases.

A separate in-app browser session independently checked Linear pre-Solve gating,
demo and local fixture replies, loaded-model selection, fresh-history consent,
stale-input cancellation, successful Solve reset, per-Lab history isolation,
inactive-Lab review, Home/Resume, both reset choices, keyboard containment and
desktop/mobile layout. It entered no key. This audit used the inspected owned
fixture; it does not claim its browser process used the parent's Chrome proxy.
The full 2,200-test run and additional parent browser scenarios remain inherited
evidence. Extra parent dark-mode mobile reset/Tutor checks passed without page
errors or CSP violations; no runtime code changed after the frozen audit.

Post-audit edits record this verdict/next gate and correct a README sentence
that still called the now-implemented Linear Tutor a future milestone. The
separate documentation review then found one P3: another current README
paragraph still said independent chunk review was pending. After the maintainer's
safe pause, all 41 hashes, the exact path set, baseline HEAD and empty index were
rechecked before correcting that sentence. Overall feature/release acceptance
remains pending. This documentation correction requires a bounded independent
recheck before commit; that wording recheck passed with no open findings.
The subsequent staged check included the newly tracked files and found four
extra EOF blank lines in extracted helpers. Only those final newlines were
normalized; helper content and tests remain unchanged. A final bounded audit
checks this whitespace correction and the full staged-equivalent diff before
commit. The earlier runtime/browser evidence still applies to the same behavior.
Proposed local commit: `Integrate Linear Systems AI Tutor`.

This chunk does not establish real cloud/model readiness or mathematical model
accuracy. No numerical, dependency, persistence, Glossary, model-management or
remote/deployment change was made. Phase 5 consolidates final documentation and
acceptance, followed by the required independent overall audit. Only after that
gate may the authorized final push and Vercel demo update occur.
