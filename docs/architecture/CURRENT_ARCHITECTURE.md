# Numerical T Lab Architecture v1

Status: **Implemented architecture; local Tutor transport additions verified separately**

Numerical T Lab is an npm-workspace repository with four explicit runtime
owners and one deployment adapter:

```text
frontend/                 browser application and teaching presentation
backend/                  server-only Tutor handler and local API process
packages/numerics/        pure mathematical and numerical authority
packages/contracts/       serializable cross-boundary Tutor DTOs
api/chat.ts               thin Vercel function adapter
```

The migration changed physical ownership, imports, and tooling. Subsequent
Linear Systems product integration uses those frozen boundaries without
moving packages or changing numerical, Tutor, Glossary, or deployment
authority.

## Workspace ownership

### Frontend

`frontend/src/main.ts` bootstraps the project-owned History API application.
Browser ownership is organized as:

- `frontend/src/app/`: shell, router, route registry, in-memory Store, Tutor
  and Glossary Hosts, modal/focus ownership, theme, scroll, and lifecycle;
- `frontend/src/pages/`: Home, About, Not Found, and the entry-safe
  `ModuleOverview` DOM helper consumed by the ODE, Linear Algebra, and PDE
  overview/roadmap pages;
- `frontend/src/components/lab-presentation/`: Lab-shared lazy `LabShell`/
  `LabHeader`, `WorkflowNavigation`, `StageSection`, outer action-role
  presentation, and the implemented Phase 2 `ProblemContext`, `TeachingBlock`,
  `PrimaryResult`, `EvidenceBlock`, `ComputationWalkthroughShell`, semantic
  numerical-table, native advanced-disclosure source, and the Phase 5
  presentation-only `AnalysisSurface`. ODE and Linear Systems both consume the
  shared Analysis grammar in addition to their compatible earlier subsets;
  shared source still owns no domain state, math, visualization, or lifecycle;
- `frontend/src/labs/ode/`: the mountable Initial Value Problems Lab, ODE
  workflow/session state, successful-result context composition, Method/Data/
  Output/Compare presentation, Chart.js lifecycle, Convergence presentation,
  presets, and bindings;
- `frontend/src/labs/linear-algebra/`: the pure editable session, complete
  Linear Systems route, Method/Data/Output/Diagnostics application, visible
  teaching model, domain-specific MathML composition helpers, and
  presentation-only Computation Walkthrough renderer;
- `frontend/src/tutor/`: browser Tutor session, panel, and `/api/chat` client;
- `frontend/src/glossary/`: production Glossary model, registry, controller,
  and lazy surface;
- `frontend/src/math/`: MathLive/Compute Engine browser adapters, lightweight
  native-MathML authored-math primitives, and safe math presentation; and
- `frontend/src/dev/`: development-only Glossary tooling and Presentation
  System fixture.

`frontend/vite.config.ts` uses the frontend directory as Vite root and emits
to the repository-root `dist/`. Public base remains `/`.
Its local dev/preview servers bind to `127.0.0.1` with strict ports and disabled
CORS. HMR shares the dev listener. Host and same-origin browser metadata are
checked before API proxy Host rewriting; unsafe listener overrides fail startup.

`frontend/contentSecurityPolicy.ts` owns the browser resource policy. Local
Vite dev/preview send it as an HTTP header, including a no-embedding restriction;
the build injects the supported resource directives as a meta policy before
scripts. Only the owned theme bootstrap receives an inline-script hash. Normal
connections are same-origin; dev adds its exact HMR host/port. Inline CSS is
allowed for existing Vite/MathLive/layout behavior, not scripts. Data font/image
assets are allowed; object/frame/worker/media loads and form submission are denied.

AppShell imports bundled interface font CSS from `src/assets/fonts/`; licenses
ship under `/licenses/`. MathLive fonts/static CSS stay at the deferred math
boundary, with implicit font/sound path discovery disabled. Browser assets have
been checked with external traffic blocked; full local inference remains a
later adapter/UI milestone. See [chunk 1C evidence](../reviews/2026-09-25-ai-tutor-connections-chunk-1c.md).

