# AI Tutor Connections v1 — Chunk 1C evidence

Date: 2026-09-25
Status: **Locally verified; independent audit PASS**
Baseline: local `main`, `b9fad94ae46c9ea89bd1d481739d8f610ba471e7`
Scope: offline browser assets and enforced resource policy.

Authority: [design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md),
[implementation plan](../superpowers/plans/2026-09-25-ai-tutor-connections-v1-implementation-plan.md).
Continuation: [Tutor handoff](../tutor/HANDOFF.md).

## Implemented behavior

- Removed Google Fonts stylesheet/preconnect requests. AppShell loads local
  DM Sans normal/italic and JetBrains Mono normal variable fonts through Vite.
  Upstream bytes, versions, hashes, notices and asset costs are recorded in
  [font provenance](../../frontend/src/assets/fonts/README.md). OFL/MIT notices
  ship in the production public assets; no dependency installation occurred.
- The shared deferred MathLive loader still imports its fonts/static CSS.
  Those imports own emitted/embedded font assets. It disables separate implicit
  font-directory and keypress-sound fetching before exposing the module to its
  consumers. Readonly rendering, editable math, parser/evaluator and numerical
  contracts are unchanged.
- `frontend/contentSecurityPolicy.ts` defines the resource policy. Vite local
  dev/preview install it after the request boundary and before serving/proxying;
  conflicting configured CSP headers fail startup. A production-build HTML hook
  inserts the supported meta policy before scripts.
- Default resource loading is denied. Scripts require same origin or the exact
  owned theme-bootstrap hash (with HTML newline normalization). There is no
  script unsafe-inline/eval allowance. Connections are same-origin; dev alone
  adds the validated incoming frontend host/port for HMR. Fonts/images may also
  use data URLs. Media, objects, frames, workers, base changes and form submission
  are denied. Local response headers deny embedding with `frame-ancestors 'none'`.
  That header-only directive is deliberately absent from static meta CSP.
- The styles-only inline exception supports existing Vite style injection,
  MathLive styles and inline layout. It does not allow external stylesheets or
  resource destinations. No general renderer or executable user content was added.

No provider operation was exposed in this chunk. No key form, session lifecycle,
cloud adapter, Lab context, history consent, numerical implementation or hosted
API behavior changed. Browser same-origin traffic can still reach the existing
legacy API; this chunk does not turn that legacy service into local inference.

## Automated evidence

Nine new regression cases failed before implementation. Six focused files pass
80 tests, covering real local HTTP dev/preview responses and unsafe overrides,
the generated build policy/bootstrap hash, packaged font/license assets, the
deferred loader, theme bootstrap and existing math behavior. Self-review extended
five of those checks for header-only embedding protection and math/font notices;
they failed before the corresponding correction.

Final `npm.cmd run verify` passed **112 files / 1,579 tests**, frontend/numerics/
contracts and API typechecks, import boundaries and production build. No skipped
test, weakened numerical assertion, dependency edit or numerical edit.
Final focused recheck again passed 6 files / 80 tests and the production build.
Documentation checks cover 10 Markdown files / 202 relative links. All 26
changed/new files are in scope; text whitespace checks pass. Task-owned browser,
driver and fixture processes were stopped before independent audit.

The Vite manifest/import contract preserves dynamic complete-Lab, Tutor,
Glossary and MathLive boundaries. Build: 116 modules; entry JS 59.11 kB / 18.31 kB
gzip, lazy Tutor 12.14 / 4.61 kB, entry CSS 30.53 / 5.59 kB. The three interface
fonts add 825,348 raw bytes (402,844 individually gzip-compressed bytes), requested
as needed. These are full upstream variable TTFs, not newly subsetted derivatives.
Existing large deferred MathLive/Compute Engine warnings remain; no manualChunks.

## Browser evidence and limits

Native Windows, agent-browser 0.27.0 and its Chrome 151.0.7922.71. Isolated fresh
sessions used a loopback proxy that rejects every external HTTP/CONNECT request,
with only literal loopback/localhost bypassed. The proxy has no forwarding code.
Tests used synthetic local API replies, never credentials or a real model.

