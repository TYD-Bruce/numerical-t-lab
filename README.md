# Numerical T Lab

Numerical T Lab is an interactive, AI-assisted laboratory for learning numerical analysis through theory, computation, visualization, error analysis, and guided experiments.

**Theory · Tools · Teaching**

**An Interactive Numerical Analysis Laboratory**

The locally implemented Labs are the **Initial Value Problems Lab**, a browser-based environment for scalar fixed-step ODE methods, and the **Linear Systems Lab**, a small dense `A x = b` environment for Gaussian elimination with partial pivoting and structured computation evidence.

## Live Demo

[**Open Numerical T Lab →**](https://numerical-t-lab.vercel.app/)

The canonical Production URL is `https://numerical-t-lab.vercel.app/`.

## Local routes and module status

This table describes the locally verified current repository. The new Tutor
Connections work has not been pushed or deployed, so the live demo remains on
the prior accepted release until a separate deployment gate is completed.

| Route | Page | Status |
|---|---|---|
| `/` | Platform Home | Available |
| `/ode` | Numerical ODE overview | Available |
| `/ode/initial-value-problems` | Initial Value Problems Lab | Available |
| `/linear-algebra` | Numerical Linear Algebra overview | Available locally |
| `/linear-algebra/linear-systems` | Linear Systems Lab | Available locally |
| `/pde` | Numerical PDE roadmap | Planned |
| `/about` | Platform and project overview | Available |

Unknown page paths render the in-shell Not Found page. Numerical PDE remains a
roadmap page; Numerical Linear Algebra has one complete local Lab while Least
Squares, SVD, and Eigenvalues remain planned.

## Linear Systems Lab

The Linear Systems Lab follows **Method -> Data -> Output -> Diagnostics** for
dense real square systems of dimension 2 through 6. It uses the two approved
presets or controlled decimal/scientific custom input, then presents the
computed solution, `P A = L U` factors, pivot evidence, residual vector, and
qualified preset-reference difference when authoritative.

**Show computation** renders the immutable structured evidence emitted by the
numerical algorithm, including pivot selection, row swaps, elimination,
triangular solves, and residual arithmetic. The renderer never reruns the
solver. A small residual is described as equation mismatch and is not claimed
to prove small solution error. The local Linear Tutor explains current successful
evidence and selected stored trace fields. Linear Algebra Glossary remains deferred.

## Initial Value Problems Lab

The first visit starts with an Exponential Decay example configured for Forward Euler:

- `t0 = 0`, `y0 = 1`, `tEnd = 5`, and `h = 0.2`;
- right-hand side `-y`;
- exact solution enabled with `e^(-t)`.

Implemented methods are Forward Euler, Backward Euler, Taylor Method (Order 2), Runge-Kutta 4, Adams-Bashforth and Adams-Moulton of orders 1-8, BDF of orders 1-6, and scalar second-order Leap-Frog.

The mathematical editor supports the controlled Version 1 expression language: arithmetic, powers, implicit multiplication, fractions, square roots, exponential and trigonometric functions, natural logarithm, absolute value, `e`, and `pi`. User mathematics is converted to the project-owned `MathAst` and evaluated through explicit numeric operations; arbitrary JavaScript is rejected.

Convergence Study is available after a successful single-method first-order run with an exact solution. Compare and Leap-Frog do not offer Convergence Study, and Tutor is available for successful single-method output rather than Compare output.

The interface defaults to a lower-glare Light theme and offers an optional,
persisted Dark theme from the global header. Existing charts redraw with
theme-aware colors without rerunning a solver. Ten reviewed Glossary Wave 1
cards and ten explicit annotations are available only in the complete Initial
Value Problems Lab, with desktop popovers and a contained mobile sheet. The
`/ode` overview and all other routes remain unannotated, Compare output remains
Glossary-plain, and no Glossary-to-Tutor handoff exists.

## Sessions, Resume, and New experiment

Lab and Tutor sessions are held **in memory for the current tab only**. Internal navigation preserves the current Lab, Tutor conversation, meaningful-work metadata, Resume card, and approved scroll positions.

Experiment and Tutor sessions are not written to browser storage or an account.
Refreshing, closing the tab, or closing the browser loses the session. Resume
cards are current-tab navigation aids, not saved history. The only persistent
browser preference is the selected Light or Dark theme.

**New experiment** restores the authoritative Beginner Starter. It can clear the Tutor conversation or preserve it behind a typed divider, and it resets visible, per-Lab, and current-history-entry scroll state so the old experiment position cannot return.

## Local development

Requires a current Node.js LTS release.

```bash
git clone https://github.com/TYD-Bruce/numerical-t-lab.git
cd numerical-t-lab
```

After cloning:

```bash
npm install
npm run dev
```

Vite serves the frontend at `http://127.0.0.1:5173/`. Dev and preview bind only
to IPv4 loopback and fail if their selected port is occupied. HMR shares the
dev listener; LAN binding and custom HMR listeners are not supported.

Start the local Tutor API in a second terminal:

```bash
npm run dev:api
```

Set `AI_TUTOR_MOCK=true` in `.env.local` for deterministic grounded default-service replies that require no live model. The default Tutor service can use a server-side `OPENAI_API_KEY`; never give a key a `VITE_` prefix because Vite exposes such variables to browser code. Default-service messages use the relative-origin `/api/chat` endpoint. Personal connections use the separate local session API described below.

The local API binds to `127.0.0.1:3001` and validates Host, Origin, browser
same-origin metadata and JSON bodies (legacy chat up to 1 MiB). Its default frontend origins
are HTTP `127.0.0.1` and `localhost` on ports 5173 and 4173. For a different
frontend port, set the API's `T_LAB_LOCAL_ORIGINS` to a comma-separated list of
exact HTTP loopback origins with explicit ports, then restart it. Changing
`API_PORT` also requires updating the proxy target in `frontend/vite.config.ts`.
Direct native CLI JSON requests remain supported on `/api/chat`.

Personal connections and the default Tutor/demo are wired into both ODE and
Linear Systems in the local development version. Linear integration is locally
verified and independently reviewed; overall feature/release acceptance remains
pending.
See the [Tutor handoff](docs/tutor/HANDOFF.md). Enable the local backend with
`T_LAB_PERSONAL_TUTOR=true` (disabled by default), then open **AI Tutor → Connection
settings → Enable personal connections**. The frontend and backend must run on
the same computer. The hosted demo does not accept personal keys or endpoints.

Choose a local-compatible server, OpenAI, Anthropic, Gemini, DeepSeek or standard
Kimi. Kimi requires an explicit international/mainland destination. **Save locally**
sends the configuration only to the local backend and clears the key input.
**Discover models** requests provider metadata; enter or select an exact model ID
and use **Select model locally** to change it without entering the key again.
**Test connection** sends a synthetic prompt and may incur cloud charges. For a
local server, the model must already be loaded; T-Lab does not manage models.
Testing checks compatibility, not mathematical accuracy.

After testing, **Use this connection** offers Start fresh, Transfer this Lab's
conversation, or Cancel. Each actual Send shares the authorized conversation and
eligible experiment context only with the selected destination. Requests return
complete responses and can be cancelled. Disconnect forgets credentials and keeps
the transcript; personal failures never automatically switch to the default service.
Keys are held only in the local backend session, with no browser or disk saving.

Known models requiring
preserved reasoning history are unavailable in this final-text-only version;
see the [model limitations](docs/reviews/2026-09-25-ai-tutor-connections-chunk-2c.md#model-compatibility-boundary).
Configuration bodies are capped at 16 KiB; personal
chat bodies at 64 KiB, with a 32 KiB full-prompt budget and no silent truncation.
Personal connections never use environment keys.

Interface and math fonts are bundled locally with notices in `/licenses/`.
Local dev/preview enforce a browser content security policy; production HTML
also carries a same-origin resource policy. Both Lab workflows and assets have
been checked on desktop and mobile with external traffic blocked and an owned
synthetic local model. Real model/provider readiness and final release acceptance
remain pending. See [font provenance](frontend/src/assets/fonts/README.md).

## Build, preview, and verification

```bash
npm run test:run
npm run typecheck
npm run typecheck:api
npm run build
npm run verify
npm run preview
```

`npm run verify` runs the full Vitest suite, both TypeScript checks, and the production build.

The production Vite base is `/`, so generated entry, stylesheet, font, and nested-route asset references use the root origin. `vercel.json` supplies an SPA rewrite to `/index.html`; Vercel filesystem and function routes remain responsible for emitted `/assets/*` files and `/api/chat` before the client fallback. After deployment, smoke-test a direct refresh at `/ode/initial-value-problems`, `/api/chat`, one JavaScript asset, one CSS asset, one font, and an unknown client route.

## Architecture

The public entry contains the project-owned router, static pages, in-memory store, shared Tutor Host placement, semantic theme tokens, and lifecycle services. The complete ODE and Linear Systems Labs have independent dynamic route boundaries. The complete Tutor panel and networking load on first Tutor open. MathLive and editable/Compute Engine support remain later deferred boundaries.

Expression ownership is:

```text
MathLive field
  -> Compute Engine raw MathJSON adapter
  -> project-owned closed MathAst
  -> profile validation and versioned serialization
  -> explicit numeric evaluator
  -> solver function parameters
```

Tutor ownership is:

```text
Lab -> LabTutorBinding -> Platform Tutor Host
AppSessionStore -> TutorSessionAccess -> Platform Tutor Host
```

Key locations:

- `frontend/src/`: browser application, pages, Labs, Tutor, Glossary, and math UI.
- `backend/src/`: server-only Tutor handler and local API process.
- `packages/numerics/src/`: ODE, Convergence, expression, Linear Systems, and Computation Trace authority.
- `packages/contracts/src/`: shared serializable browser/server DTOs.
- `api/chat.ts`: thin Vercel `/api/chat` adapter.
- `docs/architecture/`: current ownership, dependency, and deployment maps.
- `docs/PROJECT_HANDOFF.md`: current contributor handoff.
- `docs/contracts/NUMERICAL_CONTRACTS.md`: numerical correctness boundaries.

## Current limitations

- Sessions are memory-only and do not survive refresh or tab closure.
- ODE support is scalar and fixed-step; there are no systems or adaptive solvers.
- Tutor and Convergence Study are not available for Compare output.
- Convergence Study is single-method, first-order, exact-solution-based, and synchronous.
- MathLive and editable/Compute Engine chunks are intentionally deferred but substantial.
- Numerical Linear Algebra currently contains only the local Linear Systems v1
  slice; additional matrix topics and Numerical PDE are planned.
- Theme selection supports Light and Dark only; there is no system/automatic third mode.

The **Content-Agnostic Interactive Glossary Framework** and reviewed ODE Wave 1
integration are implemented. Runtime annotations remain explicit and
scope-owned; the development Playground remains excluded from production.
**Numerical T Lab Project Language Standard v1** is approved. The **Linear
Systems Tutor** is implemented and independently reviewed locally; overall
feature acceptance and deployment remain pending.

## Project documentation

See [`docs/INDEX.md`](docs/INDEX.md) for the current architecture, active plan,
design specifications, implementation plans, reviews, and feature handoffs.

## Changelog

### 2026-09-26 — Local Tutor connection recovery

- An unavailable local backend returning a non-JSON HTTP error now reports a
  service failure. Successful responses remain strictly validated, with no
  automatic retry or fallback.
- Enabling a connection now keeps keyboard focus inside Tutor when its original
  button disappears, so Escape continues to close the mobile panel.

### 2026-09-25 — Linear Systems Tutor integration

- Added the Linear Tutor interface, validated default service/demo, and successful
  Solve, input-edit, reset and navigation lifecycle integration.
- Both Labs pass desktop/mobile mock and loopback browser checks; history transfer
  remains an explicit per-Lab choice. Independent chunk audit passed.

### 2026-09-25 — Linear Tutor grounding foundation

- Added current-result Linear context and a validated personal-chat profile,
  with explicit trace-detail limits and explanatory-only replies.
- Verification uses synthetic data and local HTTP; independent re-audit passed.
  The Linear Lab interface and
  default-service/demo wiring remain the next independently reviewed chunk.

### 2026-09-25 — Local Tutor connection settings

- Added local connection settings to the lazy ODE Tutor, with explicit model
  testing, per-Lab history choices, cancellation, progress and controlled errors.
- Model selection keeps credentials on the backend. Native Windows browser
  verification uses synthetic loopback services; independent chunk audit passed.

### 2026-09-25 — Tutor connection provenance and client

- Added a tab-owned personal connection runtime and guarded chat client, with
  one-use history choices for each Lab, cancellation and session expiry.
- Settings and production panel wiring remain next; verification uses synthetic
  providers and actual loopback HTTP, without real API keys or cloud inference.

### 2026-09-25 — Validated personal Tutor chat API

- Added opt-in local ODE chat through a tested connection, with closed evidence
  validation, explicit input limits, safe final replies and request cancellation.
- Browser connection/history consent, settings and Linear Systems Tutor remain
  subsequent chunks. Verification uses synthetic providers and loopback fixtures.

### 2026-09-25 — Lab-owned Tutor context

- Moved ODE evidence and availability into its Lab binding; the shared Tutor
  now rejects outdated replies and chart actions after context/conversation changes.
- Preserved successful/failed Run behavior, Compare exclusion and safe rendering.
  Personal chat, connection settings and Linear Systems Tutor remain later chunks.

### 2026-09-25 — DeepSeek and regional Kimi adapters

- Added direct provider discovery and synthetic testing with explicit regional
  destinations, bounded complete answers and no retry or fallback.
- Known Kimi models requiring preserved reasoning history fail before inference;
  personal chat and settings remain subsequent integration chunks.

### 2026-09-25 — Native Anthropic and Gemini adapters

- Added native provider requests, model discovery and final-answer extraction
  through the existing local session and credential boundary.
- Model lists report incomplete pages explicitly. Synthetic fixtures verify
  refusals, reasoning filtering, cancellation and no automatic retry; settings
  and personal Tutor chat remain subsequent integration chunks.

### 2026-09-25 — Local-compatible and OpenAI connection adapters

- Added explicit local/OpenAI model discovery, synthetic connection testing and
  activation of successfully tested candidates, with bounded final-answer parsing.
- Local inference checks server-reported readiness and disables llama.cpp router
  autoload. Cancellation and failures preserve the active connection. Personal
  chat/UI and other providers remain later chunks; validation uses synthetic fixtures.

### 2026-09-25 — Offline assets and browser resource policy

- Bundled interface fonts and notices, removed external font requests, and
  constrained MathLive to bundled fonts without implicit sound downloads.
- Added CSP for local dev/preview and built HTML, with narrowly scoped theme
  bootstrap and HMR allowances. Verified both Labs with external traffic blocked;
  personal model inference and settings remain subsequent chunks.

### 2026-09-25 — Local Tutor credential/session foundation

- Added explicitly enabled local sessions, per-tab proof, expiry and cancellation,
  plus separate candidate/active connections and fixed destination policies.
- Added bounded, redirect-rejecting provider transport and privacy/lifecycle
  fixtures. Provider adapters, key-entry UI and strict offline mode remain later
  chunks under the independent audit/commit workflow.

### 2026-09-25 — Local Tutor transport foundation

- Constrained local API, dev/preview and HMR listeners; added pre-proxy origin
  checks, JSON/body limits and transport regression tests.
- Incorporated the connection-design review and split implementation into
  separate review gates. Credentials, providers, offline assets and both-Lab
  integration remain later rounds; see [documentation](docs/INDEX.md).

### 2026-08-21 — Module overview presentation consolidated locally

- Unified the ODE, Linear Algebra, and planned PDE overview pages through the
  entry-safe `ModuleOverview` grammar while preserving truthful routes, copy,
  availability, and Home's accepted Linear Algebra → ODE → PDE card order.
- Retired only proven obsolete generic ODE and Linear Systems presentation
  selectors; mathematical layout and dormant Motion ownership remain local.
- Passed 98 files / 1,292 tests, workspace/API typechecks, import boundaries,
  the 111-module Production build, and desktop/390/320 Light/Dark browser QA.
  No numerical, Trace, session, Tutor, Glossary, PDE implementation,
  dependency, push, or deployment change is included.

### 2026-08-19 — ODE presentation hierarchy migrated locally

- Composed the Initial Value Problems Lab's Method, preset guidance, successful
  Output, Compare, chart evidence, and stored-value tables through the accepted
  shared presentation system while preserving ODE state, mathematics,
  Chart.js, Convergence, Tutor, Glossary, and lifecycle ownership.
- Passed 94 files / 1,266 tests, workspace/API typechecks, import boundaries,
  the 108-module Production build, and desktop/mobile Light/Dark browser
  review. Linear Systems inner presentation, Analysis alignment, Motion,
  numerical behavior, dependencies, push, and deployment are unchanged.

### 2026-08-12 — Linear Systems Teaching v2 corrected locally

- Reworked the existing four-step Linear Systems Lab into a computation-led
  teaching experience with visible method concepts, properly typeset native
  MathML solution/factor displays, full trace-owned matrix transformations,
  explicit right-hand-side permutation, and ordered triangular solves.
- Reorganized Diagnostics around the residual computation and moved numerical
  safeguard evidence into a closed advanced disclosure. The existing motion
  implementation remains unmounted pending the next teaching audit.
- Added the maintainer correction pass: standard right-hand-side teaching,
  separate universal and selected-GEPP profiles, a compact equations-to-matrix
  example, and authoritative successful-result context in Output and
  Diagnostics, including stale state.
- Passed 91 files / 1,227 tests, workspace/API typechecks, boundary and build
  gates, plus desktop/mobile Light/Dark in-app browser review. No numerical,
  route, Tutor, Glossary, dependency, push, or deployment change is included.

### 2026-08-11 — Linear Systems Lab completed locally

- Added the independently lazy `/linear-algebra/linear-systems` route with the
  Method/Data/Output/Diagnostics workflow, accessible matrix editor,
  current/stale result lifecycle, Resume, and New experiment integration.
- Added the presentation-only Computation Walkthrough for the existing
  immutable trace, including bounded pivot-failure evidence and stored
  arithmetic disclosure.
- Passed 86 files / 1,189 tests, workspace/API typechecks, boundary checks,
  production build and manifest review, and desktop/mobile browser checks.
  Linear Algebra Tutor, push, and deployment remain pending.

### 2026-08-11 — Architecture v1 completed locally

- Reorganized the same application into explicit frontend, backend, pure
  numerics, and shared-contract npm workspaces while preserving the root
  `/api/chat` Vercel adapter and root developer commands.
- Added deterministic import-boundary verification and current architecture,
  dependency, deployment, and contract documentation.
- Passed 82 files / 1,168 tests, workspace/API typechecks, production build,
  manifest/private-marker review, and local desktop/mobile browser
  equivalence. No feature, push, or deployment was included.
- Detailed verdict:
  [`docs/reviews/2026-08-11-architecture-v1-migration-review.md`](docs/reviews/2026-08-11-architecture-v1-migration-review.md)

### 2026-08-01 — Frontend refinement

- Audited the lower-glare Light theme, restored Dark theme, theme-aware charts,
  initial-focus correction, workflow hierarchy, and transcript-led Tutor layout.
- Finalized the learner-facing display brand as **Numerical T Lab** and retained
  the accepted solid crescent theme-toggle icon.
- Full verification and Preview/Production browser review passed; canonical
  Production serves the synchronized refinement.

### 2026-07-28 — Glossary framework Playground completed locally

- Completed the existing DEV-only Glossary Playground with the content-neutral
  scope, dynamic-context, replacement, formula, composition, placement,
  mobile/modal, mock Tutor, strict-diagnostic, event, and reset matrix.
- Added the development-only About entry and Ctrl/Cmd+Shift+G shortcut through
  one dynamically loaded controls boundary with explicit cleanup.
- Passed focused and full verification, isolated localhost desktop/mobile
  review, and production route/graph/manifest/chunk/marker exclusion checks.
- Production remains unchanged: there are no production Glossary terms,
  annotations, Playground route, Developer Tools entry, shortcut, or visible
  Glossary behavior. Nothing was pushed or deployed.
- Detailed status: [`docs/glossary/HANDOFF.md`](docs/glossary/HANDOFF.md)

### 2026-07-23 — Numerical T-Lab Project Identity Migration completed

- Renamed the public and private deployment repositories while preserving
  their identities and visibility.
- Renamed the existing Vercel project in place, preserved its Project ID and
  settings, and verified Preview and Production deployments.
- Verified `numerical-t-lab.vercel.app` as the canonical Production address;
  retained the former address as a working alias.
- Renamed the local workspace to `D:\numerical-t-lab`, reopened Cursor/Codex
  from the canonical path, and confirmed valid Git state on `main` with the
  canonical remotes.
- Project Identity Migration is complete; repository-grounded
  Content-Agnostic Interactive Glossary Framework implementation planning is
  the next gate.

### 2026-07-22 — Numerical T-Lab identity migration prepared

- Adopted **Numerical T-Lab**, **Theory · Tools · Teaching**, and
  **An Interactive Numerical Analysis Laboratory** across active product
  surfaces.
- Prepared the `numerical-t-lab` package, repository, and deployment targets
  without renaming or contacting external services.
- Preserved the Numerical ODE routes, Initial Value Problems Lab identity,
  numerical behavior, and historical release evidence.
- External repository, Vercel, domain, remote, and local-directory changes
  remain pending review and explicit authorization.

### 2026-07-22 — Interactive Glossary framework design started

- Documented the approved Content-Agnostic Interactive Glossary Framework
  design.
- No canonical numerical notation or production Glossary terms have been
  released.
- Formal content will be reviewed from private course materials before ODE
  rollout.
- Detailed status: [`docs/glossary/HANDOFF.md`](docs/glossary/HANDOFF.md)

### 2026-07-22 — Codex project guidance added

- Added repository-level agent instructions and a current active-plan
  dashboard.
- Added durable product goals, implemented architecture documentation, and a
  documentation index.
- Added a local override pattern for private development context.
- No numerical or runtime behavior changed.

### 2026-07-22 — Numerical notation research started

- Began Milestone 2A-1 evidence collection for a future canonical numerical
  notation standard and Interactive Term Glossary.
- Added a private course-note handling boundary and public-source evidence
  workflow.
- Added a living evidence inventory and research handoff.
- Research is in progress; no canonical notation or runtime Glossary content
  has been released.
- Detailed status: [`docs/research/HANDOFF.md`](docs/research/HANDOFF.md)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