### Numerical domain

`packages/numerics` is DOM-free and exposes deliberate subpaths rather than an
eager root barrel:

- `src/ode/`: fixed-grid solvers, method catalog, polynomial and nonlinear
  helpers, and exact-solution validation;
- `src/convergence/`: numerical Convergence Study calculations;
- `src/expressions/`: closed AST, canonicalization, validation, projection,
  serialization, and explicit evaluator;
- `src/linear-algebra/`: approved Linear Systems GEPP/PLU authority and
  immutable presets; and
- `src/trace/`: generic immutable Computation Trace authority.

The frontend-owned Linear Systems session is intentionally not in numerics:
it owns editable drafts, preset/Custom workflow, current/stale output, and
meaningful-work metadata rather than mathematical authority.

### Backend and API

`backend/src/ai/chatHandler.ts` owns validation, deterministic mock behavior,
the ODE Tutor system prompt, provider invocation, and server-only environment
access. `backend/src/dev.ts` is the local HTTP entry and is launched by the
root `dev:api` script so `.env.local` and `.env` resolution remains rooted at
the repository.

`backend/src/localApiServer.ts` owns the local HTTP wrapper, exact loopback
Host/origin validation, browser Fetch Metadata checks, JSON-only 1 MiB request
bodies and bounded HTTP receipt timeouts. `dev.ts` binds it to `127.0.0.1`.
Native CLI requests without browser metadata are accepted only on legacy chat.
With explicit `T_LAB_PERSONAL_TUTOR=true`, `localTutorRoutes.ts` exposes scoped
session operations backed by `localTutorSession.ts`. The latter owns origin-bound
proof, backend-only credentials, candidate/active connections, generations,
request leases, 30-minute idle/8-hour absolute expiry and cleanup. Personal
bodies are capped at 16 KiB and authenticated before reading. Session bootstrap
requires same-origin browser metadata and a custom client marker; subsequent
operations also require session ID/proof headers. No frontend key form exists.

`localTutorPolicy.ts` owns fixed cloud/region presets and strict loopback URL
validation. `ai/providers/providerTransport.ts` supplies one bounded native HTTP
attempt with pinned DNS/TLS identity, header credentials and no redirects or
fallback. `providerAdapters.ts` implements local Chat Completions, OpenAI
Responses, native Anthropic Messages and Gemini generateContent discovery,
synthetic testing and bounded final-text extraction. Native discovery requests
one page capped at 256 models, sharing `PROVIDER_MODEL_LIMIT` with validation;
`TutorModelDiscovery` exposes projected models and `hasMore`, never raw cursors.
The personal API exposes exact `/discover` and `/test` operations with leases;
bootstrap reports these four supported providers. Successful testing marks
the current candidate for explicit activation; failure preserves the active
connection. HTTP caller closure cancels the lease and outgoing request.
Local inference first reads model metadata and uses policy-owned `autoload=false`
on the completion URL. Metadata is server-reported, not lifecycle attestation.
The backend-only completion port awaits the later profile/context/history-aware
handler; there is no personal chat HTTP route yet. Other adapters remain planned. See
the [Tutor design](../superpowers/specs/2026-09-25-ai-tutor-connections-v1-design.md).

Root `api/chat.ts` remains the public `/api/chat` Vercel entry. It enforces the
POST-only adapter contract, delegates to
the relative `../backend/src/ai/chatHandler.js` entry, and forwards handler status/body
without interpretation.

### Shared contracts

`packages/contracts/src/tutor.ts` contains only serializable DTOs that cross
the browser/server boundary. Frontend-only editable ODE problem inputs remain
under `frontend/src/labs/ode/odeTutorTypes.ts`; numerical result types remain
in the numerical package.

## Runtime dependency flow

```text
api/chat.ts -> backend -> packages/contracts

frontend -> packages/contracts
frontend -> packages/numerics

packages/numerics -> platform libraries only
packages/contracts -> platform libraries only
```

