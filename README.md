# Numerical T Lab

Numerical T Lab is an interactive, AI-assisted laboratory for learning numerical analysis through theory, computation, visualization, error analysis, and guided experiments.

**Theory · Tools · Teaching**

**An Interactive Numerical Analysis Laboratory**

The locally implemented Labs are the **Initial Value Problems Lab**, a browser-based environment for scalar fixed-step ODE methods, and the **Linear Systems Lab**, a small dense `A x = b` environment for Gaussian elimination with partial pivoting and structured computation evidence.

## Live Demo

[**Open Numerical T Lab →**](https://numerical-t-lab.vercel.app/)

The canonical Production URL is `https://numerical-t-lab.vercel.app/`.

## Local routes and module status

This table describes the current repository and deployed Labs. AI Tutor
Connections v1 passed its independent overall audit and deployed interface/API
checks. Personal server/key connections require local T-Lab; the hosted demo
does not accept personal keys. See the [release record](docs/reviews/2026-09-26-ai-tutor-connections-release.md)
for exact evidence and the live-provider testing boundary.

| Route | Page | Status |
|---|---|---|
| `/` | Platform Home | Available |
| `/ode` | Numerical ODE overview | Available |
| `/ode/initial-value-problems` | Initial Value Problems Lab | Available |
| `/linear-algebra` | Numerical Linear Algebra overview | Available |
| `/linear-algebra/linear-systems` | Linear Systems Lab | Available |
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
pending. The [Windows/local connections guide](docs/tutor/LOCAL_CONNECTIONS.md)
provides exact setup steps, data destinations and individual provider verification
status. See the [Tutor handoff](docs/tutor/HANDOFF.md). Enable the local backend with
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

See [CHANGELOG.md](CHANGELOG.md) for project milestones and notable changes.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