| Surface | Observed behavior |
|---|---|
| Dev Home and HMR | Cold load, local interface fonts, meaningful UI, Vite connected, no page error |
| Dev ODE | MathLive readonly/editable math, keyboard input, solve, chart/results, lazy Tutor and synthetic reply; desktop Dark |
| Built Linear Systems | Cold load, input grid edit/solve, native math and result display; mobile Light/Dark and desktop Dark |
| Built ODE | Cold load, local math fonts, editing, virtual keyboard, solve, synthetic Tutor reply; mobile Light |
| Theme/lifecycle | Saved Dark theme survives reload; post-solve in-app Home/Resume restores Linear Systems output |
| Negative probes | Same-origin license fetch 200; external and other-loopback-port fetch blocked; unauthorized inline script did not run; local app rejected in an iframe |

Desktop checks used 1440 x 1000, mobile 390 x 844. Normal inspected flows had
no cross-origin resource entries, CSP violations, page errors or document-level
horizontal overflow. Intentional CSP-probe violations are recorded separately.
The MathLive keyboard and Lab rail retain their own expected bounded layout.
No screen-reader or every-browser certification is claimed.

An automated hard navigation after a completed solve made one isolated browser
target unresponsive. A fresh session succeeded. After the maintainer's pause
and explicit resume, the same error was independently reproduced on a minimal
loopback HTML page containing only a button and native `beforeunload` handler:
no T-Lab, font, CSP, MathLive or API code. The driver returned Windows socket
error 10060 after the navigation command. This isolates the symptom outside this
feature; it does not identify the driver's/Chrome's internal fault. In-app
Home/Resume navigation was then checked successfully in T-Lab. The operating
contract's beforeunload protection was preserved rather than disabled to satisfy
automation. The auditor must see this limitation, not a fabricated hard-navigation pass.

Local evidence artifacts are retained in the OS temporary directory:
`t-lab-chunk-1c-final-verify.log`, focused/red logs, and
`t-lab-chunk-1c-browser` (screenshots, observation/probe JSON, denial log,
beforeunload isolation record and fixture scripts). Browser-process background
requests were rejected by the proxy; app claims concern the observed T-Lab
document, not other browser/OS services. Actual network-disconnected hardware,
live local inference and production deployment were not tested.

## Independent gate

The dedicated `Audit AI Tutor connections` task reviewed the frozen complete
snapshot with GPT-6 Astra / Extra High and returned **PASS**, with
**P0 = P1 = P2 = P3 = 0**. No in-scope finding required a correction.

It independently passed the six focused files / 80 tests, typecheck, import
boundaries, an external-directory build and `git diff --check`, checked font
hashes/sizes and lazy boundaries, and inspected the full verification log.
Its fresh external-traffic-blocked browser spot checks covered both Labs, ODE
editing, local fonts, desktop/mobile and CSP negative cases. The full original
matrix was not all repeated. It also encountered the hard-navigation automation
timeout; the limitation above remains explicit, not a passed check.

All 26 files (14 modified, 12 new) matched the manifest before and after review;
the index remained empty. Manifest SHA-256:
`f3a4362c5a323c37983ed33395df830814cadb54101729ebbc0924a14e8d6bcd`.
The implementation task independently verified the branch, baseline, exact file
set and all byte hashes after PASS, before recording this verdict. The staged
whitespace check then identified CRLF in `dm-sans-OFL.txt`; that single notice
was normalized to LF, with an exact reverse-normalization byte comparison.
Only that newline change and audit verdict/next-gate metadata followed the
pass. No runtime, font-byte or license-wording change occurred. The scoped final
recheck returned **PASS** with no findings and confirmed all 26 staged blobs
match the final manifest, with no unstaged/untracked change. Final manifest:
`6c88a4fe8247c23f7695ef80d15ca83f6ba76604426dda40224035204d4ae52a`.
The implementation task independently verified that exact staged/worktree match
before recording this final verdict. Both tasks stopped their own browser/fixture processes.

Commit boundary: `Bundle offline Tutor assets and enforce browser policy`.
Next chunk after this local commit: 2A, local-compatible and OpenAI adapters.
All remaining providers, connection/history UI, Linear Systems Tutor and final
overall audit remain in scope. No per-chunk push or Vercel deployment.