Forbidden reverse edges are documented in
[Dependency Rules](./DEPENDENCY_RULES.md) and checked by
`npm run verify:boundaries`.

## Route and lazy-load flow

```text
frontend entry
  -> shell, router, store, and static pages
  -> entry-safe ModuleOverview for ODE, Linear Algebra, and PDE overviews
  -> dynamic Initial Value Problems route
  -> shared Lab presentation chunk
  -> ODE UI, numerical package subpaths, Chart.js, and Convergence
  -> first-open Tutor panel
  -> interaction-deferred MathLive and Compute Engine

frontend entry
  -> dynamic Linear Systems route
  -> shared Lab presentation chunk
  -> frontend session and shared Teaching v2 presentation composition
  -> lightweight native MathML atoms plus controlled DOM/CSS composition
  -> domain-authored static trace interpretation inside the shared walkthrough shell
  -> Linear Systems numerical package and immutable computation trace

first valid Glossary request
  -> dynamic Glossary surface

development only
  -> dynamic Glossary controls and Playground
  -> dynamic Presentation System fixture with authored Phase 2 and Phase 5 content
```

Public routes are `/`, `/about`, `/ode`, `/ode/initial-value-problems`,
`/linear-algebra`, `/linear-algebra/linear-systems`, and `/pde`; unknown routes
render the in-shell Not Found page. Both complete Labs have independent dynamic
route boundaries. The Linear Systems route intentionally exposes neither a
Tutor binding nor a Glossary binding at this gate. PDE remains a roadmap-only
static route and exposes no runnable Lab action.

`frontend/src/pages/moduleOverview.ts` is the only entry-safe top-level
presentation primitive. It composes caller-authored native headings, written
Available/Planned state, optional native action, content, and supporting
sections by node identity. It creates no live region and imports no Lab,
session, numerical, chart, math-runtime, Tutor, Glossary, Trace, Motion, Store,
or Router authority. Home intentionally retains its dedicated module-card
composition and accepted Linear Algebra → ODE → PDE semantic order.

Both complete-Lab route manifests import the same small presentation JS/CSS
chunk. The platform entry does not import that chunk. Shared presentation owns
only semantic DOM composition, role styling, and contained workflow reveal;
each Lab still owns state, availability, callbacks, numerical content, live
regions, platform bindings, and disposal.

Phase 6 retired only generic presentation selectors with a proven shared
replacement and no remaining route consumer. Entry-loaded
`.platform-feature-card` was consolidated into `ModuleOverview`; obsolete ODE
note/result wrappers and obsolete Linear Systems method/teaching/diagnostic
card/metric wrappers were removed after source, history, test, live-DOM, and
browser proof. ODE method/preset/editor/chart/Compare/Convergence styles and
Linear Systems matrix/MathML/factor/transformation/substitution/pivot/residual
styles remain domain-local. Ambiguous mathematical selectors and all dormant
Motion selectors remain in place.

The accepted Phase 2 and implemented Phase 5 primitive TypeScript modules are
real shared source. The
ODE complete-Lab route now consumes `ProblemContext`, `TeachingBlock`,
`PrimaryResult`, `EvidenceBlock`, and `NumericalTable` for its inner Method,
Data, single Output, and Compare hierarchy. ODE supplies successful immutable
problem evidence, method metadata, mathematical DOM, result values, chart
configuration/data, and table rows; the shared primitives only compose those
authored nodes. Chart.js, ODE numerical/session/expression authority, Tutor,
Glossary, and disposal remain ODE-owned.

ODE does not consume `ComputationWalkthroughShell` because no authoritative
ODE computation trace exists. ODE Convergence now composes its setup,
domain-authored conclusion, evidence, interpretation, limitation, and existing
advanced disclosures through `AnalysisSurface`. Its controller, eligibility,
exact-solution checks, budgets, refinement calculations, classifications,
native table, Chart.js instance/data/lifecycle, and session behavior remain
ODE-owned. Convergence remains nested inside Output; ODE still has exactly the
Method, Data, and Output workflow stages.

Linear Systems Method composes its natural large teaching regions through
`TeachingBlock`. Successful current and stale Output have exactly one shared
`PrimaryResult` owner containing a successful-result `ProblemContext` and the
computed answer; both are authored only from immutable `originalA`,
`originalB`, and `xHat`. Factorization and residual-led supporting evidence use
`EvidenceBlock`; arithmetic and safeguard details use native closed
`AdvancedDetails`. The shared `ComputationWalkthroughShell` owns the rendered
ordered phases, steps, and before/operation/after corridors, while
`computationWalkthrough.ts` remains the sole trace-kind interpreter and owns
all captions, formulas, matrices, substitutions, residual evidence, and
failure boundaries. Diagnostics remains the user-facing top-level analysis
`StageSection` and now composes successful context, residual purpose, finding,
evidence, interpretation, limitation, and safeguards through
`AnalysisSurface`. All residual mathematics, successful/stale snapshot
authority, preset qualification, and safeguard values remain Linear
Systems-owned. The DEV-only Presentation System fixture remains absent from
Production route matching and emitted assets.

`AnalysisSurface` is only a labelled DOM-composition and role-style owner. It
appends caller-authored nodes by identity, supports caller-native heading
levels, creates no live region, and performs no interpretation or calculation.
There is no shared analysis result, session, controller, state machine,
calculation, or numerical DTO between the Labs.

The route module registry, Tutor Host, Glossary Host, and editable-math loader
retain distinct dynamic imports. Package extraction does not create an eager
numerics root import.

The Linear Systems walkthrough consumes producer-owned `initialU`, complete
`uBefore`/`uAfter`, `permutedB`, substitution, residual, and reference evidence
without rerunning elimination or reconstructing numerical states. Its current
Phase 4 presentation is intentionally static. The existing motion controller
remains dormant source and is not imported or mounted by the Linear Systems
route pending the separate motion-remount gate.

## State and lifecycle

`AppSessionStore` contains deeply frozen pure data only: Lab sessions, module
Tutor sessions, meaningful-work/Resume metadata, and numeric scroll metadata.
DOM nodes, Charts, MathLive handles, listeners, abort objects, closures, and
mounted instances remain route-owned runtime state.

Complete-Lab disposal closes/disconnects platform surfaces, captures pure
session and scroll state, invalidates stale work, disposes Lab-owned runtime
handles, and clears route DOM. Session data remains memory-only.

Linear Systems reuses this generic lifecycle. Its Store state contains only
the deeply frozen frontend session and the immutable numerical result/trace
reference. Resume metadata contains workflow, method, and current/stale labels
but no matrix, right-hand side, solution, residual, or trace arithmetic.

## Numerical and expression invariants

The move preserves the formulas, evaluation order, tolerances, classifications,
factor conventions, trace emission, residual orientation, and immutable result
semantics recorded in
[Numerical Contracts](../contracts/NUMERICAL_CONTRACTS.md).

The expression authority flow remains:

```text
MathLive draft
  -> Compute Engine adapter
  -> project-owned validated MathAst
  -> explicit finite evaluator
  -> numerical solver callback
```

No production `eval`, `new Function`, arbitrary JavaScript, raw user LaTeX, or
Tutor output becomes numerical authority.

## Deployment

Vite continues to emit root-base static assets to `dist/`; `vercel.json`
continues to preserve functions/assets ahead of the SPA fallback. See
[Deployment Architecture](./DEPLOYMENT_ARCHITECTURE.md).

## Contributor entry points

- Operating contract: [AGENTS.md](../../AGENTS.md)
- Current plan: [PLAN.md](../../PLAN.md)
- Dependency rules: [DEPENDENCY_RULES.md](./DEPENDENCY_RULES.md)
- Numerical contracts: [NUMERICAL_CONTRACTS.md](../contracts/NUMERICAL_CONTRACTS.md)
- Project handoff: [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md)

Update this document only when implemented ownership changes. Planned designs
do not change the current architecture map.
